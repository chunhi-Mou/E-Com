"use client";
import Link from "next/link";
import { SealMark } from "./Logo";
import { API_URL, useApiMode } from "@/lib/api";

export function Footer() {
  const mode = useApiMode((s) => s.mode);
  return (
    <footer className="mt-16 border-t border-line bg-sheet">
      <div className="shell flex flex-col gap-6 py-8 md:flex-row md:items-start md:justify-between">
        <div className="flex max-w-md gap-3">
          <SealMark size={34} />
          <p className="pretty text-[14px] text-muted">
            Sắm là dự án học tập về tìm kiếm đa phương thức. Sản phẩm lấy từ nguồn công khai, thanh toán và giao hàng chỉ là mô phỏng.
          </p>
        </div>
        <div className="flex flex-col gap-2 text-[14px] md:items-end">
          <nav className="flex gap-4">
            <Link href="/orders" className="link-ink">Tra cứu đơn hàng</Link>
            <Link href="/cart" className="link-ink">Giỏ hàng</Link>
          </nav>
          <p className="text-[12.5px] text-muted" aria-live="polite">
            {mode === null ? "Đang kiểm tra máy chủ…" : mode === "mock" ? "Dữ liệu mẫu, chạy không cần máy chủ" : `Đang kết nối ${API_URL}`}
          </p>
        </div>
      </div>
    </footer>
  );
}
