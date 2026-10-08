"use client";
import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { useToasts } from "@/store/toast";
import { Section } from "@/components/Section";

type Voucher = { code: string; amount: string; unit?: string; title: string; note: string };

const VOUCHERS: Voucher[] = [
  { code: "SAM30", amount: "30K", title: "Giảm 30.000 ₫", note: "Đơn từ 299.000 ₫" },
  { code: "SAM100", amount: "100K", title: "Giảm 100.000 ₫", note: "Đơn từ 799.000 ₫" },
  { code: "FREESHIP", amount: "0₫", unit: "ship", title: "Miễn phí vận chuyển", note: "Đơn từ 199.000 ₫" },
  { code: "THOITRANG15", amount: "15%", title: "Giảm 15% thời trang", note: "Tối đa 80.000 ₫" },
];

function VoucherCard({ v }: { v: Voucher }) {
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(v.code);
    } catch {
      /* clipboard can be blocked; the code is on screen either way */
    }
    useToasts.getState().push({ text: `Đã sao chép mã ${v.code}` });
    setDone(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setDone(false), 2000);
  };

  return (
    <li className="relative flex w-[268px] shrink-0 snap-start overflow-hidden rounded-xl border border-sale-200 bg-sheet sm:w-auto sm:shrink">
      <div className="relative grid w-[88px] shrink-0 place-items-center bg-[linear-gradient(160deg,#F25A3E,#D93A24)] px-2 py-3 text-center text-white">
        <div>
          <p className="num text-[22px] font-extrabold leading-none tracking-[-0.02em]">{v.amount}</p>
          {v.unit && <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.06em] text-white/85">{v.unit}</p>}
        </div>
        {/* Ticket notches */}
        <span aria-hidden className="absolute -right-1.5 top-[-6px] size-3 rounded-full border border-sale-200 bg-paper" />
        <span aria-hidden className="absolute -right-1.5 bottom-[-6px] size-3 rounded-full border border-sale-200 bg-paper" />
      </div>
      <div className="flex min-w-0 flex-1 items-center justify-between gap-2 border-l border-dashed border-sale-200 py-2.5 pl-3 pr-2.5">
        <div className="min-w-0">
          <p className="text-[13.5px] font-bold leading-tight">{v.title}</p>
          <p className="mt-0.5 text-[12px] leading-snug text-muted">{v.note}</p>
          <p className="num mt-1 inline-block rounded bg-sale-50 px-1.5 py-0.5 text-[11.5px] font-bold tracking-[0.04em] text-sale-700">{v.code}</p>
        </div>
        <button
          type="button"
          onClick={copy}
          aria-label={`Sao chép mã ${v.code}`}
          className={`inline-flex h-8 shrink-0 items-center gap-1 rounded-lg px-2.5 text-[12.5px] font-bold transition-[background-color,color,transform] duration-200 active:scale-95 ${
            done ? "bg-ok-soft text-ok" : "bg-sale-600 text-white hover:bg-sale-700"
          }`}
        >
          {done ? <Check size={14} strokeWidth={2.5} /> : <Copy size={14} />}
          <span className="lg:max-xl:sr-only">{done ? "Đã chép" : "Chép mã"}</span>
        </button>
      </div>
    </li>
  );
}

export function Vouchers() {
  return (
    <Section id="voucher" title="Mã giảm giá" tight>
      <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 no-scrollbar sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
        {VOUCHERS.map((v) => (
          <VoucherCard key={v.code} v={v} />
        ))}
      </ul>
    </Section>
  );
}
