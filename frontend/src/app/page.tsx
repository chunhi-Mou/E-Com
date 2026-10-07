"use client";
import Link from "next/link";
import { useMemo } from "react";
import { motion } from "motion/react";
import { ChevronRight, Mic, ImagePlus } from "lucide-react";
import { getCategories, listProducts } from "@/lib/api";
import { discountPct } from "@/lib/format";
import { useAsync } from "@/lib/hooks";
import { categoryIcon } from "@/lib/icons";
import { searchUrl } from "@/lib/searchActions";
import { EXAMPLE_QUERIES } from "@/mocks/engine";
import { ProductCard } from "@/components/ProductCard";
import { GridSkeleton } from "@/components/Skeletons";
import { Section } from "@/components/Section";
import { Countdown } from "@/components/Countdown";
import { buildTree } from "@/components/CategoryNav";
import { ImagePicker } from "@/components/ImagePicker";

const GRID6 = "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6";

export default function HomePage() {
  const cats = useAsync(getCategories, "cats");
  const all = useAsync(() => listProducts({ page_size: 100, sort: "best_selling" }), "home-all");
  const tree = useMemo(() => (cats.data ? buildTree(cats.data) : []), [cats.data]);
  const items = useMemo(() => all.data?.items ?? [], [all.data]);

  const deals = useMemo(
    () => [...items].filter((p) => discountPct(p.price, p.original_price) > 0).sort((a, b) => discountPct(b.price, b.original_price) - discountPct(a.price, a.original_price)).slice(0, 10),
    [items],
  );
  const best = items.slice(0, 12);
  const byRoot = useMemo(
    () =>
      tree.slice(0, 3).map((r) => ({
        root: r,
        items: items
          .filter((p) => p.category_path[0]?.slug === r.slug)
          .sort((a, b) => b.rating - a.rating || b.sold_count - a.sold_count)
          .slice(0, 6),
      })),
    [tree, items],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="shell pb-4 pt-4 md:pt-5"
    >
      {/* Ways to search: the product's signature, shown as plain, tappable examples */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 text-[13.5px]">
        <span className="shrink-0 font-semibold text-muted">Thử tìm</span>
        {EXAMPLE_QUERIES.slice(0, 6).map((q) => (
          <Link key={q} href={searchUrl({ text: q })} className="shrink-0 rounded-full border border-line bg-sheet px-3.5 py-1.5 text-fg transition-colors hover:border-ink-300 hover:bg-ink-50">
            {q}
          </Link>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[232px_minmax(0,1fr)]">
        <nav aria-label="Danh mục sản phẩm" className="max-lg:hidden">
          <div className="sticky top-[calc(var(--header-h)+16px)] overflow-hidden rounded-lg border border-line bg-sheet py-1.5">
            {cats.loading && !tree.length
              ? Array.from({ length: 7 }, (_, i) => <div key={i} className="skeleton mx-3 my-2.5 h-5" />)
              : tree.map((r) => {
                  const Icon = categoryIcon(r.slug);
                  return (
                    <Link key={r.slug} href={searchUrl({ category: r.slug })} className="group flex items-center gap-3 px-3.5 py-2.5 text-[14px] hover:bg-ink-50">
                      <Icon size={18} className="shrink-0 text-ink-500" />
                      <span className="flex-1">{r.name}</span>
                      <ChevronRight size={15} className="text-faint transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  );
                })}
          </div>
        </nav>

        <section aria-labelledby="deals" className="min-w-0 rounded-lg border border-line bg-sheet p-3.5 md:p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <h1 id="deals" className="text-[20px] font-bold tracking-[-0.01em] md:text-[22px]">
                Giá tốt hôm nay
              </h1>
              <Countdown />
            </div>
          </div>
          {all.loading && !items.length ? (
            <GridSkeleton n={5} cols="grid-cols-2 sm:grid-cols-3 lg:grid-cols-5" />
          ) : (
            <div className="-mx-3.5 flex snap-x gap-3 overflow-x-auto px-3.5 pb-1 no-scrollbar md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 lg:grid-cols-5">
              {deals.slice(0, 5).map((p, i) => (
                <div key={p.id} className="w-[158px] shrink-0 snap-start md:w-auto">
                  <ProductCard product={p} index={i} compact />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Categories on small screens (the rail is hidden there) */}
      <div className="mt-5 lg:hidden">
        <div className="grid grid-cols-4 gap-x-2 gap-y-4 sm:grid-cols-7">
          {tree.map((r) => {
            const Icon = categoryIcon(r.slug);
            return (
              <Link key={r.slug} href={searchUrl({ category: r.slug })} className="flex flex-col items-center gap-1.5 text-center">
                <span className="grid size-14 place-items-center rounded-full bg-ink-100 text-ink-700">
                  <Icon size={24} strokeWidth={1.7} />
                </span>
                <span className="text-[12px] leading-tight">{r.name}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* How to search without typing */}
      <div className="mt-6 flex flex-col gap-3 rounded-lg bg-ink-800 p-4 text-white md:flex-row md:items-center md:justify-between md:px-5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-white/12">
            <Mic size={18} />
          </span>
          <p className="pretty max-w-xl text-[14.5px] leading-snug text-white/90">
            <b className="font-semibold text-white">Không cần gõ.</b> Bấm micro và nói “tôi muốn mua áo mùa đông”, hoặc kéo một tấm ảnh vào trang, dán bằng Ctrl+V để tìm sản phẩm giống.
          </p>
        </div>
        <ImagePicker className="on-ink inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-white px-4 text-[14px] font-semibold text-ink-800 transition-[background-color,transform] hover:bg-hl active:scale-95">
          <ImagePlus size={18} /> Chọn ảnh để tìm
        </ImagePicker>
      </div>

      <Section title="Bán chạy">
        {all.loading && !items.length ? (
          <GridSkeleton n={12} cols={GRID6} />
        ) : (
          <div className={`grid gap-3 md:gap-4 ${GRID6}`}>
            {best.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        )}
      </Section>

      {byRoot.map(({ root, items: its }) =>
        its.length ? (
          <Section key={root.slug} title={root.name} href={searchUrl({ category: root.slug })}>
            <div className={`grid gap-3 md:gap-4 ${GRID6}`}>
              {its.map((p, i) => (
                <div key={p.id} className={i >= 4 ? "hidden lg:block" : i >= 3 ? "hidden sm:block" : ""}>
                  <ProductCard product={p} index={i} />
                </div>
              ))}
            </div>
          </Section>
        ) : null,
      )}

      {all.error && !items.length && (
        <div className="mt-8 rounded-lg border border-seal-200 bg-seal-50 p-4 text-[14px]">
          Không tải được danh sách sản phẩm.{" "}
          <button type="button" onClick={all.reload} className="link-ink font-semibold">
            Thử lại
          </button>
        </div>
      )}
    </motion.div>
  );
}
