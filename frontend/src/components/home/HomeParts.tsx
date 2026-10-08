"use client";
import Link from "next/link";
import { useRef } from "react";
import { Camera, ChevronLeft, ChevronRight, Mic, RotateCcw, ShieldCheck, Sparkles, Tag, Truck, WalletCards, Zap } from "lucide-react";
import type { Product } from "@/lib/types";
import { formatVND } from "@/lib/format";
import { categoryIcon } from "@/lib/icons";
import { fireSearch, searchUrl } from "@/lib/searchActions";
import { SHIPPING_FREE_FROM } from "@/store/cart";
import { ProductCard } from "@/components/ProductCard";
import { Countdown } from "@/components/Countdown";
import { GridSkeleton } from "@/components/Skeletons";
import { Section } from "@/components/Section";

type Root = { slug: string; name: string; children: { slug: string; name: string }[] };

/** Round-icon category grid, the "Danh mục" block every marketplace has under the banner. */
export function CategoryGrid({ roots, loading }: { roots: Root[]; loading: boolean }) {
  // Second level ("Áo nam", "Quần nam", "Giày dép nam"...): specific enough to be worth a tap. Roots if there is no second level.
  const tiles = roots
    .flatMap((r) => (r.children.length ? r.children : [r]).map((c) => ({ slug: c.slug, name: c.name, root: r.slug })))
    .slice(0, 14);
  return (
    <Section id="danh-muc" title="Danh mục" tight>
      <div className="rounded-2xl border border-line bg-sheet p-2 md:p-3">
        {loading && !tiles.length ? (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="skeleton h-[104px] rounded-xl" />
            ))}
          </div>
        ) : (
          <ul className="grid grid-cols-4 gap-1 sm:grid-cols-7">
            {tiles.map((t, i) => {
              const own = categoryIcon(t.slug);
              const Icon = own === Tag ? categoryIcon(t.root) : own;
              return (
                <li key={t.slug} className={i >= 8 ? "max-sm:hidden" : ""}>
                  <Link
                    href={searchUrl({ category: t.slug })}
                    className="group flex h-full flex-col items-center gap-2.5 rounded-xl px-1.5 py-3.5 text-center transition-[background-color,transform] duration-200 hover:bg-ink-50 active:scale-[0.97]"
                  >
                    <span className="grid size-14 place-items-center rounded-full bg-ink-50 text-ink-600 transition-[background-color,color,transform] duration-300 group-hover:-translate-y-0.5 group-hover:bg-ink-600 group-hover:text-white md:size-16">
                      <Icon size={26} strokeWidth={1.8} />
                    </span>
                    <span className="clamp-2 text-[12.5px] font-medium leading-snug md:text-[13.5px]">{t.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Section>
  );
}

/** Horizontal, snapping row of cards with arrow buttons on desktop. */
export function DealsRail({ items, flash, edge = "-mx-4 px-4 md:-mx-6 md:px-6" }: { items: Product[]; flash?: boolean; edge?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const go = (dir: 1 | -1) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };
  return (
    <div className="relative">
      <div ref={ref} className={`-my-2 flex snap-x gap-3 overflow-x-auto py-2 no-scrollbar md:gap-4 ${edge}`} style={{ scrollPaddingInline: 16 }}>
        {items.map((p, i) => (
          <div key={p.id} className="w-[158px] shrink-0 snap-start sm:w-[190px]">
            <ProductCard product={p} index={i} compact flash={flash} />
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
            className="pointer-events-auto grid size-11 place-items-center rounded-full border border-line bg-white text-fg shadow-md transition-[transform,background-color,color,border-color] duration-200 hover:border-sale-600 hover:bg-sale-600 hover:text-white active:scale-90"
          >
            {d === 1 ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Flash sale: red header with a countdown, then the deepest discounts with a "sold" bar. */
export function FlashSale({ items, loading }: { items: Product[]; loading: boolean }) {
  return (
    <section id="flash-sale" className="mt-6 scroll-mt-[calc(var(--header-h)+8px)] overflow-hidden rounded-2xl border border-sale-200 bg-sheet md:mt-8">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 bg-[linear-gradient(95deg,#B52C1A,#D93A24_55%,#F25A3E)] px-4 py-3 md:px-5">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <h2 className="inline-flex items-center gap-2 text-[20px] font-extrabold uppercase leading-none tracking-[0.01em] text-white md:text-[24px]">
            <Zap size={24} className="fill-sun text-sun" aria-hidden />
            Flash Sale
          </h2>
          <Countdown onSale />
        </div>
        <p className="text-[13px] font-medium text-white/90">Giảm sâu, số lượng có hạn</p>
      </div>
      <div className="p-3 md:p-4">
        {loading && !items.length ? (
          <GridSkeleton n={6} cols="grid-cols-2 sm:grid-cols-3 lg:grid-cols-6" />
        ) : (
          <DealsRail items={items} flash edge="-mx-3 px-3 md:-mx-4 md:px-4" />
        )}
      </div>
    </section>
  );
}

/** Slim reminder of the signature feature, so it is findable without owning the hero. */
export function SmartSearchBand() {
  const btn =
    "inline-flex h-10 items-center gap-2 rounded-xl px-4 text-[14px] font-semibold transition-[background-color,transform] duration-200 active:scale-[0.97]";
  return (
    <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-ink-200 bg-ink-50 p-4 md:mt-8 md:flex-row md:items-center md:justify-between md:px-6">
      <div className="flex items-start gap-3.5">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-ink-600 text-white">
          <Sparkles size={22} />
        </span>
        <div>
          <p className="text-[16px] font-bold tracking-[-0.01em]">Tìm nhanh hơn: nói một câu hoặc thả một tấm ảnh</p>
          <p className="pretty mt-0.5 text-[13.5px] text-muted">Thử nói “áo len màu be dưới 500k”, hoặc dán ảnh bằng Ctrl+V để tìm sản phẩm giống.</p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2.5">
        <button type="button" onClick={() => fireSearch("voice")} className={`${btn} bg-ink-600 text-white hover:bg-ink-700`}>
          <Mic size={17} /> Nói để tìm
        </button>
        <button type="button" onClick={() => fireSearch("image")} className={`${btn} bg-white text-ink-700 ring-1 ring-inset ring-ink-200 hover:bg-ink-100`}>
          <Camera size={17} /> Tìm bằng ảnh
        </button>
      </div>
    </div>
  );
}

const TRUST = [
  { icon: ShieldCheck, title: "Hàng chính hãng", sub: "Cam kết hoàn tiền nếu giả" },
  { icon: RotateCcw, title: "Đổi trả 7 ngày", sub: "Miễn phí nếu lỗi do shop" },
  { icon: Truck, title: "Freeship", sub: `Đơn từ ${formatVND(SHIPPING_FREE_FROM)}` },
  { icon: WalletCards, title: "Thanh toán an toàn", sub: "COD hoặc thẻ (mô phỏng)" },
];

export function TrustStrip() {
  return (
    <ul className="mt-12 grid grid-cols-2 gap-3 rounded-2xl border border-line bg-sheet p-4 md:mt-14 md:grid-cols-4 md:p-5">
      {TRUST.map(({ icon: Icon, title, sub }) => (
        <li key={title} className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-ink-50 text-ink-600">
            <Icon size={21} strokeWidth={1.9} />
          </span>
          <span className="min-w-0">
            <span className="block text-[13.5px] font-bold leading-tight">{title}</span>
            <span className="mt-0.5 block text-[12px] leading-snug text-muted">{sub}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
