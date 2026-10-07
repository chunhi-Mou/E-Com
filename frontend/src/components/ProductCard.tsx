"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { Plus } from "lucide-react";
import type { Product, Scores } from "@/lib/types";
import { discountPct } from "@/lib/format";
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
};

export function ProductCard({ product: p, index = 0, animate, scores, rank, compact }: Props) {
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
      className={`group relative flex flex-col overflow-hidden rounded-lg border border-line bg-sheet transition-[border-color,box-shadow,transform] duration-200 hover:border-ink-300 hover:shadow-lift ${animate ? "rise-in" : ""}`}
      style={{ "--i": index } as React.CSSProperties}
    >
      <Link href={href} onClick={onOpen} className="flex flex-1 flex-col rounded-none outline-offset-[-2px]">
        <div ref={imgBox} className="relative aspect-square overflow-hidden">
          <ProductImage src={p.images[0]} alt={p.name} className="transition-transform duration-500 ease-out group-hover:scale-[1.04]" />
          {pct > 0 && (
            <span className="label-cond absolute left-0 top-2.5 rounded-r-[4px] bg-seal-600 py-1 pl-2 pr-2.5 text-[12px] leading-none text-white">-{pct}%</span>
          )}
        </div>
        <div className={`flex flex-1 flex-col gap-1.5 ${compact ? "p-2.5" : "p-3"}`}>
          <h3 className="clamp-2 min-h-[2.6em] text-[13.5px] leading-[1.3] text-fg">{p.name}</h3>
          <Price price={p.price} original={p.original_price} size={compact ? "sm" : "md"} hideBadge />
          <Rating rating={p.rating} sold={p.sold_count} />
        </div>
      </Link>
      <button
        type="button"
        onClick={quickAdd}
        aria-label={`Thêm vào giỏ: ${p.name}`}
        className="absolute right-2.5 top-2.5 grid size-9 place-items-center rounded-full border border-line bg-white/95 text-ink-700 opacity-0 shadow-sm transition-[opacity,background-color,color,transform] duration-150 hover:bg-ink-600 hover:text-white focus-visible:opacity-100 active:scale-90 group-hover:opacity-100 max-md:opacity-100"
      >
        <Plus size={18} strokeWidth={2.25} />
      </button>
      {scores && rank !== undefined && <ScoreBars scores={scores} rank={rank} />}
    </article>
  );
}
