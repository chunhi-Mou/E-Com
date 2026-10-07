"use client";
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { FastForward, Sparkles, Shield, Cpu, Waves, Scan } from "lucide-react";
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

  // Xác định scene hiện tại dựa trên giây
  // 0 - 3.8s: Scene 1 (AI Data Network & Telemetry)
  // 3.8 - 7.8s: Scene 2 (Multimodal Waves: Text / Voice / Vision)
  // 7.8 - 12.0s: Scene 3 (Lumina Core Holographic Reveal)
  // 12.0 - 15.0s: Scene 4 (Convergence & Portal Unlock)
  const scene =
    elapsed < 3.8 ? 1 : elapsed < 7.8 ? 2 : elapsed < 12 ? 3 : 4;

  const progress = Math.min(100, (elapsed / totalSeconds) * 100);
  const remainingSeconds = Math.max(0, Math.ceil(totalSeconds - elapsed));

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-[#0a0518] px-4 text-white select-none">
      {/* Nút Skip & Thanh đếm ngược tiến trình ở góc trên */}
      <div className="absolute top-6 left-6 right-6 z-50 flex items-center justify-between">
        <div className="flex items-center gap-3 rounded-full border border-purple-500/30 bg-purple-950/40 px-4 py-1.5 backdrop-blur-md">
          <div className="h-2 w-2 rounded-full bg-violet-400 animate-pulse" />
          <span className="font-mono text-xs font-semibold tracking-wider text-purple-200">
            SHOWREEL DEMO · 00:{remainingSeconds < 10 ? `0${remainingSeconds}` : remainingSeconds}
          </span>
        </div>

        <button
          onClick={onComplete}
          className="group flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white/90 backdrop-blur-md transition-all hover:border-purple-400 hover:bg-white/20 hover:text-white"
        >
          <span>Bỏ qua Intro</span>
          <FastForward size={14} className="transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>

      {/* Thanh Progress chạy mượt trên cùng màn hình */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-white/10 z-50">
        <motion.div
          className="h-full bg-gradient-to-r from-purple-500 via-fuchsia-400 to-white shadow-[0_0_12px_rgba(216,180,254,0.8)]"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Background Motion Graphics Canvas: Lưới tọa độ và hạt lượng tử */}
      <div className="pointer-events-none absolute inset-0">
        {/* Vòng tròn sóng radar đồng tâm xoay nhẹ */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[700px] w-[700px] rounded-full border border-purple-500/15"
        >
          <div className="absolute inset-8 rounded-full border border-dashed border-purple-400/20" />
          <div className="absolute inset-24 rounded-full border border-purple-300/10" />
          <div className="absolute inset-40 rounded-full border border-dashed border-violet-500/20" />
        </motion.div>

        {/* Tia laser quét ngang */}
        <motion.div
          animate={{ y: ["-100%", "200%"] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-x-0 h-32 bg-gradient-to-b from-transparent via-purple-500/[0.08] to-transparent"
        />
      </div>

      {/* SCENE CONTENT */}
      <div className="relative z-10 flex w-full max-w-4xl flex-col items-center justify-center text-center">
        <AnimatePresence mode="wait">
          {/* SCENE 1: SYSTEM INITIALIZATION & DATA INTELLIGENCE */}
          {scene === 1 && (
            <motion.div
              key="scene-1"
              initial={{ opacity: 0, scale: 0.88, filter: "blur(10px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 1.1, filter: "blur(8px)" }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center gap-6"
            >
              {/* Icon chip xoay với các đường tia */}
              <div className="relative flex items-center justify-center">
                <motion.div
                  animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 180] }}
                  transition={{ duration: 3.5, repeat: Infinity }}
                  className="absolute h-28 w-28 rounded-full border-2 border-dashed border-purple-400/40"
                />
                <div className="grid h-20 w-20 place-items-center rounded-2xl bg-gradient-to-tr from-purple-800 to-violet-500 shadow-[0_0_35px_rgba(168,85,247,0.5)]">
                  <Cpu size={36} className="text-white" />
                </div>
              </div>

              <div>
                <motion.div
                  initial={{ y: 15, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.15 }}
                  className="inline-flex items-center gap-2 rounded-full border border-purple-400/30 bg-purple-900/30 px-3.5 py-1 text-xs font-semibold text-purple-300"
                >
                  <Sparkles size={13} className="text-violet-300" />
                  <span>NEURAL INTELLIGENCE SHOWREEL</span>
                </motion.div>

                <motion.h1
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.25 }}
                  className="mt-3 font-label text-4xl sm:text-6xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-100 to-purple-300"
                >
                  MEDIA INTELLIGENCE
                </motion.h1>

                <motion.p
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.35 }}
                  className="mx-auto mt-2 max-w-md text-sm sm:text-base font-medium text-purple-200/80"
                >
                  Động cơ phân tích & tìm kiếm đa phương thức thời gian thực
                </motion.p>
              </div>

              {/* Data Telemetry Tags */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.45 }}
                className="flex flex-wrap justify-center gap-2 pt-2 text-[11px] font-mono text-purple-300/70"
              >
                <span className="rounded bg-purple-950/60 px-2.5 py-1 border border-purple-800/40">LATENCY: 12ms</span>
                <span className="rounded bg-purple-950/60 px-2.5 py-1 border border-purple-800/40">EMBEDDINGS: 512-DIM</span>
                <span className="rounded bg-purple-950/60 px-2.5 py-1 border border-purple-800/40">ENGINE: MULTIMODAL</span>
              </motion.div>
            </motion.div>
          )}

          {/* SCENE 2: KINETIC MULTIMODAL (TEXT · VOICE · IMAGE) */}
          {scene === 2 && (
            <motion.div
              key="scene-2"
              initial={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 1.15, filter: "blur(8px)" }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center gap-6"
            >
              <div className="flex items-center gap-4">
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="flex h-14 w-14 items-center justify-center rounded-xl border border-purple-400/40 bg-purple-900/40 backdrop-blur-md shadow-[0_0_20px_rgba(168,85,247,0.3)]"
                >
                  <Waves size={26} className="text-purple-300" />
                </motion.div>
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.2 }}
                  className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-white/60 bg-gradient-to-tr from-violet-600 to-purple-400 shadow-[0_0_30px_rgba(216,180,254,0.6)]"
                >
                  <Scan size={32} className="text-white" />
                </motion.div>
                <motion.div
                  animate={{ y: [0, 6, 0] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.4 }}
                  className="flex h-14 w-14 items-center justify-center rounded-xl border border-purple-400/40 bg-purple-900/40 backdrop-blur-md shadow-[0_0_20px_rgba(168,85,247,0.3)]"
                >
                  <Shield size={26} className="text-purple-300" />
                </motion.div>
              </div>

              <div>
                <span className="font-mono text-xs font-semibold tracking-widest text-violet-300 uppercase">
                  TRI-MODAL PERCEPTION ARCHITECTURE
                </span>
                <h2 className="mt-2 text-4xl sm:text-6xl font-black tracking-tight text-white">
                  VOICE <span className="text-violet-400">·</span> IMAGE <span className="text-fuchsia-400">·</span> TEXT
                </h2>
                <p className="mt-3 text-sm sm:text-base text-purple-200/80 max-w-lg">
                  Kết hợp thị giác máy tính, nhận diện giọng nói và ngữ nghĩa tiếng Việt
                </p>
              </div>

              {/* 3 Pillars Animation */}
              <div className="grid grid-cols-3 gap-3 w-full max-w-md pt-2">
                <div className="rounded-xl border border-purple-500/30 bg-purple-950/50 p-3 text-center">
                  <div className="text-xs font-bold text-white">Giọng nói</div>
                  <div className="text-[10px] text-purple-300 font-mono">Whisper AI</div>
                </div>
                <div className="rounded-xl border border-purple-400/40 bg-purple-900/50 p-3 text-center shadow-[0_0_15px_rgba(168,85,247,0.25)]">
                  <div className="text-xs font-bold text-white">Hình ảnh</div>
                  <div className="text-[10px] text-fuchsia-300 font-mono">Vision CLIP</div>
                </div>
                <div className="rounded-xl border border-purple-500/30 bg-purple-950/50 p-3 text-center">
                  <div className="text-xs font-bold text-white">Văn bản</div>
                  <div className="text-[10px] text-purple-300 font-mono">BM25 + Semantic</div>
                </div>
              </div>
            </motion.div>
          )}

          {/* SCENE 3: LUMINA CORE HOLOGRAPHIC REVELATION */}
          {scene === 3 && (
            <motion.div
              key="scene-3"
              initial={{ opacity: 0, scale: 0.85, filter: "blur(12px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 1.15, filter: "blur(8px)" }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center gap-6"
            >
              {/* Logo Emblem khổng lồ với hiệu ứng phát quang lăng kính */}
              <motion.div
                animate={{
                  rotate: [0, 5, -5, 0],
                  scale: [1, 1.06, 1],
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="relative"
              >
                <div className="absolute -inset-6 rounded-3xl bg-gradient-to-r from-violet-600/50 via-fuchsia-500/40 to-white/40 blur-2xl" />
                <div className="relative transform scale-150">
                  <LuminaEmblem size={64} />
                </div>
              </motion.div>

              <div className="mt-6">
                <motion.h1
                  initial={{ letterSpacing: "0.2em", opacity: 0 }}
                  animate={{ letterSpacing: "0.15em", opacity: 1 }}
                  transition={{ duration: 0.8 }}
                  className="font-label text-5xl sm:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-purple-100 to-purple-400"
                >
                  LUMINA
                </motion.h1>
                <p className="mt-2 text-xs sm:text-sm font-semibold tracking-[0.3em] uppercase text-purple-200">
                  INTELLIGENT MULTIMODAL COMMERCE
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-full border border-purple-400/40 bg-purple-900/40 px-4 py-1.5 text-xs text-purple-200 backdrop-blur-md">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>Kiến trúc hệ thống sẵn sàng hoạt động</span>
              </div>
            </motion.div>
          )}

          {/* SCENE 4: PORTAL UNLOCK & CONVERGENCE TO LOGIN */}
          {scene === 4 && (
            <motion.div
              key="scene-4"
              initial={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 1.3, filter: "blur(15px)" }}
              transition={{ duration: 0.6 }}
              className="flex flex-col items-center gap-6"
            >
              <motion.div
                animate={{ scale: [1, 1.25, 1], opacity: [0.8, 1, 0.8] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="grid h-24 w-24 place-items-center rounded-full border-2 border-white/80 bg-gradient-to-tr from-violet-600 to-purple-400 shadow-[0_0_50px_rgba(255,255,255,0.7)]"
              >
                <Shield size={44} className="text-white" />
              </motion.div>

              <div>
                <span className="font-mono text-xs font-semibold tracking-widest text-violet-300 uppercase">
                  ACCESS CONTROL GATEWAY
                </span>
                <h2 className="mt-2 text-3xl sm:text-5xl font-black text-white">
                  ĐANG MỞ CỔNG XÁC THỰC...
                </h2>
                <p className="mt-2 text-sm text-purple-200/80">
                  Chuyển hướng vào không gian đăng nhập quản trị
                </p>
              </div>

              <button
                onClick={onComplete}
                className="mt-2 rounded-xl border border-purple-400/50 bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-2.5 text-sm font-bold text-white shadow-[0_0_25px_rgba(168,85,247,0.6)] hover:brightness-110 active:scale-95 transition-all"
              >
                Vào trang đăng nhập ngay
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer watermark branding */}
      <div className="absolute bottom-6 z-20 flex items-center gap-2 text-[11px] font-mono text-purple-400/60">
        <span>LUMINA CORE v1.0</span>
        <span>·</span>
        <span>ADVANCED MOTION SYSTEM</span>
      </div>
    </div>
  );
}
