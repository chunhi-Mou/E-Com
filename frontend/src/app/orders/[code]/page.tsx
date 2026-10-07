"use client";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { getOrder, ApiError } from "@/lib/api";
import { formatDate, formatTime, formatVND } from "@/lib/format";
import { useAsync } from "@/lib/hooks";
import type { PlacedOrder } from "@/lib/types";
import { useOrders } from "@/store/orders";
import { EmptyState } from "@/components/EmptyState";
import { OrderItems, OrderTimeline, StatusBadge } from "@/components/OrderParts";
import { Stamp } from "@/components/Stamp";

export default function OrderPage() {
  return (
    <Suspense fallback={<div className="shell py-8"><div className="skeleton h-72" /></div>}>
      <OrderInner />
    </Suspense>
  );
}

function OrderInner() {
  const { code } = useParams<{ code: string }>();
  const placed = useSearchParams().get("placed") === "1";
  const local = useOrders((s) => s.orders.find((o) => o.order_code === code)) as PlacedOrder | undefined;
  // Poll lightly so the simulated status of a freshly placed order advances while the page is open
  const { data: order, error, loading, reload } = useAsync(() => getOrder(code), `${code}`);

  useEffect(() => {
    if (!local) return;
    const id = setInterval(reload, 15000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local]);

  if (!order && loading) return <div className="shell py-8"><div className="skeleton mx-auto h-72 max-w-3xl" /></div>;
  if (!order) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <div className="shell py-10">
        <EmptyState
          title={notFound ? `Không tìm thấy đơn hàng ${code}` : "Chưa tải được đơn hàng"}
          action={
            <>
              {!notFound && <button type="button" onClick={reload} className="h-10 rounded-lg border border-line-strong bg-white px-4 text-[14px] font-semibold hover:bg-ink-50">Thử lại</button>}
              <Link href="/orders" className="inline-flex h-10 items-center rounded-lg bg-ink-600 px-4 text-[14px] font-semibold text-white hover:bg-ink-700">Nhập mã khác</Link>
            </>
          }
        >
          {notFound ? "Kiểm tra lại mã gồm 8 chữ số. Đơn đặt trên thiết bị khác sẽ không hiện ở đây." : "Máy chủ chưa phản hồi. Thử lại sau vài giây."}
        </EmptyState>
      </div>
    );
  }

  const subtotal = order.items.reduce((n, i) => n + i.unit_price * i.quantity, 0);
  const shipping = local?.shipping_fee ?? Math.max(0, order.total - subtotal);

  return (
    <div className="shell pb-10 pt-5">
      <div className="mx-auto max-w-4xl">
        {placed && (
          <div className="relative mb-5 flex flex-col items-center gap-4 overflow-hidden rounded-lg border border-line bg-sheet px-5 py-7 text-center sm:flex-row sm:text-left">
            <Stamp lines={["ĐÃ ĐẶT", "HÀNG"]} arc="SẮM · ĐƠN HÀNG" foot={formatDate(order.created_at)} size={150} />
            <div>
              <h1 className="text-[22px] font-bold leading-snug">Cảm ơn bạn, đơn hàng đã được ghi nhận</h1>
              <p className="pretty mt-1 text-[14.5px] text-muted">
                Mã đơn hàng của bạn là <b className="num text-[18px] tracking-wider text-fg">{order.order_code}</b>. Hãy giữ mã này để tra cứu. Đây là đơn giả lập, trạng thái sẽ tự chuyển theo thời gian.
              </p>
            </div>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {!placed ? <h1 className="text-[24px] font-bold tracking-[-0.01em]">Đơn hàng <span className="num tracking-wide">{order.order_code}</span></h1> : <h2 className="text-[20px] font-bold">Chi tiết đơn hàng</h2>}
          <StatusBadge status={order.status} />
        </div>
        <p className="num mt-1 text-[13.5px] text-muted">Đặt lúc {formatTime(order.created_at)}, {formatDate(order.created_at)}</p>

        <div className="mt-5 grid items-start gap-5 md:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-5">
            <section className="rounded-lg border border-line bg-sheet px-4 py-1 md:px-5" aria-label="Sản phẩm">
              <OrderItems order={order} />
            </section>
            {local?.address && (
              <section className="rounded-lg border border-line bg-sheet p-4 md:p-5" aria-label="Địa chỉ nhận hàng">
                <h2 className="mb-2 text-[15px] font-bold">Giao đến</h2>
                <p className="text-[14.5px] font-medium">{local.address.fullName} <span className="num font-normal text-muted">· {local.address.phone}</span></p>
                <p className="text-[14px] text-muted">{local.address.street}, {local.address.ward}, {local.address.province}</p>
                {local.address.note && <p className="mt-1 text-[13px] text-muted">Ghi chú: {local.address.note}</p>}
                <p className="mt-2 text-[13px] text-muted">Thanh toán: {local.payment === "COD" ? "khi nhận hàng" : "thẻ (mô phỏng)"}</p>
              </section>
            )}
            <section className="rounded-lg border border-line bg-sheet p-4 md:p-5" aria-label="Thanh toán">
              <div className="space-y-2 text-[14px]">
                <div className="leader"><span className="text-muted">Tạm tính</span><span className="num">{formatVND(subtotal)}</span></div>
                <div className="leader"><span className="text-muted">Phí vận chuyển</span><span className="num">{shipping === 0 ? "Miễn phí" : formatVND(shipping)}</span></div>
                <div className="flex items-baseline justify-between border-t-2 border-double border-line-strong pt-3">
                  <span className="text-[15px] font-bold">Tổng cộng</span>
                  <span className="num text-[22px] font-bold leading-none text-seal-600">{formatVND(order.total)}</span>
                </div>
              </div>
            </section>
          </div>
          <section className="rounded-lg border border-line bg-sheet p-4 md:sticky md:top-[calc(var(--header-h)+16px)] md:p-5" aria-label="Trạng thái đơn hàng">
            <h2 className="mb-4 text-[15px] font-bold">Trạng thái</h2>
            <OrderTimeline order={order} />
          </section>
        </div>
        <div className="mt-6 flex gap-4 text-[14px]">
          <Link href="/orders" className="link-ink">Tra cứu đơn khác</Link>
          <Link href="/" className="link-ink">Tiếp tục mua sắm</Link>
        </div>
      </div>
    </div>
  );
}
