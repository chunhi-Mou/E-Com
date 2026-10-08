"use client";
import { AnimatePresence, motion } from "motion/react";

/** Hairline progress under the header while a search request is in flight. */
export function ProgressBar({ active }: { active: boolean }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key="bar"
          role="progressbar"
          aria-label="Đang tìm"
          className="pointer-events-none fixed inset-x-0 top-[var(--header-h)] z-40 h-0.5 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.25 } }}
        >
          <motion.span
            className="block h-full w-1/3 bg-ink-600"
            animate={{ x: ["-100%", "300%"] }}
            transition={{ duration: 1.1, ease: [0.4, 0, 0.2, 1], repeat: Infinity }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
