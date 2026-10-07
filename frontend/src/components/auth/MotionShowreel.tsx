"use client";
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { FastForward, Compass, Layers, Sparkles, ArrowRight, Eye, ShieldCheck } from "lucide-react";
import { LuminaEmblem } from "@/components/Logo";

interface MotionShowreelProps {
  onComplete: () => void;
}

export function MotionShowreel({ onComplete }: MotionShowreelProps) {
  const [elapsed, setElapsed] = useState(0);
  const totalSeconds = 15;

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
    }, 50);

    return () => clearInterval(timer);
  }, [onComplete]);

  // Phân chia 4 phân cảnh Motion Design hiện đại:
  // 0 - 3.8s: Scene 1 (Design System & Geometric Precision)
  // 3.8 - 7.8s: Scene 2 (Fluid Kinetic Typography: Text · Voice · Visual)
  // 7.8 - 12.0s: Scene 3 (Lumina Brand Convergence & Prism Elegance)
  // 12.0 - 15.0s: Scene 4 (Gateway Open & Smooth Dissolve)
  const scene =
    elapsed < 3.8 ? 1 : elapsed < 7.8 ? 2 : elapsed < 12 ? 3 : 4;

  const progress = Math.min(100, (elapsed / totalSeconds) * 100);
  const remainingSeconds = Math.max(0, Math.ceil(totalSeconds - elapsed));

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-[#FCFBFE] px-4 text-purple-950 select-none">
      {/* 1. Nền Trắng sứ với quầng sáng tím pastel mềm mại */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(243,232,255,0.7),rgba(252,251,254,0.95))]" />
        
        {/* Vòng tròn quỹ đạo công nghệ mờ */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[680px] w-[680px] rounded-full border border-purple-200/50"
        >
          <div className="absolute inset-16 rounded-full border border-dashed border-purple-300/40" />
          <div className="absolute inset-36 rounded-full border border-purple-200/30" />
        </motion.div>

        {/* Lưới tọa độ siêu mỏng */}
        <div
          className="absolute inset-0 opacity-[0.2]"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(147, 51, 234, 0.06) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(147, 51, 234, 0.06) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      {/* 2. Thanh Progress chạy mượt trên cùng màn hình */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-purple-100 z-50">
        <motion.div
          className="h-full bg-gradient-to-r from-purple-500 via-violet-500 to-indigo-500 shadow-[0_0_10px_rgba(168,85,247,0.4)]"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 3. Header điều khiển: Bộ đếm thời gian & Nút Skip */}
      <div className="absolute top-6 left-6 right-6 z-50 flex items-center justify-between">
        <div className="flex items-center gap-2.5 rounded-full border border-purple-200 bg-white/80 px-4 py-1.5 shadow-sm backdrop-blur-md">
          <div className="h-2 w-2 rounded-full bg-purple-600 animate-pulse" />
          <span className="font-mono text-xs font-bold tracking-wider text-purple-900">
            SHOWREEL · 00:{remainingSeconds < 10 ? `0${remainingSeconds}` : remainingSeconds}
          </span>
        </div>

        <button
          onClick={onComplete}
          className="group flex items-center gap-2 rounded-full border border-purple-200 bg-white/90 px-4 py-1.5 text-xs font-bold text-purple-900 shadow-sm backdrop-blur-md transition-all hover:border-purple-400 hover:bg-purple-50 hover:text-purple-950 active:scale-95"
        >
          <span>Bỏ qua Intro</span>
          <FastForward size={14} className="transition-transform group-hover:translate-x-0.5 text-purple-600" />
        </button>
      </div>

      {/* 4. NỘI DUNG 4 PHÂN CẢNH SHOWREEL */}
      <div className="relative z-10 flex w-full max-w-4xl flex-col items-center justify-center text-center">
        <AnimatePresence mode="wait">
          {/* SCENE 1: DESIGN PRECISION & GEOMETRIC HARMONY */}
          {scene === 1 && (
            <motion.div
              key="scene-1"
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.08, filter: "blur(6px)" }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center gap-5"
            >
              {/* Vật thể công nghệ hình học xoay tròn */}
              <div className="relative flex items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                  className="h-24 w-24 rounded-2xl border-2 border-purple-400/40 p-2 shadow-lg bg-white/60 backdrop-blur-sm"
                >
                  <motion.div
                    animate={{ rotate: -360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                    className="h-full w-full rounded-xl border border-dashed border-indigo-400/50 flex items-center justify-center bg-gradient-to-tr from-purple-100 to-white"
                  >
                    <Compass size={28} className="text-purple-600" />
                  </motion.div>
                </motion.div>
              </div>

              <div>
                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.15 }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-purple-200 bg-purple-100/70 px-3.5 py-1 text-xs font-semibold text-purple-800"
                >
                  <Sparkles size={13} className="text-purple-600" />
                  <span>MOTION GRAPHICS SHOWREEL</span>
                </motion.div>

                <motion.h1
                  initial={{ y: 15, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.25 }}
                  className="mt-3 font-label text-4xl sm:text-6xl font-black tracking-tight text-purple-950"
                >
                  DIGITAL CRAFTSMANSHIP
                </motion.h1>

                <motion.p
                  initial={{ y: 15, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.35 }}
                  className="mx-auto mt-2 max-w-md text-sm sm:text-base font-medium text-purple-700/80"
                >
                  Sự kết hợp hoàn hảo giữa chuyển động hình học và công nghệ hiện đại
                </motion.p>
              </div>

              {/* Huy hiệu tối giản */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.45 }}
                className="flex items-center gap-2 font-mono text-xs text-purple-700/70"
              >
                <span className="rounded-lg bg-white border border-purple-200 px-3 py-1 shadow-xs">DYNAMIC SPRING PHYSICS</span>
                <span className="rounded-lg bg-white border border-purple-200 px-3 py-1 shadow-xs">VECTOR PRECISION</span>
              </motion.div>
            </motion.div>
          )}

          {/* SCENE 2: KINETIC TYPOGRAPHY (TEXT · VOICE · IMAGE) */}
          {scene === 2 && (
            <motion.div
              key="scene-2"
              initial={{ opacity: 0, scale: 0.92, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.1, filter: "blur(6px)" }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center gap-6"
            >
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="flex h-12 w-12 items-center justify-center rounded-xl border border-purple-200 bg-white shadow-md text-purple-600"
                >
                  <Eye size={22} />
                </motion.div>
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.2 }}
                  className="flex h-14 w-14 items-center justify-center rounded-2xl border border-purple-300 bg-gradient-to-tr from-purple-600 to-indigo-600 shadow-md text-white"
                >
                  <Layers size={26} />
                </motion.div>
                <motion.div
                  animate={{ y: [0, 5, 0] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.4 }}
                  className="flex h-12 w-12 items-center justify-center rounded-xl border border-purple-200 bg-white shadow-md text-purple-600"
                >
                  <Sparkles size={22} />
                </motion.div>
              </div>

              <div>
                <span className="font-mono text-xs font-bold tracking-widest text-purple-600 uppercase">
                  TRI-MODAL INTERACTION
                </span>
                <h2 className="mt-2 text-4xl sm:text-6xl font-black tracking-tight text-purple-950">
                  TEXT <span className="text-purple-400">·</span> VOICE <span className="text-indigo-400">·</span> IMAGE
                </h2>
                <p className="mt-2.5 text-sm sm:text-base text-purple-700/80 max-w-md mx-auto">
                  Tương tác đa giác quan: gõ từ khóa, nói bằng giọng nói hoặc tìm bằng ảnh
                </p>
              </div>

              {/* 3 Khối thiết kế thanh lịch */}
              <div className="grid grid-cols-3 gap-3 w-full max-w-md pt-1">
                <div className="rounded-xl border border-purple-200 bg-white/80 p-3 shadow-xs">
                  <div className="text-xs font-bold text-purple-950">Văn bản</div>
                  <div className="text-[10px] text-purple-600 font-semibold">Semantic Match</div>
                </div>
                <div className="rounded-xl border border-purple-300 bg-gradient-to-b from-purple-50 to-white p-3 shadow-sm ring-2 ring-purple-400/20">
                  <div className="text-xs font-bold text-purple-900">Giọng nói</div>
                  <div className="text-[10px] text-purple-600 font-semibold">Voice Recognition</div>
                </div>
                <div className="rounded-xl border border-purple-200 bg-white/80 p-3 shadow-xs">
                  <div className="text-xs font-bold text-purple-950">Hình ảnh</div>
                  <div className="text-[10px] text-purple-600 font-semibold">Visual Search</div>
                </div>
              </div>
            </motion.div>
          )}

          {/* SCENE 3: LUMINA CORE PRISM REVELATION */}
          {scene === 3 && (
            <motion.div
              key="scene-3"
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.12, filter: "blur(6px)" }}
              transition={{ duration: 0.55 }}
              className="flex flex-col items-center gap-5"
            >
              {/* Logo Emblem với vầng hào quang tím trắng tinh tế */}
              <motion.div
                animate={{
                  y: [0, -8, 0],
                  scale: [1, 1.05, 1],
                }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                className="relative"
              >
                <div className="absolute -inset-4 rounded-3xl bg-purple-300/40 blur-xl" />
                <div className="relative transform scale-150 p-2">
                  <LuminaEmblem size={64} />
                </div>
              </motion.div>

              <div className="mt-4">
                <motion.h1
                  initial={{ letterSpacing: "0.2em", opacity: 0 }}
                  animate={{ letterSpacing: "0.14em", opacity: 1 }}
                  transition={{ duration: 0.8 }}
                  className="font-label text-5xl sm:text-7xl font-extrabold text-purple-950"
                >
                  LUMINA
                </motion.h1>
                <p className="mt-1.5 text-xs sm:text-sm font-bold tracking-[0.26em] uppercase text-purple-600">
                  INTELLIGENT COMMERCE PLATFORM
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-full border border-purple-200 bg-white/90 px-4 py-1.5 text-xs font-semibold text-purple-800 shadow-xs">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Hệ thống sẵn sàng vận hành</span>
              </div>
            </motion.div>
          )}

          {/* SCENE 4: GATEWAY READY & PROCEED */}
          {scene === 4 && (
            <motion.div
              key="scene-4"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.25, filter: "blur(10px)" }}
              transition={{ duration: 0.55 }}
              className="flex flex-col items-center gap-5"
            >
              <motion.div
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 1.6, repeat: Infinity }}
                className="grid h-20 w-20 place-items-center rounded-2xl border border-purple-300 bg-gradient-to-tr from-purple-600 to-indigo-600 shadow-[0_10px_25px_-5px_rgba(147,51,234,0.4)] text-white"
              >
                <ShieldCheck size={40} />
              </motion.div>

              <div>
                <span className="font-mono text-xs font-bold tracking-widest text-purple-600 uppercase">
                  SECURITY GATEWAY
                </span>
                <h2 className="mt-1.5 text-3xl sm:text-5xl font-black text-purple-950">
                  SẴN SÀNG ĐĂNG NHẬP
                </h2>
                <p className="mt-2 text-sm text-purple-700/80">
                  Nhập thông tin quản trị để truy cập toàn bộ hệ thống
                </p>
              </div>

              <button
                onClick={onComplete}
                className="mt-2 flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-7 py-3 text-sm font-bold text-white shadow-[0_8px_20px_rgba(147,51,234,0.35)] hover:brightness-105 active:scale-95 transition-all"
              >
                <span>Vào trang đăng nhập</span>
                <ArrowRight size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer watermark branding */}
      <div className="absolute bottom-6 z-20 flex items-center gap-2 text-[11px] font-mono font-medium text-purple-400">
        <span>LUMINA SYSTEM</span>
        <span>·</span>
        <span>CLEAN MOTION SHOWREEL</span>
      </div>
    </div>
  );
}
