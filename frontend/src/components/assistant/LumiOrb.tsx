"use client";
import { useEffect, useRef } from "react";
import { motion, useAnimationFrame, useMotionValue, useReducedMotion } from "motion/react";

export type Mood = "listening" | "thinking" | "speaking" | "happy" | "error";

/** Degrees per millisecond the light shimmer turns. It quickens while thinking and nearly stops when something went wrong. */
const SPEED: Record<Mood, number> = { listening: 0.055, thinking: 0.3, speaking: 0.11, happy: 0.03, error: 0.01 };
const GLOW: Record<Mood, number> = { listening: 0.8, thinking: 0.75, speaking: 0.75, happy: 0.5, error: 0.12 };

// Ocean ombre: a fixed deep-to-light blue base, with two soft light patches (turning) that make the gradient shimmer.
const BASE = "linear-gradient(165deg, #7dd3fc 0%, #38bdf8 22%, #2563eb 62%, #1e3a8a 100%)";
const SHIMMER = "conic-gradient(from 0deg, rgba(103,232,249,0) 0%, rgba(103,232,249,0.9) 18%, rgba(37,99,235,0) 42%, rgba(125,211,252,0.8) 68%, rgba(103,232,249,0) 92%)";
const HALO = "conic-gradient(from 0deg, #1d4ed8, #38bdf8, #67e8f9, #38bdf8, #1d4ed8)";
const EASE = [0.4, 0, 0.2, 1] as const;

const MOUTH: Record<Mood, { width: number; height: number | number[]; borderRadius: string; y: number }> = {
  happy: { width: 9, height: 4.5, borderRadius: "1px 1px 9px 9px", y: 0 },
  listening: { width: 4.5, height: 4.5, borderRadius: "50%", y: 0 },
  thinking: { width: 6, height: 2, borderRadius: "2px", y: 0 },
  speaking: { width: 7, height: [3, 8, 4, 9, 3], borderRadius: "50%", y: 0 },
  error: { width: 8, height: 4, borderRadius: "9px 9px 1px 1px", y: 1.5 },
};

/**
 * Lumi, the voice assistant: a small multicoloured orb with a face. The colour wash, the eyes and the mouth all follow the
 * assistant's state (listening, thinking, speaking, done, error), so the shopper reads what it is doing without any text.
 */
export function LumiOrb({ mood, size = 56, glance = 0 }: { mood: Mood; size?: number; glance?: number }) {
  const reduce = useReducedMotion();
  const turn = useMotionValue(0);
  const speed = useRef(SPEED[mood]);
  useEffect(() => {
    speed.current = reduce ? 0 : SPEED[mood];
  }, [mood, reduce]);
  useAnimationFrame((_, delta) => turn.set((turn.get() + speed.current * delta) % 360));

  const pulse = mood === "listening" || mood === "speaking";
  const thinking = mood === "thinking";
  const mouth = MOUTH[mood];

  return (
    <span className="relative block" style={{ width: size, height: size }} aria-hidden>
      <motion.span
        className="absolute -inset-2 rounded-full blur-lg"
        style={{ background: HALO, rotate: turn }}
        animate={{ opacity: GLOW[mood], scale: pulse ? [1, 1.14, 1] : 1 }}
        transition={{ opacity: { duration: 0.4 }, scale: pulse ? { duration: mood === "listening" ? 1.3 : 0.6, ease: "easeInOut", repeat: Infinity } : { duration: 0.3 } }}
      />

      {mood === "listening" && (
        <motion.span
          className="absolute inset-0 rounded-full border-2 border-white/70"
          initial={{ scale: 1, opacity: 0.6 }}
          animate={{ scale: 1.75, opacity: 0 }}
          transition={{ duration: 1.4, ease: "easeOut", repeat: Infinity }}
        />
      )}

      <motion.span
        className="relative block size-full overflow-hidden rounded-full shadow-[inset_0_0_0_1px_rgba(255,255,255,0.6),0_10px_24px_-10px_rgba(37,99,235,0.7)]"
        animate={{ filter: mood === "error" ? "saturate(0.25) brightness(0.97)" : "saturate(1) brightness(1)" }}
        transition={{ duration: 0.4 }}
      >
        <span className="absolute inset-0" style={{ background: BASE }} />
        <motion.span className="absolute -inset-[30%] blur-[6px]" style={{ background: SHIMMER, rotate: turn }} />
        <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_22%,rgba(255,255,255,0.75),transparent_52%)]" />
        <span className="absolute inset-0 bg-[radial-gradient(circle_at_50%_125%,rgba(255,255,255,0.4),transparent_60%)]" />
        <span className="absolute left-1/2 top-[33%] h-[40%] w-[64%] -translate-x-1/2 rounded-full bg-white/35" />

        <motion.span
          className="absolute inset-0"
          animate={{ x: thinking ? [-3, 3, -2, 2.5, 0] : glance }}
          transition={thinking ? { duration: 1.5, ease: EASE, repeat: Infinity } : { type: "spring", stiffness: 260, damping: 20 }}
        >
          <span className="absolute left-1/2 top-[38%] -translate-x-1/2">
            <motion.span
              className="flex gap-[9px]"
              animate={{ scaleY: [1, 1, 1, 0.08, 1] }}
              transition={{ duration: 4.2, times: [0, 0.9, 0.94, 0.97, 1], repeat: Infinity }}
            >
              {[-1, 1].map((side) => (
                <motion.span
                  key={side}
                  className="block h-[10px] w-[5.5px] rounded-full bg-ink-950"
                  animate={{
                    scaleY: mood === "listening" ? 1.2 : mood === "error" ? 0.85 : 1,
                    y: mood === "listening" ? -1 : 0,
                    rotate: mood === "error" ? side * 16 : 0,
                  }}
                  transition={{ type: "spring", stiffness: 420, damping: 22 }}
                />
              ))}
            </motion.span>
          </span>
          <span className="absolute left-1/2 top-[57%] size-[3px] -translate-x-1/2 rounded-full bg-ink-950/55" />
          <span className="absolute left-1/2 top-[67%] -translate-x-1/2">
            <motion.span
              className="block bg-ink-950"
              animate={mouth}
              transition={{ default: { type: "spring", stiffness: 420, damping: 24 }, height: Array.isArray(mouth.height) ? { duration: 0.55, repeat: Infinity, ease: "easeInOut" } : { type: "spring", stiffness: 420, damping: 24 } }}
            />
          </span>
        </motion.span>
      </motion.span>
    </span>
  );
}
