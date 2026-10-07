"""VectorIndex on pgvector (HNSW, cosine). Drop-in replacement for NumpyVectorIndex."""
from __future__ import annotations

import math
import re
from typing import Any, Collection

import numpy as np
import psycopg
from pgvector import Vector

from data.postgres.connection import PgDatabase
from data.postgres.sql import TABLES, Kind, build_knn, column_type, embedding_ddl
from data.vector_index import VectorIndex


class PgVectorIndex(VectorIndex):
    """kind='text': ids are product ids. kind='image': ids are product ids too; the vector is
    stored against the primary image of the product (like the JSON index, which embeds images[0]).

    `model` is stored with every row, so another encoder can be loaded next to the current one
    without a schema change. The vector dimension is taken from the first vectors added.
    """

    def __init__(self, db: PgDatabase, kind: Kind, model: str) -> None:
        self.db, self.kind, self.model = db, kind, model
        self.table = TABLES[kind]
        self._col_type: str | None = None

    # -- schema ------------------------------------------------------------------
    def _column_type(self) -> str | None:
        """e.g. 'vector(174)'; None while the table does not exist yet."""
        if self._col_type is None:
            rows = self.db.query(
                "SELECT format_type(a.atttypid, a.atttypmod) FROM pg_attribute a "
                "WHERE a.attrelid = to_regclass(%s) AND a.attname = 'embedding'", [self.table])
            self._col_type = rows[0][0] if rows else None
        return self._col_type

    def _ensure_table(self, dim: int) -> str:
        existing = self._column_type()
        if existing is None:
            for stmt in embedding_ddl(self.kind, dim):
                self.db.execute(stmt)
            self.db.refresh_types()
            self._col_type = column_type(dim)
            return self._col_type
        if existing != column_type(dim):
            raise ValueError(f"{self.table} holds {existing} vectors but the encoder produces dim {dim}; "
                             "reload with --reset to rebuild the embedding tables")
        return existing

    @staticmethod
    def _dim(col_type: str) -> int:
        return int(re.search(r"\((\d+)\)", col_type).group(1))  # type: ignore[union-attr]

    # -- VectorIndex -------------------------------------------------------------
    def add(self, ids: list[str], vectors: np.ndarray) -> None:
        vecs = np.asarray(vectors, dtype=np.float32)
        if len(ids) != len(vecs):
            raise ValueError("ids and vectors differ in length")
        if not len(ids):
            return
        col = self._ensure_table(vecs.shape[1])
        norms = np.linalg.norm(vecs, axis=1, keepdims=True)
        vecs = vecs / np.where(norms == 0, 1.0, norms)
        if self.kind == "text":
            keys = list(ids)
        else:
            primary = dict(self.db.query("SELECT product_id, id FROM product_image "
                                         "WHERE product_id = ANY(%s) AND is_primary", [list(ids)]))
            missing = [i for i in ids if i not in primary]
            if missing:
                raise ValueError(f"no primary image for products: {missing[:5]}")
            keys = [primary[i] for i in ids]
        key_col = "product_id" if self.kind == "text" else "product_image_id"
        self.db.executemany(
            f"INSERT INTO {self.table} ({key_col}, model, embedding) VALUES (%s, %s, %s::{col}) "
            f"ON CONFLICT ({key_col}, model) DO UPDATE SET embedding = EXCLUDED.embedding",
            [(k, self.model, Vector(v)) for k, v in zip(keys, vecs)])

    def search(self, vector: np.ndarray, k: int = 50, allowed_ids: Collection[str] | None = None,
               filters: dict[str, Any] | None = None) -> list[tuple[str, float]]:
        """kNN restricted in SQL by allowed_ids and/or hard `filters` (same dict as find_ids)."""
        if vector is None:
            return []
        q = np.asarray(vector, dtype=np.float32)
        n = float(np.linalg.norm(q))
        if n == 0 or k <= 0:
            return []
        col = self._column_type()
        if col is None:
            return []
        if q.shape[0] != self._dim(col):
            raise ValueError(f"query has dim {q.shape[0]} but {self.table} holds {col}")
        sql, params = build_knn(self.kind, col, Vector(q / n), self.model, k, allowed_ids, filters)
        out: dict[str, float] = {}
        for pid, score in self.db.query(sql, params):
            if score is not None and math.isfinite(score) and score > out.get(pid, -math.inf):
                out[pid] = float(score)
        return sorted(out.items(), key=lambda kv: -kv[1])

    def __len__(self) -> int:
        if self._column_type() is None:
            return 0
        return int(self.db.query(f"SELECT count(*) FROM {self.table} WHERE model = %s", [self.model])[0][0])
