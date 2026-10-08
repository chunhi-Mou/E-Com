"use client";
import { AnimatePresence, motion } from "motion/react";

/** A number that rolls up into place when it changes (result count after a filter), so the shopper sees the effect of the click. */
export function Roll({ value, className = "" }: { value: number; className?: string }) {
  return (
    <span className="relative inline-flex overflow-hidden align-bottom">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.b
          key={value}
          className={`inline-block ${className}`}
          initial={{ y: "80%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "-80%", opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          {value}
        </motion.b>
      </AnimatePresence>
    </span>
  );
}
