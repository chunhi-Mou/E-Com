import type { Order, OrderStatus } from "@/lib/types";
import { productById } from "./catalog";

function mk(code: string, status: OrderStatus, created: string, items: [string, number][], hist: [string, string][]): Order {
  const lines = items.map(([id, q]) => {
    const p = productById.get(id)!;
    return { product: p, quantity: q, unit_price: p.price };
  });
  return {
    order_code: code,
    customer_id: "C001",
    status,
    created_at: created,
    total: lines.reduce((s, l) => s + l.unit_price * l.quantity, 0),
    items: lines,
    status_history: hist.map(([s, at]) => ({ status: s, at })),
  };
}

export const mockOrders: Order[] = [
  mk("20261001", "SHIPPING", "2026-10-01T09:30:00+07:00", [["P000001", 1], ["P000012", 2]], [
    ["PENDING", "2026-10-01T09:30:00+07:00"], ["CONFIRMED", "2026-10-01T10:05:00+07:00"], ["SHIPPING", "2026-10-02T08:40:00+07:00"],
  ]),
  mk("20260928", "DELIVERED", "2026-09-28T19:12:00+07:00", [["P000030", 1]], [
    ["PENDING", "2026-09-28T19:12:00+07:00"], ["CONFIRMED", "2026-09-28T19:40:00+07:00"], ["SHIPPING", "2026-09-29T07:55:00+07:00"], ["DELIVERED", "2026-10-01T14:20:00+07:00"],
  ]),
  mk("20261005", "PENDING", "2026-10-05T21:03:00+07:00", [["P000045", 1], ["P000050", 1]], [["PENDING", "2026-10-05T21:03:00+07:00"]]),
  mk("20260920", "CANCELLED", "2026-09-20T11:00:00+07:00", [["P000070", 1]], [
    ["PENDING", "2026-09-20T11:00:00+07:00"], ["CANCELLED", "2026-09-20T13:15:00+07:00"],
  ]),
];
