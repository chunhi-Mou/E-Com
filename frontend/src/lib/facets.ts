import type { Product } from "./types";

export type CatNode = { slug: string; name: string; count: number; children: CatNode[] };

export function categoryFacet(products: Product[]): CatNode[] {
  const roots: CatNode[] = [];
  for (const p of products) {
    let level = roots;
    for (const ref of p.category_path) {
      let node = level.find((n) => n.slug === ref.slug);
      if (!node) {
        node = { slug: ref.slug, name: ref.name, count: 0, children: [] };
        level.push(node);
      }
      node.count += 1;
      level = node.children;
    }
  }
  const sort = (ns: CatNode[]) => {
    ns.sort((a, b) => b.count - a.count);
    ns.forEach((n) => sort(n.children));
  };
  sort(roots);
  return roots;
}

export function countBy(products: Product[], pick: (p: Product) => string[]): { key: string; count: number }[] {
  const m = new Map<string, number>();
  for (const p of products) for (const k of new Set(pick(p))) m.set(k, (m.get(k) ?? 0) + 1);
  return [...m.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count);
}

export const PRICE_BUCKETS: { label: string; min: number | null; max: number | null }[] = [
  { label: "Dưới 200.000 ₫", min: null, max: 200_000 },
  { label: "200.000 – 500.000 ₫", min: 200_000, max: 500_000 },
  { label: "500.000 – 1.000.000 ₫", min: 500_000, max: 1_000_000 },
  { label: "Trên 1.000.000 ₫", min: 1_000_000, max: null },
];
