"use client";
import { AnimatePresence, motion } from "motion/react";
import { CircleCheck, CircleX, Clock, PackageCheck, Truck, type LucideIcon } from "lucide-react";
import type { OrderStatus } from "@/lib/types";

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  SHIPPING: "Đang giao",
  DELIVERED: "Đã giao",
  CANCELLED: "Đã hủy",
};

export const STATUS_ICON: Record<OrderStatus, LucideIcon> = {
  PENDING: Clock,
  CONFIRMED: PackageCheck,
  SHIPPING: Truck,
  DELIVERED: CircleCheck,
  CANCELLED: CircleX,
};

// The palette has one accent and no red, so colour alone cannot tell five states apart.
// Each state gets its own icon plus a different fill: outline, tint, solid, green tint, grey.
const TONE: Record<OrderStatus, string> = {
  PENDING: "bg-white text-muted ring-1 ring-inset ring-line-strong",
  CONFIRMED: "bg-ink-100 text-ink-800",
  SHIPPING: "bg-ink-600 text-white",
  DELIVERED: "bg-ok-soft text-emerald-800 ring-1 ring-inset ring-ok/30",
  CANCELLED: "bg-paper text-muted",
};

// A status that changes while the page is open (polling advanced the order) swaps in with a small pop;
// initial={false} keeps the first render still, so a freshly loaded list does not flicker.
const POP = { type: "spring", stiffness: 520, damping: 24 } as const;
const swap = {
  initial: { opacity: 0, scale: 0.7 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9, transition: { duration: 0.1 } },
  transition: POP,
} as const;

export function StatusBadge({ status }: { status: OrderStatus }) {
  const Icon = STATUS_ICON[status];
  return (
    <span className="relative inline-flex">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span key={status} {...swap} className={`inline-flex h-7 items-center gap-1.5 rounded-full pl-2 pr-3 text-[13px] font-semibold ${TONE[status]}`}>
          <Icon size={15} strokeWidth={2.2} aria-hidden /> {STATUS_LABEL[status]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export function StatusTile({ status, large = false }: { status: OrderStatus; large?: boolean }) {
  const Icon = STATUS_ICON[status];
  return (
    <span aria-hidden className={`relative block shrink-0 ${large ? "size-14" : "size-10"}`}>
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span key={status} {...swap} className={`grid size-full place-items-center ${large ? "rounded-2xl" : "rounded-xl"} ${TONE[status]}`}>
          <motion.span
            className="grid place-items-center"
            animate={status === "SHIPPING" ? { x: [-1.5, 1.5, -1.5] } : undefined}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          >
            <Icon size={large ? 26 : 20} strokeWidth={2} />
          </motion.span>
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
