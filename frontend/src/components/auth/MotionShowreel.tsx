"use client";
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  FastForward,
  Link2,
  Sparkles,
  TrendingUp,
  Globe2,
  QrCode,
  CheckCircle2,
  ArrowRight,
  MousePointer2,
  Zap,
} from "lucide-react";
import { LuminaEmblem } from "@/components/Logo";

interface MotionShowreelProps {
  onComplete: () => void;
}

export function MotionShowreel({ onComplete }: MotionShowreelProps) {
  const [elapsed, setElapsed] = useState(0);
  const totalSeconds = 15; // 15-giây showreel theo yêu cầu

  useEffect(() => {
    const start = Date.now();
    const timer = setInterval(() => {
      const now = Date.now();
      const diff = (now - start) / 1000;
      if (diff >= totalSeconds) {
        setElapsed(totalSeconds);
        clearInterval(timer);
        onComplete();
      } else {
        setElapsed(diff);
      }
    }, 40);

    return () => clearInterval(timer);
  }, [onComplete]);

  // 4 Phân cảnh của dub.co Launch SaaS Showreel:
  // 0s - 3.8s:   Scene 1 - The Problem & The Morph (URL dài -> Link ngắn sang trọng)
  // 3.8s - 7.6s: Scene 2 - Real-Time Click Stream & Global Analytics (Chart vút lên + Geo pins)
  // 7.6s - 11.4s: Scene 3 - Dynamic QR Code & Custom Branded Domains (3D Card & Routing)
  // 11.4s - 15.0s: Scene 4 - Grand Launch Finale (Hội tụ ánh sáng chuyển tiếp vào Login)
  const scene =
    elapsed < 3.8 ? 1 : elapsed < 7.6 ? 2 : elapsed < 11.4 ? 3 : 4;

  const progress = Math.min(100, (elapsed / totalSeconds) * 100);
  const remainingSeconds = Math.max(0, Math.ceil(totalSeconds - elapsed));

  // Giả lập số lượt click nhảy tăng tốc cho Scene 2
  const clickCount = Math.min(
    28490,
    Math.floor(((elapsed - 3.8) / 3.8) * 28490)
  );

  return (
    <div
      suppressHydrationWarning
      className="relative flex h-full min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-[#F8FAFC] px-4 text-slate-900 select-none"
    >
      {/* 1. NỀN CÔNG NGHỆ CHUYỂN SẮC TRẮNG SỨ - TÍM THẠCH ANH NHẸ */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_90%_at_50%_10%,rgba(243,232,255,0.8),rgba(248,250,252,0.98))]" />

        {/* Lưới tọa độ kỹ thuật số Blueprint mảnh màu xám */}
        <div
          className="absolute inset-0 opacity-[0.28]"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(100, 116, 139, 0.12) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(100, 116, 139, 0.12) 1px, transparent 1px)
            `,
            backgroundSize: "36px 36px",
          }}
        />

        {/* Vòng tròn quỹ đạo công nghệ quay chậm */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[720px] w-[720px] rounded-full border border-purple-200/50"
        >
          <div className="absolute inset-20 rounded-full border border-dashed border-purple-300/40" />
          <div className="absolute inset-40 rounded-full border border-slate-200/60" />
        </motion.div>
      </div>

      {/* 2. THANH TIẾN TRÌNH 15S CHẠY MƯỢT TRÊN ĐỈNH */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-200 z-50">
        <motion.div
          className="h-full bg-gradient-to-r from-[#4C1D95] via-[#7C3AED] to-[#3B0764] shadow-[0_0_10px_rgba(124,58,237,0.4)]"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 3. THANH ĐIỀU KHIỂN: BỘ ĐẾM 15S & NÚT BỎ QUA */}
      <div className="absolute top-6 left-6 right-6 z-50 flex items-center justify-between">
        <div className="flex items-center gap-2.5 rounded-full border border-slate-200 bg-white/90 px-4 py-1.5 shadow-2xs backdrop-blur-md">
          <div className="h-2 w-2 rounded-full bg-purple-600 animate-pulse" />
          <span
            suppressHydrationWarning
            className="font-mono text-xs font-bold text-slate-700 tracking-wider"
          >
            DUB.CO SHOWREEL · 00:{remainingSeconds < 10 ? `0${remainingSeconds}` : remainingSeconds}
          </span>
        </div>

        <button
          onClick={onComplete}
          className="group flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-4 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs backdrop-blur-md transition-all hover:bg-slate-50 hover:text-slate-900 active:scale-95"
        >
          <span>Bỏ qua Intro</span>
          <FastForward size={14} className="text-purple-600 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>

      {/* 4. NỘI DUNG 4 PHÂN CẢNH MOTION GRAPHICS SHOWREEL DUB.CO */}
      <div className="relative z-10 flex w-full max-w-3xl flex-col items-center justify-center text-center">
        <AnimatePresence mode="wait">
          {/* ========================================================
              SCENE 1 (0s - 3.8s): THE PROBLEM & THE MORPH
              URL dài ngoằng nén lại chớp nhoáng thành link dub.sh siêu sang
             ======================================================== */}
          {scene === 1 && (
            <motion.div
              key="scene-1"
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.08, filter: "blur(8px)" }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="flex w-full flex-col items-center gap-6"
            >
              {/* Badge trên */}
              <div className="inline-flex items-center gap-1.5 rounded-full border border-purple-200 bg-purple-50 px-3.5 py-1 text-xs font-bold text-purple-900">
                <Link2 size={13} className="text-purple-600" />
                <span>MODERN LINK INFRASTRUCTURE</span>
              </div>

              <div>
                <h1 className="font-label text-4xl sm:text-6xl font-black tracking-tight text-slate-950">
                  SHORT LINKS. <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-700 to-indigo-600">SUPERCHARGED.</span>
                </h1>
                <p className="mt-2 text-sm sm:text-base font-medium text-slate-600 max-w-lg mx-auto">
                  Biến những liên kết dài dòng, phức tạp thành trải nghiệm thương hiệu đẳng cấp
                </p>
              </div>

              {/* HỘP BIẾN HÌNH URL (MORPHING URL PILL) */}
              <div className="relative w-full max-w-lg">
                <motion.div
                  initial={{ width: "100%" }}
                  animate={{ scale: [0.97, 1.02, 1] }}
                  transition={{ duration: 0.4 }}
                  className="relative overflow-hidden rounded-2xl border border-slate-300/80 bg-white p-4 shadow-xl backdrop-blur-xl"
                >
                  <AnimatePresence mode="wait">
                    {elapsed < 1.8 ? (
                      /* URL cũ dài dòng rối rắm */
                      <motion.div
                        key="long-url"
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.85, filter: "blur(6px)" }}
                        className="flex items-center gap-2.5 text-xs font-mono text-slate-400 overflow-hidden"
                      >
                        <span className="shrink-0 text-rose-500 font-bold">✕ LONG URL:</span>
                        <span className="truncate line-through decoration-rose-400">
                          https://global-store.io/catalog/products/fall-2026?utm_source=spring&utm_campaign=launch_98142&ref=partner_tracker
                        </span>
                      </motion.div>
                    ) : (
                      /* URL dub.sh rút gọn cực đẹp sang trọng */
                      <motion.div
                        key="short-url"
                        initial={{ opacity: 0, scale: 0.8, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 420, damping: 25 }}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-[#4C1D95] to-[#7C3AED] text-white shadow-sm">
                            <Zap size={16} />
                          </div>
                          <span className="font-mono text-base sm:text-lg font-black text-purple-950 tracking-tight">
                            dub.sh/<span className="text-purple-600">launch</span>
                          </span>
                        </div>

                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.15, type: "spring" }}
                          className="flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700"
                        >
                          <CheckCircle2 size={14} className="text-emerald-600" />
                          <span>COPIED (12ms)</span>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Con trỏ chuột tương tác ảo */}
                <motion.div
                  initial={{ opacity: 0, x: -30, y: 30 }}
                  animate={{ opacity: [0, 1, 1, 0], x: [0, 60, 60, 100], y: [20, -10, -10, -30] }}
                  transition={{ duration: 2.2, ease: "easeInOut" }}
                  className="absolute pointer-events-none top-6 right-16 text-purple-700 drop-shadow-md"
                >
                  <MousePointer2 size={24} className="fill-purple-600" />
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* ========================================================
              SCENE 2 (3.8s - 7.6s): REAL-TIME ANALYTICS & GLOBAL REACH
              Bản đồ định vị + Biểu đồ tăng trưởng vút lên
             ======================================================== */}
          {scene === 2 && (
            <motion.div
              key="scene-2"
              initial={{ opacity: 0, scale: 0.92, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.08, filter: "blur(8px)" }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="flex w-full flex-col items-center gap-6"
            >
              <div className="inline-flex items-center gap-1.5 rounded-full border border-purple-200 bg-purple-50 px-3.5 py-1 text-xs font-bold text-purple-900">
                <TrendingUp size={13} className="text-purple-600" />
                <span>REAL-TIME ANALYTICS ENGINE</span>
              </div>

              <div>
                <h2 className="font-label text-4xl sm:text-6xl font-black tracking-tight text-slate-950">
                  GLOBAL CLICKSTREAM. <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-700 to-indigo-600">INSPECTION.</span>
                </h2>
                <p className="mt-2 text-sm sm:text-base font-medium text-slate-600">
                  Đo lường từng lượt nhấp, chuyển đổi và thiết bị người dùng tức thì
                </p>
              </div>

              {/* CARD BIỂU ĐỒ VÀ THÔNG SỐ TĂNG TRƯỞNG DUB.CO */}
              <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <div className="text-[11px] font-mono font-bold text-slate-400 uppercase">
                      TOTAL CLICKS TODAY
                    </div>
                    <div className="text-2xl sm:text-3xl font-mono font-black text-slate-950 mt-0.5">
                      {clickCount.toLocaleString()} <span className="text-xs font-sans text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">+148.2%</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
                    <Globe2 size={14} className="text-purple-600" />
                    <span>GLOBAL EDGE</span>
                  </div>
                </div>

                {/* Biểu đồ sóng SVG chuyển động (Animated Growth Sparkline) */}
                <div className="pt-4">
                  <svg viewBox="0 0 400 100" className="h-24 w-full overflow-visible">
                    <defs>
                      <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    {/* Vùng đổ bóng tím dưới đường line */}
                    <motion.path
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1.8, ease: "easeOut" }}
                      d="M 0,85 Q 70,60 130,70 T 230,40 T 320,30 T 400,10 L 400,100 L 0,100 Z"
                      fill="url(#chartGrad)"
                    />
                    {/* Đường biểu đồ chính màu tím đậm */}
                    <motion.path
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1.8, ease: "easeOut" }}
                      d="M 0,85 Q 70,60 130,70 T 230,40 T 320,30 T 400,10"
                      fill="none"
                      stroke="#6D28D9"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                    {/* Điểm nút cao nhất phát sáng */}
                    <circle cx="400" cy="10" r="5" fill="#7C3AED" />
                    <circle cx="400" cy="10" r="10" fill="none" stroke="#7C3AED" strokeWidth="2" opacity="0.5" className="animate-ping" />
                  </svg>
                </div>

                {/* 3 Thành phố hàng đầu */}
                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-left font-mono text-[11px]">
                  <div>
                    <span className="text-slate-400">🇺🇸 SF:</span> <span className="font-bold text-slate-800">42%</span>
                  </div>
                  <div>
                    <span className="text-slate-400">🇬🇧 LON:</span> <span className="font-bold text-slate-800">28%</span>
                  </div>
                  <div>
                    <span className="text-slate-400">🇻🇳 HAN:</span> <span className="font-bold text-slate-800">19%</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ========================================================
              SCENE 3 (7.6s - 11.4s): DYNAMIC QR & CUSTOM BRANDED DOMAINS
              Mã QR 3D + Thẻ điều hướng thông minh
             ======================================================== */}
          {scene === 3 && (
            <motion.div
              key="scene-3"
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.08, filter: "blur(8px)" }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="flex w-full flex-col items-center gap-6"
            >
              <div className="inline-flex items-center gap-1.5 rounded-full border border-purple-200 bg-purple-50 px-3.5 py-1 text-xs font-bold text-purple-900">
                <QrCode size={13} className="text-purple-600" />
                <span>DYNAMIC QR & SMART ROUTING</span>
              </div>

              <div>
                <h2 className="font-label text-4xl sm:text-6xl font-black tracking-tight text-slate-950">
                  BRANDED DOMAINS. <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-700 to-indigo-600">BEAUTIFULLY.</span>
                </h2>
                <p className="mt-2 text-sm sm:text-base font-medium text-slate-600">
                  Tùy chỉnh tên miền riêng, nhúng mã QR vector và điều hướng theo thiết bị
                </p>
              </div>

              {/* CARD TƯƠNG TÁC 3D MÃ QR VÀ DOMAIN */}
              <div className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-lg">
                {/* Hộp QR Code Vector phát quang */}
                <motion.div
                  animate={{ rotateY: [0, 12, 0], scale: [1, 1.04, 1] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                  className="flex flex-col items-center justify-center h-40 w-40 shrink-0 rounded-2xl border border-purple-200 bg-white p-4 shadow-xl"
                >
                  <div className="relative p-2 bg-purple-50 rounded-xl border border-purple-100">
                    <QrCode size={78} className="text-purple-900" />
                    {/* Logo nhỏ ở tâm QR */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-6 w-6 rounded-md bg-[#4C1D95] text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                        D
                      </div>
                    </div>
                  </div>
                  <span className="mt-1 text-[10px] font-mono font-bold text-purple-700">VECTOR SVG QR</span>
                </motion.div>

                {/* Danh sách tính năng cao cấp của dub.co */}
                <div className="flex-1 space-y-2.5 text-left w-full">
                  <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
                    <div className="text-xs font-bold text-slate-900">Custom Domains</div>
                    <div className="text-[11px] font-mono text-purple-700">go.lumina.com / brand.link</div>
                  </div>
                  <div className="rounded-xl border border-purple-300 bg-purple-50/70 p-3 shadow-xs ring-1 ring-purple-400/20">
                    <div className="text-xs font-bold text-purple-950">Geo & Device Targeting</div>
                    <div className="text-[11px] text-purple-700">iOS → App Store / Android → Google Play</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
                    <div className="text-xs font-bold text-slate-900">Password & Expiration</div>
                    <div className="text-[11px] text-slate-500 font-mono">Bảo mật liên kết nâng cao</div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ========================================================
              SCENE 4 (11.4s - 15.0s): GRAND FINALE LAUNCH
              Hội tụ thương hiệu DUB × LUMINA và dẫn vào Đăng nhập
             ======================================================== */}
          {scene === 4 && (
            <motion.div
              key="scene-4"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.25, filter: "blur(10px)" }}
              transition={{ duration: 0.55 }}
              className="flex flex-col items-center gap-6"
            >
              {/* Logo Emblem khổng lồ với sóng xung hào quang tím */}
              <motion.div
                animate={{ scale: [1, 1.08, 1], rotate: [0, 4, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                className="relative"
              >
                <div className="absolute -inset-6 rounded-3xl bg-purple-400/35 blur-2xl animate-pulse" />
                <div className="relative transform scale-150 p-2">
                  <LuminaEmblem size={64} />
                </div>
              </motion.div>

              <div>
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-purple-200 bg-white px-3.5 py-1 text-xs font-bold text-purple-800 shadow-2xs mb-2"
                >
                  <Sparkles size={13} className="text-purple-600" />
                  <span>DUB.CO × LUMINA PLATFORM LAUNCH</span>
                </motion.div>

                <h1 className="font-label text-4xl sm:text-6xl font-black text-slate-950 tracking-tight">
                  THE FUTURE OF <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-700 via-violet-600 to-indigo-600">COMMERCE & LINKS</span>
                </h1>
                <p className="mt-2 text-sm sm:text-base font-medium text-slate-600 max-w-md mx-auto">
                  Hạ tầng tìm kiếm đa phương thức và liên kết thông minh sẵn sàng vận hành
                </p>
              </div>

              {/* Nút vào ngay */}
              <button
                onClick={onComplete}
                className="flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-[#4C1D95] via-[#581C87] to-[#3B0764] px-8 py-3.5 text-sm font-bold text-white shadow-xl hover:brightness-110 active:scale-95 transition-all"
              >
                <span>Truy cập Cổng Quản Trị</span>
                <ArrowRight size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 5. FOOTER THƯƠNG HIỆU NHỎ GỌN */}
      <div className="absolute bottom-6 z-20 flex items-center gap-2 text-xs font-mono text-slate-500">
        <span className="font-bold text-purple-800">DUB.CO</span>
        <span>·</span>
        <span>SHOWREEL RÉSUMÉ EDITION</span>
        <span>·</span>
        <span>LUMINA SYSTEM</span>
      </div>
    </div>
  );
}
