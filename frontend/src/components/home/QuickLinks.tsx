"use client";
import Link from "next/link";
import { Camera, Gift, LayoutGrid, Mic, Ticket, Trophy, WalletCards, Zap, type LucideIcon } from "lucide-react";
import { fireSearch, searchUrl } from "@/lib/searchActions";

type Item = { label: string; icon: LucideIcon; tint: string; href?: string; onClick?: () => void };

const ITEMS: Item[] = [
  { label: "Flash Sale", icon: Zap, tint: "bg-sale-50 text-sale-600", href: "/#flash-sale" },
  { label: "Mã giảm giá", icon: Ticket, tint: "bg-amber-50 text-amber-600", href: "/#voucher" },
  { label: "Bán chạy", icon: Trophy, tint: "bg-ink-50 text-ink-600", href: "/#goi-y" },
  { label: "Dưới 100K", icon: WalletCards, tint: "bg-emerald-50 text-emerald-600", href: searchUrl({ text: "giá dưới 100k" }) },
  { label: "Quà tặng", icon: Gift, tint: "bg-pink-50 text-pink-600", href: searchUrl({ text: "quà tặng" }) },
  { label: "Nói để tìm", icon: Mic, tint: "bg-ink-50 text-ink-600", onClick: () => fireSearch("voice") },
  { label: "Tìm bằng ảnh", icon: Camera, tint: "bg-ink-50 text-ink-600", onClick: () => fireSearch("image") },
  { label: "Tất cả danh mục", icon: LayoutGrid, tint: "bg-paper text-fg", href: "/#danh-muc" },
];

const tile =
  "group flex flex-col items-center gap-2 rounded-xl px-1 py-2 text-center transition-[background-color,transform] duration-200 hover:bg-paper active:scale-95";

export function QuickLinks() {
  return (
    <nav aria-label="Lối tắt" className="mt-4 rounded-2xl border border-line bg-sheet px-2 py-3 md:mt-5 md:px-4">
      <ul className="grid grid-cols-4 gap-y-2 lg:grid-cols-8">
        {ITEMS.map(({ label, icon: Icon, tint, href, onClick }) => {
          const inner = (
            <>
              <span className={`grid size-12 place-items-center rounded-2xl transition-transform duration-200 group-hover:-translate-y-0.5 md:size-14 ${tint}`}>
                <Icon size={24} strokeWidth={1.9} />
              </span>
              <span className="text-[12.5px] font-medium leading-tight text-fg md:text-[13px]">{label}</span>
            </>
          );
          return (
            <li key={label}>
              {href ? (
                <Link href={href} className={tile}>
                  {inner}
                </Link>
              ) : (
                <button type="button" onClick={onClick} className={`${tile} w-full`}>
                  {inner}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
