"""Product and category repository. JSON implementation needs no DB."""
from __future__ import annotations

import json
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any, Iterable

from domain.models import Category, Product

DATASET_DIR = Path(__file__).resolve().parent.parent / "dataset"
ENRICHMENT_MIN_CONFIDENCE = 0.6


class ProductRepository(ABC):
    @abstractmethod
    def get(self, product_id: str) -> Product | None: ...

    @abstractmethod
    def get_many(self, ids: Iterable[str]) -> list[Product]: ...

    @abstractmethod
    def all(self) -> list[Product]: ...

    @abstractmethod
    def list_by_category(self, slug: str | None, page: int = 1, page_size: int = 20) -> tuple[list[Product], int]: ...

    @abstractmethod
    def find_ids(self, filters: dict[str, Any]) -> set[str]:
        """Apply hard filters at the data layer (WHERE equivalent); returns matching ids."""

    @abstractmethod
    def categories(self) -> list[Category]: ...

    @abstractmethod
    def category(self, slug: str) -> Category | None: ...

    @abstractmethod
    def subtree_slugs(self, slug: str) -> set[str]:
        """slug plus all descendant categories."""

    @abstractmethod
    def brands(self) -> list[str]: ...

    @abstractmethod
    def resolve_image(self, relative_path: str) -> Path:
        """Filesystem path of a product image."""


class JsonProductRepository(ProductRepository):
    def __init__(self, dataset_dir: Path | str = DATASET_DIR) -> None:
        d = Path(dataset_dir)
        self.dataset_dir = d
        raw_products = json.loads((d / "products.json").read_text(encoding="utf-8"))
        raw_cats = json.loads((d / "categories.json").read_text(encoding="utf-8"))
        self._products: dict[str, Product] = {}
        for p in raw_products:
            prod = Product(
                id=p["id"], name=p["name"], category=p["category"], price=int(p["price"]),
                description=p.get("description", ""), source=p.get("source", "seed"),
                source_id=p.get("source_id"), source_url=p.get("source_url"), brand=p.get("brand"),
                original_price=p.get("original_price"), stock=int(p.get("stock", 0)),
                rating=float(p.get("rating", 0)), rating_count=int(p.get("rating_count", 0)),
                sold_count=int(p.get("sold_count", 0)),
                attributes={k: list(v) for k, v in (p.get("attributes") or {}).items()},
                tags={k: list(v) for k, v in (p.get("tags") or {}).items()},
                images=list(p.get("images") or []),
            )
            self._products[prod.id] = prod
        self._merge_enrichment(d / "enrichment.json")
        parents = {c["slug"]: c.get("parent") for c in raw_cats}

        def path_of(slug: str) -> str:
            parts, cur = [], slug
            while cur:
                parts.append(cur)
                cur = parents.get(cur)
            return "/" + "/".join(reversed(parts))

        self._cats: dict[str, Category] = {
            c["slug"]: Category(c["slug"], c.get("parent"), c["name"], tuple(c.get("synonyms") or ()),
                                path_of(c["slug"]))
            for c in raw_cats
        }
        self._children: dict[str, list[str]] = {}
        for c in self._cats.values():
            if c.parent:
                self._children.setdefault(c.parent, []).append(c.slug)

    def _merge_enrichment(self, path: Path, min_confidence: float = ENRICHMENT_MIN_CONFIDENCE) -> None:
        """Add LLM-inferred tags from tools/enrich.py; tags already in products.json take precedence."""
        if not path.exists():
            return
        for pid, entry in json.loads(path.read_text(encoding="utf-8")).items():
            prod = self._products.get(pid)
            if prod is None:
                continue
            for code, values in (entry.get("tags") or {}).items():
                if prod.tags.get(code):
                    continue
                kept = [v["value"] for v in values if v.get("confidence", 0) >= min_confidence]
                if kept:
                    prod.tags[code] = list(dict.fromkeys(kept))

    def get(self, product_id: str) -> Product | None:
        return self._products.get(product_id)

    def get_many(self, ids: Iterable[str]) -> list[Product]:
        return [self._products[i] for i in ids if i in self._products]

    def all(self) -> list[Product]:
        return list(self._products.values())

    def categories(self) -> list[Category]:
        return list(self._cats.values())

    def category(self, slug: str) -> Category | None:
        return self._cats.get(slug)

    def subtree_slugs(self, slug: str) -> set[str]:
        out, stack = set(), [slug]
        while stack:
            cur = stack.pop()
            if cur in out:
                continue
            out.add(cur)
            stack.extend(self._children.get(cur, []))
        return out

    def brands(self) -> list[str]:
        return sorted({p.brand for p in self._products.values() if p.brand})

    def resolve_image(self, relative_path: str) -> Path:
        return self.dataset_dir / relative_path

    def list_by_category(self, slug: str | None, page: int = 1, page_size: int = 20) -> tuple[list[Product], int]:
        items = self.all()
        if slug:
            allowed = self.subtree_slugs(slug)
            items = [p for p in items if p.category in allowed]
        total = len(items)
        start = max(page - 1, 0) * page_size
        return items[start:start + page_size], total

    def find_ids(self, filters: dict[str, Any]) -> set[str]:
        cat_slugs: set[str] | None = None
        if filters.get("category"):
            cat_slugs = set()
            for slug in filters["category"]:
                cat_slugs |= self.subtree_slugs(slug)
        price_min, price_max = filters.get("price_min"), filters.get("price_max")
        brands = {b.lower() for b in filters.get("brand", [])} if filters.get("brand") else None
        attr_filters = {k: set(v) for k, v in filters.items()
                        if isinstance(v, (list, tuple, set)) and k not in ("category", "brand") and v}
        out: set[str] = set()
        for p in self._products.values():
            if cat_slugs is not None and p.category not in cat_slugs:
                continue
            if price_min is not None and p.price < price_min:
                continue
            if price_max is not None and p.price > price_max:
                continue
            if brands is not None and (p.brand or "").lower() not in brands:
                continue
            if any(not (p.values_of(code) & wanted) for code, wanted in attr_filters.items()):
                continue
            out.add(p.id)
        return out
