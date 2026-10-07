"use client";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Trash2 } from "lucide-react";
import { cartCount, cartSubtotal, SHIPPING_FREE_FROM, useCart } from "@/store/cart";
import { formatVND } from "@/lib/format";
import { useHydrated } from "@/lib/hooks";
import { EmptyState } from "@/components/EmptyState";
import { QtyStepper } from "@/components/QtyStepper";
import { ProductImage } from "@/components/ProductImage";
import { OrderTotals } from "@/components/OrderTotals";


export default function CartPage() {
  const hydrated = useHydrated();
  const { lines, setQty, remove } = useCart();
  if (!hydrated) return <div className="shell py-8"><div className="skeleton h-64" /></div>;

  if (!lines.length) {
    return (
      <div className="shell py-10">
        <EmptyState
          title="Giỏ hàng đang trống"
          action={<Link href="/" className="inline-flex h-11 items-center rounded-lg bg-ink-600 px-5 text-[15px] font-semibold text-white hover:bg-ink-700">Tiếp tục mua sắm</Link>}
        >
          Thêm sản phẩm từ trang chủ hoặc kết quả tìm kiếm. Giỏ hàng được lưu trên trình duyệt này.
        </EmptyState>
      </div>
    );
  }

  const subtotal = cartSubtotal(lines);
  const toFree = Math.max(0, SHIPPING_FREE_FROM - subtotal);

  return (
    <div className="shell pb-8 pt-5">
      <h1 className="text-[24px] font-bold tracking-[-0.01em]">
        Giỏ hàng <span className="num text-[16px] font-medium text-muted">({cartCount(lines)} sản phẩm)</span>
      </h1>
      <div className="mt-4 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section aria-label="Sản phẩm trong giỏ" className="overflow-hidden rounded-lg border border-line bg-sheet">
          <ul className="divide-y divide-line">
            <AnimatePresence initial={false}>
              {lines.map((l) => (
                <motion.li
                  key={l.key}
                  layout
                  exit={{ opacity: 0, height: 0, transition: { duration: 0.2 } }}
                  className="flex gap-3.5 overflow-hidden p-3.5 md:p-4"
                >
                  <Link href={`/product/${l.productId}`} className="relative block size-[88px] shrink-0 overflow-hidden rounded-md border border-line md:size-[104px]">
                    <ProductImage src={l.image} alt={l.name} />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <Link href={`/product/${l.productId}`} className="clamp-2 text-[14.5px] leading-snug hover:text-ink-600">
                      {l.name}
                    </Link>
                    {l.variant && <p className="mt-0.5 text-[12.5px] text-muted">{l.variant}</p>}
                    <div className="mt-auto flex flex-wrap items-end justify-between gap-x-4 gap-y-2 pt-2">
                      <div>
                        <p className="num text-[16px] font-bold text-seal-600">{formatVND(l.price)}</p>
                        {l.originalPrice && l.originalPrice > l.price && <p className="num text-[12px] text-muted line-through">{formatVND(l.originalPrice)}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <QtyStepper size="sm" value={l.quantity} onChange={(n) => setQty(l.key, n)} />
                        <button type="button" onClick={() => remove(l.key)} aria-label={`Xóa ${l.name}`} className="grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-seal-50 hover:text-seal-700">
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </section>

        <aside className="rounded-lg border border-line bg-sheet p-4 md:p-5 lg:sticky lg:top-[calc(var(--header-h)+16px)]" aria-label="Tóm tắt đơn hàng">
          <h2 className="mb-3 text-[17px] font-bold">Tóm tắt</h2>
          <OrderTotals lines={lines} />
          {toFree > 0 ? (
            <div className="mt-4">
              <p className="num text-[13px] text-muted">
                Mua thêm <b className="text-fg">{formatVND(toFree)}</b> để được miễn phí vận chuyển
              </p>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-100">
                <motion.div className="h-full rounded-full bg-ink-500" initial={false} animate={{ width: `${Math.min(100, (subtotal / SHIPPING_FREE_FROM) * 100)}%` }} transition={{ type: "spring", stiffness: 200, damping: 30 }} />
              </div>
            </div>
          ) : (
            <p className="mt-4 text-[13px] font-medium text-ok">Đơn này được miễn phí vận chuyển.</p>
          )}
          <Link href="/checkout" className="mt-5 flex h-12 items-center justify-center gap-2 rounded-lg bg-seal-600 text-[15px] font-semibold text-white transition-[background-color,transform] hover:bg-seal-700 active:scale-[0.98]">
            Tiến hành đặt hàng <ArrowRight size={18} />
          </Link>
          <Link href="/" className="mt-2 block text-center text-[13.5px] link-ink">Tiếp tục mua sắm</Link>
        </aside>
      </div>
    </div>
  );
}
