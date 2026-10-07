"use client";
import { useEffect, useState } from "react";

/** Time left until local midnight. Rendered after mount to avoid hydration mismatch. */
export function Countdown() {
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
    <span className="inline-flex items-center gap-1 text-[13px] text-muted" aria-label="Thời gian còn lại trong ngày">
      Kết thúc sau
      <span className="inline-flex items-center gap-0.5">
        {parts.map((x, i) => (
          <span key={i} className="inline-flex items-center gap-0.5">
            <span className="num label-cond min-w-[26px] rounded-[4px] bg-ink-800 px-1 py-0.5 text-center text-[14px] leading-none text-white">{x}</span>
            {i < 2 && <span className="font-bold text-ink-800">:</span>}
          </span>
        ))}
      </span>
    </span>
  );
}
