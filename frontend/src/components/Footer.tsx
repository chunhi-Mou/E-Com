"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";
import { API_URL, useApiMode } from "@/lib/api";

export function Footer() {
  const pathname = usePathname();
  const mode = useApiMode((s) => s.mode);

  if (pathname === "/login") return null;
  return (
    <footer className="mt-20 border-t border-line bg-sheet">
      <div className="shell grid gap-8 py-10 md:grid-cols-[1fr_auto] md:items-start">
        <div className="max-w-md">
          <Logo size={30} />
          <p className="pretty mt-4 text-[14px] leading-relaxed text-muted">
            Lumina là cửa hàng trực tuyến tìm kiếm bằng văn bản, giọng nói và hình ảnh. Dữ liệu và giao dịch chỉ phục vụ nghiên cứu và mô phỏng.
          </p>
        </div>
        <div className="flex flex-col gap-3 text-[14px] md:items-end">
          <nav className="flex gap-5 font-medium">
            <Link href="/orders" className="text-muted transition-colors hover:text-ink-600">Tra cứu đơn hàng</Link>
            <Link href="/cart" className="text-muted transition-colors hover:text-ink-600">Giỏ hàng</Link>
          </nav>
          <p className="inline-flex items-center gap-2 text-[12.5px] text-faint" aria-live="polite">
            <span className={`size-1.5 rounded-full ${mode === null ? "bg-line-strong" : mode === "mock" ? "bg-star" : "bg-ok"}`} aria-hidden />
            {mode === null ? "Đang kiểm tra máy chủ…" : mode === "mock" ? "Dữ liệu mẫu, chạy không cần máy chủ" : `Đang kết nối ${API_URL}`}
          </p>
        </div>
      </div>
    </footer>
  );
}
