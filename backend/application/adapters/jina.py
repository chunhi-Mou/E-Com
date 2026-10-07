"""Jina embeddings (text v3, CLIP v2) and multilingual reranker behind the existing interfaces.

Docs (request shapes not yet verified against the live API; see tools.smoke_remote):
- https://jina.ai/embeddings/   POST https://api.jina.ai/v1/embeddings, Bearer auth,
  {"model", "input": [str | {"text"} | {"image": base64}], "task", "dimensions", "normalized"}
  -> {"data": [{"index", "embedding"}]}
- https://jina.ai/models/jina-clip-v2/   text and images share one 1024-d space
- https://jina.ai/reranker/   POST https://api.jina.ai/v1/rerank, {"model", "query", "documents", "top_n"}
  -> {"results": [{"index", "relevance_score"}]}
"""
from __future__ import annotations

import base64
import io
import logging
import os
from pathlib import Path
from typing import Any, Mapping

import httpx
import numpy as np

from application.adapters.cache import VectorCache, sha256_hex
from application.adapters.http import HttpClient, RemoteError, require
from application.image_service import ImageEncoder, ImageSource, load_image
from application.reranker import Reranker, TokenCoverageReranker
from application.text_encoder import TextEncoder

log = logging.getLogger(__name__)
BASE_URL = "https://api.jina.ai"


def _env_dir(env: Mapping[str, str], sub: str) -> Path:
    base = env.get("DATASET_DIR") or str(Path(__file__).resolve().parents[2] / "dataset")
    return Path(base) / "cache" / sub


def _normalize(m: np.ndarray) -> np.ndarray:
    n = np.linalg.norm(m, axis=1, keepdims=True)
    return (m / np.where(n == 0, 1.0, n)).astype(np.float32)


class _JinaEmbedder:
    """Batching + disk cache; subclasses decide how an input becomes an API item."""

    def __init__(self, api_key: str, model: str, dim: int, cache_dir: Path | None, batch_size: int,
                 timeout: float, transport: httpx.BaseTransport | None, extra: dict[str, Any]) -> None:
        self.model, self.dim, self.batch_size, self.extra = model, dim, batch_size, extra
        self.cache_dir = cache_dir
        self.http = HttpClient(BASE_URL, {"Authorization": f"Bearer {api_key}"}, timeout,
                               transport=transport, name="jina")
        self.api_calls = 0

    def _embed(self, kind: str, items: list[tuple[str, Any]]) -> np.ndarray:
        """items: (input hash, API input). Returns (n, dim) in order; only cache misses hit the API."""
        cache = VectorCache(self.cache_dir, f"{self.model}-{kind}-{self.dim}")
        out: list[np.ndarray | None] = [cache.get(h) for h, _ in items]
        missing = [i for i, v in enumerate(out) if v is None]
        for s in range(0, len(missing), self.batch_size):
            idx = missing[s:s + self.batch_size]
            vecs = self._call([items[i][1] for i in idx])
            for i, v in zip(idx, vecs):
                out[i] = v
                cache.put(items[i][0], v)
        if not items:
            return np.zeros((0, self.dim), np.float32)
        return _normalize(np.vstack(out))  # type: ignore[arg-type]

    def _call(self, inputs: list[Any]) -> list[np.ndarray]:
        body = {"model": self.model, "input": inputs, "normalized": True, "embedding_type": "float", **self.extra}
        if self.dim:
            body["dimensions"] = self.dim
        j = self.http.json("POST", "/v1/embeddings", json=body)
        self.api_calls += 1
        try:
            data = sorted(j["data"], key=lambda d: d["index"])
            vecs = [np.asarray(d["embedding"], dtype=np.float32) for d in data]
        except (KeyError, TypeError, ValueError):
            raise RemoteError("jina: unexpected embeddings response shape") from None
        if len(vecs) != len(inputs) or any(v.ndim != 1 for v in vecs):
            raise RemoteError(f"jina: expected {len(inputs)} vectors, got {len(vecs)}")
        return vecs


