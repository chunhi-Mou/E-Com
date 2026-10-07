import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

export function Section({ title, href, aside, children, className = "" }: { title: string; href?: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`mt-9 ${className}`}>
      <div className="mb-3.5 flex items-end justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <h2 className="text-[20px] font-bold leading-tight tracking-[-0.01em] md:text-[22px]">{title}</h2>
          {aside}
        </div>
        {href && (
          <Link href={href} className="inline-flex items-center gap-0.5 text-[14px] font-medium text-ink-600 hover:underline">
            Xem tất cả <ChevronRight size={16} />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
