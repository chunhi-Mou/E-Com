"use client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { getOrder, ApiError } from "@/lib/api";
import { formatDate, formatTime, formatVND } from "@/lib/format";
import { sampleAddressFor } from "@/lib/customer";
import { useAsync } from "@/lib/hooks";
import { canCancel } from "@/lib/orderView";
import { reorder } from "@/lib/reorder";
import type { PlacedOrder } from "@/lib/types";
import { useOrders } from "@/store/orders";
import { EmptyState } from "@/components/EmptyState";
import { OrderItems } from "@/components/OrderParts";
import { ConfirmMark } from "@/components/ConfirmMark";
import { OrderHero } from "@/components/orders/OrderHero";
import { ShippingCard } from "@/components/orders/ShippingCard";

export default function OrderPage() {
  return (
    <Suspense fallback={<div className="shell py-8"><div className="skeleton h-72" /></div>}>
      <OrderInner />
    </Suspense>
  );
}

function OrderInner() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState("");
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

  const cancel = async () => {
    setConfirming(false);
    const fresh = await getOrder(code);
    if (!canCancel(fresh)) {
      setNotice("Đơn đã chuyển sang bước giao hàng nên không thể hủy nữa.");
      reload();
      return;
    }
    useOrders.getState().cancel(code);
    setNotice("");
    reload();
  };

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
              <Link href="/orders" className="inline-flex h-10 items-center rounded-lg bg-ink-600 px-4 text-[14px] font-semibold text-white hover:bg-ink-700">Về danh sách đơn</Link>
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
  const address = local?.address ?? sampleAddressFor(order.customer_id);
  const payment = local?.payment ?? "COD";

  const btn = "h-10 rounded-lg px-4 text-[14px] font-semibold active:scale-[0.97]";

  return (
    <div className="shell pb-10 pt-5">
      <div className="mx-auto max-w-5xl">
        {placed && (
          <div className="relative mb-5 flex flex-col items-center gap-5 overflow-hidden rounded-2xl border border-line bg-sheet px-6 py-8 text-center sm:flex-row sm:text-left">
            <ConfirmMark size={76} />
            <div>
              <h1 className="text-[22px] font-bold leading-snug">Cảm ơn bạn, đơn hàng đã được ghi nhận</h1>
              <p className="pretty mt-1 text-[14.5px] text-muted">
                Mã đơn hàng của bạn là <b className="num text-[18px] tracking-wider text-fg">{order.order_code}</b>. Hãy giữ mã này để tra cứu. Đây là đơn giả lập, trạng thái sẽ tự chuyển theo thời gian.
              </p>
            </div>
          </div>
        )}

        <Link href="/orders" className="link-ink inline-flex items-center gap-1 text-[14px]">
          <ArrowLeft size={15} aria-hidden /> Đơn mua
        </Link>
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-4">
          {placed ? (
            <h2 className="text-[20px] font-bold">Chi tiết đơn hàng</h2>
          ) : (
            <h1 className="text-[20px] font-bold">Đơn hàng <span className="num tracking-wide">#{order.order_code}</span></h1>
          )}
          <p className="num text-[13.5px] text-muted">Đặt lúc {formatTime(order.created_at)}, {formatDate(order.created_at)}</p>
        </div>

        <div className="mt-4">
          <OrderHero order={order}>
            {canCancel(order) && !confirming && (
              <button type="button" onClick={() => setConfirming(true)} className={`${btn} border border-line-strong bg-white hover:bg-ink-50`}>Hủy đơn</button>
            )}
            {confirming && (
              <div role="alertdialog" aria-label="Xác nhận hủy đơn" className="flex flex-wrap items-center gap-2 rounded-lg bg-paper px-3 py-2">
                <span className="text-[14px] font-medium">Hủy đơn này? Không thể hoàn tác.</span>
                <button type="button" onClick={() => setConfirming(false)} className="h-9 rounded-lg border border-line-strong bg-white px-3 text-[14px] font-semibold hover:bg-ink-50">Giữ đơn</button>
                <button type="button" onClick={cancel} className="h-9 rounded-lg bg-fg px-3 text-[14px] font-semibold text-white hover:bg-ink-900">Hủy đơn</button>
              </div>
            )}
            {(order.status === "DELIVERED" || order.status === "CANCELLED") && (
              <button type="button" onClick={() => { reorder(order); router.push("/cart"); }} className={`${btn} bg-ink-600 text-white hover:bg-ink-700`}>Mua lại</button>
            )}
            {notice ? <p role="status" className="text-[13.5px] font-medium text-muted">{notice}</p> : null}
          </OrderHero>
        </div>

        <div className="mt-5 grid items-start gap-5 md:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-5">
            <ShippingCard order={order} />
            <section className="rounded-2xl border border-line bg-sheet px-5 py-1" aria-label="Sản phẩm">
              <OrderItems order={order} />
            </section>
          </div>
          <div className="space-y-5 md:sticky md:top-[calc(var(--header-h)+16px)]">
            {address && (
              <section className="rounded-2xl border border-line bg-sheet p-5" aria-label="Địa chỉ nhận hàng">
                <h2 className="mb-2 text-[16px] font-bold">Giao đến</h2>
                <p className="text-[14.5px] font-medium">{address.fullName} <span className="num font-normal text-muted">· {address.phone}</span></p>
                <p className="text-[14px] text-muted">{address.street}, {address.ward}, {address.province}</p>
                {address.note && <p className="mt-1 text-[13px] text-muted">Ghi chú: {address.note}</p>}
              </section>
            )}
            <section className="rounded-2xl border border-line bg-sheet p-5" aria-label="Thanh toán">
              <h2 className="mb-3 text-[16px] font-bold">Thanh toán</h2>
              <div className="space-y-2 text-[14px]">
                <div className="leader"><span className="text-muted">Tạm tính</span><span className="num">{formatVND(subtotal)}</span></div>
                <div className="leader"><span className="text-muted">Phí vận chuyển</span><span className="num">{shipping === 0 ? "Miễn phí" : formatVND(shipping)}</span></div>
                <div className="flex items-baseline justify-between border-t border-line pt-3">
                  <span className="text-[15px] font-bold">Tổng tiền</span>
                  <span className="num text-[22px] font-bold leading-none">{formatVND(order.total)}</span>
                </div>
              </div>
              <p className="mt-3 text-[13px] text-muted">{payment === "COD" ? "Thanh toán khi nhận hàng" : "Thẻ (mô phỏng)"}</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
