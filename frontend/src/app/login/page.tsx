"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { User, Lock, Eye, EyeOff, ArrowRight, CheckCircle2, AlertCircle, Sparkles, Film } from "lucide-react";
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
    <div className="relative min-h-screen w-full overflow-hidden flex items-center justify-center font-sans bg-[#F8FAFC]">
      {/* Nền đồ họa mạng hạt công nghệ màu xám chạy 60fps */}
      <AmbientBackground />

      <AnimatePresence mode="wait">
        {showIntro ? (
          /* MÀN HÌNH SHOWREEL 15 GIÂY */
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
          /* KHUNG ĐĂNG NHẬP SANG TRỌNG PHỐI MÀU TRẮNG - XÁM CÔNG NGHỆ - TÍM THẠCH ANH */
          <motion.div
            key="login-container"
            initial={{ opacity: 0, scale: 0.95, y: 16, filter: "blur(8px)" }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-[440px] px-4 py-8"
          >
            {/* Thanh điều hướng nhanh góc trên */}
            <div className="mb-3.5 flex items-center justify-between text-xs font-semibold">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 border border-slate-200/90 text-slate-700 shadow-2xs backdrop-blur-md">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-600 animate-pulse" />
                <span className="font-mono text-[11px] tracking-wide text-slate-600">PORTAL // ADMIN</span>
              </span>

              <button
                type="button"
                onClick={() => setShowIntro(true)}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 border border-slate-200/90 bg-white/90 text-slate-700 shadow-2xs transition-all hover:bg-slate-50 hover:text-slate-900 active:scale-95"
                title="Xem lại video giới thiệu 15s"
              >
                <Film size={13} className="text-purple-600" />
                <span className="text-[11px] font-medium">Xem lại Showreel 15s</span>
              </button>
            </div>

            {/* Thẻ Kính Trắng Cao Cấp */}
            <motion.div
              key={shakeKey}
              animate={
                shakeKey > 0
                  ? {
                      x: [0, -8, 8, -6, 6, -3, 3, 0],
                      transition: { duration: 0.4 },
                    }
                  : {}
              }
              className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white/95 p-8 shadow-[0_25px_60px_-15px_rgba(15,23,42,0.1),0_8px_24px_-4px_rgba(0,0,0,0.04)] backdrop-blur-2xl"
            >
              {/* Ánh tím khói mờ cực nhẹ ở góc thẻ tạo chiều sâu tinh tế */}
              <div className="pointer-events-none absolute -top-24 -right-24 h-48 w-48 rounded-full bg-purple-100/40 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-indigo-50/50 blur-3xl" />

              {/* Logo & Tiêu đề */}
              <div className="mb-7 text-center">
                <div className="inline-block transform transition-transform duration-300 hover:scale-105">
                  <Logo showTagline={true} theme="dark" />
                </div>
                <h1 className="mt-4 text-[22px] font-bold tracking-tight text-slate-900">
                  Đăng nhập Quản trị
                </h1>
                <p className="mt-1 text-xs text-slate-500 font-normal">
                  Xác thực danh tính truy cập hệ thống thương mại LUMINA
                </p>
              </div>

              {/* Thông báo lỗi nếu có */}
              <AnimatePresence>
                {errorMsg && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, y: -6 }}
                    animate={{ opacity: 1, height: "auto", y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-5 flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-800"
                  >
                    <AlertCircle size={15} className="shrink-0 text-rose-600" />
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
                    className="mb-5 flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-semibold text-emerald-800"
                  >
                    <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
                    <span>Xác thực thành công! Đang chuyển tiếp…</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Form Input */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Trường Tài Khoản */}
                <div>
                  <label className="mb-1.5 block font-mono text-[11px] font-bold tracking-wider text-slate-600 uppercase">
                    Tài khoản
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                      <User size={17} />
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
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-4 text-sm font-medium text-slate-900 placeholder-slate-400 outline-none transition-all hover:bg-white focus:border-purple-600 focus:bg-white focus:ring-4 focus:ring-purple-600/10"
                    />
                  </div>
                </div>

                {/* Trường Mật Khẩu */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="block font-mono text-[11px] font-bold tracking-wider text-slate-600 uppercase">
                      Mật khẩu
                    </label>
                  </div>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                      <Lock size={17} />
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
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-11 text-sm font-medium text-slate-900 placeholder-slate-400 outline-none transition-all hover:bg-white focus:border-purple-600 focus:bg-white focus:ring-4 focus:ring-purple-600/10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 transition-colors hover:text-slate-700"
                      tabIndex={-1}
                      aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                {/* Nút Điền Nhanh Demo */}
                <div className="pt-0.5">
                  <button
                    type="button"
                    onClick={handleQuickFill}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100/80 px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition-all hover:border-purple-300 hover:bg-purple-50 hover:text-purple-900"
                  >
                    <Sparkles size={12} className="text-purple-600" />
                    <span>Điền nhanh: admin / admin1234</span>
                  </button>
                </div>

                {/* Nút Đăng Nhập: Màu Tím Hoàng Gia Sâu Thẳm & Sang Trọng */}
                <button
                  type="submit"
                  disabled={isSubmitting || isSuccess}
                  className="group relative mt-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-[#4C1D95] via-[#581C87] to-[#3B0764] py-3 text-sm font-bold text-white shadow-[0_10px_25px_-5px_rgba(76,29,149,0.35),0_4px_12px_rgba(0,0,0,0.06)] border border-white/10 transition-all hover:brightness-110 hover:shadow-[0_12px_28px_-4px_rgba(76,29,149,0.45)] active:scale-[0.99] disabled:opacity-70"
                >
                  {/* Hiệu ứng tia sáng quét mượt */}
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
              <div className="mt-6 border-t border-slate-100 pt-4 text-center">
                <p className="text-[11px] text-slate-500 font-normal">
                  Tài khoản thử nghiệm:{" "}
                  <code className="font-mono font-semibold text-purple-900 bg-purple-50 border border-purple-200/60 px-1.5 py-0.5 rounded text-[11px]">
                    admin
                  </code>
                  {" "}và mật khẩu:{" "}
                  <code className="font-mono font-semibold text-purple-900 bg-purple-50 border border-purple-200/60 px-1.5 py-0.5 rounded text-[11px]">
                    admin1234
                  </code>
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
