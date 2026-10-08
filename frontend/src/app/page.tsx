"use client";
import { useEffect, useMemo } from "react";
import { getCategories, listProducts } from "@/lib/api";
import { discountPct } from "@/lib/format";
import { useAsync } from "@/lib/hooks";
import { searchUrl } from "@/lib/searchActions";
import { useCurtain } from "@/store/curtain";
import { ProductCard } from "@/components/ProductCard";
import { GridSkeleton } from "@/components/Skeletons";
import { Section } from "@/components/Section";
import { Reveal } from "@/components/Reveal";
import { buildTree } from "@/components/CategoryNav";
import { HeroBanner } from "@/components/home/HeroBanner";
import { QuickLinks } from "@/components/home/QuickLinks";
import { Vouchers } from "@/components/home/Vouchers";
import { CategoryGrid, FlashSale, SmartSearchBand, TrustStrip } from "@/components/home/HomeParts";

// 2 / 3 / 5 / 6 columns. The cards past a breakpoint's row count are hidden so every row stays full.
const GRID = "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6";

export default function HomePage() {
  const cats = useAsync(getCategories, "cats");
  const all = useAsync(() => listProducts({ page_size: 100, sort: "best_selling" }), "home-all");
  const tree = useMemo(() => (cats.data ? buildTree(cats.data) : []), [cats.data]);
  const items = useMemo(() => all.data?.items ?? [], [all.data]);

  // Arriving from the login curtain: release it once the first data is in.
  useEffect(() => {
    if (!all.loading) useCurtain.getState().markReady();
  }, [all.loading]);

  const deals = useMemo(
    () => [...items].filter((p) => discountPct(p.price, p.original_price) > 0).sort((a, b) => discountPct(b.price, b.original_price) - discountPct(a.price, a.original_price)).slice(0, 12),
    [items],
  );
  const picks = items.slice(0, 12);
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
    <div className="shell pb-4">
      <HeroBanner />
      <QuickLinks />

      <Reveal>
        <FlashSale items={deals} loading={all.loading} />
      </Reveal>

      <Reveal>
        <Vouchers />
      </Reveal>

      <Reveal>
        <CategoryGrid roots={tree} loading={cats.loading} />
      </Reveal>

      <Reveal>
        <SmartSearchBand />
      </Reveal>

      <Reveal>
        <Section id="goi-y" title="Gợi ý hôm nay">
          {all.loading && !items.length ? (
            <GridSkeleton n={12} cols={GRID} />
          ) : (
            <div className={`grid gap-3 md:gap-4 ${GRID}`}>
              {picks.map((p, i) => (
                <div key={p.id} className={i >= 10 ? "lg:max-xl:hidden" : ""}>
                  <ProductCard product={p} index={i} />
                </div>
              ))}
            </div>
          )}
        </Section>
      </Reveal>

      {byRoot.map(({ root, items: its }) =>
        its.length ? (
          <Reveal key={root.slug}>
            <Section title={root.name} href={searchUrl({ category: root.slug })}>
              <div className={`grid gap-3 md:gap-4 ${GRID}`}>
                {its.map((p, i) => (
                  <div key={p.id} className={i >= 5 ? "max-sm:hidden lg:max-xl:hidden" : i >= 4 ? "max-sm:hidden" : ""}>
                    <ProductCard product={p} index={i} />
                  </div>
                ))}
              </div>
            </Section>
          </Reveal>
        ) : null,
      )}

      <Reveal>
        <TrustStrip />
      </Reveal>

      {all.error && !items.length && (
        <div className="mt-10 rounded-2xl border border-line bg-white p-5 text-[14px]">
          Không tải được danh sách sản phẩm.{" "}
          <button type="button" onClick={all.reload} className="link-ink font-semibold">
            Thử lại
          </button>
        </div>
      )}
    </div>
  );
}
