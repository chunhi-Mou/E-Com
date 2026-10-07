"""Product and category browsing for the presentation layer."""
from __future__ import annotations

from data.product_repository import ProductRepository
from domain.models import Category, Product

SORTS = ("relevance", "price_asc", "price_desc", "best_selling")


def sort_products(items: list[Product], sort: str) -> list[Product]:
    if sort == "price_asc":
        return sorted(items, key=lambda p: p.price)
    if sort == "price_desc":
        return sorted(items, key=lambda p: -p.price)
    if sort == "best_selling":
        return sorted(items, key=lambda p: -p.sold_count)
    return items


class CatalogService:
    def __init__(self, products: ProductRepository) -> None:
        self.products = products

    def get_product(self, product_id: str) -> Product | None:
        return self.products.get(product_id)

    def list_products(self, category: str | None, page: int, page_size: int, sort: str) -> tuple[list[Product], int]:
        if category and self.products.category(category) is None:
            return [], 0
        items, total = self.products.list_by_category(category, 1, 10**9)
        items = sort_products(items, sort)
        start = (max(page, 1) - 1) * page_size
        return items[start:start + page_size], total

    def categories(self) -> list[Category]:
        return self.products.categories()

    def category_path(self, slug: str) -> list[Category]:
        out, cur = [], self.products.category(slug)
        while cur:
            out.append(cur)
            cur = self.products.category(cur.parent) if cur.parent else None
        return list(reversed(out))
