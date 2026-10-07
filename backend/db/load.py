"""Idempotent importer: backend/dataset/ -> PostgreSQL (+ embeddings from a passed-in encoder).

    python -m db.load --dsn postgresql://ecom:ecom@localhost:5432/ecom [--reset]

Re-running updates rows in place (upserts). Rows deleted from the dataset are only removed with --reset.
"""
from __future__ import annotations

import argparse
import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Any

from data.order_repository import JsonOrderRepository
from data.postgres import DEFAULT_IMAGE_MODEL, DEFAULT_TEXT_MODEL, PgVectorIndex
from data.postgres.connection import PgDatabase
from data.postgres.sql import TABLES
from data.product_repository import DATASET_DIR, JsonProductRepository
from data.vocabulary_repository import JsonVocabularyRepository
from domain.text_utils import strip_accents

log = logging.getLogger("db.load")
SCHEMA_FILE = Path(__file__).with_name("schema.sql")
DEFAULT_DSN = "postgresql://ecom:ecom@localhost:5432/ecom"

_DATA_TABLES = ["search_query", "order_item", '"order"', "product", "brand", "category",
                "attribute_value", "attribute"]  # TRUNCATE ... CASCADE also empties the embedding tables


def apply_schema(db: PgDatabase) -> None:
    db.execute(SCHEMA_FILE.read_text(encoding="utf-8"))
    db.refresh_types()  # pgvector adapters need the extension created above


def reset(db: PgDatabase) -> None:
    for table in TABLES.values():  # dropped, because a new encoder may have another dimension
        db.execute(f"DROP TABLE IF EXISTS {table}")
    db.execute(f"TRUNCATE {', '.join(_DATA_TABLES)} RESTART IDENTITY CASCADE")


def _load_vocabulary(db: PgDatabase, vocab: Any, products: list[Any]) -> dict[tuple[str, str], int]:
    """Upsert the controlled vocabulary; unknown codes used by products are added (with a warning)."""
    attr_ids: dict[str, int] = {}
    for pos, (code, attr) in enumerate(vocab.attributes.items()):
        attr_ids[code] = db.query(
            "INSERT INTO attribute (code, name, is_hard_filterable, position) VALUES (%s, %s, %s, %s) "
            "ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, "
            "is_hard_filterable = EXCLUDED.is_hard_filterable, position = EXCLUDED.position RETURNING id",
            [code, code, attr.is_hard_filterable, pos])[0][0]

    def upsert_value(attr_code: str, code: str, label: str, syn: tuple, also: tuple, pos: int) -> int:
        return db.query(
            "INSERT INTO attribute_value (attribute_id, code, label, synonyms, also_match, position) "
            "VALUES (%s, %s, %s, %s, %s, %s) ON CONFLICT (attribute_id, code) DO UPDATE SET "
            "label = EXCLUDED.label, synonyms = EXCLUDED.synonyms, also_match = EXCLUDED.also_match, "
            "position = EXCLUDED.position RETURNING id",
            [attr_ids[attr_code], code, label, list(syn), list(also), pos])[0][0]

    value_ids: dict[tuple[str, str], int] = {}
    for code, attr in vocab.attributes.items():
        for pos, v in enumerate(attr.values.values()):
            value_ids[(code, v.code)] = upsert_value(code, v.code, v.label, v.synonyms, v.also_match, pos)
    for p in products:
        for group in (p.attributes, p.tags):
            for code, values in group.items():
                if code not in attr_ids:
                    log.warning("attribute %r is not in the vocabulary; adding it (not hard-filterable)", code)
                    attr_ids[code] = db.query(
                        "INSERT INTO attribute (code, name, is_hard_filterable, position) VALUES (%s, %s, FALSE, %s) "
                        "ON CONFLICT (code) DO UPDATE SET name = attribute.name RETURNING id",
                        [code, code, len(attr_ids)])[0][0]
                for v in values:
                    if (code, v) not in value_ids:
                        log.warning("value %s/%s is not in the vocabulary; adding it", code, v)
                        value_ids[(code, v)] = upsert_value(code, v, v, (), (), 10_000)
    return value_ids


