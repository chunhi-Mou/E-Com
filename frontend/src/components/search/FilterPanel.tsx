"use client";
import Link from "next/link";
import { useState } from "react";
import { Check, ChevronRight } from "lucide-react";
import { COLOR_HEX, valueLabel } from "@/lib/vocab";
import { PRICE_BUCKETS, type CatNode } from "@/lib/facets";
import type { Refine } from "@/lib/searchParams";

export type FacetData = {
  cats: CatNode[];
  colors: { key: string; count: number }[];
  brands: { key: string; count: number }[];
};

type Props = {
  facets: FacetData;
  refine: Refine;
  activeCat: string | null;
  browse: boolean;
  patch: (p: Record<string, string | null>) => void;
};

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-t border-line py-4 first:border-t-0 first:pt-0">
      <legend className="mb-2.5 text-[14px] font-bold">{title}</legend>
      {children}
    </fieldset>
  );
}

function CatList({ nodes, activeCat, onPick, depth = 0 }: { nodes: CatNode[]; activeCat: string | null; onPick: (slug: string | null) => void; depth?: number }) {
  return (
    <ul className={depth ? "ml-3 mt-0.5 border-l border-line pl-2.5" : ""}>
      {nodes.map((n) => {
        const onPath = activeCat !== null && (n.slug === activeCat || containsSlug(n, activeCat));
        const isActive = n.slug === activeCat;
        return (
          <li key={n.slug}>
            <button
              type="button"
              onClick={() => onPick(isActive ? null : n.slug)}
              aria-pressed={isActive}
              className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-[14px] transition-colors hover:bg-ink-50 ${isActive ? "bg-ink-100 font-semibold text-ink-800" : ""}`}
            >
              <span className="truncate">{n.name}</span>
              <span className="num text-[12px] text-muted">{n.count}</span>
            </button>
            {n.children.length > 0 && (onPath || depth === 0) && (depth === 0 ? onPath || nodes.length === 1 : true) && (
              <CatList nodes={n.children} activeCat={activeCat} onPick={onPick} depth={depth + 1} />
            )}
          </li>
        );
      })}
    </ul>
  );
}

function containsSlug(n: CatNode, slug: string): boolean {
  return n.children.some((c) => c.slug === slug || containsSlug(c, slug));
}

export function FilterPanel({ facets, refine, activeCat, browse, patch }: Props) {
  const [lo, setLo] = useState(refine.pmin?.toString() ?? "");
  const [hi, setHi] = useState(refine.pmax?.toString() ?? "");
  const toggle = (key: "color" | "brand", cur: string[], v: string) => {
    const next = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
    patch({ [key]: next.length ? next.join(",") : null });
  };
  const catKey = browse ? "c" : "fc";
  const anyActive = refine.colors.length || refine.brands.length || refine.pmin !== null || refine.pmax !== null || (!browse && refine.fc);

  return (
    <div className="text-fg">
      {browse && (
        <div className="mb-3">
          <Link href="/" className="inline-flex items-center gap-1 text-[13px] font-medium text-ink-600 hover:underline">
            <ChevronRight size={14} className="rotate-180" /> Trang chủ
          </Link>
        </div>
      )}
      {facets.cats.length > 0 && (
        <Group title="Danh mục">
          <CatList nodes={facets.cats} activeCat={activeCat} onPick={(slug) => patch({ [catKey]: slug })} />
        </Group>
      )}

      <Group title="Khoảng giá">
        <ul className="space-y-0.5">
          {PRICE_BUCKETS.map((b) => {
            const on = refine.pmin === b.min && refine.pmax === b.max;
            return (
              <li key={b.label}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    setLo(b.min?.toString() ?? "");
                    setHi(b.max?.toString() ?? "");
                    patch(on ? { pmin: null, pmax: null, ig: null } : { pmin: b.min?.toString() ?? null, pmax: b.max?.toString() ?? null });
                  }}
                  className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-[14px] hover:bg-ink-50 ${on ? "bg-ink-100 font-semibold text-ink-800" : ""}`}
                >
                  {b.label}
                  {on && <Check size={15} />}
                </button>
              </li>
            );
          })}
        </ul>
        <form
          className="mt-2.5 flex items-center gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            patch({ pmin: lo || null, pmax: hi || null });
          }}
        >
          <input value={lo} onChange={(e) => setLo(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="Từ" aria-label="Giá từ" className="num h-9 w-full min-w-0 rounded-md border border-line-strong bg-white px-2.5 text-[14px] placeholder:text-faint" />
          <span aria-hidden className="text-faint">–</span>
          <input value={hi} onChange={(e) => setHi(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="Đến" aria-label="Giá đến" className="num h-9 w-full min-w-0 rounded-md border border-line-strong bg-white px-2.5 text-[14px] placeholder:text-faint" />
          <button type="submit" className="h-9 shrink-0 rounded-md bg-ink-600 px-3 text-[13px] font-semibold text-white hover:bg-ink-700">
            Áp dụng
          </button>
        </form>
      </Group>

      {facets.colors.length > 1 && (
        <Group title="Màu sắc">
          <ul className="flex flex-wrap gap-1.5">
            {facets.colors.map((c) => {
              const on = refine.colors.includes(c.key);
              return (
                <li key={c.key}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle("color", refine.colors, c.key)}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-full border pl-1.5 pr-2.5 text-[13px] transition-colors ${on ? "border-ink-600 bg-ink-600 text-white" : "border-line-strong bg-white hover:border-ink-300"}`}
                  >
                    <span className="size-4 rounded-full ring-1 ring-black/15" style={{ background: COLOR_HEX[c.key] ?? "#999" }} />
                    {valueLabel("color", c.key)}
                    <span className={`num text-[11px] ${on ? "text-white/75" : "text-muted"}`}>{c.count}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Group>
      )}

      {facets.brands.length > 1 && (
        <Group title="Thương hiệu">
          <ul className="space-y-0.5">
            {facets.brands.slice(0, 8).map((b) => (
              <li key={b.key}>
                <label className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-[14px] hover:bg-ink-50">
                  <input type="checkbox" checked={refine.brands.includes(b.key)} onChange={() => toggle("brand", refine.brands, b.key)} className="size-4 rounded" />
                  <span className="flex-1 truncate">{b.key}</span>
                  <span className="num text-[12px] text-muted">{b.count}</span>
                </label>
              </li>
            ))}
          </ul>
        </Group>
      )}

      {anyActive ? (
        <button
          type="button"
          onClick={() => {
            setLo("");
            setHi("");
            patch({ pmin: null, pmax: null, color: null, brand: null, ...(browse ? {} : { fc: null }) });
          }}
          className="mt-1 w-full rounded-md border border-line-strong py-2 text-[13.5px] font-semibold text-ink-700 hover:bg-ink-50"
        >
          Xóa bộ lọc
        </button>
      ) : null}
    </div>
  );
}
