"use client";
import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { LuminaEmblem } from "./Logo";
import { useCurtain } from "@/store/curtain";

const EASE = [0.76, 0, 0.24, 1] as const;
const circle = (r: number, x: number, y: number) => `circle(${r}px at ${x}px ${y}px)`;

/**
 * Login to store transition: a violet circle grows from the sign-in button, the route changes
 * underneath, then the circle shrinks into the search field. About 1.7s from click to store.
 */
export function RouteCurtain() {
  const router = useRouter();
  const pathname = usePathname();
  const phase = useCurtain((s) => s.phase);
  const origin = useCurtain((s) => s.origin);
  const target = useCurtain((s) => s.target);
  const ready = useCurtain((s) => s.ready);
  const pushed = useRef(false);

  // Screen is covered: switch route once.
  useEffect(() => {
    if (phase === "idle") pushed.current = false;
    if (phase !== "covered" || pushed.current) return;
    pushed.current = true;
    router.push(target);
  }, [phase, target, router]);

  // New page is under the curtain: open it once it has data (or after a safety timeout).
  useEffect(() => {
    if (phase !== "covered") return;
    const arrived = pathname !== "/login";
    const id = setTimeout(() => useCurtain.getState().reveal(), arrived && ready ? 140 : 2800);
    return () => clearTimeout(id);
  }, [phase, pathname, ready]);

  if (phase === "idle") return null;

  const reach = Math.hypot(window.innerWidth, window.innerHeight);
  const revealing = phase === "revealing";

  return (
    <motion.div
      aria-hidden
      className="fixed inset-0 z-[200] grid place-items-center bg-[radial-gradient(90%_80%_at_50%_45%,#7C4DF0_0%,#6D3AE8_55%,#5B2BD0_100%)]"
      initial={{ clipPath: circle(0, origin.x, origin.y) }}
      animate={{ clipPath: revealing ? circle(0, window.innerWidth / 2, 40) : circle(reach, origin.x, origin.y) }}
      transition={{ duration: revealing ? 0.7 : 0.6, ease: EASE }}
      onAnimationComplete={() => {
        const s = useCurtain.getState();
        if (s.phase === "covering") s.covered();
        else if (s.phase === "revealing") s.reset();
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.9 }}
        animate={{ opacity: revealing ? 0 : 1, y: revealing ? -6 : 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: phase === "covering" ? 0.22 : 0 }}
        className="flex flex-col items-center gap-4"
      >
        <span className="relative grid place-items-center">
          <span className="ring-out absolute -inset-5 rounded-full border border-white/40" />
          <LuminaEmblem size={60} inverse />
        </span>
        <p className="text-[15px] font-medium tracking-[-0.01em] text-white/85">Chào mừng quay lại</p>
      </motion.div>
    </motion.div>
  );
}
