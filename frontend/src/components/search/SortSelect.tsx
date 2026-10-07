"use client";
import { ChevronDown } from "lucide-react";
import type { SortKey } from "@/lib/types";

const OPTIONS: { v: SortKey; label: string }[] = [
  { v: "relevance", label: "Phù hợp nhất" },
  { v: "best_selling", label: "Bán chạy" },
  { v: "price_asc", label: "Giá thấp đến cao" },
  { v: "price_desc", label: "Giá cao đến thấp" },
];

export function SortSelect({ value, onChange }: { value: SortKey; onChange: (v: SortKey) => void }) {
  return (
    <label className="relative inline-flex items-center text-[14px]">
      <span className="sr-only">Sắp xếp</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortKey)}
        className="h-10 appearance-none rounded-lg border border-line-strong bg-white pl-3 pr-9 font-medium text-fg hover:border-ink-300"
      >
        {OPTIONS.map((o) => (
          <option key={o.v} value={o.v}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown size={16} className="pointer-events-none absolute right-3 text-muted" />
    </label>
  );
}
