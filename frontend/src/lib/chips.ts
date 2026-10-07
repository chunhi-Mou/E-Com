import { formatVND } from "./format";
import { attrLabel, valueLabel } from "./vocab";
import type { Category, QueryRepresentation } from "./types";
import { CLEARED_PRICE_MAX } from "./api";

export type Chip = {
  id: string; // key passed to `ignore` when removed
  label: string;
  value: string;
  kind: "hard" | "soft";
};

function priceText(min?: number, max?: number): string | null {
  const lo = min && min > 0 ? min : undefined;
  const hi = max && max < CLEARED_PRICE_MAX ? max : undefined;
  if (lo && hi) return `${formatVND(lo)} – ${formatVND(hi)}`;
  if (hi) return `dưới ${formatVND(hi)}`;
  if (lo) return `từ ${formatVND(lo)}`;
  return null;
}

/** What the system understood, as short removable (hard) or informative (soft) chips. */
export function buildChips(rep: QueryRepresentation, cats: Category[], rootCount: number): Chip[] {
  const out: Chip[] = [];
  const h = rep.hard_filters;
  const name = (slug: string) => cats.find((c) => c.slug === slug)?.name ?? slug;

  if (h.category?.length && h.category.length < Math.max(rootCount, 3)) {
    const names = Array.from(new Set(h.category.map(name)));
    out.push({ id: "category", label: "Danh mục", value: names.length > 2 ? `${names.slice(0, 2).join(", ")} +${names.length - 2}` : names.join(", "), kind: "hard" });
  }
  const pt = priceText(h.price_min, h.price_max);
  if (pt) out.push({ id: "price", label: "Giá", value: pt, kind: "hard" });
  if (h.brand?.length) out.push({ id: "brand", label: "Thương hiệu", value: h.brand.join(", "), kind: "hard" });
  for (const [k, v] of Object.entries(h)) {
    if (["category", "price_min", "price_max", "brand", "order_code"].includes(k)) continue;
    const vals = Array.isArray(v) ? (v as string[]) : [String(v)];
    out.push({ id: k, label: attrLabel(k), value: vals.map((x) => valueLabel(k, x)).join(", "), kind: "hard" });
  }
  for (const [k, vals] of Object.entries(rep.soft_preferences)) {
    if (!vals.length) continue;
    out.push({ id: `soft:${k}`, label: attrLabel(k), value: vals.map((x) => valueLabel(k, x)).join(", "), kind: "soft" });
  }
  return out;
}
