"""Text embedding interface and an offline hashing encoder (stand-in for a semantic model)."""
from __future__ import annotations

import zlib
from abc import ABC, abstractmethod

import numpy as np

from domain.text_utils import tokenize_unaccented


class TextEncoder(ABC):
    def fit(self, corpus: list[str]) -> None:
        """Optional corpus statistics; no-op for pretrained models."""

    @abstractmethod
    def encode(self, texts: list[str]) -> np.ndarray:
        """Return an (n, dim) float32 array of L2-normalized vectors."""


class HashingTextEncoder(TextEncoder):
    """Word + char n-gram hashing with IDF. Tolerates typos and missing accents; not truly semantic."""

    def __init__(self, dim: int = 2048, ngram: tuple[int, int] = (3, 4)) -> None:
        self.dim, self.ngram = dim, ngram
        self._idf = np.ones(dim, dtype=np.float32)

    def _features(self, text: str) -> list[int]:
        feats: list[str] = []
        for tok in tokenize_unaccented(text):
            feats.append("w:" + tok)
            padded = f"#{tok}#"
            for n in range(self.ngram[0], self.ngram[1] + 1):
                feats.extend("c:" + padded[i:i + n] for i in range(max(len(padded) - n + 1, 0)))
        return [zlib.crc32(f.encode()) % self.dim for f in feats]

    def _tf(self, text: str) -> np.ndarray:
        v = np.zeros(self.dim, dtype=np.float32)
        for h in self._features(text):
            v[h] += 1.0
        return np.log1p(v)

    def fit(self, corpus: list[str]) -> None:
        df = np.zeros(self.dim, dtype=np.float32)
        for doc in corpus:
            df += (self._tf(doc) > 0)
        n = max(len(corpus), 1)
        self._idf = (np.log((1 + n) / (1 + df)) + 1.0).astype(np.float32)

    def encode(self, texts: list[str]) -> np.ndarray:
        out = np.vstack([self._tf(t) * self._idf for t in texts]) if texts else np.zeros((0, self.dim), np.float32)
        norms = np.linalg.norm(out, axis=1, keepdims=True)
        return (out / np.where(norms == 0, 1.0, norms)).astype(np.float32)
