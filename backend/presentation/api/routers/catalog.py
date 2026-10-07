from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query

from application.catalog_service import SORTS
from presentation.api.deps import get_container, get_serializer
from presentation.api.serializers import Serializer

router = APIRouter(prefix="/api", tags=["catalog"])


@router.get("/products")
def list_products(category: str | None = None, page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100),
                  sort: str = "relevance", c=Depends(get_container), ser: Serializer = Depends(get_serializer)):
    if sort not in SORTS:
        raise HTTPException(422, f"sort must be one of {list(SORTS)}")
    items, total = c.catalog.list_products(category, page, page_size, sort)
    return {"items": [ser.product(p) for p in items], "total": total}


@router.get("/products/{product_id}")
def get_product(product_id: str, c=Depends(get_container), ser: Serializer = Depends(get_serializer)):
    p = c.catalog.get_product(product_id)
    if p is None:
        raise HTTPException(404, "product not found")
    return ser.product(p)


@router.get("/categories")
def categories(c=Depends(get_container), ser: Serializer = Depends(get_serializer)):
    return [ser.category(x) for x in c.catalog.categories()]
