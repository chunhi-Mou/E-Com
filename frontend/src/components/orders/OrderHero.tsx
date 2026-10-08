"use client";
import { Children, useEffect, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { CircleCheck, Truck } from "lucide-react";
import type { Order, OrderStatus } from "@/lib/types";
import { formatDate, formatTime } from "@/lib/format";
import { promiseLine, shippingInfo } from "@/lib/shipping";
import { STATUS_ICON, STATUS_LABEL, StatusTile } from "./StatusMark";

const FLOW: OrderStatus[] = ["PENDING", "CONFIRMED", "SHIPPING", "DELIVERED"];

const SUB: Record<OrderStatus, string> = {
  PENDING: "Cửa hàng đang xem xét đơn của bạn.",
  CONFIRMED: "Cửa hàng đang đóng gói hàng.",
  SHIPPING: "",
  DELIVERED: "Cảm ơn bạn đã mua sắm.",
  CANCELLED: "Đơn này sẽ không được giao.",
};

/** The single place the detail page states where the order stands; actions go in as children. */
export function OrderHero({ order, children }: { order: Order; children?: ReactNode }) {
  const latest = order.status === "SHIPPING" ? shippingInfo(order).events[0] : undefined;
  const sub = latest ? `${latest.text}, ${formatTime(latest.at)}, ${formatDate(latest.at)}` : SUB[order.status];
  const reached = FLOW.indexOf(order.status);
  const closed = order.status === "DELIVERED" || order.status === "CANCELLED";
  const hasActions = Children.toArray(children).length > 0;
  return (
    <section aria-label="Trạng thái đơn hàng" className="rounded-2xl border border-line bg-sheet p-5 md:p-6">
      <div className="flex items-center gap-4">
        <StatusTile status={order.status} large />
        <div className="min-w-0 flex-1">
          {!closed && <p className="text-[13.5px] font-semibold text-muted">{STATUS_LABEL[order.status]}</p>}
          <h2 className="balance text-[22px] font-extrabold leading-tight tracking-[-0.02em] md:text-[26px]">{promiseLine(order)}</h2>
          <p className="mt-0.5 text-[14px] text-muted">{sub}</p>
        </div>
      </div>

      {reached >= 0 && <Journey status={order.status} reached={reached} />}

      {hasActions && <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4">{children}</div>}
    </section>
  );
}

const STEP = 0.5; // seconds the van takes per stage on the first visit
const START = 0.25;
const EASE = [0.4, 0, 0.2, 1] as const;

/** The stage tracker: a van drives from "placed" to the current stage, painting the road behind it and
 *  waking each stop as it passes. Later status changes (polling) just drive the remaining distance. */
function Journey({ status, reached }: { status: OrderStatus; reached: number }) {
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSettled(true), (START + STEP * reached + 0.6) * 1000);
    return () => clearTimeout(t);
  }, [reached]);
  const [lit, setLit] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setLit(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const p = reached / (FLOW.length - 1);
  const drive = settled
    ? { type: "spring" as const, stiffness: 170, damping: 24 }
    : { duration: Math.max(STEP * reached, 0.01), delay: START, ease: EASE };
  const arrival = settled ? 0.35 : START + STEP * reached;
  const Icon = STATUS_ICON[status];

  return (
    <div className="relative mt-6">
      <span aria-hidden className="absolute left-[12.5%] right-[12.5%] top-[15px] h-0.5 overflow-hidden rounded-full bg-line-strong">
        <motion.span className="block size-full origin-left bg-ink-600" initial={{ scaleX: 0 }} animate={{ scaleX: p }} transition={drive} />
      </span>

      <ol className="relative grid grid-cols-4" aria-label="Tiến trình đơn hàng">
        {FLOW.map((s, i) => {
          const StepIcon = STATUS_ICON[s];
          const done = lit && i <= reached;
          const current = i === reached;
          const wake = settled ? 0.35 : START + STEP * i * 0.92;
          return (
            <li key={s} aria-current={current ? "step" : undefined} className="relative flex flex-col items-center text-center">
              <span
                style={{ transitionDelay: done ? `${wake}s` : "0s" }}
                className={`relative z-10 grid size-8 place-items-center rounded-full transition-[background-color,color,box-shadow] duration-300 ${
                  done ? "bg-ink-600 text-white" : "bg-white text-faint ring-2 ring-inset ring-line-strong"
                }`}
              >
                <StepIcon size={16} strokeWidth={2.2} aria-hidden />
              </span>
              <span className={`mt-2 text-[12.5px] leading-tight transition-colors duration-300 ${current ? "font-bold text-fg" : "text-muted"}`}>{STATUS_LABEL[s]}</span>
            </li>
          );
        })}
      </ol>

      <div aria-hidden className="pointer-events-none absolute left-[12.5%] right-[12.5%] top-0 h-8">
        <motion.div className="absolute inset-0" initial={{ x: "0%" }} animate={{ x: `${p * 100}%` }} transition={drive}>
          <span className="absolute left-0 top-0 -ml-4 size-8">
            {status === "SHIPPING" && (
              <motion.span
                className="absolute inset-0 rounded-full bg-ink-500"
                initial={{ scale: 1, opacity: 0 }}
                animate={{ scale: [1, 2], opacity: [0.35, 0] }}
                transition={{ duration: 1.8, ease: "easeOut", repeat: Infinity, delay: arrival }}
              />
            )}
            {status === "DELIVERED" && (
              <motion.span
                className="absolute inset-0 rounded-full bg-ink-500"
                initial={{ scale: 1, opacity: 0 }}
                animate={{ scale: [1, 2.2], opacity: [0.45, 0] }}
                transition={{ duration: 0.8, ease: EASE, delay: arrival }}
              />
            )}
            <span className="relative grid size-full place-items-center rounded-full bg-ink-600 text-white ring-4 ring-ink-200 shadow-[0_8px_18px_-8px_rgba(109,58,232,0.7)]">
              {status === "DELIVERED" ? (
                <>
                  <motion.span className="absolute grid place-items-center" initial={{ opacity: 1, scale: 1 }} animate={{ opacity: 0, scale: 0.5 }} transition={{ delay: arrival, duration: 0.15 }}>
                    <Truck size={16} strokeWidth={2.2} />
                  </motion.span>
                  <motion.span className="absolute grid place-items-center" initial={{ opacity: 0, scale: 0.3 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: arrival, type: "spring", stiffness: 520, damping: 16 }}>
                    <CircleCheck size={17} strokeWidth={2.4} />
                  </motion.span>
                </>
              ) : (
                <motion.span
                  className="grid place-items-center"
                  animate={status === "SHIPPING" ? { y: [0, -1.2, 0] } : undefined}
                  transition={{ duration: 0.7, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Icon size={16} strokeWidth={2.2} />
                </motion.span>
              )}
            </span>
          </span>
        </motion.div>
      </div>
    </div>
  );
}