class JinaTextEncoder(_JinaEmbedder, TextEncoder):
    def __init__(self, api_key: str, model: str = "jina-embeddings-v3", task: str = "text-matching",
                 dim: int = 1024, cache_dir: Path | None = None, batch_size: int = 64, timeout: float = 30.0,
                 transport: httpx.BaseTransport | None = None) -> None:
        # symmetric task: the TextEncoder interface encodes queries and documents through the same call
        super().__init__(api_key, model, dim, cache_dir, batch_size, timeout, transport, {"task": task})
        self.task = task

    @classmethod
    def from_env(cls, env: Mapping[str, str] | None = None) -> "JinaTextEncoder":
        env = os.environ if env is None else env
        return cls(require(env, "JINA_API_KEY", "TEXT_ENCODER=jina"),
                   env.get("JINA_TEXT_MODEL") or "jina-embeddings-v3", cache_dir=_env_dir(env, "emb"))

    def encode(self, texts: list[str]) -> np.ndarray:
        return self._embed(f"text-{self.task}", [(sha256_hex(t), t) for t in texts])


class JinaClipImageEncoder(_JinaEmbedder, ImageEncoder):
    MAX_SIDE = 768

    def __init__(self, api_key: str, model: str = "jina-clip-v2", dim: int = 1024, cache_dir: Path | None = None,
                 batch_size: int = 8, timeout: float = 60.0, transport: httpx.BaseTransport | None = None) -> None:
        super().__init__(api_key, model, dim, cache_dir, batch_size, timeout, transport, {})

    @classmethod
    def from_env(cls, env: Mapping[str, str] | None = None) -> "JinaClipImageEncoder":
        env = os.environ if env is None else env
        return cls(require(env, "JINA_API_KEY", "IMAGE_ENCODER=jina_clip"),
                   env.get("JINA_CLIP_MODEL") or "jina-clip-v2", cache_dir=_env_dir(env, "emb"))

    def encode(self, images: list[ImageSource]) -> np.ndarray:
        items = []
        for src in images:
            raw = src if isinstance(src, bytes) else Path(src).read_bytes()
            items.append((sha256_hex(raw), self._payload(raw)))
        return self._embed("image", items)

    def encode_text(self, texts: list[str]) -> np.ndarray:
        """Optional cross-modal entry: text lands in the same space as the image vectors."""
        return self._embed("text", [(sha256_hex(t), {"text": t}) for t in texts])

    def _payload(self, raw: bytes) -> dict[str, str]:
        img = load_image(raw)
        img.thumbnail((self.MAX_SIDE, self.MAX_SIDE))  # smaller upload, same embedding for practical purposes
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=90)
        return {"image": base64.b64encode(buf.getvalue()).decode("ascii")}


class JinaReranker(Reranker):
    """On any failure falls back to a local reranker (RankingService cannot consume None scores)."""

    def __init__(self, api_key: str, model: str = "jina-reranker-v2-base-multilingual", timeout: float = 15.0,
                 fallback: Reranker | None = None, transport: httpx.BaseTransport | None = None) -> None:
        self.model = model
        self.fallback = fallback or TokenCoverageReranker()
        self.http = HttpClient(BASE_URL, {"Authorization": f"Bearer {api_key}"}, timeout,
                               transport=transport, name="jina-rerank")
        self.last_error: str | None = None

    @classmethod
    def from_env(cls, env: Mapping[str, str] | None = None) -> "JinaReranker":
        env = os.environ if env is None else env
        return cls(require(env, "JINA_API_KEY", "RERANKER=jina"),
                   env.get("JINA_RERANK_MODEL") or "jina-reranker-v2-base-multilingual")

    def score(self, query: str, docs: list[str]) -> list[float]:
        if not docs:
            return []
        try:
            scores = self._remote(query, docs)
            self.last_error = None
            return scores
        except RemoteError as e:
            self.last_error = str(e)
            log.warning("rerank failed (%s); using fallback reranker", e)
            return self.fallback.score(query, docs)

    def _remote(self, query: str, docs: list[str]) -> list[float]:
        j = self.http.json("POST", "/v1/rerank", json={"model": self.model, "query": query, "documents": docs,
                                                       "top_n": len(docs), "return_documents": False})
        try:
            scores = [0.0] * len(docs)
            seen = set()
            for r in j["results"]:
                scores[r["index"]] = min(max(float(r["relevance_score"]), 0.0), 1.0)
                seen.add(r["index"])
        except (KeyError, IndexError, TypeError, ValueError):
            raise RemoteError("jina-rerank: unexpected response shape") from None
        if len(seen) != len(docs):
            raise RemoteError("jina-rerank: response does not cover all documents")
        return scores
