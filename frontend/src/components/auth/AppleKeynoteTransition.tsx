"use client";
import React, { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import {
  Volume2,
  VolumeX,
  FastForward,
  Camera,
  Sun,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

interface AppleKeynoteTransitionProps {
  onComplete: () => void;
}

// 9 ảnh sản phẩm cho Bento Grid
const BENTO_PHOTOS = [
  { id: 1, src: "/photos/P000001_0.jpg", tag: "PRECISION", title: "Khởi đầu đa thức", span: "col-span-2 row-span-2" },
  { id: 2, src: "/photos/P000002_0.jpg", tag: "OPTICS", title: "Thấu kính phân giải", span: "col-span-1 row-span-1" },
  { id: 3, src: "/photos/P000003_0.jpg", tag: "CHRONO", title: "Thời gian thực 120 FPS", span: "col-span-1 row-span-1" },
  { id: 4, src: "/photos/P000004_0.jpg", tag: "AI VISION", title: "Embeddings 512-D", span: "col-span-1 row-span-2" },
  { id: 5, src: "/photos/P000005_0.jpg", tag: "LUMINA", title: "Trải nghiệm cực hạn", span: "col-span-1 row-span-1" },
  { id: 6, src: "/photos/P000006_0.jpg", tag: "MINIMAL", title: "Đường nét tối giản", span: "col-span-1 row-span-1" },
  { id: 7, src: "/photos/P000007_0.jpg", tag: "ACOUSTIC", title: "Phản hồi xúc giác", span: "col-span-1 row-span-1" },
  { id: 8, src: "/photos/P000008_0.jpg", tag: "TEXTURE", title: "Chất liệu quang học", span: "col-span-1 row-span-1" },
  { id: 9, src: "/photos/P000009_0.jpg", tag: "CATALOG", title: "Hệ sinh thái thông minh", span: "col-span-2 row-span-1" },
];

export function AppleKeynoteTransition({ onComplete }: AppleKeynoteTransitionProps) {
  // Beat counter: 120 BPM = 500ms mỗi beat. Tổng 18 beats (~9.0 giây)
  const [beat, setBeat] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Âm thanh tổng hợp Web Audio API (chuẩn nhịp 120 BPM)
  const playSound = useCallback(
    (type: "tick" | "click" | "snap" | "sweep" | "bassDrop" | "chime") => {
      if (isMuted) return;
      try {
        const AudioCtor =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!audioCtxRef.current && AudioCtor) {
          audioCtxRef.current = new AudioCtor();
        }
        const ctx = audioCtxRef.current;
        if (!ctx) return;
        if (ctx.state === "suspended") {
          ctx.resume().catch(() => {});
        }

        const now = ctx.currentTime;

        if (type === "tick") {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(800, now);
          osc.frequency.exponentialRampToValueAtTime(200, now + 0.04);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.04);
        } else if (type === "click") {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(1400, now);
          osc.frequency.exponentialRampToValueAtTime(300, now + 0.08);
          gain.gain.setValueAtTime(0.18, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.08);
        } else if (type === "snap") {
          // Iris mechanical snap: white noise burst + short mechanical pulse
          const bufferSize = ctx.sampleRate * 0.06;
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
          }
          const noise = ctx.createBufferSource();
          noise.buffer = buffer;
          const filter = ctx.createBiquadFilter();
          filter.type = "bandpass";
          filter.frequency.setValueAtTime(2200, now);
          filter.Q.setValueAtTime(3, now);
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.28, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
          noise.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          noise.start(now);
        } else if (type === "sweep") {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(240, now);
          osc.frequency.exponentialRampToValueAtTime(680, now + 0.35);
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.linearRampToValueAtTime(0.15, now + 0.2);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.35);
        } else if (type === "bassDrop") {
          // Sub-bass drop tại beat 14
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(80, now);
          osc.frequency.exponentialRampToValueAtTime(32, now + 0.8);
          gain.gain.setValueAtTime(0.35, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.85);
        } else if (type === "chime") {
          // Hợp âm hạ cánh Cmaj9
          [523.25, 659.25, 783.99, 987.77, 1174.66].forEach((freq, idx) => {
            if (!ctx) return;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, now + idx * 0.04);
            gain.gain.setValueAtTime(0.08, now + idx * 0.04);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + idx * 0.04);
            osc.stop(now + 1.25);
          });
        }
      } catch {
        // Fallback im lặng nếu autoplay bị chặn
      }
    },
    [isMuted]
  );

  // Bộ định thì 120 BPM: Mỗi 500ms nhảy 1 beat
  useEffect(() => {
    let currentBeat = 0;
    const interval = setInterval(() => {
      currentBeat += 1;
      setBeat(currentBeat);

      // Kích hoạt âm thanh đồng bộ từng phân cảnh
      if (currentBeat === 1) playSound("click");
      if (currentBeat === 2) playSound("click");
      if (currentBeat === 4) playSound("snap"); // Iris blades snap open
      if (currentBeat === 6) playSound("tick");
      if (currentBeat === 9) playSound("sweep"); // Golden hour relight slider
      if (currentBeat === 11) playSound("click"); // Bento grid unfold
      if (currentBeat === 14) playSound("bassDrop"); // Black flood
      if (currentBeat === 16) playSound("chime"); // Contracting into header emblem

      if (currentBeat >= 18) {
        clearInterval(interval);
        setTimeout(() => {
          onComplete();
        }, 300);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [onComplete, playSound]);

  // Điều phối các phân cảnh liên tục (Continuous-Take 2D)
  // Beat 0-2: Wordmark SEEK. trồi lên & nén accordion thành viên thuốc đen
  // Beat 3-5: Con trỏ click viên thuốc, biến hình thành khẩu độ máy ảnh Iris 6 cánh
  // Beat 6-8: Khẩu độ bung mở thành ảnh sản phẩm 1 & Thanh iOS Liquid Glass
  // Beat 9-10: Con trỏ kéo slider chuyển ánh sáng sang Golden Hour hoàng hôn tím
  // Beat 11-13: Bung nở Bento Grid 9 ảnh như bản đồ gập origami
  // Beat 14-15: Khối đen tím tràn ngập màn hình (Black shape flood)
  // Beat 16-18: Khối đen co rút về vị trí Header Logo LUMINA trên trang chủ

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#FAF9FE] text-slate-900 select-none">
      {/* Lưới kỹ thuật nền tinh tế */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(148,163,184,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.12) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* THANH ĐIỀU KHIỂN ĐỈNH TRÊN (BỎ QUA & ÂM LƯỢNG) */}
      <div className="absolute top-6 left-6 right-6 z-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3.5 py-1.5 shadow-sm backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-purple-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-purple-600" />
            </span>
            <span className="font-mono text-xs font-bold tracking-wider text-slate-700 uppercase">
              120 BPM // BEAT {beat}/18
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsMuted((m) => !m)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-600 shadow-sm backdrop-blur-md transition-colors hover:bg-slate-100 hover:text-slate-900"
            title={isMuted ? "Bật âm thanh" : "Tắt âm thanh"}
          >
            {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
        </div>

        <button
          type="button"
          onClick={onComplete}
          className="group flex items-center gap-2 rounded-full border border-purple-200 bg-white/90 px-4 py-1.5 text-xs font-bold text-purple-900 shadow-md backdrop-blur-md transition-all hover:border-purple-400 hover:bg-purple-50 active:scale-95"
        >
          <span>Vào Trang Chủ ngay</span>
          <FastForward size={14} className="text-purple-600 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>

      {/* SÂN KHẤU CHUYỂN CẢNH MỘT CÚ MÁY (ONE CONTINUOUS TAKE) */}
      <div className="relative flex h-full w-full items-center justify-center">

        {/* =========================================================================
            PHASE 1 (Beats 0-2): WORDMARK "SEEK." ACCORDION SQUEEZE -> LIQUID PILL
           ========================================================================= */}
        {beat <= 3 && (
          <motion.div
            className="relative flex items-center justify-center"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1 }}
          >
            {/* Vùng mask line che chữ trồi lên */}
            <div className="relative overflow-hidden py-4">
              <motion.div
                initial={{ y: 90 }}
                animate={{
                  y: beat >= 1.5 ? 0 : 0,
                  scaleX: beat >= 2 ? 0.08 : 1, // Accordion squeeze vào dấu chấm
                  opacity: beat >= 2.5 ? 0 : 1,
                }}
                transition={{
                  duration: 0.45,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="flex items-baseline font-black tracking-tighter text-7xl sm:text-8xl md:text-9xl text-slate-950 font-sans"
              >
                <span>SEEK</span>
                <span className="text-purple-600">.</span>
              </motion.div>
            </div>

            {/* Dấu chấm biến thành Viên thuốc đen bóng (Liquid Pill) */}
            {beat >= 2 && beat <= 3 && (
              <motion.div
                initial={{ scale: 0.2, width: 24, height: 24 }}
                animate={{
                  scale: 1,
                  width: beat === 3 ? 240 : 180,
                  height: 54,
                }}
                transition={{ type: "spring", stiffness: 420, damping: 28 }}
                className="absolute flex items-center justify-between rounded-full bg-slate-950 px-5 text-white shadow-2xl ring-4 ring-purple-500/20"
              >
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-purple-400 animate-pulse" />
                  <span className="font-mono text-xs font-bold tracking-widest text-slate-200 uppercase">
                    SEEK.LUMINA
                  </span>
                </div>
                <ArrowRight size={16} className="text-purple-400" />
              </motion.div>
            )}
          </motion.div>
        )}

        {/* =========================================================================
            PHASE 2 (Beats 3-5): KHẨU ĐỘ 6 CÁNH IRIS SNAP MỞ RA ẢNH SẢN PHẨM
           ========================================================================= */}
        {beat >= 3 && beat <= 6 && (
          <motion.div
            initial={{ scale: 0.3, borderRadius: "50%" }}
            animate={{
              scale: beat >= 5 ? 1.05 : 0.85,
              borderRadius: beat >= 5 ? "28px" : "50%",
            }}
            transition={{ type: "spring", stiffness: 350, damping: 26 }}
            className="relative flex items-center justify-center overflow-hidden border-4 border-slate-900 bg-slate-950 shadow-[0_30px_90px_-20px_rgba(15,23,42,0.45)]"
            style={{
              width: beat >= 5 ? "85vw" : "360px",
              maxWidth: "1020px",
              height: beat >= 5 ? "72vh" : "360px",
              maxHeight: "680px",
            }}
          >
            {/* Ảnh sản phẩm nằm bên dưới khẩu độ */}
            <div className="relative h-full w-full">
              <Image
                src="/photos/P000001_0.jpg"
                alt="Product Iris Reveal"
                fill
                priority
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-slate-950/20" />
            </div>

            {/* 6 cánh khẩu độ (Iris Blades SVG) che phủ rồi quay xoay mở snap */}
            <motion.div
              initial={{ rotate: 0, opacity: 1, scale: 1 }}
              animate={{
                rotate: beat >= 4 ? 65 : 0,
                scale: beat >= 4 ? 2.4 : 1,
                opacity: beat >= 5 ? 0 : 1,
              }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
            >
              <svg className="h-[440px] w-[440px]" viewBox="0 0 100 100">
                {/* 6 cánh khẩu độ cơ học xám titan */}
                {[0, 60, 120, 180, 240, 300].map((deg, i) => (
                  <polygon
                    key={i}
                    points="50,50 85,20 100,60 65,80"
                    transform={`rotate(${deg} 50 50)`}
                    fill="#0F172A"
                    stroke="#334155"
                    strokeWidth="0.8"
                    opacity="0.96"
                  />
                ))}
                <circle cx="50" cy="50" r="16" fill="transparent" stroke="#7C3AED" strokeWidth="1.5" />
              </svg>
            </motion.div>

            {/* Tâm ngắm ống kính */}
            {beat === 4 && (
              <motion.div
                initial={{ scale: 0.7 }}
                animate={{ scale: 1 }}
                className="pointer-events-none absolute flex flex-col items-center gap-1 font-mono text-[11px] font-bold text-white uppercase tracking-wider"
              >
                <Camera size={26} className="text-purple-400" />
                <span className="bg-slate-900/80 px-2 py-0.5 rounded border border-purple-500/40">
                  IRIS SNAP // f/1.4
                </span>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* =========================================================================
            PHASE 3 (Beats 6-10): LIQUID GLASS TOOLBAR & GOLDEN HOUR RELIGHT
           ========================================================================= */}
        {beat >= 6 && beat <= 10 && (
          <motion.div
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="relative flex flex-col items-center justify-center overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_30px_90px_-20px_rgba(15,23,42,0.3)]"
            style={{
              width: "88vw",
              maxWidth: "1080px",
              height: "75vh",
              maxHeight: "700px",
            }}
          >
            {/* Ảnh sản phẩm với filter ánh sáng thay đổi từ ngày sang Golden Hour hoàng hôn tím */}
            <div className="relative h-full w-full overflow-hidden">
              <Image
                src="/photos/P000001_0.jpg"
                alt="Studio Relight"
                fill
                priority
                className="object-cover"
              />

              {/* Lớp ánh sáng vàng tím (Golden Hour + Royal Violet Overlay) */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: beat >= 8 ? 0.65 : 0 }}
                transition={{ duration: 0.7, ease: "easeInOut" }}
                className="absolute inset-0 bg-gradient-to-tr from-purple-950/60 via-amber-600/30 to-violet-500/40 mix-blend-color-burn pointer-events-none"
              />

              {/* Thông tin Telemetry hiển thị trên ảnh */}
              <div className="absolute top-6 left-6 flex items-center gap-2 rounded-xl bg-slate-950/70 px-3.5 py-1.5 font-mono text-xs text-white backdrop-blur-md border border-white/10">
                <ShieldCheck size={14} className="text-emerald-400" />
                <span>MULTIMODAL SENSORY ENGINE // ACTIVE</span>
              </div>
            </div>

            {/* THANH ĐIỀU KHIỂN KÍNH LỎNG (iOS 26 Liquid Glass Toolbar) */}
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="absolute bottom-8 z-30 flex items-center gap-5 rounded-2xl border border-white/50 bg-white/40 px-6 py-3.5 shadow-[0_20px_50px_rgba(76,29,149,0.25)] backdrop-blur-2xl ring-1 ring-white/60"
            >
              <div className="flex items-center gap-2 font-mono text-xs font-bold text-slate-900">
                <Sun size={17} className="text-amber-500 animate-spin" style={{ animationDuration: "12s" }} />
                <span>RELIGHT: {beat >= 9 ? "GOLDEN HOUR (3200K)" : "STUDIO NOON (5600K)"}</span>
              </div>

              {/* Thanh kéo Slider ánh sáng */}
              <div className="relative h-2 w-44 rounded-full bg-slate-900/20 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-purple-600 to-amber-500"
                  initial={{ width: "25%" }}
                  animate={{ width: beat >= 9 ? "85%" : "25%" }}
                  transition={{ duration: 0.6, ease: "easeInOut" }}
                />
              </div>

              <div className="flex items-center gap-1.5 rounded-lg bg-slate-900/80 px-2.5 py-1 text-[11px] font-mono text-purple-200">
                <Sparkles size={12} className="text-purple-400" />
                <span>CHROMATIC REFRACTION</span>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* =========================================================================
            PHASE 4 (Beats 11-13): BENTO GRID 9 ẢNH UNROLL NHƯ BẢN ĐỒ ORIGAMI
           ========================================================================= */}
        {beat >= 11 && beat <= 13 && (
          <motion.div
            initial={{ scale: 0.88, rotateX: 10, opacity: 0 }}
            animate={{ scale: 1, rotateX: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
            className="relative w-[92vw] max-w-5xl h-[80vh] max-h-[740px] p-4 flex flex-col justify-between"
          >
            {/* Header Bento Grid */}
            <div className="flex items-center justify-between mb-3 px-2">
              <div className="flex items-center gap-2">
                <Layers size={18} className="text-purple-600" />
                <h3 className="text-base font-bold text-slate-900">
                  HỆ SINH THÁI TÌM KIẾM ĐA PHƯƠNG THỨC LUMINA
                </h3>
              </div>
              <span className="font-mono text-xs font-semibold text-purple-700 bg-purple-100/80 px-2.5 py-0.5 rounded-full border border-purple-200">
                9 NÚT MẠNG KẾT NỐI
              </span>
            </div>

            {/* Lưới 9 ô Bento bung nở */}
            <div className="grid grid-cols-4 grid-rows-3 gap-3 flex-1">
              {BENTO_PHOTOS.map((item, idx) => (
                <motion.div
                  key={item.id}
                  initial={{ scale: 0.7, opacity: 0, y: 30 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  transition={{
                    delay: idx * 0.04,
                    type: "spring",
                    stiffness: 380,
                    damping: 25,
                  }}
                  className={`group relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 shadow-md ${item.span}`}
                >
                  <Image
                    src={item.src}
                    alt={item.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/20" />

                  <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-mono text-[9px] font-black uppercase tracking-wider text-purple-300">
                        {item.tag}
                      </span>
                      <p className="text-xs font-bold text-white truncate drop-shadow-sm">
                        {item.title}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* =========================================================================
            PHASE 5 (Beats 14-18): BLACK FLOOD -> CONTRACT VÀO HEADER LOGO TRANG CHỦ
           ========================================================================= */}
        {beat >= 14 && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
          >
            {/* Khối đen tím bùng nổ tràn ngập khung hình tại Beat 14 */}
            {beat <= 15 ? (
              <motion.div
                initial={{ scale: 0.1, borderRadius: "50%" }}
                animate={{ scale: 3.5, borderRadius: "0%" }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="h-[120vmax] w-[120vmax] bg-gradient-to-br from-[#0F172A] via-[#1E1B4B] to-[#3B0764] flex items-center justify-center"
              >
                <div className="text-center text-white">
                  <h2 className="font-sans text-5xl sm:text-6xl font-black tracking-tight">
                    LUMINA
                  </h2>
                  <p className="mt-2 font-mono text-sm tracking-widest text-purple-300 uppercase">
                    CHÀO MỪNG ĐẾN VỚI TRANG CHỦ
                  </p>
                </div>
              </motion.div>
            ) : (
              /* Beat 16-18: Khối đen co rút từ trung tâm lên đỉnh đầu (Vị trí Header của Trang Chủ) */
              <motion.div
                initial={{
                  x: 0,
                  y: 0,
                  width: "100vw",
                  height: "100vh",
                  borderRadius: "0px",
                }}
                animate={{
                  x: 0,
                  y: "-42vh", // Co lên vị trí Header
                  width: "280px",
                  height: "50px",
                  borderRadius: "25px",
                }}
                transition={{
                  duration: 0.85,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="flex items-center justify-center bg-gradient-to-r from-[#4C1D95] via-[#581C87] to-[#3B0764] shadow-[0_15px_40px_rgba(76,29,149,0.5)] border border-purple-400/30 overflow-hidden"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-center gap-2 text-white"
                >
                  <div className="h-3 w-3 rounded-full bg-purple-300 animate-ping" />
                  <span className="font-bold tracking-wider text-sm font-sans uppercase">
                    LUMINA STORE
                  </span>
                </motion.div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* CON TRỎ CHUỘT MÔ PHỎNG ĐIỀU HƯỚNG TỰ ĐỘNG (Simulated Mac Cursor) */}
        {beat >= 2 && beat <= 10 && (
          <motion.div
            className="pointer-events-none fixed z-40"
            initial={{ x: "65vw", y: "75vh" }}
            animate={{
              x:
                beat === 3
                  ? "50vw" // Di chuyển vào giữa click viên thuốc
                  : beat === 7
                  ? "58vw" // Di chuyển đến toolbar
                  : beat >= 9
                  ? "46vw" // Kéo slider Golden Hour
                  : "52vw",
              y:
                beat === 3
                  ? "50vh"
                  : beat === 7
                  ? "82vh"
                  : beat >= 9
                  ? "82vh"
                  : "60vh",
              scale: beat === 3 || beat === 9 ? 0.85 : 1,
            }}
            transition={{
              duration: 0.6,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            {/* SVG con trỏ macOS kinh điển */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              className="drop-shadow-[0_4px_10px_rgba(0,0,0,0.4)]"
            >
              <path
                d="M5.5 3.2L18.8 12.3C19.7 12.9 19.4 14.3 18.3 14.4L13.2 15L16.4 20.8C16.8 21.6 15.9 22.3 15.1 21.8L12.4 20.3L9.6 15.5L6.3 18.4C5.5 19.1 4.2 18.5 4.3 17.4L5.5 3.2Z"
                fill="#0F172A"
                stroke="#FFFFFF"
                strokeWidth="1.5"
              />
            </svg>
          </motion.div>
        )}
      </div>

      {/* THANH TIẾN ĐỘ THỜI GIAN CHUẨN 18 BEATS Ở DƯỚI ĐÁY */}
      <div className="absolute bottom-4 left-8 right-8 z-50">
        <div className="relative h-1 w-full overflow-hidden rounded-full bg-slate-200">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-800"
            initial={{ width: "0%" }}
            animate={{ width: `${Math.min(100, (beat / 18) * 100)}%` }}
            transition={{ ease: "linear", duration: 0.4 }}
          />
        </div>
      </div>
    </div>
  );
}
