"use client";
import { motion, useReducedMotion } from "motion/react";

const EXPO = [0.16, 1, 0.3, 1] as const;

/** Success mark for confirmation moments (added to cart, order placed): a violet disc, a ring that bursts outward, a check that draws itself. */
export function ConfirmMark({ size = 64, className = "" }: { size?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <span className={`relative inline-grid shrink-0 place-items-center ${className}`} style={{ width: size, height: size }} role="img" aria-label="Thành công">
      {!reduce && (
        <motion.span
          aria-hidden
          initial={{ scale: 0.7, opacity: 0.45 }}
          animate={{ scale: 1.8, opacity: 0 }}
          transition={{ duration: 0.9, ease: EXPO }}
          className="absolute inset-0 rounded-full bg-ink-500"
        />
      )}
      <motion.span
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 420, damping: 20 }}
        className="relative grid size-full place-items-center rounded-full bg-ink-600 text-white shadow-[0_14px_30px_-12px_rgba(109,58,232,0.8)]"
      >
        <svg viewBox="0 0 24 24" width={size * 0.5} height={size * 0.5} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: reduce ? 1 : 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.18, duration: 0.4, ease: EXPO }} />
        </svg>
      </motion.span>
    </span>
  );
}