def _search_documents(products: JsonProductRepository, vocab: Any) -> dict[str, str]:
    from application.search_service import DocumentBuilder  # same text the in-memory indexes use

    builder = DocumentBuilder(products, vocab, enriched=True)
    return {p.id: builder.build(p) for p in products.all()}


def load(dsn: str, dataset_dir: Path | str = DATASET_DIR, *, text_encoder: Any = None, image_encoder: Any = None,
         text_model: str = DEFAULT_TEXT_MODEL, image_model: str = DEFAULT_IMAGE_MODEL,
         reset_data: bool = False, embeddings: bool = True) -> dict[str, int]:
    """Import everything and return row counts.

    text_encoder / image_encoder: objects with the application TextEncoder / ImageEncoder interface.
    Default to the offline encoders of application/ (imported here only, to keep the data layer clean).
    """
    dataset_dir = Path(dataset_dir)
    products_repo = JsonProductRepository(dataset_dir)
    vocab = JsonVocabularyRepository(dataset_dir).load()
    orders = JsonOrderRepository(dataset_dir)._orders
    products = products_repo.all()
    docs = _search_documents(products_repo, vocab)

    db = PgDatabase(dsn)
    try:
        apply_schema(db)
        if reset_data:
            reset(db)
        with db.transaction():
            value_ids = _load_vocabulary(db, vocab, products)

            cats = products_repo.categories()
            for i, c in enumerate(cats):
                db.execute(
                    "INSERT INTO category (slug, name, synonyms, path, ord) VALUES (%s, %s, %s, %s, %s) "
                    "ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, synonyms = EXCLUDED.synonyms, "
                    "path = EXCLUDED.path, ord = EXCLUDED.ord", [c.slug, c.name, list(c.synonyms), c.path, i])
            for c in cats:
                db.execute("UPDATE category SET parent_id = (SELECT id FROM category WHERE slug = %s) "
                           "WHERE slug = %s", [c.parent, c.slug])

            for name in sorted({p.brand for p in products if p.brand}):
                db.execute("INSERT INTO brand (name) VALUES (%s) ON CONFLICT (name) DO NOTHING", [name])

            for i, p in enumerate(products):
                db.execute(
                    "INSERT INTO product (id, ord, source, source_id, source_url, name, description, brand_id, "
                    "category_id, price, original_price, stock, rating_avg, rating_count, sold_count, "
                    "search_document, search_document_unaccent) VALUES "
                    "(%s, %s, %s, %s, %s, %s, %s, (SELECT id FROM brand WHERE name = %s), "
                    "(SELECT id FROM category WHERE slug = %s), %s, %s, %s, %s, %s, %s, %s, %s) "
                    "ON CONFLICT (id) DO UPDATE SET ord = EXCLUDED.ord, source = EXCLUDED.source, "
                    "source_id = EXCLUDED.source_id, source_url = EXCLUDED.source_url, name = EXCLUDED.name, "
                    "description = EXCLUDED.description, brand_id = EXCLUDED.brand_id, "
                    "category_id = EXCLUDED.category_id, price = EXCLUDED.price, "
                    "original_price = EXCLUDED.original_price, stock = EXCLUDED.stock, "
                    "rating_avg = EXCLUDED.rating_avg, rating_count = EXCLUDED.rating_count, "
                    "sold_count = EXCLUDED.sold_count, search_document = EXCLUDED.search_document, "
                    "search_document_unaccent = EXCLUDED.search_document_unaccent",
                    [p.id, i, p.source, p.source_id, p.source_url, p.name, p.description, p.brand, p.category,
                     p.price, p.original_price, p.stock, p.rating, p.rating_count, p.sold_count,
                     docs[p.id], strip_accents(docs[p.id]).lower()])
                # images: upsert by position so product_image ids (referenced by embeddings) stay stable
                for pos, url in enumerate(p.images):
                    db.execute("INSERT INTO product_image (product_id, url, position, is_primary) "
                               "VALUES (%s, %s, %s, %s) ON CONFLICT (product_id, position) DO UPDATE SET "
                               "url = EXCLUDED.url, is_primary = EXCLUDED.is_primary", [p.id, url, pos, pos == 0])
                db.execute("DELETE FROM product_image WHERE product_id = %s AND position >= %s",
                           [p.id, len(p.images)])
                # attributes and tags are replaced as a whole
                db.execute("DELETE FROM product_attribute WHERE product_id = %s", [p.id])
                rows, pos = [], 0
                for is_tag, group in ((False, p.attributes), (True, p.tags)):
                    for code, values in group.items():
                        for v in values:
                            rows.append((p.id, value_ids[(code, v)], is_tag, "manual" if is_tag else "scraped", 1.0, pos))
                            pos += 1
                db.executemany("INSERT INTO product_attribute (product_id, attribute_value_id, is_tag, source, "
                               "confidence, position) VALUES (%s, %s, %s, %s, %s, %s)", rows)

            for o in orders:
                oid = db.query(
                    'INSERT INTO "order" (order_code, customer_id, status, total, created_at, created_at_iso) '
                    "VALUES (%s, %s, %s, %s, %s, %s) ON CONFLICT (order_code) DO UPDATE SET "
                    "customer_id = EXCLUDED.customer_id, status = EXCLUDED.status, total = EXCLUDED.total, "
                    "created_at = EXCLUDED.created_at, created_at_iso = EXCLUDED.created_at_iso RETURNING id",
                    [o.order_code, o.customer_id, o.status, o.total, datetime.fromisoformat(o.created_at),
                     o.created_at])[0][0]
                db.execute("DELETE FROM order_item WHERE order_id = %s", [oid])
                db.executemany("INSERT INTO order_item (order_id, position, product_id, quantity, unit_price) "
                               "VALUES (%s, %s, %s, %s, %s)",
                               [(oid, n, i.product_id, i.quantity, i.unit_price) for n, i in enumerate(o.items)])

        counts = {"categories": len(cats), "products": len(products), "orders": len(orders),
                  "attributes": len(vocab.attributes)}
        if embeddings:
            counts.update(_load_embeddings(db, products_repo, products, docs, text_encoder, image_encoder,
                                           text_model, image_model))
        return counts
    finally:
        db.close()


