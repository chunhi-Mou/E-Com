"use client";
import { Minus, Plus } from "lucide-react";

export function QtyStepper({ value, onChange, max = 99, size = "md" }: { value: number; onChange: (n: number) => void; max?: number; size?: "sm" | "md" }) {
  const h = size === "sm" ? "h-8" : "h-10";
  const btn = `grid ${size === "sm" ? "w-8" : "w-10"} ${h} place-items-center text-ink-700 transition-colors hover:bg-ink-50 disabled:text-faint disabled:hover:bg-transparent`;
  return (
    <div className={`inline-flex ${h} items-center overflow-hidden rounded-lg border border-line-strong bg-white`} role="group" aria-label="Số lượng">
      <button type="button" className={btn} onClick={() => onChange(value - 1)} disabled={value <= 1} aria-label="Giảm">
        <Minus size={16} />
      </button>
      <input
        value={value}
        onChange={(e) => {
          const n = parseInt(e.target.value.replace(/\D/g, ""), 10);
          if (!Number.isNaN(n)) onChange(Math.max(1, Math.min(max, n)));
        }}
        inputMode="numeric"
        aria-label="Số lượng"
        className={`num ${h} w-10 border-x border-line bg-transparent text-center text-[14px] font-semibold`}
      />
      <button type="button" className={btn} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Tăng">
        <Plus size={16} />
      </button>
    </div>
  );
}
