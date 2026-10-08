"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { motion } from "motion/react";
import { LogIn, LogOut, ReceiptText, Search, ShoppingBag } from "lucide-react";
import { Logo } from "./Logo";
import { SearchBar } from "./SearchBar";
import { CategoryNav } from "./CategoryNav";
import { cartCount, useCart } from "@/store/cart";
import { useAuth } from "@/store/auth";
import { useCurtain } from "@/store/curtain";
import { useHydrated } from "@/lib/hooks";

function SearchFallback() {
  return (
    <div className="mx-auto flex h-11 w-full max-w-[640px] items-center gap-2 rounded-2xl bg-paper pl-3.5 text-faint ring-1 ring-line md:h-12">
      <Search size={19} />
      <span className="text-[15px]">Tìm áo mùa đông, giày trắng dưới 500k…</span>
    </div>
  );
}

const ghost =
  "flex h-10 items-center gap-2 rounded-xl px-3 text-[13.5px] font-medium text-muted transition-[background-color,color,transform] duration-150 hover:bg-paper hover:text-fg active:scale-95";

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const lines = useCart((s) => s.lines);
  const hydrated = useHydrated();
  const count = hydrated ? cartCount(lines) : 0;
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const authHydrated = useAuth((s) => s.hydrated);
  // After the login curtain the header arrives a beat later, as the circle opens.
  const afterCurtain = useCurtain((s) => s.phase !== "idle");

  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 4);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  if (pathname === "/login") return null;

  const initial = (user?.name ?? "A").trim().charAt(0).toUpperCase();

  const actions = (
    <div className="flex items-center gap-0.5">
      <Link href="/orders" className={ghost} aria-label="Đơn hàng">
        <ReceiptText size={19} />
        <span className="max-xl:hidden">Đơn hàng</span>
      </Link>
      <Link href="/cart" className={ghost} aria-label={`Giỏ hàng, ${count} sản phẩm`}>
        <span data-cart-icon className="relative grid place-items-center">
          <ShoppingBag size={20} />
          {count > 0 && (
            <motion.span
              key={count}
              initial={{ scale: 0.4 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 600, damping: 14 }}
              className="num absolute -right-2.5 -top-2 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-ink-600 px-1 text-[11px] font-bold leading-none text-white ring-2 ring-white"
            >
              {count > 99 ? "99+" : count}
            </motion.span>
          )}
        </span>
        <span className="max-xl:hidden">Giỏ hàng</span>
      </Link>
      <span className="mx-1.5 h-6 w-px bg-line max-lg:hidden" aria-hidden />
      {authHydrated && user ? (
        <div className="flex items-center gap-1">
          <span className="grid size-9 place-items-center rounded-full bg-ink-100 text-[13px] font-bold text-ink-700" title={`${user.name} (${user.role})`}>
            {initial}
          </span>
          <button
            type="button"
            onClick={() => {
              logout();
              router.replace("/login");
            }}
            title="Đăng xuất"
            className={`${ghost} !px-2.5`}
            aria-label="Đăng xuất"
          >
            <LogOut size={18} />
          </button>
        </div>
      ) : (
        <Link href="/login" className={ghost} aria-label="Đăng nhập">
          <LogIn size={18} />
          <span className="max-xl:hidden">Đăng nhập</span>
        </Link>
      )}
    </div>
  );

  return (
    <motion.header
      initial={{ y: -18, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: afterCurtain ? 0.4 : 0 }}
      className={`sticky top-[-56px] z-40 border-b bg-white/85 backdrop-blur-xl transition-[border-color,box-shadow] duration-300 lg:top-0 ${
        scrolled ? "border-line shadow-[0_12px_32px_-22px_rgba(20,19,26,0.35)]" : "border-line/70"
      }`}
    >
      <div className="shell">
        {/* Mobile row 1 (scrolls away; the search row below stays) */}
        <div className="flex h-14 items-center justify-between lg:hidden">
          <Link href="/" aria-label="Lumina, trang chủ">
            <Logo size={32} />
          </Link>
          {actions}
        </div>
        <div className="flex items-center gap-4 pb-3 lg:h-16 lg:pb-0">
          <Link href="/" aria-label="Lumina, trang chủ" className="max-lg:hidden">
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
    </motion.header>
  );
}
