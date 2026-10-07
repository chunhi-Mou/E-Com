"""Search log: one search_query row per search plus one search_result row per ranked product."""
from __future__ import annotations

import json
from abc import ABC, abstractmethod
from typing import Sequence

from psycopg.types.json import Jsonb

from domain.models import QueryRepresentation, SearchResult

from data.postgres.connection import PgDatabase


class SearchLogRepository(ABC):
    @abstractmethod
    def log(self, representation: QueryRepresentation, results: Sequence[SearchResult],
            latency_ms: float) -> int:
        """Persist one search; returns the search_query id."""


def _jsonb(obj: object) -> Jsonb:
    return Jsonb(obj, dumps=lambda o: json.dumps(o, ensure_ascii=False, default=str))


class PostgresSearchLogRepository(SearchLogRepository):
    def __init__(self, db: PgDatabase) -> None:
        self.db = db

    def log(self, representation: QueryRepresentation, results: Sequence[SearchResult], latency_ms: float,
            customer_id: str | None = None, session_id: str | None = None) -> int:
        with self.db.transaction():
            qid = self.db.query(
                "INSERT INTO search_query (customer_id, session_id, modality, raw_text, representation, latency_ms) "
                "VALUES (%s, %s, %s, %s, %s, %s) RETURNING id",
                [customer_id, session_id, representation.modality.value, representation.raw_text,
                 _jsonb(representation.to_dict()), latency_ms])[0][0]
            self.db.executemany(
                "INSERT INTO search_result (query_id, product_id, rank, scores, final_score) "
                "VALUES (%s, %s, %s, %s, %s)",
                [(qid, r.product.id, r.rank, _jsonb(r.scores), r.scores.get("final")) for r in results])
        return int(qid)
