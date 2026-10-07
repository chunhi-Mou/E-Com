"use client";
import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/store/auth";
import { LuminaEmblem } from "@/components/Logo";

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

  // Chờ hydrate và kiểm tra phiên: màn trắng tối giản với biểu tượng nhịp thở
  if (!mounted || !hydrated || !user) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-white">
        <span className="animate-pulse">
          <LuminaEmblem size={48} />
        </span>
      </div>
    );
  }

  // Đã đăng nhập hợp lệ: hiển thị nội dung trang
  return <>{children}</>;
}
