import { useCart } from "@/store/cart";
import type { Order } from "./types";

export function reorder(order: Order) {
  const add = useCart.getState().add;
  for (const it of order.items) add(it.product, it.quantity);
}
