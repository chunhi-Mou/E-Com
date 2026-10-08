"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play, Ticket, Truck } from "lucide-react";
import { formatVND } from "@/lib/format";
import { searchUrl } from "@/lib/searchActions";
import { SHIPPING_FREE_FROM } from "@/store/cart";

type Slide = {
  id: string;
  /** Finished artwork (text baked in): shown whole, no overlay copy. */
  art?: { src: string; alt: string };
  kicker: string;
  title: [string, string];
  sub: string;
  cta: string;
  href: string;
  photo: string;
  /** Panel background behind the copy. */
  panel: string;
  /** Where the photo sits inside its slanted frame. */
  focus: string;
};

// Photos: Unsplash (free licence), see public/banners/CREDITS.md.
const SLIDES: Slide[] = [
  {
    id: "flash-fashion",
    art: { src: "/banners/flash-fashion.jpg", alt: "Flash Sale thời trang: voucher 1 triệu xu, deal sốc 1K" },
    kicker: "",
    title: ["", ""],
    sub: "",
    cta: "",
    href: "/#flash-sale",
    photo: "",
    panel: "bg-[#F4503A]",
    focus: "",
  },
  {
    id: "sale",
    kicker: "Ngày hội sale 10.10",
    title: ["Siêu sale", "giảm đến 50%"],
    sub: "Hàng nghìn sản phẩm giảm sâu, giá chốt trong ngày.",
    cta: "Săn sale ngay",
    href: "/#flash-sale",
    photo: "/banners/sale-bags.jpg",
    panel: "bg-[linear-gradient(100deg,#B52C1A_0%,#D93A24_52%,#F25A3E_100%)]",
    focus: "object-[38%_50%]",
  },
  {
    id: "fashion",
    kicker: "Thời trang thu đông",
    title: ["Mặc đẹp", "giảm đến 30%"],
    sub: "Áo len, áo khoác, váy đầm cho mùa mới.",
    cta: "Xem thời trang",
    href: searchUrl({ text: "áo thu đông" }),
    photo: "/banners/fashion-rack.jpg",
    panel: "bg-[linear-gradient(100deg,#2E1B6B_0%,#5B2BD0_60%,#6D3AE8_100%)]",
    focus: "object-[50%_70%]",
  },
  {
    id: "tech",
    kicker: "Công nghệ giá tốt",
    title: ["Tai nghe, sạc", "từ 99.000 ₫"],
    sub: "Phụ kiện chính hãng, giao nhanh toàn quốc.",
    cta: "Xem phụ kiện",
    href: searchUrl({ text: "tai nghe" }),
    photo: "/banners/tech-headphones.jpg",
    panel: "bg-[linear-gradient(100deg,#0E0826_0%,#1B1040_100%)]",
    focus: "object-[50%_55%]",
  },
];

const EASE = [0.16, 1, 0.3, 1] as const;
// Fades the artwork's left and right edges into the blurred fill behind it.
const FEATHER: React.CSSProperties = {
  WebkitMaskImage: "linear-gradient(to right, transparent, #000 7%, #000 93%, transparent)",
  maskImage: "linear-gradient(to right, transparent, #000 7%, #000 93%, transparent)",
};
const AUTOPLAY_MS = 5500;