def _load_embeddings(db: PgDatabase, repo: JsonProductRepository, products: list[Any], docs: dict[str, str],
                     text_encoder: Any, image_encoder: Any, text_model: str, image_model: str) -> dict[str, int]:
    if text_encoder is None or image_encoder is None:
        from application.image_service import ColorHistogramEncoder
        from application.text_encoder import HashingTextEncoder
        text_encoder = text_encoder or HashingTextEncoder()
        image_encoder = image_encoder or ColorHistogramEncoder()
    ids = [p.id for p in products]
    text_encoder.fit([docs[i] for i in ids])
    PgVectorIndex(db, "text", text_model).add(ids, text_encoder.encode([docs[i] for i in ids]))
    with_img = [p for p in products if p.images]
    if with_img:
        vecs = image_encoder.encode([repo.resolve_image(p.images[0]) for p in with_img])
        PgVectorIndex(db, "image", image_model).add([p.id for p in with_img], vecs)
    return {"text_embeddings": len(ids), "image_embeddings": len(with_img)}


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dsn", default=os.environ.get("PG_DSN", DEFAULT_DSN))
    ap.add_argument("--dataset-dir", default=str(DATASET_DIR))
    ap.add_argument("--reset", action="store_true", help="empty all tables first (also drops embedding tables)")
    ap.add_argument("--no-embeddings", action="store_true")
    ap.add_argument("--text-model", default=DEFAULT_TEXT_MODEL, help="model name stored with text embeddings")
    ap.add_argument("--image-model", default=DEFAULT_IMAGE_MODEL, help="model name stored with image embeddings")
    args = ap.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    counts = load(args.dsn, args.dataset_dir, text_model=args.text_model, image_model=args.image_model,
                  reset_data=args.reset, embeddings=not args.no_embeddings)
    print("loaded:", ", ".join(f"{k}={v}" for k, v in counts.items()))


if __name__ == "__main__":
    main()
