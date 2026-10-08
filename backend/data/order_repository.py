"""Order repository."""
from __future__ import annotations

import json
from abc import ABC, abstractmethod
from pathlib import Path

from domain.models import Order, OrderItem

from data.product_repository import DATASET_DIR


class OrderRepository(ABC):
    @abstractmethod
    def find_by_code(self, order_code: str) -> Order | None: ...

    @abstractmethod
    def find_latest_by_customer(self, customer_id: str) -> Order | None: ...

    @abstractmethod
    def find_by_customer(self, customer_id: str, status: str | None = None) -> list[Order]: ...


class JsonOrderRepository(OrderRepository):
    def __init__(self, dataset_dir: Path | str = DATASET_DIR) -> None:
        raw = json.loads((Path(dataset_dir) / "orders.json").read_text(encoding="utf-8"))
        self._orders = [
            Order(o["order_code"], o["customer_id"], o["status"], o["created_at"], int(o["total"]),
                  [OrderItem(i["product_id"], int(i["quantity"]), int(i["unit_price"])) for i in o.get("items", [])])
            for o in raw
        ]

    def find_by_code(self, order_code: str) -> Order | None:
        return next((o for o in self._orders if o.order_code == order_code), None)

    def find_latest_by_customer(self, customer_id: str) -> Order | None:
        mine = [o for o in self._orders if o.customer_id == customer_id]
        return max(mine, key=lambda o: o.created_at) if mine else None

    def find_by_customer(self, customer_id: str, status: str | None = None) -> list[Order]:
        mine = [o for o in self._orders
                if o.customer_id == customer_id and (status is None or o.status == status)]
        return sorted(mine, key=lambda o: o.created_at, reverse=True)
