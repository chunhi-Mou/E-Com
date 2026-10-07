// A small rule-based stand-in for the backend: parses a query into a representation, filters, ranks.
import { fold } from "@/lib/text";
import { COLOR_HEX } from "@/lib/vocab";
import type { Order, Product, QueryRepresentation, Scores, SearchFilters, SearchRequest, SearchResponse, SearchResult } from "@/lib/types";
import { categories, descendants, productById, products } from "./catalog";

const CATEGORY_KEYWORDS: [string, string[]][] = [
  ["ao thun", ["ao-thun-nam", "ao-thun-nu"]], ["t shirt", ["ao-thun-nam", "ao-thun-nu"]], ["tee", ["ao-thun-nam", "ao-thun-nu"]],
  ["ao len", ["ao-len-nam", "ao-len-nu"]], ["sweater", ["ao-len-nam", "ao-len-nu"]], ["cardigan", ["ao-len-nu"]], ["hoodie", ["ao-len-nam"]],
  ["ao khoac", ["ao-khoac-nam", "ao-khoac-nu"]], ["ao phao", ["ao-khoac-nam", "ao-khoac-nu"]], ["jacket", ["ao-khoac-nam", "ao-khoac-nu"]], ["coat", ["ao-khoac-nam", "ao-khoac-nu"]],
  ["ao", ["ao-nam", "ao-nu"]], ["shirt", ["ao-nam", "ao-nu"]],
  ["quan jeans", ["quan-jeans-nam"]], ["jeans", ["quan-jeans-nam"]], ["quan short", ["quan-short-nam"]], ["short", ["quan-short-nam"]], ["quan kaki", ["quan-jeans-nam"]],
  ["quan", ["quan-nam"]], ["pants", ["quan-nam"]],
  ["vay", ["dam-vay"]], ["dam", ["dam-vay"]], ["dress", ["dam-vay"]],
  ["giay the thao", ["giay-the-thao"]], ["sneaker", ["giay-the-thao"]], ["sneakers", ["giay-the-thao"]], ["giay chay bo", ["giay-the-thao"]],
  ["giay da", ["giay-da"]], ["giay luoi", ["giay-da"]], ["loafer", ["giay-da"]], ["giay bup be", ["giay-da"]],
  ["dep", ["dep-sandal"]], ["sandal", ["dep-sandal"]], ["sandals", ["dep-sandal"]],
  ["giay", ["giay-dep"]], ["shoes", ["giay-dep"]], ["shoe", ["giay-dep"]],
  ["balo", ["balo"]], ["backpack", ["balo"]], ["tui xach", ["tui-xach-nu"]], ["tui tote", ["tui-xach-nu"]], ["handbag", ["tui-xach-nu"]],
  ["tui", ["tui-balo"]], ["bag", ["tui-balo"]],
  ["kinh mat", ["kinh-mat"]], ["kinh", ["kinh-mat"]], ["sunglasses", ["kinh-mat"]],
  ["mu", ["mu-non"]], ["non", ["mu-non"]], ["cap", ["mu-non"]], ["hat", ["mu-non"]], ["beanie", ["mu-non"]],
  ["dong ho", ["dong-ho"]], ["watch", ["dong-ho"]],
  ["tai nghe", ["tai-nghe"]], ["earbuds", ["tai-nghe"]], ["headphones", ["tai-nghe"]],
  ["sac du phong", ["sac-du-phong"]], ["power bank", ["sac-du-phong"]], ["powerbank", ["sac-du-phong"]],
  ["binh giu nhiet", ["binh-giu-nhiet"]], ["binh", ["binh-giu-nhiet"]], ["bottle", ["binh-giu-nhiet"]],
  ["chan", ["chan-mem"]], ["blanket", ["chan-mem"]],
].sort((a, b) => b[0].length - a[0].length) as [string, string[]][];

