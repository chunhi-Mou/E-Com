"use client";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ImagePlus } from "lucide-react";
import { getCategories, listProducts, search, searchImage } from "@/lib/api";
import { buildChips, type Chip } from "@/lib/chips";
import { categoryFacet, countBy } from "@/lib/facets";
import { formatSeconds } from "@/lib/format";
import { useAsync } from "@/lib/hooks";
import { readRefine, useParamPatch } from "@/lib/searchParams";
import { searchUrl } from "@/lib/searchActions";
import { finishVoiceFlow } from "@/lib/voiceFlow";
import type { SearchResponse, SearchResult } from "@/lib/types";
import { EXAMPLE_QUERIES } from "@/mocks/engine";
import { useSession } from "@/store/session";
import { EmptyState } from "@/components/EmptyState";
import { ImagePicker } from "@/components/ImagePicker";
import { OrderSummary } from "@/components/OrderParts";
import { ProductCard } from "@/components/ProductCard";
import { GridSkeleton } from "@/components/Skeletons";
import { FilterPanel } from "@/components/search/FilterPanel";
import { FilterSheet } from "@/components/search/FilterSheet";
import { InspectPanel } from "@/components/search/InspectPanel";
import { SortSelect } from "@/components/search/SortSelect";
import { ProgressBar } from "@/components/search/ProgressBar";
import { Roll } from "@/components/search/Roll";
import { ScanThumb } from "@/components/search/ScanThumb";
import { UnderstoodBar } from "@/components/search/UnderstoodBar";

type State = { resp: SearchResponse | null; loading: boolean; skeleton: boolean; error: string | null; isNew: boolean; qid: number };

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="shell py-6"><GridSkeleton n={8} /></div>}>
      <SearchInner />
    </Suspense>
  );
}

