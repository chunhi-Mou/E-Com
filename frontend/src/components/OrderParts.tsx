"use client";
import Link from "next/link";
import type { Order } from "@/lib/types";
import { formatVND } from "@/lib/format";
import { cardLine } from "@/lib/shipping";
import { ProductImage } from "./ProductImage";
import { STATUS_LABEL, StatusTile } from "./orders/StatusMark";

export function OrderItems({ order }: { order: Order }) {
  return (
    <ul className="divide-y divide-line">
      {order.items.map((it, i) => (
        <li key={i} className="flex items-center gap-3 py-3">
          <Link href={`/product/${it.product.id}`} className="relative block size-16 shrink-0 overflow-hidden rounded-md border border-line">
            <ProductImage src={it.product.images[0]} alt="" />
          </Link>
          <div className="min-w-0 flex-1">
            <Link href={`/product/${it.product.id}`} className="clamp-2 text-[14px] leading-snug hover:text-ink-600">
              {it.product.name}
            </Link>
            <p className="num mt-0.5 text-[13px] text-muted">
              {formatVND(it.unit_price)} × {it.quantity}
            </p>
          </div>
          <span className="num text-[14px] font-semibold">{formatVND(it.unit_price * it.quantity)}</span>
        </li>
      ))}
    </ul>
  );
}

/** Compact order card used inside search results when the query is an order lookup. */
export function OrderSummary({ order }: { order: Order }) {
  return (
    <section className="rounded-2xl border border-ink-300 bg-sheet p-4 md:p-5" aria-label="Đơn hàng tìm thấy">
      <div className="flex items-start gap-3">
        <StatusTile status={order.status} />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold leading-snug">{STATUS_LABEL[order.status]}</p>
          <p className="text-[13.5px] text-muted">{cardLine(order)}</p>
        </div>
        <span className="num pt-0.5 text-[12.5px] text-faint">#{order.order_code}</span>
      </div>
      <div className="mt-2">
        <OrderItems order={order} />
      </div>
      <div className="mt-2 flex items-center justify-between border-t border-line pt-3">
        <p className="num text-[15px]">
          Tổng tiền <b className="ml-1 text-[18px]">{formatVND(order.total)}</b>
        </p>
        <Link href={`/orders/${order.order_code}`} className="link-ink text-[14px] font-semibold">
          Xem chi tiết
        </Link>
      </div>
    </section>
  );
}
