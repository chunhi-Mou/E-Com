"""Domain objects -> JSON shapes of the HTTP API."""
from __future__ import annotations

from typing import Any

from application.catalog_service import CatalogService
from application.order_service import OrderDetail
from application.search_orchestrator import SearchResponse
from domain.models import Category, Product, QueryRepresentation, SearchResult


class Serializer:
    def __init__(self, catalog: CatalogService, base_url: str) -> None:
        self.catalog, self.base_url = catalog, base_url.rstrip("/")

    def product(self, p: Product) -> dict[str, Any]:
        return {
            "id": p.id, "name": p.name, "description": p.description, "brand": p.brand, "category": p.category,
            "category_path": [{"slug": c.slug, "name": c.name} for c in self.catalog.category_path(p.category)],
            "price": p.price, "original_price": p.original_price, "stock": p.stock, "rating": p.rating,
            "rating_count": p.rating_count, "sold_count": p.sold_count,
            "attributes": p.attributes, "tags": p.tags,
            "images": [f"{self.base_url}/static/{i}" for i in p.images],
        }

    @staticmethod
    def category(c: Category) -> dict[str, Any]:
        return {"slug": c.slug, "parent": c.parent, "name": c.name}

    @staticmethod
    def representation(rep: QueryRepresentation) -> dict[str, Any]:
        return rep.to_dict()

    def result(self, r: SearchResult) -> dict[str, Any]:
        return {"product": self.product(r.product), "rank": r.rank, "scores": r.scores}

    def order(self, d: OrderDetail | None) -> dict[str, Any] | None:
        if d is None:
            return None
        o = d.order
        return {
            "order_code": o.order_code, "customer_id": o.customer_id, "status": o.status,
            "created_at": o.created_at, "total": o.total,
            "items": [{"product": self.product(d.products[i.product_id]), "quantity": i.quantity,
                       "unit_price": i.unit_price} for i in o.items if i.product_id in d.products],
        }

    def search_response(self, resp: SearchResponse) -> dict[str, Any]:
        return {
            "representation": self.representation(resp.representation),
            "results": [self.result(r) for r in resp.results],
            "total": resp.total,
            "relaxed_filters": resp.relaxed_filters,
            "order": self.order(resp.order),
            "latency_ms": resp.latency_ms,
        }
