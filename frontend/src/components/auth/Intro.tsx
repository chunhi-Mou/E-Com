"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { LuminaEmblem } from "@/components/Logo";

const EXPO = [0.16, 1, 0.3, 1] as const;
const WORDS = ["lời nói", "hình ảnh", "văn bản", "cách bạn muốn"];
// Timeline in ms: mark, name, then one word per step, hold, wipe up.
const WORD_AT = [850, 1150, 1450, 1750];
const HOLD_UNTIL = 2450;
const WIPE_MS = 650;

const CLIP_OPEN = "inset(0% 0% 0% 0% round 0px 0px 0px 0px)";
const CLIP_SHUT = "inset(0% 0% 100% 0% round 0px 0px 56px 56px)";

/**
 * About three seconds, once per session: the mark, the name, then the three ways to search
 * landing on "cách bạn muốn". Click, Enter, Space or Esc skips. `onLeaving` fires when the wipe
 * starts so the page underneath can begin its own entrance.
 */
export function Intro({ onLeaving, onDone }: { onLeaving: () => void; onDone: () => void }) {
  const [word, setWord] = useState(-1);
  const [leaving, setLeaving] = useState(false);
  const left = useRef(false);

  const leave = useCallback(() => {
    if (left.current) return;
    left.current = true;
    setLeaving(true);
    onLeaving();
    window.setTimeout(onDone, WIPE_MS + 40);
  }, [onLeaving, onDone]);

  useEffect(() => {
    const ids = WORD_AT.map((t, i) => window.setTimeout(() => setWord(i), t));
    ids.push(window.setTimeout(leave, HOLD_UNTIL));
    return () => ids.forEach(window.clearTimeout);
  }, [leave]);

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        leave();
      }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [leave]);

  return (
    <motion.div
      role="presentation"
      onClick={leave}
      initial={{ clipPath: CLIP_OPEN }}
      animate={{ clipPath: leaving ? CLIP_SHUT : CLIP_OPEN }}
      transition={{ duration: WIPE_MS / 1000, ease: [0.76, 0, 0.24, 1] }}
      className="fixed inset-0 z-50 grid cursor-pointer place-items-center overflow-hidden bg-white select-none"
    >
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(55%_45%_at_50%_42%,#F3EEFF_0%,rgba(255,255,255,0)_100%)]" />

      <motion.div animate={{ y: leaving ? -36 : 0, opacity: leaving ? 0 : 1 }} transition={{ duration: WIPE_MS / 1000, ease: [0.76, 0, 0.24, 1] }} className="relative flex flex-col items-center px-6 text-center">
        <div className="flex items-center gap-4">
          <motion.div initial={{ scale: 0.4, opacity: 0, rotate: -14 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}>
            <LuminaEmblem size={68} />
          </motion.div>
          <span className="overflow-hidden pb-1">
            <motion.span
              initial={{ y: "110%" }}
              animate={{ y: 0 }}
              transition={{ duration: 0.7, ease: EXPO, delay: 0.38 }}
              className="block text-[clamp(2.6rem,7vw,3.75rem)] font-extrabold leading-none tracking-[-0.045em] text-fg"
            >
              Lumina
            </motion.span>
          </span>
        </div>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: word >= 0 ? 1 : 0, y: word >= 0 ? 0 : 10 }}
          transition={{ duration: 0.5, ease: EXPO }}
          className="mt-7 flex items-center justify-center gap-[0.4em] text-[clamp(1.1rem,2.6vw,1.5rem)] font-medium leading-[1.3] tracking-[-0.02em] text-muted"
        >
          <span>Tìm bằng</span>
          <span className="relative inline-block h-[1.3em] w-[7.6em] overflow-hidden text-left">
            <AnimatePresence initial={false}>
              {word >= 0 && (
                <motion.span
                  key={word}
                  initial={{ y: "100%", opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: "-100%", opacity: 0 }}
                  transition={{ duration: 0.42, ease: EXPO }}
                  className="absolute inset-x-0 top-0 font-bold text-ink-600"
                >
                  {WORDS[word]}
                </motion.span>
              )}
            </AnimatePresence>
          </span>
        </motion.p>

      </motion.div>

      <motion.button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          leave();
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: leaving ? 0 : 1 }}
        transition={{ delay: leaving ? 0 : 0.9, duration: 0.4 }}
        className="absolute bottom-7 right-7 rounded-full px-4 py-2 text-[13px] font-medium text-faint transition-colors hover:bg-paper hover:text-fg"
      >
        Bỏ qua
      </motion.button>
    </motion.div>
  );
}
