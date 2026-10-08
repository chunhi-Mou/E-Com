"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Order } from "@/lib/types";
import { formatDate, formatTime, formatVND } from "@/lib/format";
import { reorder } from "@/lib/reorder";
import { cardLine, shippingInfo } from "@/lib/shipping";
import { ProductImage } from "../ProductImage";
import { STATUS_LABEL, StatusTile } from "./StatusMark";

const SHOWN = 2;

const primary = "inline-flex h-9 items-center rounded-lg bg-ink-600 px-4 text-[14px] font-semibold text-white hover:bg-ink-700 active:scale-[0.97]";
const secondary = "inline-flex h-9 items-center rounded-lg border border-line-strong bg-white px-4 text-[14px] font-semibold hover:bg-ink-50";

export function OrderCard({ order }: { order: Order }) {
  const router = useRouter();
  const shown = order.items.slice(0, SHOWN);
  const rest = order.items.length - shown.length;
  const href = `/orders/${order.order_code}`;
  const latest = order.status === "SHIPPING" ? shippingInfo(order).events[0] : undefined;
  const closed = order.status === "DELIVERED" || order.status === "CANCELLED";

  return (
    <div className="group overflow-hidden rounded-2xl border border-line bg-sheet transition-[transform,box-shadow,border-color] duration-300 ease-out hover:-translate-y-0.5 hover:border-ink-200 hover:shadow-lift">
      <div className="flex items-start gap-3 border-b border-line px-4 py-3.5">
        <StatusTile status={order.status} />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold leading-snug">{STATUS_LABEL[order.status]}</p>
          <p className="text-[13.5px] text-muted">{cardLine(order)}</p>
          {latest && <p className="mt-0.5 text-[13px] text-muted">{latest.text}, {formatTime(latest.at)} {formatDate(latest.at).slice(0, 5)}</p>}
        </div>
        <span className="num pt-0.5 text-[12.5px] text-faint">#{order.order_code}</span>
      </div>

      <Link href={href} className="block divide-y divide-line px-4 hover:bg-ink-50">
        {shown.map((it, i) => (
          <div key={i} className="flex items-center gap-3 py-3">
            <span className="relative block size-14 shrink-0 overflow-hidden rounded-md border border-line">
              <ProductImage src={it.product.images[0]} alt="" className="transition-transform duration-500 ease-out group-hover:scale-[1.06]" />
            </span>
            <p className="clamp-2 min-w-0 flex-1 text-[14px] leading-snug">{it.product.name}</p>
            <span className="num shrink-0 text-[13px] text-muted">×{it.quantity}</span>
          </div>
        ))}
        {rest > 0 && <p className="py-2.5 text-[13px] text-muted">và {rest} sản phẩm khác</p>}
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
        <p className="num text-[14px]">Tổng tiền <b className="ml-1 text-[17px]">{formatVND(order.total)}</b></p>
        <div className="flex gap-2">
          {closed ? (
            <>
              <Link href={href} className={secondary}>Xem chi tiết</Link>
              <button type="button" onClick={() => { reorder(order); router.push("/cart"); }} className={primary}>Mua lại</button>
            </>
          ) : (
            <Link href={href} className={order.status === "SHIPPING" ? primary : secondary}>
              {order.status === "SHIPPING" ? "Theo dõi đơn hàng" : "Xem chi tiết"}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
