"use client";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { CircleAlert, Check } from "lucide-react";
import { useToasts } from "@/store/toast";

export function Toaster() {
  const toasts = useToasts((s) => s.toasts);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[70] flex flex-col items-center gap-2 px-4 md:bottom-6" aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, transition: { duration: 0.12 } }}
            transition={{ type: "spring", stiffness: 500, damping: 34 }}
            className="pointer-events-auto flex max-w-[92vw] items-center gap-3 rounded-lg bg-ink-950 py-2.5 pl-3 pr-3 text-[14px] text-white shadow-pop"
          >
            {t.tone === "error" ? <CircleAlert size={18} className="text-seal-400" /> : <Check size={18} className="text-hl" />}
            <span>{t.text}</span>
            {t.href && (
              <Link href={t.href} className="ml-1 rounded-md bg-white/12 px-2.5 py-1 font-medium text-hl hover:bg-white/20">
                {t.action ?? "Xem"}
              </Link>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
