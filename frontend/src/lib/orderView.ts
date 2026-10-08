import type { Order, OrderStatus } from "./types";

export type OrderTab = "ALL" | "PENDING" | "SHIPPING" | "DELIVERED" | "CANCELLED";

export const TABS: { key: OrderTab; label: string; statuses: OrderStatus[] | null }[] = [
  { key: "PENDING", label: "Đang xử lý", statuses: ["PENDING", "CONFIRMED"] },
  { key: "SHIPPING", label: "Đang giao", statuses: ["SHIPPING"] },
  { key: "DELIVERED", label: "Đã giao", statuses: ["DELIVERED"] },
  { key: "CANCELLED", label: "Đã hủy", statuses: ["CANCELLED"] },
  // History, not a state: kept last so the tabs read in the order an order lives through them.
  { key: "ALL", label: "Tất cả", statuses: null },
];

export function matchesTab(o: Order, tab: OrderTab): boolean {
  const t = TABS.find((x) => x.key === tab)!;
  return t.statuses === null || t.statuses.includes(o.status);
}

/** Most shoppers open this page to follow an order in flight, so land on what is moving, else on everything. */
export function defaultTab(orders: Order[]): OrderTab {
  for (const t of ["SHIPPING", "PENDING"] as const) if (orders.some((o) => matchesTab(o, t))) return t;
  return "ALL";
}

/** Shopee-style rule: an order can be cancelled until it leaves the shop. */
export const canCancel = (o: Order) => o.status === "PENDING" || o.status === "CONFIRMED";

const FLOW: OrderStatus[] = ["PENDING", "CONFIRMED", "SHIPPING", "DELIVERED"];
// Backend orders carry no history; spread plausible timestamps after created_at (minutes).
const OFFSET_MIN: Record<OrderStatus, number> = { PENDING: 0, CONFIRMED: 30, SHIPPING: 24 * 60, DELIVERED: 72 * 60, CANCELLED: 120 };

export function withHistory(o: Order): Order {
  if (o.status_history?.length) return o;
  const steps: OrderStatus[] = o.status === "CANCELLED" ? ["PENDING", "CANCELLED"] : FLOW.slice(0, FLOW.indexOf(o.status) + 1);
  const t0 = new Date(o.created_at).getTime();
  return {
    ...o,
    status_history: steps.map((s) => ({ status: s, at: s === "PENDING" ? o.created_at : new Date(t0 + OFFSET_MIN[s] * 60000).toISOString() })),
  };
}

export function withCancellation(o: Order, cancelledAt?: string): Order {
  if (!cancelledAt) return o;
  return {
    ...o,
    status: "CANCELLED",
    status_history: [{ status: "PENDING", at: o.created_at }, { status: "CANCELLED", at: cancelledAt }],
  };
}
