"""PostgreSQL + pgvector implementation of the Data layer (swappable with the JSON/numpy one)."""
from __future__ import annotations

from pathlib import Path

from data.postgres.connection import PgDatabase
from data.postgres.order_repository import PostgresOrderRepository
from data.postgres.product_repository import PostgresProductRepository
from data.postgres.search_log import PostgresSearchLogRepository, SearchLogRepository
from data.postgres.vector_index import PgVectorIndex
from data.postgres.vocabulary_repository import PostgresVocabularyRepository
from data.product_repository import DATASET_DIR

# Model names stored next to each embedding; db/load.py writes the same defaults.
DEFAULT_TEXT_MODEL = "hashing"
DEFAULT_IMAGE_MODEL = "color_histogram"


class PgDataLayer(tuple):
    """Unpacks as (product_repo, order_repo, vocabulary_repo, text_vector_index, image_vector_index).

    Extras: .search_log (SearchLogRepository), .db (shared PgDatabase; .close() on shutdown).
    """

    def __new__(cls, parts: tuple, db: PgDatabase, search_log: SearchLogRepository) -> "PgDataLayer":
        self = super().__new__(cls, parts)
        self.db, self.search_log = db, search_log
        return self


def build_postgres_data_layer(dsn: str, dataset_dir: Path | str = DATASET_DIR,
                              text_model: str = DEFAULT_TEXT_MODEL,
                              image_model: str = DEFAULT_IMAGE_MODEL) -> PgDataLayer:
    """Wire the Postgres adapters. Run `python -m db.load` once beforehand to fill the database."""
    db = PgDatabase(dsn)
    parts = (PostgresProductRepository(db, dataset_dir), PostgresOrderRepository(db),
             PostgresVocabularyRepository(db), PgVectorIndex(db, "text", text_model),
             PgVectorIndex(db, "image", image_model))
    return PgDataLayer(parts, db, PostgresSearchLogRepository(db))


__all__ = ["build_postgres_data_layer", "PgDataLayer", "PgDatabase", "PostgresProductRepository",
           "PostgresOrderRepository", "PostgresVocabularyRepository", "PgVectorIndex",
           "PostgresSearchLogRepository", "SearchLogRepository", "DEFAULT_TEXT_MODEL", "DEFAULT_IMAGE_MODEL"]
