"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartLine, Product } from "@/lib/types";

type CartState = {
  lines: CartLine[];
  bump: number; // increments on every add, drives the badge animation
  add: (p: Product, qty?: number, variant?: string) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
};

export const lineKey = (id: string, variant?: string) => (variant ? `${id}::${variant}` : id);

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      bump: 0,
      add: (p, qty = 1, variant) =>
        set((s) => {
          const key = lineKey(p.id, variant);
          const found = s.lines.find((l) => l.key === key);
          const lines = found
            ? s.lines.map((l) => (l.key === key ? { ...l, quantity: Math.min(99, l.quantity + qty) } : l))
            : [
                ...s.lines,
                {
                  key, productId: p.id, name: p.name, image: p.images[0] ?? "", price: p.price,
                  originalPrice: p.original_price, quantity: qty, variant, category: p.category,
                },
              ];
          return { lines, bump: s.bump + 1 };
        }),
      setQty: (key, qty) =>
        set((s) => ({ lines: s.lines.map((l) => (l.key === key ? { ...l, quantity: Math.max(1, Math.min(99, qty)) } : l)) })),
      remove: (key) => set((s) => ({ lines: s.lines.filter((l) => l.key !== key) })),
      clear: () => set({ lines: [] }),
    }),
    { name: "sam-cart-v1", partialize: (s) => ({ lines: s.lines }) },
  ),
);

export const cartCount = (lines: CartLine[]) => lines.reduce((n, l) => n + l.quantity, 0);
export const cartSubtotal = (lines: CartLine[]) => lines.reduce((n, l) => n + l.price * l.quantity, 0);
export const SHIPPING_FREE_FROM = 500_000;
export const SHIPPING_FEE = 30_000;
export const shippingFor = (subtotal: number) => (subtotal === 0 || subtotal >= SHIPPING_FREE_FROM ? 0 : SHIPPING_FEE);
