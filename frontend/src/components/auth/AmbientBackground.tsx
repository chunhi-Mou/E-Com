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

    // Tạo các hạt công nghệ màu xám chuyển động (Tech Nodes)
    const nodeCount = Math.floor(Math.min(width, 1400) / 22);
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
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        radius: Math.random() * 2 + 1.2,
        alpha: Math.random() * 0.5 + 0.25,
      });
    }

    // Vòng quét radar công nghệ
    let radarAngle = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Cập nhật và vẽ các hạt và đường nối mạng công nghệ màu xám
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        n.x += n.vx;
        n.y += n.vy;

        if (n.x < 0) n.x = width;
        if (n.x > width) n.x = 0;
        if (n.y < 0) n.y = height;
        if (n.y > height) n.y = 0;

        // Vẽ hạt màu xám titan
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(100, 116, 139, ${n.alpha})`;
        ctx.fill();

        // Nối với các hạt lân cận bằng đường kẻ xám mảnh
        for (let j = i + 1; j < nodes.length; j++) {
          const n2 = nodes[j];
          const dx = n.x - n2.x;
          const dy = n.y - n2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 125) {
            const lineAlpha = (1 - dist / 125) * 0.22;
            ctx.beginPath();
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(n2.x, n2.y);
            ctx.strokeStyle = `rgba(148, 163, 184, ${lineAlpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      // Vẽ vòng tròn tâm kỹ thuật công nghệ ở nền (Tech Reticle / Sonar)
      radarAngle += 0.008;
      const cx = width * 0.5;
      const cy = height * 0.5;
      const radarR = Math.min(width, height) * 0.38;

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radarR, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(148, 163, 184, 0.18)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.stroke();

      // Vòng tròn nhỏ bên trong
      ctx.beginPath();
      ctx.arc(cx, cy, radarR * 0.6, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(148, 163, 184, 0.12)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Tia quét radar mờ
      const rx = cx + Math.cos(radarAngle) * radarR;
      const ry = cy + Math.sin(radarAngle) * radarR;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(rx, ry);
      ctx.strokeStyle = "rgba(168, 85, 247, 0.18)";
      ctx.lineWidth = 1.2;
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
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#F8FAFC]">
      {/* 1. Lớp gradient nền trắng bạc công nghệ pha ánh tím khói rất nhẹ */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_100%_at_50%_0%,rgba(241,245,249,0.9),rgba(248,250,252,1))]" />

      {/* Ánh tím khói mờ cực kỳ tinh tế ở góc xa, không bị lấn át */}
      <div className="absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full bg-purple-200/20 blur-[130px]" />
      <div className="absolute -bottom-32 -right-32 h-[550px] w-[550px] rounded-full bg-violet-200/25 blur-[140px]" />

      {/* 2. Lưới kỹ thuật số CAD / Blueprint kẻ caro màu xám nhạt */}
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(148, 163, 184, 0.12) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(148, 163, 184, 0.12) 1px, transparent 1px)
          `,
          backgroundSize: "36px 36px",
        }}
      />

      {/* 3. HTML5 Canvas: Mạng lưới hạt công nghệ màu xám chạy liên tục 60fps */}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full opacity-80" />

      {/* 4. Các chi tiết đồ họa công nghệ xám (HUD Telemetry Markers) xung quanh */}
      <div className="absolute top-8 left-8 hidden sm:flex items-center gap-2 font-mono text-[11px] text-slate-400 select-none">
        <span className="inline-block h-1.5 w-1.5 bg-slate-400 rounded-full" />
        <span>SYS.GRID // 0x48A</span>
        <span className="text-slate-300">|</span>
        <span>LATENCY: 1.2MS</span>
      </div>

      <div className="absolute top-8 right-8 hidden sm:flex items-center gap-2 font-mono text-[11px] text-slate-400 select-none">
        <span>SECURITY PROTOCOL // ENCRYPTED</span>
        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
      </div>

      <div className="absolute bottom-8 left-8 hidden sm:flex items-center gap-3 font-mono text-[11px] text-slate-400 select-none">
        <span>[001] MULTIMODAL PERCEPTION</span>
        <span className="text-slate-300">/</span>
        <span>SYS.CORE READY</span>
      </div>

      <div className="absolute bottom-8 right-8 hidden sm:flex items-center gap-2 font-mono text-[11px] text-slate-400 select-none">
        <span>FPS: 60</span>
        <span className="text-slate-300">|</span>
        <span>STATUS: ACTIVE</span>
      </div>

      {/* Dấu chữ thập công nghệ căn lề ở 4 góc */}
      <div className="absolute top-6 left-6 text-slate-300 font-mono text-xs">+</div>
      <div className="absolute top-6 right-6 text-slate-300 font-mono text-xs">+</div>
      <div className="absolute bottom-6 left-6 text-slate-300 font-mono text-xs">+</div>
      <div className="absolute bottom-6 right-6 text-slate-300 font-mono text-xs">+</div>

      {/* Vạch quét sáng laser xám mảnh di chuyển ngang nhẹ nhàng */}
      <motion.div
        animate={{ y: ["-20%", "120%"] }}
        transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
        className="absolute inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-slate-400/25 to-transparent"
      />
    </div>
  );
}
