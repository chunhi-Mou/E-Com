"use client";
import { AnimatePresence, motion } from "motion/react";
import { useSession } from "@/store/session";

/** Dims the page while the search dropdown is open, so the field reads as the focus of attention. */
export function SearchScrim() {
  const open = useSession((s) => s.searchOpen);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="pointer-events-none fixed inset-0 z-30 bg-ink-950/40"
          aria-hidden
        />
      )}
    </AnimatePresence>
  );
}