const COLOR_WORDS: [string, string, boolean][] = [
  // [folded phrase, code, needs "mau"/"color" prefix because it collides with common words]
  ["xanh navy", "navy", false], ["navy", "navy", false], ["xanh la", "green", false], ["xanh duong", "blue", false], ["xanh", "blue", false],
  ["trang", "white", false], ["white", "white", false], ["black", "black", false], ["xam", "gray", false], ["gray", "gray", false], ["grey", "gray", false],
  ["nau", "brown", false], ["brown", "brown", false], ["hong", "pink", false], ["pink", "pink", false], ["tim", "purple", false], ["purple", "purple", false],
  ["vang", "yellow", false], ["yellow", "yellow", false], ["green", "green", false], ["blue", "blue", false], ["red", "red", false], ["orange", "orange", false],
  ["beige", "beige", false], ["silver", "silver", false], ["gold", "gold", false],
  ["den", "black", true], ["do", "red", true], ["be", "beige", true], ["cam", "orange", true], ["bac", "silver", true],
];

type Soft = { match: string[]; soft: Record<string, string[]>; expand: string[] };
const CONCEPTS: Soft[] = [
  { match: ["mua dong", "winter", "troi lanh", "lanh", "ret", "giu am", "warm"], soft: { season: ["winter"], warmth: ["high"] }, expand: ["áo len", "áo phao", "áo khoác", "nỉ", "giữ ấm"] },
  { match: ["mua he", "summer", "troi nong", "nong"], soft: { season: ["summer"], warmth: ["low"] }, expand: ["thoáng mát", "cotton", "linen"] },
  { match: ["di bien", "beach", "nghi mat", "bien"], soft: { occasion: ["beach"], season: ["summer"] }, expand: ["quần short", "đầm maxi", "sandal", "kính mát", "nón"] },
  { match: ["cong so", "di lam", "office", "work"], soft: { occasion: ["office"] }, expand: ["công sở", "thanh lịch"] },
  { match: ["the thao", "tap gym", "gym", "sport", "chay bo", "running"], soft: { occasion: ["sport"], style: ["sporty"] }, expand: ["thể thao", "thấm hút"] },
  { match: ["du lich", "travel", "di choi"], soft: { occasion: ["travel"] }, expand: ["balo", "gọn nhẹ"] },
  { match: ["du tiec", "di tiec", "party", "tiec"], soft: { occasion: ["party"] }, expand: ["váy", "đầm", "dự tiệc"] },
  { match: ["o nha", "home"], soft: { occasion: ["home"] }, expand: ["mềm", "thoải mái"] },
  { match: ["toi gian", "minimal"], soft: { style: ["minimal"] }, expand: [] },
  { match: ["streetwear", "duong pho"], soft: { style: ["streetwear"] }, expand: [] },
  { match: ["vintage", "co dien"], soft: { style: ["vintage"] }, expand: [] },
  { match: ["thanh lich", "elegant"], soft: { style: ["elegant"] }, expand: [] },
  { match: ["basic", "co ban"], soft: { style: ["basic"] }, expand: [] },
];
const MATERIALS: [string, string][] = [["da bo", "leather"], ["leather", "leather"], ["jeans", "denim"], ["denim", "denim"], ["len", "wool"], ["wool", "wool"], ["linen", "linen"], ["dui", "linen"], ["lua", "silk"], ["silk", "silk"], ["cotton", "cotton"], ["canvas", "canvas"], ["nylon", "nylon"], ["ni", "fleece"], ["fleece", "fleece"]];

const FILLERS = [
  "toi muon mua", "toi muon tim", "toi muon xem", "toi muon", "toi can mua", "toi can tim", "toi can", "toi dang tim", "minh muon mua", "minh muon", "minh can",
  "muon mua", "can mua", "cho toi xem", "cho toi", "cho minh", "tim giup toi", "tim giup minh", "tim cho toi", "tim kiem", "tim giup", "tim", "mua",
  "i want to buy", "i want to find", "i want", "i need", "i am looking for", "looking for", "find me", "show me", "give me", "for", "the", "a", "an", "with", "of", "and",
  "mot cai", "mot chiec", "mot doi", "nhe", "nha", "di", "cho", "co", "khong", "voi", "mau", "color", "colour", "do", "san pham", "hang", "giong anh nay", "nhung",
];
const EN_WORDS = new Set(["for", "the", "under", "below", "over", "white", "black", "red", "blue", "green", "shoes", "shoe", "men", "women", "winter", "summer", "jacket", "sweater", "dress", "bag", "watch", "want", "need", "find", "looking", "backpack", "beach", "show", "me", "sneakers", "cap", "hat", "sunglasses"]);
const BRANDS = Array.from(new Set(products.map((p) => p.brand).filter((b): b is string => !!b)));

