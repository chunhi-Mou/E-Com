"""Shared helpers for the Postgres tests (not tests themselves).

Integration tests need a server with pgvector and a role allowed to CREATE DATABASE:
    PG_DSN=postgresql://ecom:ecom@localhost:5432/ecom pytest tests/test_postgres_*.py
Without PG_DSN they skip. Each run loads the dataset into a throw-away database that is dropped afterwards.
"""
from __future__ import annotations

import atexit
import os
import uuid
from types import SimpleNamespace

import pytest

PG_DSN = os.environ.get("PG_DSN")
requires_pg = pytest.mark.skipif(not PG_DSN, reason="PG_DSN not set (needs Postgres with pgvector)")

_state: SimpleNamespace | None = None


def _build_container(layer, dataset_dir):
    """Same wiring as container.build_container (profile 'full'), but on the Postgres data layer."""
    from application.catalog_service import CatalogService
    from application.image_service import ColorHistogramEncoder
    from application.lexicon import Lexicon
    from application.order_service import OrderService
    from application.query_service import ConceptExpander, QueryService, RuleQueryParser
    from application.ranking_service import RankingConfig, RankingService
    from application.reranker import TokenCoverageReranker
    from application.search_orchestrator import SearchOrchestrator
    from application.search_service import DocumentBuilder, RetrievalConfig, SearchService
    from application.speech_service import SimulatedSpeechToText
    from application.text_encoder import HashingTextEncoder
    from container import Container, Settings
    from data.keyword_index import Bm25KeywordIndex

    products, orders, vocab_repo, text_index, image_index = layer
    vocabulary = vocab_repo.load()
    lexicon = Lexicon(vocabulary, products.categories(), products.brands())
    text_encoder, image_encoder = HashingTextEncoder(), ColorHistogramEncoder()
    docs = DocumentBuilder(products, vocabulary, enriched=True)
    search = SearchService(products, vocabulary, Bm25KeywordIndex(), text_index, image_index,
                           text_encoder, image_encoder, docs, RetrievalConfig(use_dense=True))
    search.build_index()
    ranking = RankingService(docs, TokenCoverageReranker(), RankingConfig(business=0.10, soft=0.20))
    queries = QueryService(RuleQueryParser(lexicon), ConceptExpander(products, lexicon), text_encoder, image_encoder)
    order_service = OrderService(orders, products)
    orchestrator = SearchOrchestrator(SimulatedSpeechToText(), queries, search, ranking, order_service, "C001")
    return Container(Settings(profile="full"), vocabulary, CatalogService(products), order_service, orchestrator,
                     search, ranking, queries, lexicon, dataset_dir)


def state() -> SimpleNamespace:
    """Create a temporary database, load the dataset, wire the Postgres layer. Built once per process."""
    global _state
    if _state is not None:
        return _state
    import psycopg
    from psycopg.conninfo import make_conninfo

    from data.postgres import build_postgres_data_layer
    from data.product_repository import DATASET_DIR
    from db.load import load

    name = f"ecom_test_{uuid.uuid4().hex[:10]}"
    admin = psycopg.connect(PG_DSN, autocommit=True)
    admin.execute(f'CREATE DATABASE "{name}"')
    dsn = make_conninfo(PG_DSN, dbname=name)
    counts = load(dsn, DATASET_DIR)
    layer = build_postgres_data_layer(dsn)

    def cleanup() -> None:
        layer.db.close()
        admin.execute(f'DROP DATABASE IF EXISTS "{name}" WITH (FORCE)')
        admin.close()

    atexit.register(cleanup)
    _state = SimpleNamespace(dsn=dsn, layer=layer, counts=counts, dataset_dir=DATASET_DIR,
                             container=_build_container(layer, DATASET_DIR))
    return _state
