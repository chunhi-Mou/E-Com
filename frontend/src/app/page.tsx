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
import { Countdown } from "@/components/Countdown";
import { Reveal } from "@/components/Reveal";
import { buildTree } from "@/components/CategoryNav";
import { HomeHero } from "@/components/home/HomeHero";
import { CategoryCards, DealsRail, PromoBand } from "@/components/home/HomeParts";

const GRID = "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5";

export default function HomePage() {
  const cats = useAsync(getCategories, "cats");
  const all = useAsync(() => listProducts({ page_size: 100, sort: "best_selling" }), "home-all");
  const tree = useMemo(() => (cats.data ? buildTree(cats.data) : []), [cats.data]);
  const items = useMemo(() => all.data?.items ?? [], [all.data]);

  // Arriving from the login curtain: let the hero wait for the circle to open.
  const base = useMemo(() => (useCurtain.getState().phase === "idle" ? 0.05 : 0.5), []);
  useEffect(() => {
    if (!all.loading) useCurtain.getState().markReady();
  }, [all.loading]);

  const deals = useMemo(
    () => [...items].filter((p) => discountPct(p.price, p.original_price) > 0).sort((a, b) => discountPct(b.price, b.original_price) - discountPct(a.price, a.original_price)).slice(0, 10),
    [items],
  );
  const best = items.slice(0, 10);
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
      <HomeHero base={base} />

      <Reveal className="mt-12 md:mt-16">
        <CategoryCards roots={tree} loading={cats.loading} />
      </Reveal>

      <Reveal>
        <Section title="Giá tốt hôm nay" aside={<Countdown />}>
          {all.loading && !items.length ? <GridSkeleton n={5} cols="grid-cols-2 sm:grid-cols-3 lg:grid-cols-5" /> : <DealsRail items={deals} />}
        </Section>
      </Reveal>

      <Reveal className="mt-14 md:mt-16">
        <PromoBand />
      </Reveal>

      <Reveal>
        <Section title="Bán chạy">
          {all.loading && !items.length ? (
            <GridSkeleton n={10} cols={GRID} />
          ) : (
            <div className={`grid gap-3 md:gap-4 ${GRID}`}>
              {best.map((p, i) => (
                <div key={p.id} className={i >= 9 ? "hidden lg:block" : i >= 8 ? "hidden sm:block" : ""}>
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
                  <div key={p.id} className={i >= 5 ? "hidden sm:block lg:hidden" : i >= 4 ? "hidden sm:block" : ""}>
                    <ProductCard product={p} index={i} />
                  </div>
                ))}
              </div>
            </Section>
          </Reveal>
        ) : null,
      )}

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