function parsePrice(f: string): { min?: number; max?: number; rest: string } {
  const unit = (n: string, u?: string) => {
    const v = parseFloat(n.replace(",", "."));
    if (u === "tr" || u === "trieu" || u === "m" || u === "million") return v * 1_000_000;
    if (u === "k" || u === "nghin" || u === "ngan" || u === "thousand") return v * 1000;
    if (u === "d" || u === "vnd" || u === "dong") return v;
    return v < 1000 ? v * 1000 : v;
  };
  const NUM = String.raw`(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?)\s*(tr|trieu|million|m|k|nghin|ngan|thousand|vnd|dong|d)?`;
  let m = f.match(new RegExp(String.raw`(?:tu|from|between)?\s*${NUM}\s*(?:den|toi|to|-)\s*${NUM}`));
  if (m && m[0].trim().length > 3) {
    const a = unit(m[1].replace(/\.(?=\d{3})/g, ""), m[2] ?? m[4]);
    const b = unit(m[3].replace(/\.(?=\d{3})/g, ""), m[4] ?? m[2]);
    return { min: Math.min(a, b), max: Math.max(a, b), rest: f.replace(m[0], " ") };
  }
  m = f.match(new RegExp(String.raw`(?:duoi|nho hon|toi da|khong qua|under|below|less than|max)\s*${NUM}`));
  if (m) return { max: unit(m[1].replace(/\.(?=\d{3})/g, ""), m[2]), rest: f.replace(m[0], " ") };
  m = f.match(new RegExp(String.raw`(?:tren|lon hon|toi thieu|over|above|more than|min)\s*${NUM}`));
  if (m) return { min: unit(m[1].replace(/\.(?=\d{3})/g, ""), m[2]), rest: f.replace(m[0], " ") };
  return { rest: f };
}

function hasWord(f: string, phrase: string): boolean {
  return new RegExp(`(^|\\s)${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=\\s|$)`).test(f);
}
function removeWord(f: string, phrase: string): string {
  return f.replace(new RegExp(`(^|\\s)${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=\\s|$)`), " ");
}

export type ParsedQuery = {
  rep: QueryRepresentation;
  tokens: string[];
  orderCode: string | null;
  latestOrder: boolean;
};

