"use client";
import { create } from "zustand";

export type AuthUser = {
  username: string;
  role: string;
  name: string;
  avatarUrl?: string;
};

type AuthState = {
  user: AuthUser | null;
  hydrated: boolean;
  login: (username: string, password: string) => { success: boolean; message?: string };
  logout: () => void;
  setHydrated: () => void;
};

const STORAGE_KEY = "lumina_auth_user";

export const useAuth = create<AuthState>((set) => {
  // Lấy dữ liệu đã lưu nếu đang chạy ở môi trường client (browser)
  let initialUser: AuthUser | null = null;
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        initialUser = JSON.parse(saved);
      }
    } catch {
      // Bỏ qua lỗi đọc localStorage
    }
  }

  return {
    user: initialUser,
    hydrated: false,
    setHydrated: () => set({ hydrated: true }),
    login: (username, password) => {
      const cleanUser = username.trim().toLowerCase();
      const cleanPass = password.trim();

      if (cleanUser === "admin" && cleanPass === "admin1234") {
        const user: AuthUser = {
          username: "admin",
          role: "Quản trị viên",
          name: "Lumina Admin",
        };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
        } catch {}
        set({ user });
        return { success: true };
      }

      return {
        success: false,
        message: "Tài khoản hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại!",
      };
    },
    logout: () => {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
      set({ user: null });
    },
  };
});
