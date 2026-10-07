"""Keyword index: numpy BM25 with accent stripping and bigrams."""
from __future__ import annotations

import math
from abc import ABC, abstractmethod
from collections import Counter
from typing import Collection, Sequence

import numpy as np

from domain.text_utils import tokenize_unaccented


def analyze(text: str) -> list[str]:
    """Unaccented unigrams plus bigrams (phrases like "co lo", "mua dong")."""
    toks = tokenize_unaccented(text)
    return toks + [f"{a}_{b}" for a, b in zip(toks, toks[1:])]


class KeywordIndex(ABC):
    @abstractmethod
    def build(self, docs: dict[str, str]) -> None: ...

    @abstractmethod
    def search(self, queries: Sequence[tuple[str, float]], k: int = 100,
               allowed_ids: Collection[str] | None = None) -> list[tuple[str, float]]:
        """queries: (text, weight) pairs. Returns [(id, bm25)] descending, score > 0 only."""


class Bm25KeywordIndex(KeywordIndex):
    def __init__(self, k1: float = 1.5, b: float = 0.75) -> None:
        self.k1, self.b = k1, b
        self._ids: list[str] = []
        self._postings: dict[str, tuple[np.ndarray, np.ndarray]] = {}
        self._idf: dict[str, float] = {}
        self._dl: np.ndarray = np.zeros(0)
        self._avgdl = 1.0

    def build(self, docs: dict[str, str]) -> None:
        self._ids = list(docs)
        tmp: dict[str, list[tuple[int, int]]] = {}
        lengths = []
        for i, doc_id in enumerate(self._ids):
            toks = analyze(docs[doc_id])
            lengths.append(len(toks))
            for term, tf in Counter(toks).items():
                tmp.setdefault(term, []).append((i, tf))
        self._dl = np.asarray(lengths, dtype=np.float64)
        self._avgdl = float(self._dl.mean()) if len(lengths) else 1.0
        n = len(self._ids)
        self._postings, self._idf = {}, {}
        for term, plist in tmp.items():
            idx = np.fromiter((p[0] for p in plist), dtype=np.int64)
            tf = np.fromiter((p[1] for p in plist), dtype=np.float64)
            self._postings[term] = (idx, tf)
            df = len(plist)
            self._idf[term] = math.log(1 + (n - df + 0.5) / (df + 0.5))

    def search(self, queries: Sequence[tuple[str, float]], k: int = 100,
               allowed_ids: Collection[str] | None = None) -> list[tuple[str, float]]:
        weights: Counter[str] = Counter()
        for text, w in queries:
            for term in analyze(text):
                weights[term] += w
        scores = np.zeros(len(self._ids))
        for term, w in weights.items():
            post = self._postings.get(term)
            if post is None:
                continue
            idx, tf = post
            denom = tf + self.k1 * (1 - self.b + self.b * self._dl[idx] / self._avgdl)
            scores[idx] += w * self._idf[term] * tf * (self.k1 + 1) / denom
        if allowed_ids is not None:
            allowed = set(allowed_ids)
            mask = np.fromiter((i in allowed for i in self._ids), dtype=bool, count=len(self._ids))
            scores = np.where(mask, scores, 0.0)
        order = np.argsort(-scores)[:k]
        return [(self._ids[i], float(scores[i])) for i in order if scores[i] > 0]
