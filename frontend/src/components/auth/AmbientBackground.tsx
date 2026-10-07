"use client";
import React from "react";
import { motion } from "motion/react";

export function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#FAF9FE]">
      {/* 1. Lớp nền trắng sứ chủ đạo với các quầng sáng tím pastel thanh lịch */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_90%_at_50%_-10%,rgba(238,230,255,0.85),rgba(250,249,254,0.95))]" />

      {/* Quầng sáng tím oải hương mềm 1 (Góc trên trái) */}
      <motion.div
        animate={{
          x: [0, 40, -30, 0],
          y: [0, -35, 30, 0],
          scale: [1, 1.15, 0.95, 1],
        }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -left-20 -top-24 h-[550px] w-[550px] rounded-full bg-gradient-to-br from-purple-200/50 via-violet-100/40 to-transparent blur-[120px]"
      />

      {/* Quầng sáng tím thạch anh mềm 2 (Góc dưới phải) */}
      <motion.div
        animate={{
          x: [0, -50, 40, 0],
          y: [0, 45, -35, 0],
          scale: [1, 1.1, 1.2, 1],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -right-24 bottom-[-10%] h-[600px] w-[600px] rounded-full bg-gradient-to-tl from-purple-200/60 via-fuchsia-100/35 to-transparent blur-[130px]"
      />

      {/* Quầng sáng trắng ngọc trung tâm */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[750px] w-[750px] rounded-full bg-white/70 blur-[90px]" />

      {/* 2. Lưới tọa độ kiến trúc công nghệ siêu mảnh (Architectural Tech Grid) */}
      <div
        className="absolute inset-0 opacity-[0.25]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(147, 51, 234, 0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(147, 51, 234, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
      />

      {/* 3. CÁC VẬT THỂ CÔNG NGHỆ CHUYỂN ĐỘNG SANG TRỌNG */}

      {/* VẬT THỂ 1: Con quay hồi chuyển đa trục công nghệ (Multi-Axis Gyroscopic Tech Rings) ở góc phải trên */}
      <div className="absolute right-[5%] top-[12%] hidden lg:block opacity-75">
        <div className="relative h-72 w-72 [perspective:1000px]">
          {/* Vòng ngoài cùng - Trục X & Y */}
          <motion.div
            animate={{ rotateZ: 360, rotateX: [15, 35, 15] }}
            transition={{ rotateZ: { duration: 32, repeat: Infinity, ease: "linear" }, rotateX: { duration: 8, repeat: Infinity, ease: "easeInOut" } }}
            className="absolute inset-0 rounded-full border border-purple-300/60 shadow-[0_0_20px_rgba(168,85,247,0.12)]"
          >
            {/* Các vạch chia độ công nghệ */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 h-2.5 w-1 bg-purple-500 rounded-full" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-2.5 w-1 bg-purple-400 rounded-full" />
            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 w-2.5 bg-purple-400 rounded-full" />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 h-1 w-2.5 bg-purple-500 rounded-full" />
          </motion.div>

          {/* Vòng giữa - Xoay ngược chiều */}
          <motion.div
            animate={{ rotateZ: -360, rotateY: [25, -20, 25] }}
            transition={{ rotateZ: { duration: 24, repeat: Infinity, ease: "linear" }, rotateY: { duration: 10, repeat: Infinity, ease: "easeInOut" } }}
            className="absolute inset-8 rounded-full border border-dashed border-purple-400/50"
          >
            {/* Hạt phát sáng chạy trên quỹ đạo */}
            <div className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-purple-600 shadow-[0_0_10px_rgba(147,51,234,0.6)]" />
          </motion.div>

          {/* Vòng trong cùng với tâm điểm tinh thể */}
          <motion.div
            animate={{ rotateZ: 360 }}
            transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
            className="absolute inset-16 rounded-full border border-purple-300/50"
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-6 w-6 rounded-lg bg-gradient-to-tr from-purple-500 to-indigo-400 opacity-60 shadow-md rotate-45" />
            </div>
          </motion.div>
        </div>
      </div>

      {/* VẬT THỂ 2: Khối lăng kính hình học công nghệ 3D (Floating Tech Wireframe) ở góc trái dưới */}
      <div className="absolute left-[6%] bottom-[12%] hidden lg:block opacity-70">
        <motion.div
          animate={{
            y: [0, -18, 0],
            rotateZ: [0, 8, -6, 0],
          }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          className="relative h-64 w-64"
        >
          {/* Lớp khối hình học đa giác lơ lửng */}
          <svg viewBox="0 0 200 200" className="h-full w-full">
            <defs>
              <linearGradient id="techLineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#A855F7" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#6366F1" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#C084FC" stopOpacity="0.2" />
              </linearGradient>
            </defs>
            {/* Khối lăng kính đa diện (Isometric Polyhedron) */}
            <polygon
              points="100,20 170,60 170,140 100,180 30,140 30,60"
              fill="rgba(243, 232, 255, 0.45)"
              stroke="url(#techLineGrad)"
              strokeWidth="1.5"
            />
            {/* Các đường kết nối cấu trúc khối */}
            <line x1="100" y1="20" x2="100" y2="180" stroke="url(#techLineGrad)" strokeWidth="1" strokeDasharray="3 3" />
            <line x1="30" y1="60" x2="170" y2="140" stroke="url(#techLineGrad)" strokeWidth="1" />
            <line x1="170" y1="60" x2="30" y2="140" stroke="url(#techLineGrad)" strokeWidth="1" />
            <circle cx="100" cy="100" r="16" fill="rgba(168, 85, 247, 0.15)" stroke="#9333EA" strokeWidth="1" />
            <circle cx="100" cy="100" r="4" fill="#9333EA" />
          </svg>
        </motion.div>
      </div>

      {/* VẬT THỂ 3: Các đường vòng cung quỹ đạo thanh mảnh (Orbit Arcs) */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[900px] w-[900px] rounded-full border border-purple-200/35"
      >
        <div className="absolute left-1/4 top-0 h-2 w-2 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
        <div className="absolute right-1/4 bottom-0 h-2.5 w-2.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
      </motion.div>

      {/* VẬT THỂ 4: Các hạt bụi sáng lơ lửng nhẹ nhàng (Subtle Floating Tech Beacons) */}
      {[
        { x: "20%", y: "30%", d: 14, s: 5 },
        { x: "80%", y: "45%", d: 18, s: 6 },
        { x: "35%", y: "75%", d: 16, s: 4 },
        { x: "65%", y: "85%", d: 20, s: 5 },
        { x: "15%", y: "60%", d: 15, s: 4 },
      ].map((p, i) => (
        <motion.div
          key={i}
          animate={{
            y: [0, -25, 0],
            opacity: [0.3, 0.8, 0.3],
          }}
          transition={{ duration: p.d, repeat: Infinity, ease: "easeInOut", delay: i * 1.5 }}
          style={{ left: p.x, top: p.y, width: p.s, height: p.s }}
          className="absolute rounded-full bg-gradient-to-tr from-purple-400 to-indigo-400 shadow-[0_0_8px_rgba(168,85,247,0.4)]"
        />
      ))}
    </div>
  );
}
