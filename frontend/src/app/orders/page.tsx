"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import { formatDate, formatVND } from "@/lib/format";
import { useHydrated } from "@/lib/hooks";
import { simulateStatus, useOrders } from "@/store/orders";
import { StatusBadge } from "@/components/OrderParts";

export default function OrdersPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const orders = useOrders((s) => s.orders);
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");

  const go = (e: React.FormEvent) => {
    e.preventDefault();
    const c = code.replace(/\s/g, "");
    if (!/^\d{8}$/.test(c)) {
      setErr("Mã đơn hàng gồm đúng 8 chữ số, ví dụ 20261001.");
      return;
    }
    router.push(`/orders/${c}`);
  };

  return (
    <div className="shell pb-10 pt-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-[24px] font-bold tracking-[-0.01em]">Tra cứu đơn hàng</h1>
        <p className="mt-1 text-[14.5px] text-muted">Nhập mã đơn hàng gồm 8 chữ số. Bạn cũng có thể gõ hoặc nói “đơn hàng 20261001” vào ô tìm kiếm.</p>

        <form onSubmit={go} noValidate className="mt-5 flex gap-2">
          <div className="flex-1">
            <label htmlFor="code" className="sr-only">Mã đơn hàng</label>
            <input
              id="code"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/[^\d\s]/g, "").slice(0, 9));
                setErr("");
              }}
              inputMode="numeric"
              placeholder="20261001"
              aria-invalid={!!err}
              aria-describedby={err ? "code-err" : undefined}
              className={`num h-12 w-full rounded-lg border bg-white px-4 text-[18px] tracking-widest placeholder:text-faint ${err ? "border-seal-500 ring-1 ring-seal-500" : "border-line-strong hover:border-ink-300"}`}
            />
            {err && <p id="code-err" role="alert" className="mt-1.5 text-[13px] font-medium text-seal-700">{err}</p>}
          </div>
          <button type="submit" className="flex h-12 items-center gap-2 rounded-lg bg-ink-600 px-5 text-[15px] font-semibold text-white hover:bg-ink-700 active:scale-[0.97]">
            <Search size={18} /> Tra cứu
          </button>
        </form>
        <p className="mt-2 text-[13px] text-muted">
          Mã mẫu để thử: {["20261001", "20260928", "20261005", "20260920"].map((c, i) => (
            <span key={c}>{i > 0 && ", "}<Link href={`/orders/${c}`} className="num link-ink">{c}</Link></span>
          ))}
        </p>

        {hydrated && orders.length > 0 && (
          <section className="mt-9" aria-labelledby="mine">
            <h2 id="mine" className="mb-3 text-[17px] font-bold">Đơn đã đặt trên thiết bị này</h2>
            <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-sheet">
              {orders.map((o) => {
                const s = simulateStatus(o);
                return (
                  <li key={o.order_code}>
                    <Link href={`/orders/${o.order_code}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-ink-50">
                      <div className="min-w-0 flex-1">
                        <p className="num text-[16px] font-bold tracking-wide">{o.order_code}</p>
                        <p className="num text-[13px] text-muted">{formatDate(o.created_at)} · {o.items.length} sản phẩm · {formatVND(o.total)}</p>
                      </div>
                      <StatusBadge status={s.status} />
                      <ArrowRight size={17} className="text-faint" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
