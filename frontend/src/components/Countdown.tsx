"use client";
import { useEffect, useState } from "react";

/** Time left until local midnight. Rendered after mount to avoid hydration mismatch. */
export function Countdown({ onSale }: { onSale?: boolean }) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const end = new Date(now);
      end.setHours(24, 0, 0, 0);
      setLeft(Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000)));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  const p = (n: number) => String(n).padStart(2, "0");
  const parts = left === null ? ["--", "--", "--"] : [p(Math.floor(left / 3600)), p(Math.floor((left % 3600) / 60)), p(left % 60)];
  return (
    <span className={`inline-flex items-center gap-2 text-[13px] ${onSale ? "text-white/90" : "text-muted"}`} aria-label="Thời gian còn lại trong ngày">
      Kết thúc sau
      <span className="inline-flex items-center gap-1">
        {parts.map((x, i) => (
          <span key={i} className="inline-flex items-center gap-1">
            <span className="num min-w-[30px] rounded-lg bg-fg px-1.5 py-1 text-center text-[13px] font-semibold leading-none text-white">{x}</span>
            {i < 2 && <span className={`font-semibold ${onSale ? "text-white/80" : "text-faint"}`}>:</span>}
          </span>
        ))}
      </span>
    </span>
  );
}
