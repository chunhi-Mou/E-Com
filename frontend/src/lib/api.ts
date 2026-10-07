// Typed client for the backend API, with a mock mode that mirrors the same shapes.
import { create } from "zustand";
import { categories as mockCategories, productById, products as mockProducts, descendants } from "@/mocks/catalog";
import { mockOrders } from "@/mocks/orders";
import { mockSuggest, runSearch, similarTo } from "@/mocks/engine";
import { useOrders, simulateStatus } from "@/store/orders";
import { dominantColor } from "./image";
import type {
  AssistantReply, AssistantReplyRequest, Category, Order, Product, ProductsPage, SearchFilters,
  SearchRequest, SearchResponse, SortKey, TranscribeResponse,
} from "./types";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");
const FORCE = process.env.NEXT_PUBLIC_USE_MOCK;

export type ApiMode = "mock" | "real";
export const useApiMode = create<{ mode: ApiMode | null }>(() => ({ mode: null }));

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

let modePromise: Promise<ApiMode> | null = null;

export function getMode(): Promise<ApiMode> {
  if (!modePromise) {
    modePromise = (async (): Promise<ApiMode> => {
      let m: ApiMode;
      if (FORCE === "1") m = "mock";
      else if (FORCE === "0") m = "real";
      else {
        try {
          const r = await fetch(`${API_URL}/api/categories`, { signal: AbortSignal.timeout(1500) });
          m = r.ok ? "real" : "mock";
        } catch {
          m = "mock";
        }
      }
      useApiMode.setState({ mode: m });
      return m;
    })();
  }
  return modePromise;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const jitter = (base: number) => base + Math.floor(Math.random() * 120);

async function http<T>(path: string, init?: RequestInit, timeout = 20000): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, signal: AbortSignal.timeout(timeout) });
  } catch {
    throw new ApiError(0, "Không kết nối được máy chủ");
  }
  if (!res.ok) throw new ApiError(res.status, `HTTP ${res.status}`);
  return (await res.json()) as T;
}

function absImage(u: string): string {
  if (/^(https?:|data:|blob:)/.test(u) || u.startsWith("/mock-img/")) return u;
  return `${API_URL}${u.startsWith("/") ? "" : "/"}${u}`;
}

const productCache = new Map<string, Product>();
export const getCachedProduct = (id: string) => productCache.get(id);

function norm(p: Product, mode: ApiMode): Product {
  const out = mode === "real" ? { ...p, images: (p.images ?? []).map(absImage) } : p;
  productCache.set(out.id, out);
  return out;
}
function normResponse(r: SearchResponse, mode: ApiMode): SearchResponse {
  return { ...r, results: r.results.map((x) => ({ ...x, product: norm(x.product, mode) })), order: r.order ? normOrder(r.order, mode) : null };
}
function normOrder(o: Order, mode: ApiMode): Order {
  return { ...o, items: o.items.map((i) => ({ ...i, product: norm(i.product, mode) })) };
}

// ---------- Orders (local first: checkout is a client-side mock) ----------
function localOrder(code: string): Order | null {
  const o = useOrders.getState().orders.find((x) => x.order_code === code);
  return o ? simulateStatus(o) : null;
}

// ---------- Search ----------
let cachedRoots: string[] | null = null;
async function rootSlugs(): Promise<string[]> {
  if (!cachedRoots) cachedRoots = (await getCategories()).filter((c) => !c.parent).map((c) => c.slug);
  return cachedRoots;
}

/** Sentinels: the contract has no "clear filter" field, so clearing is expressed as an override that matches everything. */
export const CLEARED_PRICE_MAX = 1_000_000_000;

export async function search(req: SearchRequest): Promise<SearchResponse> {
  const mode = await getMode();
  if (mode === "mock") {
    await sleep(jitter(260));
    const { response, orderIntent } = runSearch(req);
    if (orderIntent.code) response.order = await getOrder(orderIntent.code).catch(() => null);
    else if (orderIntent.latest) response.order = await getLatestOrder().catch(() => null);
    return normResponse(response, mode);
  }
  const filters: SearchFilters = { ...(req.filters ?? {}) };
  const ignore = filters.ignore ?? [];
  delete filters.ignore;
  const extra: string[] = [];
  for (const k of ignore) {
    if (k === "category") filters.category ??= await rootSlugs();
    else if (k === "price") { filters.price_min ??= 0; filters.price_max ??= CLEARED_PRICE_MAX; }
    else extra.push(k);
  }
  const body = { ...req, filters: { ...filters, ...(extra.length ? { ignore: extra } : {}) } };
  try {
    return normResponse(await http<SearchResponse>("/api/search", jsonInit(body)), mode);
  } catch (e) {
    if (extra.length && e instanceof ApiError && e.status >= 400 && e.status < 500) {
      return normResponse(await http<SearchResponse>("/api/search", jsonInit({ ...req, filters })), mode);
    }
    throw e;
  }
}

export async function searchImage(file: File, text = "", limit = 60, filters?: SearchFilters): Promise<SearchResponse> {
  const mode = await getMode();
  if (mode === "mock") {
    const color = await dominantColor(file);
    await sleep(jitter(520));
    return normResponse(runSearch({ text, modality: "text", limit, filters }, { image: { color } }).response, mode);
  }
  const fd = new FormData();
  fd.append("image", file);
  if (text.trim()) fd.append("text", text.trim());
  fd.append("limit", String(limit));
  return normResponse(await http<SearchResponse>("/api/search/image", { method: "POST", body: fd }, 40000), mode);
}

