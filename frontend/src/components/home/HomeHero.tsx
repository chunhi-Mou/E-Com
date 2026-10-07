"use client";
import Link from "next/link";
import { motion } from "motion/react";
import { Camera, Mic, Search } from "lucide-react";
import { searchUrl } from "@/lib/searchActions";
import { EXAMPLE_QUERIES } from "@/mocks/engine";

const EXPO = [0.16, 1, 0.3, 1] as const;

/** Ask the header search field to focus, listen or open the image picker. */
export function fireSearch(mode: "focus" | "voice" | "image") {
  window.dispatchEvent(new CustomEvent("lumina:search", { detail: mode }));
}

// Clean studio shots that ship with the app, so the hero never depends on catalog photo quality.
const HERO_PHOTOS = [3, 11, 8, 7].map((n) => `/photos/P${String(n).padStart(6, "0")}_0.jpg`);

function Tile({ src, i, ratio, base }: { src: string; i: number; ratio: string; base: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 48, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.9, ease: EXPO, delay: base + 0.25 + i * 0.1 }}
      className={`relative overflow-hidden rounded-[26px] bg-paper ring-1 ring-black/[0.04] ${ratio}`}
    >
      <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
    </motion.div>
  );
}

export function HomeHero({ base }: { base: number }) {
  const rise = (i: number) => ({
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.75, ease: EXPO, delay: base + i * 0.08 },
  });

  return (
    <section aria-labelledby="hero" className="grid items-center gap-10 pb-2 pt-8 md:pt-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-6 lg:pt-14">
      <div className="max-w-[640px]">
        <motion.p {...rise(0)} className="text-[14px] font-semibold text-ink-600">
          Tìm kiếm bằng văn bản, giọng nói và hình ảnh
        </motion.p>
        <motion.h1 {...rise(1)} id="hero" className="balance mt-4 text-[clamp(2.4rem,5.4vw,4.1rem)] font-extrabold leading-[1.04] tracking-[-0.04em]">
          Tìm đúng món bạn cần, <span className="text-ink-600">theo cách bạn muốn.</span>
        </motion.h1>
        <motion.p {...rise(2)} className="pretty mt-5 max-w-[520px] text-[17px] leading-relaxed text-muted">
          Gõ một câu, nói bằng giọng của bạn hoặc thả một tấm ảnh. Lumina hiểu ý và đưa ra sản phẩm phù hợp, kèm lý do vì sao.
        </motion.p>

        <motion.div {...rise(3)} className="mt-8 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => fireSearch("focus")}
            className="group inline-flex h-12 items-center gap-2.5 rounded-2xl bg-ink-600 px-6 text-[15px] font-semibold text-white shadow-[0_14px_28px_-14px_rgba(109,58,232,0.8)] transition-[background-color,transform,box-shadow] duration-200 hover:bg-ink-700 hover:shadow-[0_18px_32px_-14px_rgba(109,58,232,0.9)] active:scale-[0.97]"
          >
            <Search size={18} />
            Bắt đầu tìm
          </button>
          <button
            type="button"
            onClick={() => fireSearch("voice")}
            className="inline-flex h-12 items-center gap-2 rounded-2xl border border-line bg-white px-5 text-[15px] font-semibold text-fg transition-[border-color,background-color,transform] duration-200 hover:border-ink-300 hover:bg-ink-50 active:scale-[0.97]"
          >
            <Mic size={18} className="text-ink-600" />
            Nói để tìm
          </button>
          <button
            type="button"
            onClick={() => fireSearch("image")}
            className="inline-flex h-12 items-center gap-2 rounded-2xl border border-line bg-white px-5 text-[15px] font-semibold text-fg transition-[border-color,background-color,transform] duration-200 hover:border-ink-300 hover:bg-ink-50 active:scale-[0.97]"
          >
            <Camera size={18} className="text-ink-600" />
            Tìm bằng ảnh
          </button>
        </motion.div>

        <motion.div {...rise(4)} className="mt-7 flex flex-wrap items-center gap-2 text-[13.5px]">
          <span className="font-medium text-faint">Thử:</span>
          {EXAMPLE_QUERIES.slice(0, 3).map((q, i) => (
            <Link
              key={q}
              href={searchUrl({ text: q })}
              className={`rounded-full bg-paper px-3.5 py-1.5 text-fg transition-[background-color,color,transform] duration-200 hover:bg-ink-100 hover:text-ink-700 active:scale-95 ${i > 1 ? "max-sm:hidden" : ""}`}
            >
              {q}
            </Link>
          ))}
        </motion.div>
      </div>

      <div className="relative mx-auto w-full max-w-[540px] lg:ml-auto lg:mr-0">
        <div className="h-[380px] overflow-hidden sm:h-[500px] [mask-image:linear-gradient(to_bottom,#000_76%,transparent)]">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="drift flex flex-col gap-3 sm:gap-4">
              <Tile src={HERO_PHOTOS[0]} i={0} ratio="aspect-[4/5]" base={base} />
              <Tile src={HERO_PHOTOS[2]} i={2} ratio="aspect-square" base={base} />
            </div>
            <div className="drift-slow mt-12 flex flex-col gap-3 sm:gap-4">
              <Tile src={HERO_PHOTOS[1]} i={1} ratio="aspect-square" base={base} />
              <Tile src={HERO_PHOTOS[3]} i={3} ratio="aspect-[4/5]" base={base} />
            </div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: EXPO, delay: base + 0.95 }}
          className="absolute -left-1 bottom-3 z-10 sm:-left-8 sm:bottom-24"
        >
          <div className="drift w-[262px] rounded-2xl border border-line bg-white/95 p-3.5 shadow-pop backdrop-blur-md">
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-ink-600 text-white">
                <Mic size={15} />
              </span>
              <p className="text-[13.5px] font-medium leading-snug">“áo len màu be, dưới 500k”</p>
            </div>
            <p className="mb-1.5 mt-3.5 text-[11px] font-semibold text-faint">Lumina hiểu</p>
            <div className="flex flex-wrap gap-1.5">
              {["Áo len", "Màu be", "Dưới 500.000 ₫"].map((c) => (
                <span key={c} className="rounded-full bg-ink-50 px-2.5 py-1 text-[12px] font-medium text-ink-700">
                  {c}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
