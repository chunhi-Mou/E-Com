"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronRight, ShoppingBag, Zap } from "lucide-react";
import { getCachedProduct, getProduct, searchSimilar } from "@/lib/api";
import { discountPct, formatVND } from "@/lib/format";
import { useAsync } from "@/lib/hooks";
import { flyToCart, signalViewReady } from "@/lib/nav";
import { searchUrl } from "@/lib/searchActions";
import { attrLabel, valueLabel } from "@/lib/vocab";
import type { Product } from "@/lib/types";
import { useCart } from "@/store/cart";
import { useToasts } from "@/store/toast";
import { EmptyState } from "@/components/EmptyState";
import { Gallery } from "@/components/Gallery";
import { Price } from "@/components/Price";
import { ProductCard } from "@/components/ProductCard";
import { QtyStepper } from "@/components/QtyStepper";
import { Rating } from "@/components/Rating";
import { Section } from "@/components/Section";
import { GridSkeleton } from "@/components/Skeletons";

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const { data: p, error, loading, reload } = useAsync(() => getProduct(id), id, getCachedProduct(id) ?? null);

  useEffect(() => {
    if (p) {
      document.title = `${p.name} | Lumina`;
      signalViewReady();
    }
  }, [p]);

  if (!p && loading) return <ProductSkeleton />;
  if (!p || error) {
    return (
      <div className="shell py-10">
        <EmptyState
          title="Không tìm thấy sản phẩm"
          action={
            <>
              <button type="button" onClick={reload} className="h-10 rounded-lg border border-line-strong bg-white px-4 text-[14px] font-semibold hover:bg-ink-50">Thử lại</button>
              <Link href="/" className="inline-flex h-10 items-center rounded-lg bg-ink-600 px-4 text-[14px] font-semibold text-white hover:bg-ink-700">Về trang chủ</Link>
            </>
          }
        >
          Sản phẩm có thể đã ngừng bán, hoặc đường dẫn chưa đúng.
        </EmptyState>
      </div>
    );
  }
  return <ProductView key={p.id} p={p} />;
}

function ProductSkeleton() {
  return (
    <div className="shell grid gap-8 py-6 lg:grid-cols-[minmax(0,560px)_1fr]">
      <div className="skeleton aspect-square" />
      <div className="space-y-4">
        <div className="skeleton h-7 w-4/5" />
        <div className="skeleton h-5 w-1/3" />
        <div className="skeleton h-24 w-full" />
        <div className="skeleton h-12 w-2/3" />
      </div>
    </div>
  );
}

function variantsOf(p: Product): { key: string; values: string[] }[] {
  return Object.entries(p.attributes)
    .filter(([key, vals]) => key === "color" && vals.length > 1)
    .map(([key, values]) => ({ key, values }));
}

