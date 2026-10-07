"""Reranker interface and an offline lexical default (stand-in for a cross-encoder)."""
from __future__ import annotations

from abc import ABC, abstractmethod

from domain.text_utils import tokenize_unaccented


class Reranker(ABC):
    @abstractmethod
    def score(self, query: str, docs: list[str]) -> list[float]:
        """Relevance of each doc to the query, in [0, 1]."""


class TokenCoverageReranker(Reranker):
    """Fraction of query tokens (and bigrams) found in the doc."""

    def score(self, query: str, docs: list[str]) -> list[float]:
        q = tokenize_unaccented(query)
        if not q:
            return [0.0] * len(docs)
        qb = set(zip(q, q[1:]))
        out = []
        for d in docs:
            dt = tokenize_unaccented(d)
            ds, db = set(dt), set(zip(dt, dt[1:]))
            uni = sum(t in ds for t in q) / len(q)
            bi = (sum(b in db for b in qb) / len(qb)) if qb else uni
            out.append(0.6 * uni + 0.4 * bi)
        return out
