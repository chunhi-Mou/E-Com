import type { Order, OrderStatus } from "./types";

export type ShipEvent = { at: string; text: string };
export type Carrier = { name: string; prefix: string };
export type Shipping = { carrier: Carrier; trackingCode: string; events: ShipEvent[] };

// Orders carry no carrier data, so carrier, tracking code, events and delivery window are
// simulated here, derived from the order code and its status history so they stay stable.
const CARRIERS: Carrier[] = [
  { name: "Giao Hàng Nhanh", prefix: "GHN" },
  { name: "Viettel Post", prefix: "VTP" },
  { name: "J&T Express", prefix: "JT" },
  { name: "SPX Express", prefix: "SPX" },
];

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const ms = (iso: string) => Date.parse(iso);
const num = (code: string) => Number(code.replace(/\D/g, "")) || 0;
const dm = (t: number) => {
  const d = new Date(t);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const when = (o: Order, s: OrderStatus) => o.status_history?.find((h) => h.status === s)?.at;

/** Newest first, only events that have happened by `now`. Expects `status_history` (see `withHistory`). */
export function shippingInfo(o: Order, now = Date.now()): Shipping {
  const carrier = CARRIERS[num(o.order_code) % CARRIERS.length];
  const events: ShipEvent[] = [];
  const push = (at: string | undefined, text: string) => {
    if (at && ms(at) <= now) events.push({ at, text });
  };
  const delivered = when(o, "DELIVERED");
  const shipped = when(o, "SHIPPING");

  push(o.created_at, "Đặt hàng thành công");
  push(when(o, "CONFIRMED"), "Cửa hàng đã xác nhận, đang đóng gói");
  if (shipped) {
    push(shipped, `Đã bàn giao cho ${carrier.name}`);
    const end = delivered ? ms(delivered) : Infinity;
    for (const [h, text] of [[8, "Đã đến kho phân loại"], [20, "Đang trên đường giao đến bạn"]] as const) {
      const at = new Date(ms(shipped) + h * HOUR).toISOString();
      if (ms(at) < end) push(at, text);
    }
  }
  push(delivered, "Giao hàng thành công");
  push(when(o, "CANCELLED"), "Đơn hàng đã được hủy");

  return {
    carrier,
    trackingCode: `${carrier.prefix}${String((num(o.order_code) * 7919) % 1_000_000_000).padStart(9, "0")}VN`,
    events: events.sort((a, b) => ms(b.at) - ms(a.at)),
  };
}

/** Delivery window like "09/10 – 10/10" for orders still on their way, otherwise null. */
export function etaWindow(o: Order, now = Date.now()): string | null {
  if (o.status === "SHIPPING") {
    const base = Math.max(now, ms(when(o, "SHIPPING") ?? o.created_at));
    return `${dm(base + DAY)} – ${dm(base + 2 * DAY)}`;
  }
  if (o.status === "PENDING" || o.status === "CONFIRMED") {
    const base = Math.max(now, ms(o.created_at));
    return `${dm(base + 3 * DAY)} – ${dm(base + 4 * DAY)}`;
  }
  return null;
}

/** The one line a shopper wants first: when it arrives, when it arrived, or when it was cancelled. */
export function promiseLine(o: Order, now = Date.now()): string {
  if (o.status === "DELIVERED") {
    const at = when(o, "DELIVERED");
    return at ? `Đã giao ngày ${dm(ms(at))}` : "Đã giao";
  }
  if (o.status === "CANCELLED") {
    const at = when(o, "CANCELLED");
    return at ? `Đã hủy ngày ${dm(ms(at))}` : "Đã hủy";
  }
  return `Dự kiến giao ${etaWindow(o, now)}`;
}

/** Second line of a list card: the status is already named above it, so closed orders only add the date. */
export function cardLine(o: Order, now = Date.now()): string {
  if (o.status === "DELIVERED" || o.status === "CANCELLED") {
    const at = when(o, o.status);
    return at ? `${o.status === "DELIVERED" ? "Giao" : "Hủy"} ngày ${dm(ms(at))}` : "";
  }
  return promiseLine(o, now);
}
