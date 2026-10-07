"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { User, Lock, Eye, EyeOff, ArrowRight, CheckCircle2, AlertCircle, Sparkles, Film, ArrowLeft } from "lucide-react";
import { useAuth } from "@/store/auth";
import { useToasts } from "@/store/toast";
import { Logo } from "@/components/Logo";
import { AmbientBackground } from "@/components/auth/AmbientBackground";
import { MotionShowreel } from "@/components/auth/MotionShowreel";

export default function LoginPage() {
  const router = useRouter();
  const login = useAuth((s) => s.login);

  // Mặc định hiển thị video/hoạt ảnh Intro mở đầu
  const [showIntro, setShowIntro] = useState(true);

  // Form states
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Hiệu ứng lắc thẻ khi lỗi
  const [shakeKey, setShakeKey] = useState(0);

  // Tiện ích điền nhanh tài khoản admin demo
  const handleQuickFill = () => {
    setUsername("admin");
    setPassword("admin1234");
    setErrorMsg(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg("Vui lòng nhập đầy đủ tài khoản và mật khẩu");
      setShakeKey((k) => k + 1);
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    setTimeout(() => {
      const res = login(username, password);
      setIsSubmitting(false);

      if (res.success) {
        setIsSuccess(true);
        useToasts.getState().push({ text: "Đăng nhập thành công! Chào mừng Quản trị viên.", tone: "ok" });
        setTimeout(() => {
          router.push("/");
        }, 850);
      } else {
        setErrorMsg(res.message || "Tài khoản hoặc mật khẩu không chính xác");
        setShakeKey((k) => k + 1);
      }
    }, 400);
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex items-center justify-center font-sans bg-[#FAF9FE]">
      {/* Nền hoạt ảnh mờ chuyển động trắng sứ thiên tím với vật thể công nghệ 3D */}
      <AmbientBackground />

      <AnimatePresence mode="wait">
        {showIntro ? (
          /* MÀN HÌNH SHOWREEL 15 GIÂY (Trắng chủ đạo thiên tím) */
          <motion.div
            key="showreel-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.04, filter: "blur(10px)" }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="fixed inset-0 z-50"
          >
            <MotionShowreel onComplete={() => setShowIntro(false)} />
          </motion.div>
        ) : (
          /* KHUNG ĐĂNG NHẬP KÍNH TRẮNG SỨ THIÊN TÍM (White-Ceramic Glassmorphic Card) */
          <motion.div
            key="login-container"
            initial={{ opacity: 0, scale: 0.94, y: 18, filter: "blur(8px)" }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-md px-4 py-8"
          >
            {/* Thanh điều hướng nhanh góc trên */}
            <div className="mb-4 flex items-center justify-between text-xs font-semibold text-purple-800">
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-purple-100/60 text-purple-700">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-600 animate-pulse" />
                <span>Cổng Quản Trị Hệ Thống</span>
              </span>

              <button
                type="button"
                onClick={() => setShowIntro(true)}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 border border-purple-200 bg-white/90 text-purple-800 shadow-xs transition-colors hover:bg-purple-50 hover:text-purple-950"
                title="Xem lại video giới thiệu 15s"
              >
                <Film size={14} className="text-purple-600" />
                <span>Xem lại Showreel 15s</span>
              </button>
            </div>

            {/* Thẻ Kính Trắng Sứ Sang Trọng */}
            <motion.div
              key={shakeKey}
              animate={
                shakeKey > 0
                  ? {
                      x: [0, -10, 10, -8, 8, -4, 4, 0],
                      transition: { duration: 0.45 },
                    }
                  : {}
              }
              className="relative overflow-hidden rounded-3xl border border-purple-200/90 bg-white/90 p-8 shadow-[0_24px_60px_-15px_rgba(147,51,234,0.14),0_6px_20px_-4px_rgba(0,0,0,0.03)] backdrop-blur-xl"
            >
              {/* Vầng ánh sáng tím pastel góc trên thẻ */}
              <div className="pointer-events-none absolute -top-24 -left-24 h-48 w-48 rounded-full bg-gradient-to-br from-purple-200/50 via-violet-100/30 to-transparent blur-2xl" />

              {/* Logo & Tiêu đề */}
              <div className="mb-6 text-center">
                <div className="inline-block transform transition-transform duration-300 hover:scale-105">
                  <Logo showTagline={true} theme="dark" />
                </div>
                <h1 className="mt-4 text-2xl font-black tracking-tight text-purple-950">
                  Đăng nhập Quản trị
                </h1>
                <p className="mt-1 text-xs font-medium text-purple-700/80">
                  Xác thực danh tính để vào hệ thống thương mại LUMINA
                </p>
              </div>

              {/* Thông báo lỗi nếu có */}
              <AnimatePresence>
                {errorMsg && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, y: -6 }}
                    animate={{ opacity: 1, height: "auto", y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-5 flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-800 shadow-xs"
                  >
                    <AlertCircle size={16} className="shrink-0 text-rose-600" />
                    <span>{errorMsg}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Thông báo thành công nếu có */}
              <AnimatePresence>
                {isSuccess && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mb-5 flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-semibold text-emerald-800 shadow-xs"
                  >
                    <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
                    <span>Xác thực thành công! Đang chuyển tiếp vào trang chủ…</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Form Input */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Trường Tài Khoản */}
                <div>
                  <label className="mb-1.5 block text-xs font-bold tracking-wide text-purple-900 uppercase">
                    Tài khoản
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-purple-400">
                      <User size={18} />
                    </div>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        setErrorMsg(null);
                      }}
                      placeholder="admin"
                      autoComplete="username"
                      className="w-full rounded-xl border border-purple-200 bg-[#FAF9FE] py-3 pl-10 pr-4 text-sm font-medium text-purple-950 placeholder-purple-300 shadow-2xs outline-none transition-all focus:border-purple-600 focus:bg-white focus:ring-4 focus:ring-purple-400/15"
                    />
                  </div>
                </div>

                {/* Trường Mật Khẩu */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="block text-xs font-bold tracking-wide text-purple-900 uppercase">
                      Mật khẩu
                    </label>
                  </div>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-purple-400">
                      <Lock size={18} />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setErrorMsg(null);
                      }}
                      placeholder="admin1234"
                      autoComplete="current-password"
                      className="w-full rounded-xl border border-purple-200 bg-[#FAF9FE] py-3 pl-10 pr-11 text-sm font-medium text-purple-950 placeholder-purple-300 shadow-2xs outline-none transition-all focus:border-purple-600 focus:bg-white focus:ring-4 focus:ring-purple-400/15"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-purple-400 transition-colors hover:text-purple-700"
                      tabIndex={-1}
                      aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Nút Điền Nhanh Demo */}
                <div className="pt-1 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handleQuickFill}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-[11px] font-bold text-purple-800 transition-all hover:border-purple-400 hover:bg-purple-100/70"
                  >
                    <Sparkles size={12} className="text-purple-600" />
                    <span>Điền nhanh: admin / admin1234</span>
                  </button>
                </div>

                {/* Nút Đăng Nhập */}
                <button
                  type="submit"
                  disabled={isSubmitting || isSuccess}
                  className="group relative mt-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 py-3 text-sm font-bold text-white shadow-[0_8px_20px_rgba(147,51,234,0.3)] transition-all hover:brightness-105 active:scale-[0.99] disabled:opacity-70"
                >
                  {/* Hiệu ứng quét sáng */}
                  <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />

                  {isSubmitting ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <span>Đăng nhập hệ thống</span>
                      <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </form>

              {/* Thông tin hỗ trợ */}
              <div className="mt-6 border-t border-purple-100 pt-4 text-center">
                <p className="text-[11px] font-medium text-purple-600/70">
                  Hệ thống bảo vệ phân quyền · Tài khoản thử nghiệm: <code className="font-mono text-purple-900 font-bold">admin</code> / <code className="font-mono text-purple-900 font-bold">admin1234</code>
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
