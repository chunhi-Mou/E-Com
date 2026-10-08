"use client";
import { AnimatePresence, motion } from "motion/react";

/** The photo the shopper searched with. While results load, a scan band sweeps down it: the system is reading the image. */
export function ScanThumb({ src, scanning }: { src: string; scanning: boolean }) {
  return (
    <span className="relative block size-14 shrink-0 overflow-hidden rounded-lg border border-line">
      <img src={src} alt="Ảnh bạn chọn" className="size-full object-cover" />
      <AnimatePresence>
        {scanning && (
          <motion.span
            key="scan"
            aria-hidden
            className="absolute inset-0 bg-ink-950/10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
          >
            <motion.span
              className="absolute inset-x-0 -top-full h-full border-b-2 border-ink-400 bg-ink-500/25"
              animate={{ y: ["0%", "200%"] }}
              transition={{ duration: 1.1, ease: [0.4, 0, 0.2, 1], repeat: Infinity, repeatDelay: 0.15 }}
            />
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
