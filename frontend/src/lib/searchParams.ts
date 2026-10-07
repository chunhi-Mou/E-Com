"use client";
import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { SortKey } from "./types";

export type Refine = {
  sort: SortKey;
  pmin: number | null;
  pmax: number | null;
  fc: string | null;
  colors: string[];
  brands: string[];
  ignore: string[];
};

const num = (v: string | null) => (v && /^\d+$/.test(v) ? Number(v) : null);
const list = (v: string | null) => (v ? v.split(",").filter(Boolean) : []);

export function readRefine(sp: URLSearchParams): Refine {
  const sort = sp.get("sort");
  return {
    sort: sort === "price_asc" || sort === "price_desc" || sort === "best_selling" ? sort : "relevance",
    pmin: num(sp.get("pmin")),
    pmax: num(sp.get("pmax")),
    fc: sp.get("fc"),
    colors: list(sp.get("color")),
    brands: list(sp.get("brand")),
    ignore: list(sp.get("ig")),
  };
}

/** Patch URL params in place (replace, no scroll jump). null removes a key. */
export function useParamPatch() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  return useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(sp.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === "") next.delete(k);
        else next.set(k, v);
      }
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [router, pathname, sp],
  );
}