function SearchInner() {
  const sp = useSearchParams();
  const patch = useParamPatch();
  // Diagnostics (query representation, score breakdown) are only exposed with ?debug in the URL.
  const inspectOn = sp.has("debug");

  const q = (sp.get("q") ?? "").trim();
  const m = sp.get("m");
  const c = sp.get("c");
  const v = sp.get("v") ?? "";
  const refine = readRefine(sp);
  const image = useSession((s) => s.image);
  const isImage = m === "image";
  const browse = !q && !isImage;

  const cats = useAsync(getCategories, "cats");
  const [state, setState] = useState<State>({ resp: null, loading: true, skeleton: true, error: null, isNew: false, qid: 0 });
  const [visible, setVisible] = useState(24);
  const lastQuery = useRef<string>("");
  const [retry, setRetry] = useState(0);

  const ig = refine.ignore.join(",");
  const queryId = isImage ? `img|${image?.id ?? 0}|${q}|${v}` : browse ? `browse|${c ?? ""}` : `txt|${q}|${m ?? ""}|${v}`;
  const fetchKey = isImage
    ? `${queryId}|${ig}|${retry}`
    : browse
      ? `${queryId}|${refine.sort}|${retry}`
      : `${queryId}|${refine.pmin}|${refine.pmax}|${refine.sort}|${ig}|${retry}`;

  useEffect(() => {
    let live = true;
    const willBeNew = lastQuery.current !== queryId;
    setState((s) => ({ ...s, loading: true, error: null, skeleton: willBeNew || !s.resp }));
    if (willBeNew) setVisible(24);

    const run = async (): Promise<SearchResponse> => {
      if (isImage) {
        if (!image) throw new Error("NO_IMAGE");
        return searchImage(image.file, q, 60, { ignore: refine.ignore });
      }
      if (browse) {
        const page = await listProducts({ category: c ?? undefined, page_size: 100, sort: refine.sort });
        return {
          representation: {
            modality: "text", raw_text: null, normalized_text: null, language: null, intent: "PRODUCT_SEARCH",
            hard_filters: c ? { category: [c] } : {}, soft_preferences: {}, expansion_terms: [], parser: "rules",
          },
          results: page.items.map((p, i) => ({ product: p, rank: i + 1, scores: { text: 0, image: 0, business: 0, soft: 0, final: 0 } })),
          total: page.total, relaxed_filters: [], order: null, latency_ms: 0,
        };
      }
      return search({
        text: q,
        modality: m === "voice" ? "voice" : "text",
        limit: 60,
        filters: { sort: refine.sort, price_min: refine.pmin ?? undefined, price_max: refine.pmax ?? undefined, ignore: refine.ignore.length ? refine.ignore : undefined },
      });
    };

    run().then(
      (resp) => {
        if (!live) return;
        const isNew = lastQuery.current !== queryId;
        lastQuery.current = queryId;
        setState((s) => ({ resp, loading: false, skeleton: false, error: null, isNew, qid: isNew ? s.qid + 1 : s.qid }));
        if (m === "voice" && isNew) {
          // What was said is full of "tớ muốn…"; the box shows the cleaned query the backend actually searched for.
          const heard = resp.representation.normalized_text?.trim();
          if (heard) useSession.getState().setText(heard);
          void finishVoiceFlow(resp);
        }
      },
      (e: Error) => {
        if (!live) return;
        setState((s) => ({ ...s, loading: false, skeleton: false, error: e.message === "NO_IMAGE" ? "NO_IMAGE" : "ERROR" }));
        if (m === "voice") useSession.getState().patchVoice({ phase: "error", error: "Không tìm được kết quả. Hãy thử lại sau ít phút." });
      },
    );
    return () => {
      live = false;
    };
    // fetchKey captures every input that should trigger a new request
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchKey]);

  // Stagger-in only right after a new query lands
  useEffect(() => {
    if (!state.isNew) return;
    const t = setTimeout(() => setState((s) => ({ ...s, isNew: false })), 900);
    return () => clearTimeout(t);
  }, [state.isNew, state.resp]);

  const resp = state.resp;
  const base: SearchResult[] = useMemo(() => {
    if (!resp) return [];
    let list = resp.results;
    if (isImage) {
      list = list.filter((r) => (refine.pmin === null || r.product.price >= refine.pmin) && (refine.pmax === null || r.product.price <= refine.pmax));
      if (refine.sort === "price_asc") list = [...list].sort((a, b) => a.product.price - b.product.price);
      else if (refine.sort === "price_desc") list = [...list].sort((a, b) => b.product.price - a.product.price);
      else if (refine.sort === "best_selling") list = [...list].sort((a, b) => b.product.sold_count - a.product.sold_count);
    }
    return list;
  }, [resp, isImage, refine.pmin, refine.pmax, refine.sort]);

  const shown = useMemo(() => {
    let list = base;
    if (!browse && refine.fc) list = list.filter((r) => r.product.category_path.some((x) => x.slug === refine.fc));
    if (refine.colors.length) list = list.filter((r) => refine.colors.some((col) => r.product.attributes.color?.includes(col)));
    if (refine.brands.length) list = list.filter((r) => r.product.brand && refine.brands.includes(r.product.brand));
    return list;
  }, [base, browse, refine.fc, refine.colors, refine.brands]);

  const facets = useMemo(() => {
    const prods = base.map((r) => r.product);
    return {
      cats: categoryFacet(prods),
      colors: countBy(prods, (p) => p.attributes.color ?? []),
      brands: countBy(prods, (p) => (p.brand ? [p.brand] : [])),
    };
  }, [base]);

  const rootCount = (cats.data ?? []).filter((x) => !x.parent).length;
  const chips = resp && !browse ? buildChips(resp.representation, cats.data ?? [], rootCount) : [];
  const removeChip = (chip: Chip) => {
    const next = Array.from(new Set([...refine.ignore, chip.id]));
    patch({
      ig: next.join(","),
      ...(chip.id === "price" ? { pmin: null, pmax: null } : {}),
      ...(chip.id === "category" ? { fc: null } : {}),
    });
  };

  const activeFilterCount = refine.colors.length + refine.brands.length + (refine.pmin !== null || refine.pmax !== null ? 1 : 0) + (!browse && refine.fc ? 1 : 0);
  const activeCat = browse ? c : refine.fc;
  const isOrder = !!resp && resp.representation.intent !== "PRODUCT_SEARCH";

  const catName = c ? (cats.data ?? []).find((x) => x.slug === c)?.name : null;
  const title = browse ? (catName ?? "Tất cả sản phẩm") : isImage ? "Sản phẩm giống ảnh bạn chọn" : `Kết quả cho “${(m === "voice" && resp?.representation.normalized_text?.trim()) || q}”`;

  const filterPanel = (
    <FilterPanel facets={facets} refine={refine} activeCat={activeCat} browse={browse} patch={patch} />
  );

  // ---------- Special states ----------
  if (isImage && state.error === "NO_IMAGE") {
    return (
      <div className="shell py-10">
        <EmptyState
          title="Ảnh tìm kiếm không còn trong bộ nhớ"
          action={
            <ImagePicker className="inline-flex h-11 items-center gap-2 rounded-lg bg-ink-600 px-5 text-[15px] font-semibold text-white hover:bg-ink-700">
              <ImagePlus size={18} /> Chọn lại ảnh
            </ImagePicker>
          }
        >
          Ảnh chỉ được giữ trong lúc bạn đang dùng trang. Chọn lại ảnh, kéo thả hoặc dán ảnh để tìm tiếp.
        </EmptyState>
      </div>
    );
  }

  const gridCols = inspectOn ? "grid-cols-2 sm:grid-cols-3 xl:grid-cols-3" : "grid-cols-2 sm:grid-cols-3 xl:grid-cols-4";

  return (
    <div className="shell pb-6 pt-4 md:pt-5">
      <ProgressBar active={state.loading} />
      <div className={`grid gap-x-6 gap-y-4 ${isOrder ? "" : "lg:grid-cols-[236px_minmax(0,1fr)]"} ${inspectOn ? (isOrder ? "xl:grid-cols-[minmax(0,1fr)_340px]" : "xl:grid-cols-[236px_minmax(0,1fr)_340px]") : ""}`}>
        {!isOrder && (
          <aside className="max-lg:hidden" aria-label="Bộ lọc">
            <div className="sticky top-[calc(var(--header-h)+16px)] max-h-[calc(100dvh-var(--header-h)-32px)] overflow-y-auto pr-1">{filterPanel}</div>
          </aside>
        )}

        <div className="min-w-0 space-y-4">
          <div>
            <div className="flex items-start gap-3">
              {isImage && image && <ScanThumb src={image.url} scanning={state.loading} />}
              <div className="min-w-0 flex-1">
                <h1 className="balance text-[20px] font-bold leading-tight tracking-[-0.01em] md:text-[24px]">{title}</h1>
                <p className="num mt-1 text-[13.5px] text-muted" aria-live="polite">
                  {state.skeleton ? "Đang tìm…" : isOrder ? "Tra cứu đơn hàng" : resp ? (
                    <>
                      <Roll value={shown.length} className="font-semibold text-fg" /> sản phẩm
                      {resp.total > base.length || shown.length !== resp.total ? ` (trong ${resp.total} kết quả)` : ""}
                      {resp.latency_ms > 0 && ` · ${formatSeconds(resp.latency_ms)}`}
                    </>
                  ) : null}
                </p>
              </div>
              <div className={`hidden shrink-0 ${isOrder ? "" : "md:block"}`}>
                <SortSelect value={refine.sort} onChange={(s) => patch({ sort: s === "relevance" ? null : s })} />
              </div>
            </div>
          </div>

          {resp && !browse && !isOrder && (
            <UnderstoodBar key={state.qid} modality={resp.representation.modality} rawText={resp.representation.raw_text} chips={chips} relaxed={resp.relaxed_filters} onRemove={removeChip} />
          )}

          {/* Mobile controls */}
          <div className={`flex items-center gap-2 lg:hidden ${isOrder ? "hidden" : ""}`}>
            <FilterSheet count={activeFilterCount} total={shown.length}>
              {filterPanel}
            </FilterSheet>
            <div className="md:hidden">
              <SortSelect value={refine.sort} onChange={(s) => patch({ sort: s === "relevance" ? null : s })} />
            </div>
          </div>

          {inspectOn && (
            <div className="xl:hidden">
              <InspectPanel resp={resp} browse={browse} />
            </div>
          )}

          {isOrder && resp?.order && <OrderSummary order={resp.order} />}
          {isOrder && resp && !resp.order && (
            <EmptyState title="Không tìm thấy đơn hàng">Kiểm tra lại mã gồm 8 chữ số, hoặc vào trang <Link className="link-ink" href="/orders">tra cứu đơn hàng</Link>.</EmptyState>
          )}

          {!isOrder && (
            <>
              {state.error === "ERROR" && !resp ? (
                <EmptyState
                  title="Chưa tải được kết quả"
                  action={
                    <button type="button" onClick={() => setRetry((n) => n + 1)} className="h-10 rounded-lg bg-ink-600 px-5 text-[14px] font-semibold text-white hover:bg-ink-700">
                      Thử lại
                    </button>
                  }
                >
                  Có thể máy chủ đang bận. Thử lại sau vài giây.
                </EmptyState>
              ) : state.skeleton ? (
                <GridSkeleton n={12} cols={gridCols} />
              ) : shown.length === 0 ? (
                <EmptyResults q={q} browse={browse} hasFilters={activeFilterCount > 0} onClear={() => patch({ pmin: null, pmax: null, color: null, brand: null, fc: null, ig: null })} />
              ) : (
                <div className={`transition-opacity duration-200 ${state.loading ? "opacity-55" : ""}`}>
                  <div className={`grid gap-3 md:gap-4 ${gridCols}`}>
                    {/* Filtering or sorting reflows the grid: cards glide to their new cell, dropped ones fade. */}
                    <AnimatePresence mode="popLayout" initial={false}>
                      {shown.slice(0, visible).map((r, i) => (
                        <motion.div
                          key={r.product.id}
                          layout="position"
                          exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
                          transition={{ layout: { type: "spring", stiffness: 420, damping: 42 } }}
                          className="flex [&>*]:min-w-0 [&>*]:flex-1"
                        >
                          <ProductCard
                            product={r.product}
                            index={i}
                            animate={state.isNew}
                            scores={inspectOn && !browse ? r.scores : undefined}
                            rank={r.rank}
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                  {shown.length > visible && (
                    <div className="mt-6 flex justify-center">
                      <button type="button" onClick={() => setVisible((n) => n + 24)} className="h-11 rounded-lg border border-line-strong bg-white px-6 text-[14px] font-semibold hover:border-ink-300 hover:bg-ink-50">
                        Xem thêm {Math.min(24, shown.length - visible)} sản phẩm
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {inspectOn && (
          <div className="max-xl:hidden">
            <div className="sticky top-[calc(var(--header-h)+16px)] max-h-[calc(100dvh-var(--header-h)-32px)] overflow-y-auto">
              <InspectPanel resp={resp} browse={browse} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyResults({ q, browse, hasFilters, onClear }: { q: string; browse: boolean; hasFilters: boolean; onClear: () => void }) {
  return (
    <div className="rounded-lg border border-dashed border-line-strong bg-sheet">
      <EmptyState
        title={hasFilters ? "Không có sản phẩm khớp bộ lọc" : browse ? "Danh mục này chưa có sản phẩm" : `Không tìm thấy “${q}”`}
        action={
          hasFilters ? (
            <button type="button" onClick={onClear} className="h-10 rounded-lg bg-ink-600 px-5 text-[14px] font-semibold text-white hover:bg-ink-700">
              Xóa bộ lọc
            </button>
          ) : undefined
        }
      >
        {hasFilters ? "Thử bỏ bớt bộ lọc để thấy thêm sản phẩm." : "Thử bớt từ khóa, kiểm tra chính tả, hoặc tìm bằng ảnh. Bạn cũng có thể thử một trong các gợi ý này."}
      </EmptyState>
      {!hasFilters && (
        <div className="flex flex-wrap justify-center gap-2 px-4 pb-10">
          {EXAMPLE_QUERIES.slice(0, 5).map((s) => (
            <Link key={s} href={searchUrl({ text: s })} className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-white px-3.5 py-1.5 text-[14px] hover:border-ink-300 hover:bg-ink-50">
              {s}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