function SlideView({ s, first }: { s: Slide; first: boolean }) {
  if (s.art) {
    // Blurred copy fills the sides, the sharp one sits whole on top, so the artwork is never cropped.
    return (
      <Link href={s.href} aria-label={s.art.alt} className={`relative block h-full overflow-hidden ${s.panel}`}>
        <img src={s.art.src} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-110 object-cover opacity-90 blur-xl" draggable={false} />
        <img src={s.art.src} alt={s.art.alt} className="relative mx-auto h-full w-auto max-w-full object-contain" style={FEATHER} draggable={false} fetchPriority={first ? "high" : "auto"} loading={first ? "eager" : "lazy"} />
      </Link>
    );
  }
  return (
    <div className={`relative h-full overflow-hidden ${s.panel}`}>
      <div
        aria-hidden
        className="absolute inset-y-0 right-0 w-[48%] [clip-path:polygon(18%_0,100%_0,100%_100%,0_100%)] sm:w-[52%]"
      >
        <img
          src={s.photo}
          alt=""
          className={`h-full w-full object-cover ${s.focus}`}
          draggable={false}
          fetchPriority={first ? "high" : "auto"}
          loading={first ? "eager" : "lazy"}
        />
      </div>

      <div className="relative z-10 flex h-full max-w-[62%] flex-col justify-center pb-10 pt-4 pl-5 text-white sm:max-w-[56%] sm:py-5 sm:pb-10 sm:pl-9 lg:pl-12">
        <p className="inline-flex w-fit items-center rounded-full bg-sun px-3 py-1 text-[11.5px] font-extrabold uppercase tracking-[0.04em] text-ink-950 sm:text-[12.5px]">
          {s.kicker}
        </p>
        <h2 className="mt-3 text-[clamp(1.5rem,3.6vw,3rem)] font-extrabold leading-[1.05] tracking-[-0.035em] sm:mt-4">
          {s.title[0]}
          <br />
          <span className="text-sun">{s.title[1]}</span>
        </h2>
        <p className="pretty mt-2 hidden max-w-[360px] text-[14.5px] leading-snug text-white/85 sm:block lg:mt-3">{s.sub}</p>
        <Link
          href={s.href}
          className="on-ink group mt-4 inline-flex h-10 w-fit items-center gap-2 rounded-xl bg-white px-4 text-[14px] font-bold text-ink-950 transition-[background-color,transform] duration-200 hover:bg-sun active:scale-[0.97] sm:mt-5 sm:h-11 sm:px-5 sm:text-[15px]"
        >
          {s.cta}
          <ArrowRight size={17} className="transition-transform duration-200 group-hover:translate-x-1" />
        </Link>
      </div>
    </div>
  );
}

/** Banner carousel: auto-advances, pauses on hover, focus and via the pause button. */
function Carousel() {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hover, setHover] = useState(false);
  const n = SLIDES.length;
  const go = useCallback((d: number) => setI((x) => (x + d + n) % n), [n]);

  const playing = !paused && !hover && !reduce;
  useEffect(() => {
    if (!playing) return;
    const id = setTimeout(() => go(1), AUTOPLAY_MS);
    return () => clearTimeout(id);
  }, [playing, i, go]);

  const arrow =
    "pointer-events-auto grid size-10 place-items-center rounded-full bg-white/90 text-fg shadow-md transition-[opacity,transform,background-color] duration-200 hover:bg-white active:scale-90";

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Khuyến mãi nổi bật"
      className="group/hero relative h-[212px] overflow-hidden rounded-2xl sm:h-[300px] lg:h-[372px]"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") go(-1);
        if (e.key === "ArrowRight") go(1);
      }}
    >
      <AnimatePresence initial={false}>
        <motion.div
          key={SLIDES[i].id}
          role="group"
          aria-roledescription="slide"
          aria-label={`${i + 1} trên ${n}`}
          className="absolute inset-0"
          initial={{ opacity: 0, scale: 1.015 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.35 } }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          <SlideView s={SLIDES[i]} first={i === 0} />
        </motion.div>
      </AnimatePresence>

      <div className="pointer-events-none absolute inset-x-3 top-1/2 hidden -translate-y-1/2 items-center justify-between opacity-0 transition-opacity duration-200 group-focus-within/hero:opacity-100 group-hover/hero:opacity-100 lg:flex">
        <button type="button" onClick={() => go(-1)} aria-label="Banner trước" className={arrow}>
          <ChevronLeft size={20} />
        </button>
        <button type="button" onClick={() => go(1)} aria-label="Banner tiếp theo" className={arrow}>
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="absolute bottom-3 left-5 z-20 flex items-center gap-2.5 sm:left-9 lg:left-12">
        <div className="flex items-center gap-1.5">
          {SLIDES.map((s, k) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setI(k)}
              aria-label={`Đến banner ${k + 1}`}
              aria-current={k === i}
              className="grid h-5 place-items-center"
            >
              <span className={`block h-1.5 rounded-full bg-white transition-[width,opacity] duration-300 ${k === i ? "w-6 opacity-100" : "w-1.5 opacity-55"}`} />
            </button>
          ))}
        </div>
        {!reduce && (
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? "Tự chuyển banner" : "Dừng tự chuyển banner"}
            className="grid size-6 place-items-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-colors hover:bg-white/35"
          >
            {paused ? <Play size={12} fill="currentColor" /> : <Pause size={12} fill="currentColor" />}
          </button>
        )}
      </div>
    </div>
  );
}

