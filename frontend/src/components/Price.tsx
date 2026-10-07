import { discountPct, formatVND } from "@/lib/format";

export function Price({ price, original, size = "md", hideBadge }: { price: number; original: number | null; size?: "sm" | "md" | "lg"; hideBadge?: boolean }) {
  const pct = discountPct(price, original);
  const cls = size === "lg" ? "text-[28px]" : size === "md" ? "text-[17px]" : "text-[14px]";
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <span className={`num font-bold leading-none tracking-tight text-seal-600 ${cls}`}>{formatVND(price)}</span>
      {pct > 0 && original && (
        <>
          <span className={`num text-muted line-through decoration-1 ${size === "lg" ? "text-[15px]" : "text-[12px]"}`}>{formatVND(original)}</span>
          {!hideBadge && <span className="label-cond rounded-[4px] bg-seal-100 px-1.5 py-0.5 text-[12px] leading-none text-seal-700">-{pct}%</span>}
        </>
      )}
    </div>
  );
}