export function parseQuery(text: string, modality: QueryRepresentation["modality"], imageColor: string | null): ParsedQuery {
  const raw = text.trim();
  let f = fold(raw);
  const hard: QueryRepresentation["hard_filters"] = {};
  const soft: Record<string, string[]> = {};
  const expansion: string[] = [];

  const code = f.match(/(?<!\d)\d{8}(?!\d)/);
  const latest = /(don hang|order).*(gan nhat|moi nhat|latest|last|recent)|(gan nhat|moi nhat).*(don hang|order)/.test(f);
  const intent: QueryRepresentation["intent"] = code ? "ORDER_LOOKUP" : latest ? "ORDER_LATEST" : "PRODUCT_SEARCH";

  const price = parsePrice(f);
  f = price.rest;
  if (price.min !== undefined) hard.price_min = Math.round(price.min);
  if (price.max !== undefined) hard.price_max = Math.round(price.max);

  // Soft concepts first so "mua dong" is not read as a colour or category
  for (const c of CONCEPTS) {
    for (const m of c.match) {
      if (hasWord(f, m)) {
        for (const [k, v] of Object.entries(c.soft)) soft[k] = Array.from(new Set([...(soft[k] ?? []), ...v]));
        for (const e of c.expand) if (!expansion.includes(e)) expansion.push(e);
        f = removeWord(f, m);
        break;
      }
    }
  }

  const cats: string[] = [];
  for (const [phrase, slugs] of CATEGORY_KEYWORDS) {
    if (hasWord(f, phrase)) {
      for (const s of slugs) if (!cats.includes(s)) cats.push(s);
      f = removeWord(f, phrase);
    }
  }
  if (cats.length) hard.category = cats;

  for (const [phrase, color, needsPrefix] of COLOR_WORDS) {
    if (needsPrefix ? hasWord(f, `mau ${phrase}`) || hasWord(f, `color ${phrase}`) : hasWord(f, phrase)) {
      hard.color = [color];
      f = needsPrefix ? removeWord(removeWord(f, `mau ${phrase}`), `color ${phrase}`) : removeWord(f, phrase);
      break;
    }
  }

  if (hasWord(f, "nam") || hasWord(f, "men") || hasWord(f, "male")) { hard.gender = ["male"]; f = removeWord(removeWord(removeWord(f, "nam"), "men"), "male"); }
  else if (hasWord(f, "nu") || hasWord(f, "women") || hasWord(f, "female")) { hard.gender = ["female"]; f = removeWord(removeWord(removeWord(f, "nu"), "women"), "female"); }

  for (const b of BRANDS) {
    if (hasWord(f, fold(b))) { hard.brand = [b]; f = removeWord(f, fold(b)); }
  }

  for (const [phrase, mat] of MATERIALS) {
    if (hasWord(f, phrase)) {
      soft.material = Array.from(new Set([...(soft.material ?? []), mat]));
      f = removeWord(f, phrase);
    }
  }

  if (imageColor && !hard.color) soft.color = [imageColor];

  for (const fill of FILLERS) f = removeWord(f, fill);
  const tokens = f.split(" ").filter((t) => t.length > 1);

  const words = fold(raw).split(" ");
  const hasViMarks = /[à-ỹđ]/i.test(raw);
  const language: "vi" | "en" | null = !raw ? null : !hasViMarks && words.some((w) => EN_WORDS.has(w)) ? "en" : "vi";

  return {
    rep: {
      modality,
      raw_text: raw || null,
      normalized_text: raw ? fold(raw) : null,
      language,
      intent,
      hard_filters: hard,
      soft_preferences: soft,
      expansion_terms: expansion,
      parser: "rules",
    },
    tokens,
    orderCode: code ? code[0] : null,
    latestOrder: latest,
  };
}

function hexRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function colorSim(a: string, b: string): number {
  if (a === b) return 1;
  const x = hexRgb(COLOR_HEX[a] ?? "#888888");
  const y = hexRgb(COLOR_HEX[b] ?? "#888888");
  const d = Math.sqrt((x[0] - y[0]) ** 2 + (x[1] - y[1]) ** 2 + (x[2] - y[2]) ** 2);
  return Math.max(0, Math.exp(-d / 110));
}

function matchesHard(p: Product, h: QueryRepresentation["hard_filters"], skip: Set<string>): boolean {
  if (!skip.has("category") && h.category?.length) {
    const allowed = new Set(h.category.flatMap((c) => descendants(c)));
    if (!allowed.has(p.category)) return false;
  }
  if (!skip.has("price_min") && h.price_min !== undefined && p.price < h.price_min) return false;
  if (!skip.has("price_max") && h.price_max !== undefined && p.price > h.price_max) return false;
  if (!skip.has("brand") && h.brand?.length && !h.brand.includes(p.brand ?? "")) return false;
  if (!skip.has("color") && Array.isArray(h.color) && !(h.color as string[]).some((c) => p.attributes.color?.includes(c))) return false;
  if (!skip.has("gender") && Array.isArray(h.gender)) {
    const g = h.gender as string[];
    const pg = p.attributes.gender ?? [];
    if (!g.some((x) => pg.includes(x)) && !pg.includes("unisex")) return false;
  }
  return true;
}

