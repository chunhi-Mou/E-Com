"use client";
import Link from "next/link";
import type { Order, OrderStatus } from "@/lib/types";
import { formatDate, formatTime, formatVND } from "@/lib/format";
import { Check, X } from "lucide-react";
import { ProductImage } from "./ProductImage";

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  SHIPPING: "Đang giao",
  DELIVERED: "Đã giao",
  CANCELLED: "Đã hủy",
};

const STATUS_STYLE: Record<OrderStatus, string> = {
  PENDING: "bg-hl-soft text-hl-ink ring-hl",
  CONFIRMED: "bg-ink-100 text-ink-800 ring-ink-200",
  SHIPPING: "bg-ink-100 text-ink-800 ring-ink-200",
  DELIVERED: "bg-ok-soft text-ok ring-ok/30",
  CANCELLED: "bg-seal-50 text-seal-700 ring-seal-200",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`inline-flex h-7 items-center rounded-full px-3 text-[13px] font-semibold ring-1 ${STATUS_STYLE[status]}`}>{STATUS_LABEL[status]}</span>;
}

const FLOW: OrderStatus[] = ["PENDING", "CONFIRMED", "SHIPPING", "DELIVERED"];

export function OrderTimeline({ order }: { order: Order }) {
  const hist = new Map((order.status_history ?? []).map((h) => [h.status, h.at]));
  const cancelled = order.status === "CANCELLED";
  const steps: OrderStatus[] = cancelled ? ["PENDING", "CANCELLED"] : FLOW;
  const reached = cancelled ? 1 : FLOW.indexOf(order.status);
  return (
    <ol className="relative" aria-label="Tiến trình đơn hàng">
      {steps.map((s, i) => {
        const done = cancelled ? true : i <= reached;
        const current = cancelled ? s === "CANCELLED" : i === reached;
        const at = hist.get(s) ?? (s === "PENDING" ? order.created_at : undefined);
        const bad = s === "CANCELLED";
        return (
          <li key={s} className="relative flex gap-3.5 pb-6 last:pb-0">
            {i < steps.length - 1 && (
              <span aria-hidden className={`absolute left-[13px] top-7 h-[calc(100%-28px)] w-0.5 ${done && (cancelled || i < reached) ? (bad ? "bg-seal-400" : "bg-ink-500") : "bg-line-strong"}`} />
            )}
            <span
              className={`relative z-10 grid size-7 shrink-0 place-items-center rounded-full ${
                bad ? "bg-seal-600 text-white" : done ? "bg-ink-600 text-white" : "border-2 border-line-strong bg-white text-faint"
              } ${current && !bad ? "ring-4 ring-ink-200" : ""}`}
            >
              {bad ? <X size={15} strokeWidth={3} /> : done ? <Check size={15} strokeWidth={3} /> : <span className="size-1.5 rounded-full bg-current" />}
            </span>
            <div className="-mt-0.5">
              <p className={`text-[15px] ${current ? "font-bold" : done ? "font-medium" : "text-muted"}`}>{STATUS_LABEL[s]}</p>
              <p className="num text-[13px] text-muted">{at ? `${formatTime(at)} · ${formatDate(at)}` : current ? "Trạng thái hiện tại" : done ? "Đã hoàn tất" : "Chưa tới bước này"}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

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
    <section className="rounded-lg border border-ink-300 bg-sheet p-4 md:p-5" aria-label="Đơn hàng tìm thấy">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[13px] text-muted">Mã đơn hàng</p>
          <p className="num text-[22px] font-bold tracking-wide">{order.order_code}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>
      <div className="mt-3 grid gap-5 md:grid-cols-2">
        <OrderItems order={order} />
        <div className="md:pl-4">
          <OrderTimeline order={order} />
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
        <p className="num text-[15px]">
          Tổng cộng <b className="text-[18px] text-seal-600">{formatVND(order.total)}</b>
        </p>
        <Link href={`/orders/${order.order_code}`} className="link-ink text-[14px] font-semibold">
          Xem chi tiết
        </Link>
      </div>
    </section>
  );
}
