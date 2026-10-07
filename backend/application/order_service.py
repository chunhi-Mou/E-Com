"""Order lookup (intents ORDER_LOOKUP and ORDER_LATEST)."""
from __future__ import annotations

from dataclasses import dataclass, field

from data.order_repository import OrderRepository
from data.product_repository import ProductRepository
from domain.models import Order, Product


@dataclass
class OrderDetail:
    order: Order
    products: dict[str, Product] = field(default_factory=dict)


class OrderService:
    def __init__(self, orders: OrderRepository, products: ProductRepository) -> None:
        self.orders, self.products = orders, products

    def _detail(self, order: Order | None) -> OrderDetail | None:
        if order is None:
            return None
        return OrderDetail(order, {p.id: p for p in self.products.get_many(i.product_id for i in order.items)})

    def lookup(self, order_code: str) -> OrderDetail | None:
        return self._detail(self.orders.find_by_code(order_code))

    def latest(self, customer_id: str) -> OrderDetail | None:
        return self._detail(self.orders.find_latest_by_customer(customer_id))
