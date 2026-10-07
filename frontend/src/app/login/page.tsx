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
  const currentUser = useAuth((s) => s.user);

  // Trạng thái hiển thị Intro showreel (mặc định mở intro trước)
  const [showIntro, setShowIntro] = useState(true);

  // Form states
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Lắc thẻ khi lỗi
  const [shakeKey, setShakeKey] = useState(0);

  // Nút tiện ích điền nhanh tài khoản admin demo
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

    // Mô phỏng xác thực mượt mà
    setTimeout(() => {
      const res = login(username, password);
      setIsSubmitting(false);

      if (res.success) {
        setIsSuccess(true);
        useToasts.getState().push({ text: "Đăng nhập thành công! Chào mừng Quản trị viên.", tone: "ok" });
        setTimeout(() => {
          router.push("/");
        }, 1000);
      } else {
        setErrorMsg(res.message || "Tài khoản hoặc mật khẩu không chính xác");
        setShakeKey((k) => k + 1);
      }
    }, 450);
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex items-center justify-center font-sans">
      {/* Nền hoạt ảnh mờ chuyển động trắng - tím */}
      <AmbientBackground />

      <AnimatePresence mode="wait">
        {showIntro ? (
          /* MÀN HÌNH INTRO MOTION GRAPHICS 15 GIÂY */
          <motion.div
            key="showreel-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05, filter: "blur(12px)" }}
            transition={{ duration: 0.65, ease: "easeInOut" }}
            className="fixed inset-0 z-50"
          >
            <MotionShowreel onComplete={() => setShowIntro(false)} />
          </motion.div>
        ) : (
          /* KHUNG ĐĂNG NHẬP SANG TRỌNG (LUXURY GLASSMORPHIC CARD) */
          <motion.div
            key="login-container"
            initial={{ opacity: 0, scale: 0.92, y: 20, filter: "blur(10px)" }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-md px-4 py-8"
          >
            {/* Thanh điều hướng nhanh góc trên */}
            <div className="mb-4 flex items-center justify-between text-xs font-medium text-purple-200/80">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition-colors hover:bg-white/10 hover:text-white"
              >
                <ArrowLeft size={14} />
                <span>Về trang chủ</span>
              </Link>

              <button
                type="button"
                onClick={() => setShowIntro(true)}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition-colors hover:bg-white/10 hover:text-white"
                title="Xem lại video giới thiệu 15s"
              >
                <Film size={14} />
                <span>Xem lại Showreel 15s</span>
              </button>
            </div>

            {/* Thẻ Kính Mờ Đăng Nhập */}
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
              className="relative overflow-hidden rounded-3xl border border-white/20 bg-white/[0.07] p-8 shadow-[0_25px_60px_-15px_rgba(112,26,238,0.35)] backdrop-blur-2xl"
            >
              {/* Ánh sáng phản chiếu góc thẻ (Glass highlight) */}
              <div className="pointer-events-none absolute -top-24 -left-24 h-48 w-48 rounded-full bg-gradient-to-br from-white/30 to-purple-400/0 blur-2xl" />

              {/* Logo & Tiêu đề */}
              <div className="mb-7 text-center">
                <div className="inline-block transform transition-transform duration-300 hover:scale-105">
                  <Logo showTagline={true} />
                </div>
                <h1 className="mt-4 text-2xl font-bold tracking-tight text-white">
                  Đăng nhập Quản trị
                </h1>
                <p className="mt-1 text-xs text-purple-200/75">
                  Truy cập bảng điều khiển và kiểm soát tìm kiếm thông minh
                </p>
              </div>

              {/* Thông báo lỗi nếu có */}
              <AnimatePresence>
                {errorMsg && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, y: -6 }}
                    animate={{ opacity: 1, height: "auto", y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-5 flex items-center gap-2.5 rounded-xl border border-rose-500/40 bg-rose-950/40 px-3.5 py-2.5 text-xs text-rose-200 backdrop-blur-md"
                  >
                    <AlertCircle size={16} className="shrink-0 text-rose-400" />
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
                    className="mb-5 flex items-center gap-2.5 rounded-xl border border-emerald-500/40 bg-emerald-950/40 px-3.5 py-2.5 text-xs text-emerald-200 backdrop-blur-md"
                  >
                    <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
                    <span>Xác thực thành công! Đang chuyển tiếp...</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Form Input */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Trường Tài Khoản */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold tracking-wide text-purple-100/90 uppercase">
                    Tài khoản
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-purple-300/70">
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
                      className="w-full rounded-xl border border-white/15 bg-white/10 py-3 pl-10 pr-4 text-sm text-white placeholder-purple-200/40 shadow-inner outline-none transition-all focus:border-purple-300 focus:bg-white/15 focus:ring-2 focus:ring-purple-400/40"
                    />
                  </div>
                </div>

                {/* Trường Mật Khẩu */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="block text-xs font-semibold tracking-wide text-purple-100/90 uppercase">
                      Mật khẩu
                    </label>
                  </div>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-purple-300/70">
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
                      className="w-full rounded-xl border border-white/15 bg-white/10 py-3 pl-10 pr-11 text-sm text-white placeholder-purple-200/40 shadow-inner outline-none transition-all focus:border-purple-300 focus:bg-white/15 focus:ring-2 focus:ring-purple-400/40"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-purple-300/70 transition-colors hover:text-white"
                      tabIndex={-1}
                      aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Nút Điền Nhanh Admin Demo */}
                <div className="pt-1 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handleQuickFill}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-purple-400/30 bg-purple-900/30 px-3 py-1.5 text-[11px] font-semibold text-purple-200 transition-all hover:border-purple-300 hover:bg-purple-800/40 hover:text-white"
                  >
                    <Sparkles size={12} className="text-violet-300" />
                    <span>Điền nhanh: admin / admin1234</span>
                  </button>
                </div>

                {/* Nút Đăng Nhập */}
                <button
                  type="submit"
                  disabled={isSubmitting || isSuccess}
                  className="group relative mt-3 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl border border-white/30 bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 py-3 text-sm font-bold text-white shadow-[0_10px_25px_-5px_rgba(147,51,234,0.5)] transition-all hover:scale-[1.01] hover:shadow-[0_15px_30px_-5px_rgba(168,85,247,0.6)] active:scale-[0.99] disabled:opacity-70"
                >
                  {/* Hiệu ứng tia sáng quét ngang khi hover */}
                  <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />

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
              <div className="mt-6 border-t border-white/10 pt-4 text-center">
                <p className="text-[11px] text-purple-300/60">
                  Hệ thống bảo mật đa phương thức · Tài khoản thử nghiệm: <code className="font-mono text-purple-200 font-bold">admin</code> / <code className="font-mono text-purple-200 font-bold">admin1234</code>
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
