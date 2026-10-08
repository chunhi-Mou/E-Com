"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReceiptText, Ticket, Truck, Zap } from "lucide-react";
import { formatVND } from "@/lib/format";
import { SHIPPING_FREE_FROM } from "@/store/cart";

/** Thin utility strip above the header, the way marketplaces open every page. Desktop only. */
export function TopBar() {
  const pathname = usePathname();
  if (pathname === "/login") return null;
  const link = "inline-flex items-center gap-1.5 transition-colors hover:text-white";
  return (
    <div className="bg-ink-950 text-[12.5px] text-white/75 max-lg:hidden">
      <div className="shell flex h-8 items-center justify-between">
        <p className="inline-flex items-center gap-2">
          <Truck size={14} aria-hidden />
          Freeship đơn từ <span className="num font-semibold text-white">{formatVND(SHIPPING_FREE_FROM)}</span>
          <span aria-hidden className="text-white/30">|</span>
          Đổi trả trong 7 ngày
        </p>
        <nav aria-label="Tiện ích" className="flex items-center gap-5">
          <Link href="/#flash-sale" className={link}>
            <Zap size={14} aria-hidden /> Flash Sale
          </Link>
          <Link href="/#voucher" className={link}>
            <Ticket size={14} aria-hidden /> Mã giảm giá
          </Link>
          <Link href="/orders" className={link}>
            <ReceiptText size={14} aria-hidden /> Theo dõi đơn hàng
          </Link>
        </nav>
      </div>
    </div>
  );
}
