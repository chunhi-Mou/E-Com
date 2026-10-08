"use client";
import { useRef } from "react";
import { motion } from "motion/react";
import { TABS, type OrderTab } from "@/lib/orderView";

export function OrderTabs({ value, onChange }: { value: OrderTab; onChange: (t: OrderTab) => void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const n = (i + d + TABS.length) % TABS.length;
    onChange(TABS[n].key);
    refs.current[n]?.focus();
  };
  return (
    <div role="tablist" aria-label="Lọc đơn hàng theo trạng thái" className="-mx-4 flex overflow-x-auto border-b border-line px-4 md:mx-0 md:px-0">
      {TABS.map((t, i) => {
        const on = t.key === value;
        return (
          <button
            key={t.key}
            ref={(el) => { refs.current[i] = el; }}
            role="tab"
            id={`tab-${t.key}`}
            aria-selected={on}
            aria-controls="orders-panel"
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(t.key)}
            onKeyDown={(e) => onKey(e, i)}
            className={`relative -mb-px flex h-11 shrink-0 items-center border-b-2 border-transparent px-4 text-[14.5px] font-semibold transition-colors duration-200 ${on ? "text-ink-700" : "text-muted hover:text-fg"}`}
          >
            {t.label}
            {on && (
              <motion.span
                layoutId="order-tab-underline"
                aria-hidden
                className="absolute inset-x-0 -bottom-0.5 h-0.5 bg-ink-600"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