function ProductView({ p }: { p: Product }) {
  const router = useRouter();
  const add = useCart((s) => s.add);
  const push = useToasts((s) => s.push);
  const [qty, setQty] = useState(1);
  const [chosen, setChosen] = useState<Record<string, string>>({});
  const [stamp, setStamp] = useState(0);
  const [justAdded, setJustAdded] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);

  const variants = variantsOf(p);
  const variantLabel = variants.length
    ? variants.map((v) => `${attrLabel(v.key)}: ${valueLabel(v.key, chosen[v.key] ?? v.values[0])}`).join(", ")
    : undefined;
  const pct = discountPct(p.price, p.original_price);

  const similar = useAsync(() => searchSimilar(p), p.id);

  useEffect(() => {
    const t = timers.current;
    return () => t.forEach((x) => window.clearTimeout(x));
  }, []);

  const doAdd = (e: React.MouseEvent<HTMLButtonElement>, goCheckout = false) => {
    add(p, qty, variantLabel);
    if (goCheckout) {
      router.push("/checkout");
      return;
    }
    flyToCart(mainRef.current?.querySelector("img") ?? e.currentTarget, p.images[0]);
    setStamp((n) => n + 1);
    setJustAdded(true);
    timers.current.push(window.setTimeout(() => setStamp(0), 1500), window.setTimeout(() => setJustAdded(false), 1700));
    push({ text: "Đã thêm vào giỏ", href: "/cart", action: "Xem giỏ" });
  };

  const specs = useMemo(() => {
    const rows: [string, string][] = [];
    if (p.brand) rows.push(["Thương hiệu", p.brand]);
    rows.push(["Danh mục", p.category_path.map((c) => c.name).join(" › ")]);
    for (const [k, vals] of Object.entries(p.attributes)) rows.push([attrLabel(k), vals.map((x) => valueLabel(k, x)).join(", ")]);
    for (const [k, vals] of Object.entries(p.tags)) if (vals.length) rows.push([attrLabel(k), vals.map((x) => valueLabel(k, x)).join(", ")]);
    rows.push(["Còn hàng", `${p.stock} sản phẩm`]);
    return rows;
  }, [p]);

  const outOfStock = p.stock <= 0;

  return (
    <div className="shell pb-28 pt-4 md:pb-8 md:pt-5">
      <nav aria-label="Đường dẫn" className="mb-4 flex flex-wrap items-center gap-1 text-[13px] text-muted">
        <Link href="/" className="hover:text-ink-600">Trang chủ</Link>
        {p.category_path.map((c) => (
          <span key={c.slug} className="flex items-center gap-1">
            <ChevronRight size={13} />
            <Link href={searchUrl({ category: c.slug })} className="hover:text-ink-600">{c.name}</Link>
          </span>
        ))}
      </nav>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,580px)_minmax(0,1fr)] lg:gap-10">
        <Gallery images={p.images.length ? p.images : [""]} name={p.name} stampKey={stamp} mainRef={mainRef} />

        <div className="min-w-0">
          <h1 className="balance text-[22px] font-bold leading-snug tracking-[-0.01em] md:text-[26px]">{p.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <Rating rating={p.rating} count={p.rating_count} sold={p.sold_count} size={14} />
            {p.brand && <span className="text-[13px] text-muted">Thương hiệu: <b className="font-semibold text-fg">{p.brand}</b></span>}
          </div>

          <div className="mt-4 rounded-lg bg-seal-50 px-4 py-3.5 ring-1 ring-seal-100">
            <Price price={p.price} original={p.original_price} size="lg" />
            {pct > 0 && p.original_price && (
              <p className="num mt-1.5 text-[13px] text-seal-700">Tiết kiệm {formatVND(p.original_price - p.price)}</p>
            )}
          </div>

          {variants.map((v) => (
            <fieldset key={v.key} className="mt-5">
              <legend className="mb-2 text-[14px] font-semibold">
                {attrLabel(v.key)}: <span className="font-normal text-muted">{valueLabel(v.key, chosen[v.key] ?? v.values[0])}</span>
              </legend>
              <div className="flex flex-wrap gap-2">
                {v.values.map((val) => {
                  const on = (chosen[v.key] ?? v.values[0]) === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setChosen((c) => ({ ...c, [v.key]: val }))}
                      className={`h-10 rounded-lg border px-4 text-[14px] transition-colors ${on ? "border-ink-600 bg-ink-50 font-semibold text-ink-800 ring-1 ring-ink-600" : "border-line-strong bg-white hover:border-ink-300"}`}
                    >
                      {valueLabel(v.key, val)}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}

          <div className="mt-5 flex items-center gap-3">
            <span className="text-[14px] font-semibold">Số lượng</span>
            <QtyStepper value={qty} onChange={(n) => setQty(Math.max(1, Math.min(p.stock || 99, n)))} max={p.stock || 99} />
            <span className={`text-[13px] ${p.stock < 15 ? "font-medium text-seal-700" : "text-muted"}`}>
              {outOfStock ? "Hết hàng" : p.stock < 15 ? `Chỉ còn ${p.stock}` : `${p.stock} sản phẩm có sẵn`}
            </span>
          </div>

          <div className="mt-5 hidden gap-3 md:flex">
            <AddButton onClick={doAdd} added={justAdded} disabled={outOfStock} />
            <button
              type="button"
              disabled={outOfStock}
              onClick={(e) => doAdd(e, true)}
              className="inline-flex h-12 min-w-[150px] items-center justify-center gap-2 rounded-lg bg-seal-600 px-6 text-[15px] font-semibold text-white transition-[background-color,transform] hover:bg-seal-700 active:scale-[0.97] disabled:bg-faint"
            >
              <Zap size={18} /> Mua ngay
            </button>
          </div>

          <section className="mt-8">
            <h2 className="mb-2 text-[17px] font-bold">Thông tin chi tiết</h2>
            <dl className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-sheet">
              {specs.map(([k, val]) => (
                <div key={k} className="grid grid-cols-[130px_1fr] gap-3 px-4 py-2.5 text-[14px]">
                  <dt className="text-muted">{k}</dt>
                  <dd className="min-w-0">{val}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="mt-6">
            <h2 className="mb-2 text-[17px] font-bold">Mô tả</h2>
            <p className="pretty max-w-[68ch] text-[15px] leading-relaxed text-fg/90">{p.description}</p>
          </section>
        </div>
      </div>

      <Section title="Sản phẩm tương tự" aside={<span className="text-[13px] text-muted">tìm theo ảnh chính của sản phẩm</span>}>
        {similar.loading && !similar.data ? (
          <GridSkeleton n={6} cols="grid-cols-2 sm:grid-cols-3 lg:grid-cols-6" />
        ) : similar.data && similar.data.results.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-6">
            {similar.data.results.slice(0, 6).map((r, i) => (
              <ProductCard key={r.product.id} product={r.product} index={i} compact />
            ))}
          </div>
        ) : (
          <p className="text-[14px] text-muted">Chưa tìm được sản phẩm tương tự.</p>
        )}
      </Section>

      {/* Mobile purchase bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-line bg-sheet px-4 py-2.5 pb-[max(10px,env(safe-area-inset-bottom))] md:hidden">
        <div className="min-w-0 flex-1">
          <p className="num truncate text-[18px] font-bold leading-tight text-seal-600">{formatVND(p.price * qty)}</p>
          {qty > 1 && <p className="num text-[12px] text-muted">{qty} × {formatVND(p.price)}</p>}
        </div>
        <AddButton onClick={doAdd} added={justAdded} disabled={outOfStock} compact />
        <button type="button" disabled={outOfStock} onClick={(e) => doAdd(e, true)} className="h-11 rounded-lg bg-seal-600 px-5 text-[14px] font-semibold text-white active:bg-seal-700 disabled:bg-faint">
          Mua ngay
        </button>
      </div>
    </div>
  );
}

function AddButton({ onClick, added, disabled, compact }: { onClick: (e: React.MouseEvent<HTMLButtonElement>) => void; added: boolean; disabled?: boolean; compact?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-lg border-2 border-ink-600 font-semibold text-ink-700 transition-[background-color,color,transform] hover:bg-ink-50 active:scale-[0.97] disabled:border-line-strong disabled:text-faint ${compact ? "h-11 w-11 px-0" : "h-12 min-w-[190px] px-6 text-[15px]"}`}
      aria-label="Thêm vào giỏ"
    >
      <AnimatePresence mode="wait" initial={false}>
        {added ? (
          <motion.span key="ok" initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -14, opacity: 0 }} transition={{ duration: 0.16 }} className="flex items-center gap-2 text-ok">
            <Check size={19} strokeWidth={3} /> {!compact && "Đã thêm"}
          </motion.span>
        ) : (
          <motion.span key="add" initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -14, opacity: 0 }} transition={{ duration: 0.16 }} className="flex items-center gap-2">
            <ShoppingBag size={19} /> {!compact && "Thêm vào giỏ"}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
