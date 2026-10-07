"use client";
import React from "react";
import { motion } from "motion/react";

export function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#0e0720]">
      {/* Lớp nền gradient tổng thể chuyển sắc tím sẫm huyền bí */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,53,230,0.35),rgba(255,255,255,0))]" />

      {/* Quầng sáng tím 1 (Top Left Orb) */}
      <motion.div
        animate={{
          x: [0, 60, -40, 0],
          y: [0, -50, 40, 0],
          scale: [1, 1.25, 0.9, 1],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute -left-20 -top-20 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-purple-600/40 via-violet-500/30 to-fuchsia-500/20 blur-[120px]"
      />

      {/* Quầng sáng trắng tím 2 (Center Right Orb - Ánh sáng tinh thể) */}
      <motion.div
        animate={{
          x: [0, -80, 50, 0],
          y: [0, 70, -60, 0],
          scale: [1, 1.15, 1.3, 1],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute -right-20 top-1/4 h-[600px] w-[600px] rounded-full bg-gradient-to-tr from-violet-700/35 via-purple-300/25 to-white/20 blur-[140px]"
      />

      {/* Quầng sáng tím oải hương 3 (Bottom Center Orb) */}
      <motion.div
        animate={{
          x: [0, 70, -60, 0],
          y: [0, -40, 50, 0],
          scale: [1, 1.3, 0.95, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute bottom-[-10%] left-1/3 h-[550px] w-[550px] rounded-full bg-gradient-to-t from-fuchsia-600/30 via-indigo-500/25 to-purple-400/20 blur-[130px]"
      />

      {/* Lưới tinh thể số hóa mờ nhạt (Subtle Cyber Grid) */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.8) 1px, transparent 1px)`,
          backgroundSize: "32px 32px",
        }}
      />

      {/* Ánh sáng quét ngang tinh tế (Light Beam) */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-500/[0.03] to-transparent" />
    </div>
  );
}
