"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { Plus } from "lucide-react";
import type { Product, Scores } from "@/lib/types";
import { discountPct, formatCompact } from "@/lib/format";
import { flyToCart, goWithImage } from "@/lib/nav";
import { useCart } from "@/store/cart";
import { useToasts } from "@/store/toast";
import { ProductImage } from "./ProductImage";
import { Price } from "./Price";
import { Rating } from "./Rating";
import { ScoreBars } from "./ScoreBars";

type Props = {
  product: Product;
  index?: number;
  animate?: boolean;
  scores?: Scores;
  rank?: number;
  compact?: boolean;
  /** Flash-sale card: swaps the rating row for a "sold" progress bar. */
  flash?: boolean;
};

/** Stable 55-95% fill for the flash-sale bar, derived from the id so it does not flicker. */
function claimedPct(id: string): number {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return 55 + (h % 41);
}

export function ProductCard({ product: p, index = 0, animate, scores, rank, compact, flash }: Props) {
  const router = useRouter();
  const imgBox = useRef<HTMLDivElement>(null);
  const add = useCart((s) => s.add);
  const push = useToasts((s) => s.push);
  const href = `/product/${p.id}`;
  const pct = discountPct(p.price, p.original_price);

  const onOpen = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    goWithImage(router, href, imgBox.current);
  };

  const quickAdd = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    add(p, 1);
    flyToCart(imgBox.current, p.images[0]);
    push({ text: "Đã thêm vào giỏ", href: "/cart", action: "Xem giỏ" });
  };

  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-sheet transition-[border-color,box-shadow,transform] duration-300 ease-out hover:-translate-y-1 hover:border-ink-200 hover:shadow-lift ${animate ? "rise-in" : ""}`}
      style={{ "--i": index } as React.CSSProperties}
    >
      <Link href={href} onClick={onOpen} className="flex flex-1 flex-col rounded-none outline-offset-[-2px]">
        <div ref={imgBox} className="relative aspect-square overflow-hidden">
          <ProductImage src={p.images[0]} alt={p.name} className="transition-[transform,opacity] duration-700 ease-out group-hover:scale-[1.05]" />
          {pct > 0 && (
            <span className="num absolute left-0 top-2.5 rounded-r-md bg-sale-600 px-2 py-1 text-[12px] font-bold leading-none text-white shadow-sm">-{pct}%</span>
          )}
        </div>
        <div className={`flex flex-1 flex-col gap-2 ${compact ? "p-3" : "p-3.5"}`}>
          <h3 className="clamp-2 min-h-[2.7em] text-[13.5px] leading-[1.35] text-fg">{p.name}</h3>
          <Price price={p.price} original={p.original_price} size={compact ? "sm" : "md"} hideBadge />
          {flash ? (
            <div className="mt-auto">
              <div className="h-1.5 overflow-hidden rounded-full bg-sale-100" aria-hidden>
                <span className="block h-full rounded-full bg-[linear-gradient(90deg,#F25A3E,#D93A24)]" style={{ width: `${claimedPct(p.id)}%` }} />
              </div>
              <p className="num mt-1.5 text-[11.5px] font-semibold text-sale-700">Đã bán {formatCompact(p.sold_count)}</p>
            </div>
          ) : (
            <Rating rating={p.rating} sold={p.sold_count} />
          )}
        </div>
      </Link>
      <button
        type="button"
        onClick={quickAdd}
        aria-label={`Thêm vào giỏ: ${p.name}`}
        className="absolute right-2.5 top-2.5 grid size-9 translate-y-1 place-items-center rounded-full bg-white text-ink-700 opacity-0 shadow-md transition-[opacity,background-color,color,transform] duration-200 hover:bg-ink-600 hover:text-white focus-visible:translate-y-0 focus-visible:opacity-100 active:scale-90 group-hover:translate-y-0 group-hover:opacity-100 max-md:translate-y-0 max-md:opacity-100"
      >
        <Plus size={18} strokeWidth={2.25} />
      </button>
      {scores && rank !== undefined && <ScoreBars scores={scores} rank={rank} />}
    </article>
  );
}
