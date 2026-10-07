"""ProductRepository on PostgreSQL. Hard filters and category subtrees are evaluated in SQL."""
from __future__ import annotations

import threading
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

from domain.models import Category, Product

from data.postgres.connection import PgDatabase
from data.postgres.sql import build_find_ids
from data.product_repository import DATASET_DIR, ProductRepository

_PRODUCT_SQL = (
    "SELECT p.id, p.name, c.slug, p.price, p.description, p.source, p.source_id, p.source_url, b.name, "
    "p.original_price, p.stock, p.rating_avg, p.rating_count, p.sold_count "
    "FROM product p JOIN category c ON c.id = p.category_id LEFT JOIN brand b ON b.id = p.brand_id"
)
_CATEGORY_SQL = ("SELECT c.slug, par.slug, c.name, c.synonyms, c.path "
                 "FROM category c LEFT JOIN category par ON par.id = c.parent_id")


@dataclass
class _Snapshot:
    products: dict[str, Product]
    categories: dict[str, Category]
    loaded_at: float


class PostgresProductRepository(ProductRepository):
    """cache_ttl: seconds the in-process entity cache is kept (0 = always query).

    SearchService calls get()/all() hundreds of times per search, so entities are cached;
    find_ids / list_by_category / subtree_slugs always go to SQL. Call invalidate() after reloading data.
    """

    def __init__(self, db: PgDatabase, dataset_dir: Path | str = DATASET_DIR, cache_ttl: float = 300.0) -> None:
        self.db = db
        self.dataset_dir = Path(dataset_dir)
        self.cache_ttl = cache_ttl
        self._snap: _Snapshot | None = None
        self._lock = threading.Lock()

    # -- cache -------------------------------------------------------------------
    def invalidate(self) -> None:
        self._snap = None

    def _snapshot(self) -> _Snapshot | None:
        if self.cache_ttl <= 0:
            return None
        snap = self._snap
        if snap is None or time.monotonic() - snap.loaded_at > self.cache_ttl:
            with self._lock:
                snap = self._snap
                if snap is None or time.monotonic() - snap.loaded_at > self.cache_ttl:
                    snap = _Snapshot({p.id: p for p in self._fetch_products(None)},
                                     {c.slug: c for c in self._fetch_categories()}, time.monotonic())
                    self._snap = snap
        return snap

    # -- row mapping -------------------------------------------------------------
    def _fetch_products(self, ids: list[str] | None) -> list[Product]:
        where, params = ("", []) if ids is None else (" WHERE p.id = ANY(%s)", [ids])
        rows = self.db.query(f"{_PRODUCT_SQL}{where} ORDER BY p.ord, p.id", params)
        products = {
            r[0]: Product(
                id=r[0], name=r[1], category=r[2], price=int(r[3]), description=r[4], source=r[5],
                source_id=r[6], source_url=r[7], brand=r[8],
                original_price=None if r[9] is None else int(r[9]), stock=int(r[10]),
                rating=float(r[11]), rating_count=int(r[12]), sold_count=int(r[13]))
            for r in rows
        }
        if not products:
            return []
        keys = list(products)
        attr_rows = self.db.query(
            "SELECT pa.product_id, att.code, av.code, pa.is_tag FROM product_attribute pa "
            "JOIN attribute_value av ON av.id = pa.attribute_value_id "
            "JOIN attribute att ON att.id = av.attribute_id "
            "WHERE pa.product_id = ANY(%s) ORDER BY pa.product_id, pa.position", [keys])
        for pid, code, value, is_tag in attr_rows:
            group = products[pid].tags if is_tag else products[pid].attributes
            group.setdefault(code, []).append(value)
        for pid, url in self.db.query(
                "SELECT product_id, url FROM product_image WHERE product_id = ANY(%s) "
                "ORDER BY product_id, position", [keys]):
            products[pid].images.append(url)
        return list(products.values())

    def _fetch_categories(self) -> list[Category]:
        return [Category(r[0], r[1], r[2], tuple(r[3] or ()), r[4])
                for r in self.db.query(f"{_CATEGORY_SQL} ORDER BY c.ord, c.id")]

    # -- ProductRepository -------------------------------------------------------
    def get(self, product_id: str) -> Product | None:
        snap = self._snapshot()
        if snap is not None:
            return snap.products.get(product_id)
        found = self._fetch_products([product_id])
        return found[0] if found else None

    def get_many(self, ids: Iterable[str]) -> list[Product]:
        ids = list(ids)
        snap = self._snapshot()
        by_id = snap.products if snap is not None else {p.id: p for p in self._fetch_products(list(set(ids)))}
        return [by_id[i] for i in ids if i in by_id]

    def all(self) -> list[Product]:
        snap = self._snapshot()
        return list(snap.products.values()) if snap is not None else self._fetch_products(None)

    def categories(self) -> list[Category]:
        snap = self._snapshot()
        return list(snap.categories.values()) if snap is not None else self._fetch_categories()

    def category(self, slug: str) -> Category | None:
        snap = self._snapshot()
        if snap is not None:
            return snap.categories.get(slug)
        rows = self.db.query(f"{_CATEGORY_SQL} WHERE c.slug = %s", [slug])
        return Category(rows[0][0], rows[0][1], rows[0][2], tuple(rows[0][3] or ()), rows[0][4]) if rows else None

    def subtree_slugs(self, slug: str) -> set[str]:
        rows = self.db.query(
            "SELECT c.slug FROM category c JOIN category r ON r.slug = %s "
            "AND (c.path = r.path OR c.path LIKE r.path || %s)", [slug, "/%"])
        return {slug} | {r[0] for r in rows}  # an unknown slug yields itself, like the JSON version

    def brands(self) -> list[str]:
        rows = self.db.query("SELECT DISTINCT b.name FROM brand b JOIN product p ON p.brand_id = b.id")
        return sorted(r[0] for r in rows)  # sorted in Python: same ordering as the JSON version

    def resolve_image(self, relative_path: str) -> Path:
        return self.dataset_dir / relative_path

    def list_by_category(self, slug: str | None, page: int = 1, page_size: int = 20) -> tuple[list[Product], int]:
        filters: dict[str, Any] = {"category": [slug]} if slug else {}
        base, params = build_find_ids(filters)
        total = int(self.db.query(f"SELECT count(*) FROM ({base}) t", params)[0][0])
        start = max(page - 1, 0) * page_size
        ids = [r[0] for r in self.db.query(f"{base} ORDER BY p.ord, p.id LIMIT %s OFFSET %s",
                                           [*params, max(page_size, 0), start])]
        return self.get_many(ids), total

    def find_ids(self, filters: dict[str, Any]) -> set[str]:
        sql, params = build_find_ids(filters)
        return {r[0] for r in self.db.query(sql, params)}
