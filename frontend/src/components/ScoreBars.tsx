import type { Scores } from "@/lib/types";

const ROWS: { key: keyof Scores; label: string; color: string }[] = [
  { key: "text", label: "Văn bản", color: "bg-ink-500" },
  { key: "image", label: "Ảnh", color: "bg-ink-300" },
  { key: "business", label: "Kinh doanh", color: "bg-star" },
  { key: "soft", label: "Ưu tiên", color: "bg-ok" },
];

/** Per-item score breakdown shown when Inspect is on. */
export function ScoreBars({ scores, rank }: { scores: Scores; rank: number }) {
  return (
    <div className="border-t border-dashed border-line-strong bg-ink-50/70 px-3 py-2.5 text-[11px] text-muted" aria-label="Phân rã điểm xếp hạng">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="label-cond text-[12px] text-ink-700">Hạng {rank}</span>
        <span className="num text-[13px] font-bold text-fg">{scores.final.toFixed(3)}</span>
      </div>
      <div className="space-y-1">
        {ROWS.map((r) => (
          <div key={r.key} className="grid grid-cols-[62px_1fr_34px] items-center gap-1.5">
            <span>{r.label}</span>
            <span className="h-1.5 overflow-hidden rounded-full bg-ink-100">
              <span className={`block h-full rounded-full ${r.color}`} style={{ width: `${Math.round(scores[r.key] * 100)}%` }} />
            </span>
            <span className="num text-right text-fg">{scores[r.key].toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
