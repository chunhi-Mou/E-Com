import { discountPct, formatVND } from "@/lib/format";

export function Price({ price, original, size = "md", hideBadge }: { price: number; original: number | null; size?: "sm" | "md" | "lg"; hideBadge?: boolean }) {
  const pct = discountPct(price, original);
  const cls = size === "lg" ? "text-[30px]" : size === "md" ? "text-[17px]" : "text-[15px]";
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <span className={`num font-bold leading-none tracking-[-0.02em] ${pct > 0 ? "text-sale-600" : "text-fg"} ${cls}`}>{formatVND(price)}</span>
      {pct > 0 && original && (
        <>
          <span className={`num text-faint line-through decoration-1 ${size === "lg" ? "text-[15px]" : "text-[12px]"}`}>{formatVND(original)}</span>
          {!hideBadge && <span className="num rounded-md bg-sale-50 px-1.5 py-1 text-[12px] font-bold leading-none text-sale-700">-{pct}%</span>}
        </>
      )}
    </div>
  );
}
