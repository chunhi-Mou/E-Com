"use client";
import React, { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { ShieldCheck, Cpu, Sparkles, Activity, Layers } from "lucide-react";
import { LuminaEmblem } from "@/components/Logo";

export function TechVisualBox() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 500);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 600);

    const onResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };
    window.addEventListener("resize", onResize);

    // Tạo các hạt mạng lượng tử công nghệ
    const pCount = 38;
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
      color: string;
    }> = [];

    const colors = [
      "rgba(192, 132, 252, 0.8)", // tím sáng
      "rgba(147, 197, 253, 0.75)", // xanh bạc
      "rgba(255, 255, 255, 0.85)", // trắng tinh
      "rgba(168, 85, 247, 0.7)",  // tím hoa cà
    ];

    for (let i = 0; i < pCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.7,
        vy: (Math.random() - 0.5) * 0.7,
        r: Math.random() * 2.2 + 1.2,
        color: colors[i % colors.length],
      });
    }

    let angle = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Cập nhật vị trí và vẽ đường liên kết
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 110) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(192, 132, 252, ${(1 - dist / 110) * 0.35})`;
            ctx.lineWidth = 0.9;
            ctx.stroke();
          }
        }
      }

      // Vẽ vòng tròn radar xoay ở trung tâm
      angle += 0.012;
      const cx = width * 0.5;
      const cy = height * 0.5;
      const r = Math.min(width, height) * 0.32;

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(168, 85, 247, 0.25)";
      ctx.lineWidth = 1.2;
      ctx.setLineDash([5, 5]);
      ctx.stroke();

      // Tia quét radar
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
      ctx.strokeStyle = "rgba(216, 180, 254, 0.55)";
      ctx.lineWidth = 1.8;
      ctx.setLineDash([]);
      ctx.stroke();
      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div className="relative h-full min-h-[580px] w-full overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c071e] via-[#1a0f35] to-[#090515] p-8 text-white shadow-2xl flex flex-col justify-between select-none">
      {/* 1. Lớp ánh sáng quang học và tia laser */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(147,51,234,0.35),transparent_70%)]" />

      {/* Lưới tọa độ bên trong box */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(216, 180, 254, 0.25) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(216, 180, 254, 0.25) 1px, transparent 1px)
          `,
          backgroundSize: "32px 32px",
        }}
      />

      {/* Canvas mạng hạt kết nối và radar chạy 60fps */}
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />

      {/* 2. VẬT THỂ CÔNG NGHỆ 3D TRUNG TÂM (Con quay hồi chuyển đa trục + Logo Lumina phát quang) */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="relative flex items-center justify-center h-72 w-72 [perspective:1000px]">
          {/* Vòng ngoài cùng - Trục X & Y */}
          <motion.div
            animate={{ rotateZ: 360, rotateX: [20, 50, 20] }}
            transition={{
              rotateZ: { duration: 25, repeat: Infinity, ease: "linear" },
              rotateX: { duration: 7, repeat: Infinity, ease: "easeInOut" },
            }}
            className="absolute inset-0 rounded-full border-2 border-purple-400/40 shadow-[0_0_25px_rgba(168,85,247,0.35)]"
          >
            {/* Các vạch chia độ công nghệ */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 h-3 w-1.5 bg-white rounded-full shadow-[0_0_8px_#fff]" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-3 w-1.5 bg-purple-400 rounded-full" />
            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 w-3 bg-purple-400 rounded-full" />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 h-1.5 w-3 bg-white rounded-full shadow-[0_0_8px_#fff]" />
          </motion.div>

          {/* Vòng giữa - Xoay ngược chiều quanh trục Y */}
          <motion.div
            animate={{ rotateZ: -360, rotateY: [30, -30, 30] }}
            transition={{
              rotateZ: { duration: 18, repeat: Infinity, ease: "linear" },
              rotateY: { duration: 8, repeat: Infinity, ease: "easeInOut" },
            }}
            className="absolute inset-7 rounded-full border border-dashed border-indigo-300/60"
          >
            {/* Hạt photon chạy trên quỹ đạo */}
            <div className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rounded-full bg-gradient-to-r from-purple-400 to-white shadow-[0_0_12px_rgba(255,255,255,0.9)]" />
          </motion.div>

          {/* Vòng trong cùng với vầng sáng phát quang */}
          <motion.div
            animate={{ rotateZ: 360 }}
            transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
            className="absolute inset-16 rounded-full border border-purple-400/50 bg-purple-950/20 backdrop-blur-xs"
          />

          {/* Tâm điểm: Biểu tượng lăng kính Lumina nổi khối 3D */}
          <motion.div
            animate={{
              scale: [1, 1.08, 1],
              rotateY: [0, 15, -15, 0],
            }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="relative z-10 filter drop-shadow-[0_0_20px_rgba(192,132,252,0.8)]"
          >
            <LuminaEmblem size={58} />
          </motion.div>
        </div>
      </div>

      {/* 3. PHẦN ĐẦU BOX: THẺ THÔNG TIN CÔNG NGHỆ (TOP HUD) */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-2.5 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 backdrop-blur-md">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="font-mono text-xs font-semibold tracking-wider text-purple-200">
            SYSTEM // ACTIVE
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-purple-300/80">
          <Activity size={14} className="text-purple-400" />
          <span>60 FPS</span>
        </div>
      </div>

      {/* 4. PHẦN ĐÁY BOX: THẺ TÍNH NĂNG NỔI BẬT (BOTTOM HUD) */}
      <div className="relative z-10 space-y-4">
        {/* Thẻ nổi công nghệ kính mờ */}
        <div className="rounded-2xl border border-white/15 bg-white/[0.08] p-4.5 backdrop-blur-xl shadow-lg">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600/40 border border-purple-400/40 text-purple-200">
              <Cpu size={20} />
            </div>
            <div>
              <div className="text-sm font-bold text-white tracking-wide">
                MULTIMODAL INTELLIGENCE
              </div>
              <div className="text-xs text-purple-200/70">
                Nhận diện đồng thời Text, Voice & Vision
              </div>
            </div>
          </div>

          <div className="mt-3.5 flex items-center justify-between border-t border-white/10 pt-3 text-[11px] font-mono text-purple-300/80">
            <span>SECURE GATEWAY</span>
            <span className="text-emerald-400 font-semibold">AUTHENTICATED</span>
          </div>
        </div>

        {/* Chú thích chân box */}
        <div className="flex items-center justify-between text-[11px] font-mono text-purple-400/70 px-1">
          <span>LUMINA CORE v1.0</span>
          <span>HIGH-PRECISION MOTION</span>
        </div>
      </div>
    </div>
  );
}
