"use client";
import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/store/auth";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const hydrated = useAuth((s) => s.hydrated);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Chỉ kiểm tra khi đã mount và hydrated ở client
    if (!mounted || !hydrated) return;

    // Nếu đang ở trang login thì không chặn
    if (pathname === "/login") return;

    // Nếu chưa đăng nhập, bắt buộc chuyển hướng về /login
    if (!user) {
      router.replace("/login");
    }
  }, [mounted, hydrated, user, pathname, router]);

  // Nếu đang ở trang login, render trực tiếp
  if (pathname === "/login") {
    return <>{children}</>;
  }

  // Khi chưa hydrate xong hoặc chưa có user ở client, hiển thị màn chờ thanh lịch màu trắng tím
  if (!mounted || !hydrated || !user) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#FAF9FE] text-purple-950">
        <div className="relative flex flex-col items-center gap-4">
          {/* Vòng quay công nghệ chờ xác thực */}
          <div className="relative h-14 w-14">
            <div className="absolute inset-0 rounded-full border-2 border-purple-200" />
            <div className="absolute inset-0 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
            <div className="absolute inset-2.5 rounded-full bg-purple-100/60" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold tracking-wider uppercase text-purple-900">
              LUMINA
            </p>
            <p className="mt-0.5 text-xs text-purple-600/70">
              Đang xác thực quyền truy cập…
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Đã đăng nhập hợp lệ: hiển thị nội dung trang
  return <>{children}</>;
}
