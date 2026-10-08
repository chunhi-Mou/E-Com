"""OrderRepository on PostgreSQL."""
from __future__ import annotations

from domain.models import Order, OrderItem

from data.order_repository import OrderRepository
from data.postgres.connection import PgDatabase

_ORDER_SQL = 'SELECT id, order_code, customer_id, status, created_at_iso, total FROM "order"'


class PostgresOrderRepository(OrderRepository):
    def __init__(self, db: PgDatabase) -> None:
        self.db = db

    def _build(self, row: tuple) -> Order:
        items = self.db.query("SELECT product_id, quantity, unit_price FROM order_item "
                              "WHERE order_id = %s ORDER BY position", [row[0]])
        return Order(row[1], row[2], row[3], row[4], int(row[5]),
                     [OrderItem(i[0], int(i[1]), int(i[2])) for i in items])

    def find_by_code(self, order_code: str) -> Order | None:
        rows = self.db.query(f"{_ORDER_SQL} WHERE order_code = %s", [order_code])
        return self._build(rows[0]) if rows else None

    def find_latest_by_customer(self, customer_id: str) -> Order | None:
        rows = self.db.query(f"{_ORDER_SQL} WHERE customer_id = %s ORDER BY created_at DESC, id DESC LIMIT 1",
                             [customer_id])
        return self._build(rows[0]) if rows else None

    def find_by_customer(self, customer_id: str, status: str | None = None) -> list[Order]:
        sql, params = f"{_ORDER_SQL} WHERE customer_id = %s", [customer_id]
        if status is not None:
            sql, params = sql + " AND status = %s", params + [status]
        return [self._build(r) for r in self.db.query(sql + " ORDER BY created_at DESC, id DESC", params)]
