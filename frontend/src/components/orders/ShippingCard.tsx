"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Copy } from "lucide-react";
import type { Order } from "@/lib/types";
import { formatDate, formatTime } from "@/lib/format";
import { shippingInfo } from "@/lib/shipping";

export function ShippingCard({ order }: { order: Order }) {
  const { carrier, trackingCode, events } = shippingInfo(order);
  const handedOver = order.status === "SHIPPING" || order.status === "DELIVERED";
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(trackingCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard can be blocked (insecure context); the code stays selectable.
    }
  };

  return (
    <section aria-label="Thông tin vận chuyển" className="rounded-2xl border border-line bg-sheet p-5">
      <h2 className="text-[16px] font-bold">Thông tin vận chuyển</h2>

      {handedOver ? (
        <dl className="mt-3 grid gap-x-8 gap-y-3 text-[14px] sm:grid-cols-2">
          <div>
            <dt className="text-muted">Đơn vị vận chuyển</dt>
            <dd className="font-semibold">{carrier.name}</dd>
          </div>
          <div>
            <dt className="text-muted">Mã vận đơn</dt>
            <dd className="flex items-center gap-2">
              <span className="num select-all font-semibold tracking-wide">{trackingCode}</span>
              <button
                type="button"
                onClick={copy}
                aria-label={copied ? "Đã sao chép mã vận đơn" : "Sao chép mã vận đơn"}
                className="grid size-7 place-items-center rounded-md border border-line-strong bg-white text-muted hover:bg-ink-50 hover:text-ink-700"
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={copied ? "ok" : "copy"}
                    className="grid place-items-center"
                    initial={{ opacity: 0, scale: 0.4, rotate: -40 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    exit={{ opacity: 0, scale: 0.4, transition: { duration: 0.08 } }}
                    transition={{ type: "spring", stiffness: 600, damping: 22 }}
                  >
                    {copied ? <Check size={14} className="text-ok" /> : <Copy size={14} />}
                  </motion.span>
                </AnimatePresence>
              </button>
            </dd>
          </div>
        </dl>
      ) : order.status !== "CANCELLED" ? (
        <p className="mt-2 text-[14px] text-muted">Mã vận đơn sẽ có khi cửa hàng bàn giao hàng cho đơn vị vận chuyển.</p>
      ) : null}

      <ol className="mt-4 border-t border-line pt-4" aria-label="Lịch sử đơn hàng, mới nhất trước">
        {events.map((e, i) => {
          const live = i === 0 && order.status === "SHIPPING";
          const at = { once: true, margin: "0px 0px -40px 0px" } as const;
          return (
            <motion.li
              key={i}
              className="relative flex gap-3 pb-4 last:pb-0"
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={at}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: Math.min(i, 6) * 0.08 }}
            >
              {i < events.length - 1 && (
                <motion.span
                  aria-hidden
                  className="absolute left-1 top-3 h-full w-px origin-top bg-line-strong"
                  initial={{ scaleY: 0 }}
                  whileInView={{ scaleY: 1 }}
                  viewport={at}
                  transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1], delay: Math.min(i, 6) * 0.08 + 0.12 }}
                />
              )}
              <span className="relative z-10 mt-1.5 size-[9px] shrink-0">
                {live && (
                  <motion.span
                    aria-hidden
                    className="absolute inset-0 rounded-full bg-ink-500"
                    animate={{ scale: [1, 3], opacity: [0.4, 0] }}
                    transition={{ duration: 1.8, ease: "easeOut", repeat: Infinity }}
                  />
                )}
                <span className={`relative block size-full rounded-full ${i === 0 ? "bg-ink-600 ring-4 ring-ink-100" : "bg-line-strong"}`} />
              </span>
              <div>
                <p className={`text-[14px] ${i === 0 ? "font-semibold" : ""}`}>{e.text}</p>
                <p className="num text-[12.5px] text-muted">{formatTime(e.at)} · {formatDate(e.at)}</p>
              </div>
            </motion.li>
          );
        })}
      </ol>
    </section>
  );
}
