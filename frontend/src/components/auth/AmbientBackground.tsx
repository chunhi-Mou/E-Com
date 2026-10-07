"use client";
import React, { useEffect, useRef } from "react";
import { motion } from "motion/react";

export function AmbientBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const onResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", onResize);

    // Tạo các hạt công nghệ màu xám đậm nét (High-Contrast Tech Nodes)
    const nodeCount = Math.floor(Math.min(width, 1400) / 20);
    const nodes: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      alpha: number;
    }> = [];

    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        radius: Math.random() * 2.5 + 1.5,
        alpha: Math.random() * 0.4 + 0.5, // Độ đậm rõ nét: 0.5 - 0.9
      });
    }

    let radarAngle = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Cập nhật và vẽ các hạt và đường nối mạng công nghệ màu xám rõ nét
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        n.x += n.vx;
        n.y += n.vy;

        if (n.x < 0) n.x = width;
        if (n.x > width) n.x = 0;
        if (n.y < 0) n.y = height;
        if (n.y > height) n.y = 0;

        // Vẽ hạt xám titan đậm
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(71, 85, 105, ${n.alpha})`;
        ctx.fill();

        // Nối với các hạt lân cận bằng đường kẻ xám rõ ràng
        for (let j = i + 1; j < nodes.length; j++) {
          const n2 = nodes[j];
          const dx = n.x - n2.x;
          const dy = n.y - n2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 135) {
            const lineAlpha = (1 - dist / 135) * 0.45; // Độ đậm đường kẻ rõ ràng
            ctx.beginPath();
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(n2.x, n2.y);
            ctx.strokeStyle = `rgba(100, 116, 139, ${lineAlpha})`;
            ctx.lineWidth = 1.1;
            ctx.stroke();
          }
        }
      }

      // Vòng tròn radar kỹ thuật ở nền
      radarAngle += 0.009;
      const cx = width * 0.5;
      const cy = height * 0.5;
      const radarR = Math.min(width, height) * 0.38;

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radarR, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(100, 116, 139, 0.35)";
      ctx.lineWidth = 1.2;
      ctx.setLineDash([6, 6]);
      ctx.stroke();

      // Vòng trong
      ctx.beginPath();
      ctx.arc(cx, cy, radarR * 0.6, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(100, 116, 139, 0.25)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Tia quét radar
      const rx = cx + Math.cos(radarAngle) * radarR;
      const ry = cy + Math.sin(radarAngle) * radarR;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(rx, ry);
      ctx.strokeStyle = "rgba(147, 51, 234, 0.45)";
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
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#F1F5F9]">
      {/* 1. Lớp nền sáng xám bạc công nghệ */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_100%_at_50%_0%,rgba(248,250,252,0.8),rgba(226,232,240,0.95))]" />

      {/* Ánh tím khói mờ tinh tế ở các góc */}
      <div className="absolute -top-32 -left-32 h-[550px] w-[550px] rounded-full bg-purple-300/25 blur-[120px]" />
      <div className="absolute -bottom-32 -right-32 h-[600px] w-[600px] rounded-full bg-violet-300/25 blur-[130px]" />

      {/* 2. Lưới kỹ thuật số Blueprint / CAD Grid màu xám đậm nét, nhìn thấy rõ ràng */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(100, 116, 139, 0.16) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(100, 116, 139, 0.16) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      {/* 3. HTML5 Canvas: Mạng lưới hạt công nghệ màu xám chạy liên tục 60fps */}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {/* 4. HUD Telemetry Markers ở 4 góc hiển thị rõ ràng */}
      <div className="absolute top-6 left-8 hidden sm:flex items-center gap-2.5 font-mono text-xs font-semibold text-slate-600 select-none bg-white/70 px-3 py-1.5 rounded-lg border border-slate-300/70 shadow-2xs backdrop-blur-md">
        <span className="inline-block h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
        <span>SYS.GRID // 0x48A</span>
        <span className="text-slate-400">|</span>
        <span>LATENCY: 1.2MS</span>
      </div>

      <div className="absolute top-6 right-8 hidden sm:flex items-center gap-2 font-mono text-xs font-semibold text-slate-600 select-none bg-white/70 px-3 py-1.5 rounded-lg border border-slate-300/70 shadow-2xs backdrop-blur-md">
        <span>SECURITY PROTOCOL // ENCRYPTED</span>
      </div>

      <div className="absolute bottom-6 left-8 hidden sm:flex items-center gap-2.5 font-mono text-xs font-semibold text-slate-600 select-none bg-white/70 px-3 py-1.5 rounded-lg border border-slate-300/70 shadow-2xs backdrop-blur-md">
        <span>MULTIMODAL PERCEPTION // ONLINE</span>
      </div>

      <div className="absolute bottom-6 right-8 hidden sm:flex items-center gap-2 font-mono text-xs font-semibold text-slate-600 select-none bg-white/70 px-3 py-1.5 rounded-lg border border-slate-300/70 shadow-2xs backdrop-blur-md">
        <span>FPS: 60</span>
        <span className="text-slate-400">|</span>
        <span className="text-purple-700 font-bold">LUMINA ENGINE</span>
      </div>

      {/* Dấu chữ thập công nghệ căn lề ở 4 góc */}
      <div className="absolute top-5 left-5 text-slate-500 font-mono text-sm font-bold">+</div>
      <div className="absolute top-5 right-5 text-slate-500 font-mono text-sm font-bold">+</div>
      <div className="absolute bottom-5 left-5 text-slate-500 font-mono text-sm font-bold">+</div>
      <div className="absolute bottom-5 right-5 text-slate-500 font-mono text-sm font-bold">+</div>

      {/* Vạch quét laser xám mảnh di chuyển ngang nhẹ nhàng */}
      <motion.div
        animate={{ y: ["-20%", "120%"] }}
        transition={{ duration: 6.5, repeat: Infinity, ease: "linear" }}
        className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-purple-500/35 to-transparent"
      />
    </div>
  );
}
