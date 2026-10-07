"use client";
import Link from "next/link";
import { useRef } from "react";
import { ArrowUpRight, Camera, ChevronLeft, ChevronRight, Mic } from "lucide-react";
import type { Product } from "@/lib/types";
import { categoryIcon } from "@/lib/icons";
import { searchUrl } from "@/lib/searchActions";
import { ProductCard } from "@/components/ProductCard";
import { fireSearch } from "./HomeHero";

type Root = { slug: string; name: string; children: { name: string }[] };

/** Big, tappable category cards (replaces the old side rail). */
export function CategoryCards({ roots, loading }: { roots: Root[]; loading: boolean }) {
  if (loading && !roots.length) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="skeleton h-[132px] rounded-2xl" />
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
      {roots.map((r) => {
        const Icon = categoryIcon(r.slug);
        const sub = r.children.slice(0, 3).map((c) => c.name).join(", ");
        return (
          <Link
            key={r.slug}
            href={searchUrl({ category: r.slug })}
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-white p-4 transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-1 hover:border-ink-200 hover:shadow-lift active:scale-[0.98] md:p-5"
          >
            <span className="grid size-11 place-items-center rounded-xl bg-ink-50 text-ink-600 transition-[background-color,color] duration-300 group-hover:bg-ink-600 group-hover:text-white">
              <Icon size={22} strokeWidth={1.8} />
            </span>
            <span className="mt-4 text-[16px] font-bold tracking-[-0.015em]">{r.name}</span>
            {sub && <span className="clamp-2 mt-1 text-[13px] leading-snug text-muted">{sub}</span>}
            <ArrowUpRight size={18} className="absolute right-4 top-4 text-faint opacity-0 transition-[opacity,transform] duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100 group-hover:text-ink-600" />
          </Link>
        );
      })}
    </div>
  );
}

/** Horizontal, snapping row of cards with arrow buttons on desktop. */
export function DealsRail({ items }: { items: Product[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const go = (dir: 1 | -1) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };
  return (
    <div className="relative">
      <div ref={ref} className="-mx-4 -my-2 flex snap-x gap-3 overflow-x-auto px-4 py-2 no-scrollbar md:-mx-6 md:gap-4 md:px-6" style={{ scrollPaddingInline: 16 }}>
        {items.map((p, i) => (
          <div key={p.id} className="w-[172px] shrink-0 snap-start sm:w-[212px]">
            <ProductCard product={p} index={i} compact />
          </div>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 -left-3 -right-3 hidden items-center justify-between lg:flex">
        {([-1, 1] as const).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => go(d)}
            aria-label={d === 1 ? "Xem tiếp" : "Xem trước"}
            className="pointer-events-auto grid size-11 place-items-center rounded-full border border-line bg-white text-fg shadow-md transition-[transform,background-color,color,border-color] duration-200 hover:border-ink-600 hover:bg-ink-600 hover:text-white active:scale-90"
          >
            {d === 1 ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        ))}
      </div>
    </div>
  );
}

/** The one saturated violet block on the page. */
export function PromoBand() {
  return (
    <div className="relative overflow-hidden rounded-[28px] bg-[radial-gradient(120%_140%_at_100%_0%,#8B5CF6_0%,#6D3AE8_42%,#4B24B5_100%)] px-6 py-10 text-white md:px-12 md:py-14">
      <div className="relative z-10 max-w-[540px]">
        <p className="text-[14px] font-semibold text-white/75">Không cần gõ</p>
        <h2 className="balance mt-3 text-[clamp(1.75rem,3.6vw,2.75rem)] font-extrabold leading-[1.08] tracking-[-0.035em]">Nói một câu. Hoặc thả một tấm ảnh.</h2>
        <p className="pretty mt-4 text-[16px] leading-relaxed text-white/80">
          Bấm micro và nói “tôi muốn mua áo mùa đông”, hoặc kéo một tấm ảnh vào trang, dán bằng Ctrl+V để tìm sản phẩm giống.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => fireSearch("image")}
            className="on-ink inline-flex h-12 items-center gap-2 rounded-2xl bg-white px-5 text-[15px] font-semibold text-ink-700 transition-[background-color,transform] duration-200 hover:bg-ink-50 active:scale-[0.97]"
          >
            <Camera size={18} /> Chọn ảnh để tìm
          </button>
          <button
            type="button"
            onClick={() => fireSearch("voice")}
            className="on-ink inline-flex h-12 items-center gap-2 rounded-2xl bg-white/12 px-5 text-[15px] font-semibold text-white ring-1 ring-inset ring-white/30 transition-[background-color,transform] duration-200 hover:bg-white/20 active:scale-[0.97]"
          >
            <Mic size={18} /> Nói để tìm
          </button>
        </div>
      </div>

      {/* Sound-wave rings */}
      <div aria-hidden className="pointer-events-none absolute -right-16 top-1/2 hidden size-[420px] -translate-y-1/2 place-items-center md:grid lg:right-6">
        {[0, 1, 2].map((i) => (
          <span key={i} className="ring-out absolute inset-0 rounded-full border border-white/35" style={{ animationDelay: `${i * 1.05}s` }} />
        ))}
        <span className="grid size-24 place-items-center rounded-full bg-white text-ink-600 shadow-[0_20px_50px_-16px_rgba(20,10,60,0.6)]">
          <Mic size={36} strokeWidth={1.8} />
        </span>
      </div>
    </div>
  );
}
