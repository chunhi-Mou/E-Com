"use client";
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { FastForward, Sparkles, ArrowRight } from "lucide-react";
import { LuminaEmblem } from "@/components/Logo";

interface MotionShowreelProps {
  onComplete: () => void;
}

export function MotionShowreel({ onComplete }: MotionShowreelProps) {
  const [elapsed, setElapsed] = useState(0);
  const totalSeconds = 5; // Rút ngắn chính xác 5 giây theo yêu cầu

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

  // Phân đoạn trong 5 giây:
  // 0s - 2.6s: Khởi tạo lăng kính hình học & Brand Typography "LUMINA"
  // 2.6s - 5.0s: Hội tụ lăng kính 3D & Mở cổng vào hệ thống
  const phase = elapsed < 2.6 ? 1 : 2;
  const progress = Math.min(100, (elapsed / totalSeconds) * 100);
  const remainingSeconds = Math.max(0, Math.ceil(totalSeconds - elapsed));

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-[#F8FAFC] px-4 text-slate-900 select-none">
      {/* 1. Nền sáng công nghệ phối quầng sáng tím khói nhẹ */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(238,230,255,0.7),rgba(248,250,252,0.95))]" />

        {/* Lưới kỹ thuật số mờ */}
        <div
          className="absolute inset-0 opacity-[0.25]"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(100, 116, 139, 0.12) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(100, 116, 139, 0.12) 1px, transparent 1px)
            `,
            backgroundSize: "36px 36px",
          }}
        />

        {/* Vòng tròn quỹ đạo hình học quay nhẹ */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[650px] w-[650px] rounded-full border border-purple-200/60"
        >
          <div className="absolute inset-16 rounded-full border border-dashed border-purple-300/40" />
          <div className="absolute inset-32 rounded-full border border-slate-200/50" />
        </motion.div>
      </div>

      {/* 2. Thanh Progress 5 giây trên cùng màn hình */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-slate-200 z-50">
        <motion.div
          className="h-full bg-gradient-to-r from-[#4C1D95] via-[#7C3AED] to-[#3B0764] shadow-[0_0_8px_rgba(124,58,237,0.4)]"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 3. Header: Đếm ngược 5s & Nút Bỏ qua */}
      <div className="absolute top-6 left-6 right-6 z-50 flex items-center justify-between">
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3.5 py-1.5 shadow-xs backdrop-blur-md">
          <div className="h-2 w-2 rounded-full bg-purple-600 animate-pulse" />
          <span className="font-mono text-xs font-bold text-slate-700 tracking-wider">
            INTRO · 00:0{remainingSeconds}
          </span>
        </div>

        <button
          onClick={onComplete}
          className="group flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/90 px-4 py-1.5 text-xs font-semibold text-slate-700 shadow-xs backdrop-blur-md transition-all hover:bg-slate-50 hover:text-slate-900 active:scale-95"
        >
          <span>Bỏ qua</span>
          <FastForward size={13} className="text-purple-600 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>

      {/* 4. NỘI DUNG CHUYỂN ĐỘNG 5 GIÂY (Không gian đồ họa tinh giản, sang trọng, không giống AI) */}
      <div className="relative z-10 flex w-full max-w-2xl flex-col items-center justify-center text-center">
        <AnimatePresence mode="wait">
          {/* GIAI ĐOẠN 1 (0s - 2.6s): BRAND KINETIC REVEAL */}
          {phase === 1 && (
            <motion.div
              key="phase-1"
              initial={{ opacity: 0, scale: 0.92, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.08, filter: "blur(6px)" }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center gap-4"
            >
              {/* Logo Emblem với hiệu ứng lăng kính xoay nhẹ */}
              <motion.div
                animate={{ scale: [1, 1.06, 1], rotate: [0, 6, 0] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                className="relative p-2"
              >
                <div className="absolute -inset-3 rounded-2xl bg-purple-200/50 blur-lg" />
                <div className="relative transform scale-125">
                  <LuminaEmblem size={56} />
                </div>
              </motion.div>

              <div className="mt-2">
                <motion.h1
                  initial={{ letterSpacing: "0.22em", opacity: 0 }}
                  animate={{ letterSpacing: "0.15em", opacity: 1 }}
                  transition={{ duration: 0.6 }}
                  className="font-label text-5xl sm:text-7xl font-extrabold text-slate-950 tracking-[0.15em]"
                >
                  LUMINA
                </motion.h1>
                <p className="mt-1 text-xs sm:text-sm font-semibold tracking-[0.25em] uppercase text-purple-700">
                  NEXT GENERATION COMMERCE
                </p>
              </div>

              <div className="mt-2 flex items-center gap-1.5 font-mono text-[11px] text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded-full shadow-2xs">
                <Sparkles size={12} className="text-purple-600" />
                <span>DYNAMIC MOTION SHOWCASE</span>
              </div>
            </motion.div>
          )}

          {/* GIAI ĐOẠN 2 (2.6s - 5.0s): GATEWAY READY */}
          {phase === 2 && (
            <motion.div
              key="phase-2"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.15, filter: "blur(8px)" }}
              transition={{ duration: 0.45 }}
              className="flex flex-col items-center gap-4"
            >
              <motion.div
                animate={{ scale: [1, 1.12, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                className="grid h-16 w-16 place-items-center rounded-2xl border border-purple-300 bg-gradient-to-tr from-[#4C1D95] to-[#7C3AED] text-white shadow-[0_8px_20px_rgba(124,58,237,0.35)]"
              >
                <ArrowRight size={28} />
              </motion.div>

              <div>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                  SẴN SÀNG TRUY CẬP
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-slate-500 font-medium">
                  Đang khởi tạo không gian quản trị LUMINA…
                </p>
              </div>

              <button
                onClick={onComplete}
                className="mt-1 flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#4C1D95] via-[#581C87] to-[#3B0764] px-6 py-2.5 text-xs font-bold text-white shadow-md hover:brightness-110 active:scale-95 transition-all"
              >
                <span>Vào ngay</span>
                <ArrowRight size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer nhỏ gọn */}
      <div className="absolute bottom-6 z-20 flex items-center gap-2 text-[11px] font-mono text-slate-400">
        <span>LUMINA SYSTEM</span>
        <span>·</span>
        <span>5-SECOND CINEMATIC INTRO</span>
      </div>
    </div>
  );
}
