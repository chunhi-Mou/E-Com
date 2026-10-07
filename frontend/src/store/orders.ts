"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { OrderStatus, PlacedOrder } from "@/lib/types";

type OrdersState = {
  orders: PlacedOrder[];
  add: (o: PlacedOrder) => void;
};

export const useOrders = create<OrdersState>()(
  persist(
    (set) => ({
      orders: [],
      add: (o) => set((s) => ({ orders: [o, ...s.orders].slice(0, 20) })),
    }),
    { name: "sam-orders-v1" },
  ),
);

const STEPS: { status: OrderStatus; afterMin: number }[] = [
  { status: "PENDING", afterMin: 0 },
  { status: "CONFIRMED", afterMin: 1 },
  { status: "SHIPPING", afterMin: 4 },
  { status: "DELIVERED", afterMin: 12 },
];

/** Orders placed in the browser have no backend; their status advances with time so the timeline is demonstrable. */
export function simulateStatus(o: PlacedOrder, now = Date.now()): PlacedOrder {
  const t0 = new Date(o.created_at).getTime();
  const mins = (now - t0) / 60000;
  const reached = STEPS.filter((s) => mins >= s.afterMin);
  const history = reached.map((s) => ({ status: s.status, at: new Date(t0 + s.afterMin * 60000).toISOString() }));
  return { ...o, status: reached[reached.length - 1].status, status_history: history };
}
