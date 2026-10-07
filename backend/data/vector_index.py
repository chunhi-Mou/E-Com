"""Vector index. Numpy brute-force cosine; a pgvector implementation can replace it."""
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Collection

import numpy as np


class VectorIndex(ABC):
    @abstractmethod
    def add(self, ids: list[str], vectors: np.ndarray) -> None: ...

    @abstractmethod
    def search(self, vector: np.ndarray, k: int = 50,
               allowed_ids: Collection[str] | None = None) -> list[tuple[str, float]]: ...

    @abstractmethod
    def __len__(self) -> int: ...


class NumpyVectorIndex(VectorIndex):
    def __init__(self) -> None:
        self._ids: list[str] = []
        self._mat: np.ndarray | None = None

    def add(self, ids: list[str], vectors: np.ndarray) -> None:
        vecs = np.asarray(vectors, dtype=np.float32)
        norms = np.linalg.norm(vecs, axis=1, keepdims=True)
        vecs = vecs / np.where(norms == 0, 1.0, norms)
        self._ids.extend(ids)
        self._mat = vecs if self._mat is None else np.vstack([self._mat, vecs])

    def search(self, vector: np.ndarray, k: int = 50,
               allowed_ids: Collection[str] | None = None) -> list[tuple[str, float]]:
        if self._mat is None or vector is None:
            return []
        q = np.asarray(vector, dtype=np.float32)
        n = np.linalg.norm(q)
        if n == 0:
            return []
        scores = self._mat @ (q / n)
        if allowed_ids is not None:
            allowed = set(allowed_ids)
            mask = np.fromiter((i in allowed for i in self._ids), dtype=bool, count=len(self._ids))
            scores = np.where(mask, scores, -np.inf)
        order = np.argsort(-scores)[:k]
        return [(self._ids[i], float(scores[i])) for i in order if np.isfinite(scores[i])]

    def __len__(self) -> int:
        return len(self._ids)