function SideTile({ href, tone, icon, title, sub, photo, focus, chip }: { href: string; tone: "violet" | "sun"; icon: React.ReactNode; title: string; sub: string; photo: string; focus: string; chip: string }) {
  const violet = tone === "violet";
  return (
    <Link
      href={href}
      className={`group relative flex h-[104px] items-center overflow-hidden rounded-2xl transition-transform duration-300 hover:-translate-y-0.5 active:scale-[0.98] sm:h-[124px] lg:h-auto ${
        violet ? "bg-[linear-gradient(120deg,#4B24B5,#6D3AE8_60%,#8B5CF6)] text-white" : "bg-[linear-gradient(120deg,#FFC93C,#FFE08A_70%,#FFEDB8)] text-ink-950"
      }`}
    >
      <div aria-hidden className="absolute inset-y-0 right-0 w-[44%] [clip-path:polygon(24%_0,100%_0,100%_100%,0_100%)]">
        <img src={photo} alt="" className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${focus}`} draggable={false} loading="lazy" />
      </div>
      <span
        aria-hidden
        className={`absolute right-[34%] top-3 hidden rotate-[-6deg] rounded-md px-2 py-1 text-[11px] font-extrabold uppercase tracking-[0.04em] shadow-md sm:block ${
          violet ? "bg-white text-ink-700" : "bg-sale-600 text-white"
        }`}
      >
        {chip}
      </span>
      <div className="relative z-10 flex max-w-[60%] items-center gap-3 pl-4 sm:pl-5 lg:gap-3.5">
        <span className={`grid size-11 shrink-0 place-items-center rounded-xl max-sm:hidden ${violet ? "bg-white/18" : "bg-white/70"}`}>{icon}</span>
        <span className="min-w-0">
          <span className="block text-[15px] font-extrabold leading-tight tracking-[-0.015em] sm:text-[16px]">{title}</span>
          <span className={`mt-0.5 block text-[12.5px] leading-snug max-sm:hidden ${violet ? "text-white/85" : "text-ink-950/75"}`}>{sub}</span>
        </span>
      </div>
    </Link>
  );
}

export function HeroBanner() {
  return (
    <section aria-label="Ưu đãi" className="grid gap-3 pt-4 md:pt-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-4">
      <Carousel />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-1 lg:grid-rows-2 lg:gap-4">
        <SideTile href="/#voucher" tone="violet" icon={<Truck size={24} />} title="Freeship toàn quốc" sub={`Đơn từ ${formatVND(SHIPPING_FREE_FROM)}`} photo="/banners/tile-freeship.jpg" focus="object-[50%_68%]" chip="Ship 0₫" />
        <SideTile href="/#voucher" tone="sun" icon={<Ticket size={24} />} title="Mã giảm đến 100K" sub="Sao chép mã ngay bên dưới" photo="/banners/tile-voucher.jpg" focus="object-[62%_50%]" chip="-100K" />
      </div>
    </section>
  );
}