function softScore(p: Product, soft: Record<string, string[]>): number {
  const dims = Object.entries(soft).filter(([k]) => k !== "color");
  if (!dims.length) return 0;
  let hit = 0;
  for (const [k, vals] of dims) {
    const have = [...(p.attributes[k] ?? []), ...(p.tags[k] ?? [])];
    if (vals.some((v) => have.includes(v))) hit += 1;
  }
  return hit / dims.length;
}

function businessScore(p: Product): number {
  const r = (p.rating - 3.5) / 1.5;
  const s = Math.log(p.sold_count + 1) / Math.log(7000);
  const d = p.original_price ? Math.min(0.5, (p.original_price - p.price) / p.original_price) / 0.5 : 0;
  return Math.max(0, Math.min(1, 0.5 * r + 0.35 * s + 0.15 * d));
}

function textScore(p: Product, tokens: string[], expansion: string[]): number {
  const name = fold(p.name);
  const cat = fold(p.category_path.map((c) => c.name).join(" "));
  let score = 0;
  if (tokens.length) {
    for (const t of tokens) score += name.includes(t) ? 1 : cat.includes(t) ? 0.7 : 0;
    score /= tokens.length;
  }
  if (expansion.length) {
    let e = 0;
    for (const x of expansion) if (name.includes(fold(x))) e += 1;
    score += Math.min(0.3, e * 0.15);
  }
  return Math.min(1, score);
}

const r3 = (n: number) => Math.round(n * 1000) / 1000;

export function applyFilterOverrides(rep: QueryRepresentation, filters?: SearchFilters): void {
  if (!filters) return;
  const h = rep.hard_filters;
  for (const k of filters.ignore ?? []) {
    if (k === "price") { delete h.price_min; delete h.price_max; }
    else delete h[k];
  }
  if (filters.category) h.category = Array.isArray(filters.category) ? filters.category : [filters.category];
  if (filters.price_min !== undefined) h.price_min = filters.price_min;
  if (filters.price_max !== undefined) h.price_max = filters.price_max;
}

export function runSearch(req: SearchRequest, opts: { image?: { color: string | null }; modality?: QueryRepresentation["modality"] } = {}): {
  response: SearchResponse;
  orderIntent: { code: string | null; latest: boolean };
} {
  const t0 = performance.now();
  const modality = opts.modality ?? (opts.image ? (req.text.trim() ? "multimodal" : "image") : req.modality);
  const parsed = parseQuery(req.text, modality, opts.image?.color ?? null);
  const rep = parsed.rep;
  applyFilterOverrides(rep, req.filters);

  const empty = (): SearchResponse => ({ representation: rep, results: [], total: 0, relaxed_filters: [], order: null, latency_ms: 0 });
  if (rep.intent !== "PRODUCT_SEARCH") {
    return { response: empty(), orderIntent: { code: parsed.orderCode, latest: parsed.latestOrder } };
  }

  const hard = rep.hard_filters;
  const hasHard = Object.keys(hard).length > 0;
  const hasSignals = parsed.tokens.length > 0 || Object.keys(rep.soft_preferences).length > 0 || rep.expansion_terms.length > 0;
  const isImage = !!opts.image;
  const relaxed: string[] = [];

  let pool = products.filter((p) => matchesHard(p, hard, new Set()));
  if (pool.length < 3 && hasHard) {
    const skip = new Set<string>();
    for (const key of ["brand", "color", "gender", "price_min", "price_max"]) {
      if (key in hard) {
        skip.add(key);
        pool = products.filter((p) => matchesHard(p, hard, skip));
        const label = key.startsWith("price") ? "price" : key;
        if (!relaxed.includes(label)) relaxed.push(label);
        if (pool.length >= 3) break;
      }
    }
  }

  const scored: SearchResult[] = [];
  for (const p of pool) {
    const text = textScore(p, parsed.tokens, rep.expansion_terms);
    const soft = softScore(p, rep.soft_preferences);
    const business = businessScore(p);
    const catHit = hard.category?.length ? 0.55 : 0;
    const colorWant = rep.soft_preferences.color?.[0];
    const image = isImage ? (colorWant ? colorSim(colorWant, p.attributes.color?.[0] ?? "") : 0.3) : 0;

    if (!isImage && !hasHard && hasSignals && text === 0 && soft === 0) continue;
    if (!isImage && !hasHard && !hasSignals && rep.raw_text) continue;

    const t = Math.max(text, catHit);
    const wText = isImage ? 0.25 : 0.55;
    const wImage = isImage ? 0.4 : 0;
    const wSoft = 0.2;
    const wBiz = isImage ? 0.15 : 0.25 - 0.0;
    const sum = wText + wImage + wSoft + wBiz;
    const final = (t * wText + image * wImage + soft * wSoft + business * wBiz) / sum;
    const scores: Scores = { text: r3(t), image: r3(image), business: r3(business), soft: r3(soft), final: r3(final) };
    scored.push({ product: p, rank: 0, scores });
  }

  const sort = req.filters?.sort ?? "relevance";
  scored.sort((a, b) => {
    if (sort === "price_asc") return a.product.price - b.product.price;
    if (sort === "price_desc") return b.product.price - a.product.price;
    if (sort === "best_selling") return b.product.sold_count - a.product.sold_count;
    return b.scores.final - a.scores.final;
  });
  scored.forEach((r, i) => (r.rank = i + 1));

  const limit = req.limit ?? 60;
  const response: SearchResponse = {
    representation: rep,
    results: scored.slice(0, limit),
    total: scored.length,
    relaxed_filters: relaxed,
    order: null,
    latency_ms: Math.round(performance.now() - t0) + 38 + Math.floor(Math.random() * 40),
  };
  return { response, orderIntent: { code: null, latest: false } };
}