/** "Similar products": search by the product's main image, falling back to its name. */
export async function searchSimilar(p: Product): Promise<SearchResponse> {
  const mode = await getMode();
  if (mode === "mock") {
    await sleep(jitter(200));
    return normResponse(similarTo(p), mode);
  }
  try {
    // no-store: the <img> tag already cached this URL without CORS headers, and a cached entry would make this fetch fail
    const blob = await (await fetch(p.images[0], { signal: AbortSignal.timeout(8000), cache: "no-store" })).blob();
    const r = await searchImage(new File([blob], "main.jpg", { type: blob.type || "image/jpeg" }), "", 16);
    return { ...r, results: r.results.filter((x) => x.product.id !== p.id).slice(0, 12) };
  } catch {
    const r = await search({ text: p.name, modality: "text", limit: 16 });
    return { ...r, results: r.results.filter((x) => x.product.id !== p.id).slice(0, 12) };
  }
}

const jsonInit = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

// ---------- Catalog ----------
export async function listProducts(q: { category?: string; page?: number; page_size?: number; sort?: SortKey }): Promise<ProductsPage> {
  const mode = await getMode();
  const page = q.page ?? 1;
  const size = q.page_size ?? 24;
  if (mode === "mock") {
    await sleep(jitter(120));
    let items = q.category ? mockProducts.filter((p) => descendants(q.category!).includes(p.category)) : [...mockProducts];
    if (q.sort === "price_asc") items.sort((a, b) => a.price - b.price);
    else if (q.sort === "price_desc") items.sort((a, b) => b.price - a.price);
    else if (q.sort === "best_selling") items.sort((a, b) => b.sold_count - a.sold_count);
    const total = items.length;
    items = items.slice((page - 1) * size, page * size);
    return { items: items.map((p) => norm(p, mode)), total };
  }
  const qs = new URLSearchParams();
  if (q.category) qs.set("category", q.category);
  qs.set("page", String(page));
  qs.set("page_size", String(size));
  if (q.sort) qs.set("sort", q.sort);
  const r = await http<ProductsPage>(`/api/products?${qs}`);
  return { ...r, items: r.items.map((p) => norm(p, mode)) };
}

export async function getProduct(id: string): Promise<Product> {
  const mode = await getMode();
  if (mode === "mock") {
    await sleep(80);
    const p = productById.get(id);
    if (!p) throw new ApiError(404, "Không tìm thấy sản phẩm");
    return norm(p, mode);
  }
  return norm(await http<Product>(`/api/products/${encodeURIComponent(id)}`), mode);
}

let catPromise: Promise<Category[]> | null = null;
export function getCategories(): Promise<Category[]> {
  if (!catPromise) {
    catPromise = getMode()
      .then((m) => (m === "mock" ? mockCategories : http<Category[]>("/api/categories")))
      .catch((e) => {
        catPromise = null;
        throw e;
      });
  }
  return catPromise;
}

// ---------- Orders ----------
export async function getOrder(code: string): Promise<Order> {
  const local = localOrder(code);
  if (local) return local;
  const mode = await getMode();
  if (mode === "mock") {
    await sleep(160);
    const o = mockOrders.find((x) => x.order_code === code);
    if (!o) throw new ApiError(404, "Không tìm thấy đơn hàng");
    return o;
  }
  return normOrder(await http<Order>(`/api/orders/${encodeURIComponent(code)}`), mode);
}

export async function getLatestOrder(customerId = "C001"): Promise<Order> {
  const local = useOrders.getState().orders[0];
  if (local) return simulateStatus(local);
  const mode = await getMode();
  if (mode === "mock") {
    await sleep(160);
    return [...mockOrders].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  }
  return normOrder(await http<Order>(`/api/orders/latest?customer_id=${encodeURIComponent(customerId)}`), mode);
}

// ---------- Phase 2: adapters (each may be missing; callers fall back in the browser) ----------
const unavailable = { transcribe: false, reply: false, suggest: false };

export async function transcribe(audio: Blob, lang: "vi" | "en"): Promise<TranscribeResponse> {
  const mode = await getMode();
  if (mode === "mock" || unavailable.transcribe) throw new ApiError(404, "transcribe unavailable");
  const fd = new FormData();
  fd.append("audio", audio, `voice.${audio.type.includes("ogg") ? "ogg" : "webm"}`);
  fd.append("lang", lang);
  try {
    return await http<TranscribeResponse>("/api/speech/transcribe", { method: "POST", body: fd }, 30000);
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 405 || e.status === 501)) unavailable.transcribe = true;
    throw e;
  }
}

export async function assistantReply(body: AssistantReplyRequest): Promise<AssistantReply> {
  const mode = await getMode();
  if (mode === "mock" || unavailable.reply) throw new ApiError(404, "assistant unavailable");
  try {
    const r = await http<AssistantReply>("/api/assistant/reply", jsonInit(body), 20000);
    return { ...r, audio_url: r.audio_url ? absImage(r.audio_url) : "" };
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 405 || e.status === 501)) unavailable.reply = true;
    throw e;
  }
}

export async function suggest(q: string): Promise<string[]> {
  const mode = await getMode();
  if (mode === "mock" || unavailable.suggest) return mockSuggest(q);
  try {
    const r = await http<{ suggestions: string[] }>(`/api/search/suggest?q=${encodeURIComponent(q)}`, undefined, 4000);
    return r.suggestions;
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) unavailable.suggest = true;
    return mockSuggest(q);
  }
}
