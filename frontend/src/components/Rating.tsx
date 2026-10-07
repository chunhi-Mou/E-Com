import { Star } from "lucide-react";
import { formatCompact, formatRating } from "@/lib/format";

export function Rating({ rating, count, sold, size = 12 }: { rating: number; count?: number; sold?: number; size?: number }) {
  return (
    <div className="flex items-center gap-1.5 text-[12px] text-muted">
      <span className="inline-flex items-center gap-0.5 font-medium text-fg">
        <Star size={size} className="fill-star text-star" aria-hidden />
        <span className="num">{formatRating(rating)}</span>
      </span>
      {count !== undefined && <span className="num">({formatCompact(count)})</span>}
      {sold !== undefined && (
        <>
          <span aria-hidden className="h-3 w-px bg-line-strong" />
          <span className="num">Đã bán {formatCompact(sold)}</span>
        </>
      )}
    </div>
  );
}
