from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from presentation.api.deps import get_container, get_serializer
from presentation.api.serializers import Serializer

router = APIRouter(prefix="/api/orders", tags=["orders"])


@router.get("/latest")
def latest_order(customer_id: str | None = None, c=Depends(get_container),
                 ser: Serializer = Depends(get_serializer)):
    detail = c.orders.latest(customer_id or c.settings.default_customer_id)
    if detail is None:
        raise HTTPException(404, "no order for this customer")
    return ser.order(detail)


@router.get("/{code}")
def get_order(code: str, c=Depends(get_container), ser: Serializer = Depends(get_serializer)):
    detail = c.orders.lookup(code)
    if detail is None:
        raise HTTPException(404, "order not found")
    return ser.order(detail)
