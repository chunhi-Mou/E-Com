"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Camera, Keyboard, Mic, Search, type LucideIcon } from "lucide-react";

const EXPO = [0.16, 1, 0.3, 1] as const;
const CYCLE_MS = 5200;

type Mode = { key: "type" | "voice" | "image"; label: string; icon: LucideIcon; text: string; chips: string[]; photos: number[] };

const MODES: Mode[] = [
  { key: "type", label: "Gõ", icon: Keyboard, text: "áo len màu be, dưới 500k", chips: ["Áo len", "Màu be", "Dưới 500.000 ₫"], photos: [3, 4, 12, 8] },
  { key: "voice", label: "Nói", icon: Mic, text: "tôi muốn mua áo mùa đông", chips: ["Mùa đông", "Áo ấm", "Nam"], photos: [7, 11, 9, 10] },
  { key: "image", label: "Ảnh", icon: Camera, text: "màu xám", chips: ["Giống ảnh", "Áo len", "Màu xám"], photos: [8, 9, 7, 3] },
];

const photo = (n: number) => `/photos/P${String(n).padStart(6, "0")}_0.jpg`;

function useTyped(text: string, speed: number) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let i = 0;
    let iv: number | undefined;
    const start = window.setTimeout(() => {
      iv = window.setInterval(() => {
        i += 1;
        setN(i);
        if (i >= text.length) window.clearInterval(iv);
      }, speed);
    }, 380);
    return () => {
      window.clearTimeout(start);
      window.clearInterval(iv);
    };
  }, [text, speed]);
  return text.slice(0, n);
}

function Field({ mode }: { mode: Mode }) {
  const typed = useTyped(mode.text, mode.key === "voice" ? 38 : 52);
  return (
    <div className="flex h-14 items-center gap-3 rounded-2xl bg-white pl-4 pr-2 shadow-soft ring-1 ring-line">
      {mode.key === "image" ? (
        <motion.img
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.45, ease: EXPO }}
          src={photo(8)}
          alt=""
          className="size-9 shrink-0 rounded-lg object-cover ring-1 ring-line"
        />
      ) : mode.key === "voice" ? (
        <span className="relative grid size-8 shrink-0 place-items-center">
          <span className="ring-out absolute inset-0 rounded-full bg-ink-500/40" />
          <span className="relative grid size-8 place-items-center rounded-full bg-ink-600 text-white">
            <Mic size={16} />
          </span>
        </span>
      ) : (
        <Search size={19} className="shrink-0 text-ink-600" />
      )}

      {mode.key === "voice" && (
        <span className="flex h-6 shrink-0 items-center gap-[3px]" aria-hidden>
          {Array.from({ length: 9 }, (_, i) => (
            <span key={i} className="voice-bar h-full w-[3px] rounded-full bg-ink-500" style={{ animationDelay: `${i * 0.09}s` }} />
          ))}
        </span>
      )}

      <span className="min-w-0 flex-1 truncate text-[16px] text-fg">
        {typed}
        <span className="caret ml-px inline-block h-[1.1em] w-[2px] translate-y-[3px] rounded-full bg-ink-600" />
      </span>

      <span className="grid h-10 shrink-0 place-items-center rounded-xl bg-ink-600 px-5 text-[14px] font-semibold text-white">Tìm</span>
    </div>
  );
}

/** Right-hand side of the login screen: the product's three ways to search, played on a loop. */
export function LoginShowcase() {
  const [i, setI] = useState(0);
  const [tick, setTick] = useState(0);
  const mode = MODES[i];

  useEffect(() => {
    const id = window.setTimeout(() => setI((x) => (x + 1) % MODES.length), CYCLE_MS);
    return () => window.clearTimeout(id);
  }, [i, tick]);

  return (
    <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-[32px] bg-paper bg-[radial-gradient(70%_55%_at_90%_0%,#EFE9FF_0%,rgba(246,246,249,0)_72%)] p-10 xl:p-14">
      <div>
        <p className="text-[14px] font-semibold text-ink-600">Một ô tìm kiếm, ba cách dùng</p>
        <h2 className="balance mt-3 max-w-[460px] text-[clamp(1.75rem,2.6vw,2.4rem)] font-extrabold leading-[1.1] tracking-[-0.035em]">
          Nói với Lumina như nói với một người bán hàng.
        </h2>
      </div>

      <div className="mx-auto w-full max-w-[600px] space-y-5">
        <div className="relative mx-auto flex w-fit gap-1 rounded-2xl bg-black/[0.045] p-1" role="tablist" aria-label="Cách tìm kiếm">
          {MODES.map((m, idx) => {
            const on = idx === i;
            const Icon = m.icon;
            return (
              <button
                key={m.key}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => {
                  setI(idx);
                  setTick((t) => t + 1);
                }}
                className={`relative flex h-9 items-center gap-2 rounded-xl px-4 text-[14px] font-semibold transition-colors duration-200 ${on ? "text-ink-700" : "text-muted hover:text-fg"}`}
              >
                {on && <motion.span layoutId="showcase-seg" transition={{ type: "spring", stiffness: 420, damping: 34 }} className="absolute inset-0 rounded-xl bg-white shadow-sm" />}
                <Icon size={16} className="relative" />
                <span className="relative">{m.label}</span>
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={mode.key}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10, transition: { duration: 0.22 } }}
            transition={{ duration: 0.55, ease: EXPO }}
            className="space-y-5"
          >
            <Field mode={mode} />

            <div className="flex min-h-[32px] flex-wrap items-center gap-2">
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }} className="text-[12px] font-semibold text-faint">
                Lumina hiểu
              </motion.span>
              {mode.chips.map((c, ci) => (
                <motion.span
                  key={c}
                  initial={{ opacity: 0, scale: 0.85, y: 6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: 1.2 + ci * 0.14, duration: 0.45, ease: EXPO }}
                  className="rounded-full bg-ink-100 px-3 py-1.5 text-[13px] font-medium text-ink-700"
                >
                  {c}
                </motion.span>
              ))}
            </div>

            <div className="grid grid-cols-4 gap-3">
              {mode.photos.map((n, pi) => (
                <motion.div
                  key={n}
                  initial={{ opacity: 0, y: 26, scale: 0.94 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 1.55 + pi * 0.1, duration: 0.7, ease: EXPO }}
                  className="aspect-[3/4] overflow-hidden rounded-2xl bg-white ring-1 ring-black/[0.05]"
                >
                  <img src={photo(n)} alt="" className="h-full w-full object-cover" draggable={false} />
                </motion.div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <p className="text-[13px] text-faint">Hiểu tiếng Việt có dấu, không dấu và cả tiếng Anh.</p>
    </div>
  );
}