/** "More like this" for the product page, ranked on category, colour and material. */
export function similarTo(p: Product, limit = 12): SearchResponse {
  const color = p.attributes.color?.[0] ?? "";
  const scored: SearchResult[] = products
    .filter((x) => x.id !== p.id)
    .map((x) => {
      const sameCat = x.category === p.category ? 1 : x.category_path[0]?.slug === p.category_path[0]?.slug ? 0.35 : 0;
      const col = colorSim(color, x.attributes.color?.[0] ?? "");
      const mat = (x.attributes.material ?? []).some((m) => (p.attributes.material ?? []).includes(m)) ? 1 : 0;
      const business = businessScore(x);
      const image = 0.6 * sameCat + 0.4 * col;
      const final = 0.7 * image + 0.15 * mat + 0.15 * business;
      return { product: x, rank: 0, scores: { text: 0, image: r3(image), business: r3(business), soft: r3(mat), final: r3(final) } };
    })
    .filter((r) => r.scores.image > 0.3)
    .sort((a, b) => b.scores.final - a.scores.final)
    .slice(0, limit)
    .map((r, i) => ({ ...r, rank: i + 1 }));
  return {
    representation: {
      modality: "image", raw_text: null, normalized_text: null, language: null, intent: "PRODUCT_SEARCH",
      hard_filters: {}, soft_preferences: color ? { color: [color] } : {}, expansion_terms: [], parser: "rules",
    },
    results: scored,
    total: scored.length,
    relaxed_filters: [],
    order: null,
    latency_ms: 52,
  };
}

export const EXAMPLE_QUERIES = [
  "áo mùa đông",
  "đồ đi biển",
  "giày thể thao trắng dưới 500k",
  "áo khoác nam màu đen",
  "balo laptop chống nước",
  "váy đi tiệc màu đỏ",
  "winter jacket for men",
  "white sneakers under 500k",
];

export function mockSuggest(q: string): string[] {
  const f = fold(q);
  if (!f) return EXAMPLE_QUERIES.slice(0, 6);
  const pool = [...EXAMPLE_QUERIES, ...categories.map((c) => c.name), ...Array.from(new Set(products.map((p) => p.name.replace(/ màu .*/, ""))))];
  const starts = pool.filter((s) => fold(s).startsWith(f));
  const has = pool.filter((s) => !fold(s).startsWith(f) && fold(s).includes(f));
  return Array.from(new Set([...starts, ...has])).slice(0, 7);
}

export { productById };
export type { Order };
