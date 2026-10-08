import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";

export function Section({ title, href, aside, children, className = "", id, tight }: { title: string; href?: string; aside?: ReactNode; children: ReactNode; className?: string; id?: string; tight?: boolean }) {
  return (
    <section id={id} className={`${tight ? "mt-6 md:mt-8" : "mt-10 md:mt-12"} scroll-mt-[calc(var(--header-h)+8px)] ${className}`}>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h2 className="text-[20px] font-extrabold leading-tight tracking-[-0.025em] md:text-[24px]">{title}</h2>
          {aside}
        </div>
        {href && (
          <Link href={href} className="group inline-flex shrink-0 items-center gap-1.5 text-[14px] font-semibold text-ink-600 transition-colors hover:text-ink-700">
            Xem tất cả
            <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-1" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
