"""Thin shared psycopg connection: one autocommit connection guarded by a lock (no pool dependency)."""
from __future__ import annotations

import threading
from contextlib import contextmanager
from typing import Any, Iterator, Sequence

import psycopg
from pgvector.psycopg import register_vector


class PgDatabase:
    """Used by every Postgres repository, so they share one connection and one DSN."""

    def __init__(self, dsn: str, hnsw_ef_search: int = 200) -> None:
        self.dsn = dsn
        self._ef_search = hnsw_ef_search
        self._conn: psycopg.Connection | None = None
        self._vector_registered = False
        self._lock = threading.RLock()

    # -- connection management -------------------------------------------------
    def _connect(self) -> psycopg.Connection:
        conn = psycopg.connect(self.dsn, autocommit=True)
        self._conn, self._vector_registered = conn, False
        self._register_vector()
        return conn

    def _register_vector(self) -> None:
        """Register pgvector adapters; fails harmlessly until CREATE EXTENSION vector has run."""
        if self._vector_registered or self._conn is None:
            return
        try:
            register_vector(self._conn)
        except psycopg.ProgrammingError:
            return
        self._vector_registered = True
        # Filtered kNN: keep scanning the HNSW index until enough rows pass the WHERE (pgvector >= 0.8).
        for stmt in (f"SET hnsw.ef_search = {int(self._ef_search)}", "SET hnsw.iterative_scan = relaxed_order"):
            try:
                self._conn.execute(stmt)
            except psycopg.Error:
                pass

    def _ready(self) -> psycopg.Connection:
        if self._conn is None or self._conn.closed:
            return self._connect()
        self._register_vector()
        return self._conn

    def refresh_types(self) -> None:
        """Call after CREATE EXTENSION vector on this connection."""
        with self._lock:
            self._ready()

    def close(self) -> None:
        with self._lock:
            if self._conn is not None and not self._conn.closed:
                self._conn.close()
            self._conn = None

    # -- query helpers -----------------------------------------------------------
    def query(self, sql: str, params: Sequence[Any] | None = None) -> list[tuple]:
        with self._lock:
            conn = self._ready()
            try:
                return conn.execute(sql, params).fetchall()
            except psycopg.OperationalError:
                if not conn.closed:
                    raise
                return self._connect().execute(sql, params).fetchall()  # server restarted: retry once

    def execute(self, sql: str, params: Sequence[Any] | None = None) -> None:
        with self._lock:
            self._ready().execute(sql, params)

    def executemany(self, sql: str, rows: Sequence[Sequence[Any]]) -> None:
        if not rows:
            return
        with self._lock:
            with self._ready().cursor() as cur:
                cur.executemany(sql, rows)

    @contextmanager
    def transaction(self) -> Iterator[None]:
        """Statements issued through this object inside the block share one transaction."""
        with self._lock:
            with self._ready().transaction():
                yield
