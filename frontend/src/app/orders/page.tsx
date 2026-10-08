"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Search } from "lucide-react";
import { listOrders } from "@/lib/api";
import { customerIdFor } from "@/lib/customer";
import { useAsync } from "@/lib/hooks";
import { defaultTab, matchesTab, TABS, type OrderTab } from "@/lib/orderView";
import { useAuth } from "@/store/auth";
import { useOrders } from "@/store/orders";
import { EmptyState } from "@/components/EmptyState";
import { OrderCard } from "@/components/orders/OrderCard";
import { OrderTabs } from "@/components/orders/OrderTabs";

const EXPO = [0.16, 1, 0.3, 1] as const;

export default function OrdersPage() {
  const router = useRouter();
  const username = useAuth((s) => s.user?.username);
  const customerId = customerIdFor(username);
  // Refetch when the shopper places or cancels an order; poll so simulated statuses advance.
  const localSig = useOrders((s) => `${s.orders.length}:${Object.keys(s.cancelled).length}`);
  const { data: orders, error, loading, reload } = useAsync(() => listOrders(customerId), `${customerId}:${localSig}`);
  const [picked, setPicked] = useState<OrderTab | null>(null);
  const [lookup, setLookup] = useState(false);
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    const id = setInterval(reload, 30000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const go = (e: React.FormEvent) => {
    e.preventDefault();
    const c = code.replace(/\s/g, "");
    if (!/^\d{8}$/.test(c)) {
      setErr("Mã đơn hàng gồm đúng 8 chữ số, ví dụ 20261001.");
      return;
    }
    router.push(`/orders/${c}`);
  };

  // Choose the landing tab once, from the first load, so polling never moves the list under the shopper.
  if (picked === null && orders) setPicked(defaultTab(orders));
  const tab = picked ?? "ALL";
  const visible = (orders ?? []).filter((o) => matchesTab(o, tab));
  const label = TABS.find((t) => t.key === tab)!.label;

  return (
    <div className="shell pb-10 pt-6">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4">
          <h1 className="text-[24px] font-bold tracking-[-0.01em]">Đơn mua</h1>
          <button
            type="button"
            onClick={() => setLookup((v) => !v)}
            aria-expanded={lookup}
            aria-controls="lookup"
            className="link-ink inline-flex items-center gap-1.5 text-[14px]"
          >
            <Search size={14} aria-hidden /> Tra cứu theo mã đơn
          </button>
        </div>

        {lookup && (
          <form id="lookup" onSubmit={go} noValidate className="mt-3 flex gap-2">
            <div className="flex-1">
              <label htmlFor="code" className="sr-only">Mã đơn hàng</label>
              <input
                id="code"
                autoFocus
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.replace(/[^\d\s]/g, "").slice(0, 9));
                  setErr("");
                }}
                inputMode="numeric"
                placeholder="Mã đơn hàng, ví dụ 20261001"
                aria-invalid={!!err}
                aria-describedby={err ? "code-err" : undefined}
                className={`num h-10 w-full rounded-lg border bg-white px-3 text-[14.5px] placeholder:text-faint ${err ? "border-seal-500 ring-1 ring-seal-500" : "border-line-strong hover:border-ink-300"}`}
              />
              {err && <p id="code-err" role="alert" className="mt-1.5 text-[13px] font-medium text-seal-700">{err}</p>}
            </div>
            <button type="submit" className="h-10 rounded-lg bg-ink-600 px-4 text-[14px] font-semibold text-white hover:bg-ink-700 active:scale-[0.97]">
              Xem đơn
            </button>
          </form>
        )}

        <div className="mt-4">
          <OrderTabs value={tab} onChange={setPicked} />
        </div>

        <div role="tabpanel" id="orders-panel" aria-labelledby={`tab-${tab}`} className="mt-4">
          {!orders && loading ? (
            <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-44 rounded-2xl" />)}</div>
          ) : !orders && error ? (
            <EmptyState
              title="Chưa tải được danh sách đơn hàng"
              action={<button type="button" onClick={reload} className="h-10 rounded-lg border border-line-strong bg-white px-4 text-[14px] font-semibold hover:bg-ink-50">Thử lại</button>}
            >
              Máy chủ chưa phản hồi. Thử lại sau vài giây.
            </EmptyState>
          ) : visible.length === 0 ? (
            <EmptyState
              title={tab === "ALL" ? "Bạn chưa có đơn hàng nào" : `Không có đơn ở mục “${label}”`}
              action={<Link href="/" className="inline-flex h-10 items-center rounded-lg bg-ink-600 px-4 text-[14px] font-semibold text-white hover:bg-ink-700">Tiếp tục mua sắm</Link>}
            />
          ) : (
            <ul className="space-y-3">
              <AnimatePresence mode="popLayout">
                {visible.map((o, i) => (
                  <motion.li
                    key={o.order_code}
                    layout="position"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.15, ease: "easeIn" } }}
                    transition={{ duration: 0.42, ease: EXPO, delay: Math.min(i, 8) * 0.04, layout: { type: "spring", stiffness: 500, damping: 40 } }}
                  >
                    <OrderCard order={o} />
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
