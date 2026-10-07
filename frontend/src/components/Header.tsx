"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense } from "react";
import { motion } from "motion/react";
import { Braces, LogIn, LogOut, ReceiptText, Search, ShoppingBag } from "lucide-react";
import { Logo } from "./Logo";
import { SearchBar } from "./SearchBar";
import { CategoryNav } from "./CategoryNav";
import { cartCount, useCart } from "@/store/cart";
import { useUi } from "@/store/ui";
import { useAuth } from "@/store/auth";
import { useHydrated } from "@/lib/hooks";

function SearchFallback() {
  return (
    <div className="mx-auto flex h-11 w-full max-w-[640px] items-center gap-2 rounded-xl bg-white pl-3 text-faint ring-1 ring-white/25 md:h-12">
      <Search size={19} className="text-ink-500" />
      <span className="text-[15px]">Tìm áo mùa đông, giày trắng dưới 500k…</span>
    </div>
  );
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const lines = useCart((s) => s.lines);
  const hydrated = useHydrated();
  const count = hydrated ? cartCount(lines) : 0;
  const inspect = useUi((s) => s.inspect);
  const toggle = useUi((s) => s.toggleInspect);
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const authHydrated = useAuth((s) => s.hydrated);

  if (pathname === "/login") return null;

  const actions = (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={toggle}
        aria-pressed={hydrated && inspect}
        title="Hiện cách hệ thống hiểu truy vấn và chấm điểm kết quả"
        className={`flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-semibold transition-colors ${
          hydrated && inspect ? "bg-hl text-ink-950" : "text-white/85 hover:bg-white/10 hover:text-white"
        }`}
      >
        <Braces size={18} />
        <span className="max-xl:hidden">Inspect</span>
      </button>
      <Link href="/orders" className="flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-semibold text-white/85 transition-colors hover:bg-white/10 hover:text-white" aria-label="Đơn hàng">
        <ReceiptText size={19} />
        <span className="max-xl:hidden">Đơn hàng</span>
      </Link>
      <Link href="/cart" className="relative flex h-9 items-center gap-2.5 rounded-lg px-3 text-[13px] font-semibold text-white/85 transition-colors hover:bg-white/10 hover:text-white" aria-label={`Giỏ hàng, ${count} sản phẩm`}>
        <span data-cart-icon className="relative grid place-items-center">
          <ShoppingBag size={20} />
          {count > 0 && (
            <motion.span
              key={count}
              initial={{ scale: 0.4 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 600, damping: 14 }}
              className="num absolute -right-2.5 -top-2 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-seal-600 px-1 text-[11px] font-bold leading-none text-white ring-2 ring-ink-800"
            >
              {count > 99 ? "99+" : count}
            </motion.span>
          )}
        </span>
        <span className="max-xl:hidden">Giỏ hàng</span>
      </Link>
      {authHydrated && user ? (
        <div className="flex items-center gap-1.5 pl-1">
          <span className="flex h-8 items-center gap-1.5 rounded-full border border-purple-300/40 bg-purple-900/60 px-2.5 text-[12px] font-bold text-purple-200 shadow-sm backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="max-xl:hidden">Admin</span>
          </span>
          <button
            type="button"
            onClick={() => {
              logout();
              router.replace("/login");
            }}
            title="Đăng xuất khỏi hệ thống"
            className="flex h-9 items-center gap-1 rounded-lg px-2 text-[13px] font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Đăng xuất"
          >
            <LogOut size={16} />
            <span className="max-xl:hidden">Thoát</span>
          </button>
        </div>
      ) : (
        <Link
          href="/login"
          className="flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-semibold text-white/85 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Đăng nhập quản trị"
        >
          <LogIn size={18} />
          <span className="max-xl:hidden">Đăng nhập</span>
        </Link>
      )}
    </div>
  );

  return (
    <header className="on-ink sticky top-[-56px] z-40 bg-ink-800 text-white lg:top-0">
      <div className="shell">
        {/* Mobile row 1 (scrolls away; the search row below stays) */}
        <div className="flex h-14 items-center justify-between lg:hidden">
          <Link href="/" aria-label="Sắm, trang chủ">
            <Logo />
          </Link>
          {actions}
        </div>
        <div className="flex items-center gap-4 pb-3 lg:h-16 lg:pb-0">
          <Link href="/" aria-label="Sắm, trang chủ" className="max-lg:hidden">
            <Logo />
          </Link>
          <div className="min-w-0 flex-1">
            <Suspense fallback={<SearchFallback />}>
              <SearchBar />
            </Suspense>
          </div>
          <div className="max-lg:hidden">{actions}</div>
        </div>
      </div>
      <CategoryNav />
    </header>
  );
}
