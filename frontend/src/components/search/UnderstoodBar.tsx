"use client";
import { AnimatePresence, motion } from "motion/react";
import { Camera, Info, Mic, Sparkles, Type, X } from "lucide-react";
import type { Chip } from "@/lib/chips";
import type { Modality } from "@/lib/types";
import { FILTER_LABEL } from "@/lib/vocab";

const MODALITY: Record<Modality, { label: string; icon: typeof Mic }> = {
  text: { label: "Văn bản", icon: Type },
  voice: { label: "Giọng nói", icon: Mic },
  image: { label: "Ảnh", icon: Camera },
  multimodal: { label: "Ảnh và chữ", icon: Camera },
};

export function UnderstoodBar({
  modality, rawText, chips, relaxed, onRemove,
}: {
  modality: Modality;
  rawText: string | null;
  chips: Chip[];
  relaxed: string[];
  onRemove: (c: Chip) => void;
}) {
  const M = MODALITY[modality];
  const isRelaxed = (c: Chip) => relaxed.some((r) => r === c.id || (c.id === "price" && r.startsWith("price")));
  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-2" aria-label="Sắm hiểu truy vấn như sau">
        <span className="inline-flex h-8 items-center gap-1.5 text-[13px] font-semibold text-ink-800">
          <Sparkles size={15} className="text-ink-500" />
          Sắm hiểu
        </span>
        <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-ink-100 px-3 text-[13px] font-medium text-ink-800">
          <M.icon size={14} />
          {M.label}
          {rawText && <span className="max-w-[28ch] truncate font-normal text-ink-700">“{rawText}”</span>}
        </span>
        <AnimatePresence initial={false} mode="popLayout">
          {chips.map((c) =>
            c.kind === "hard" ? (
              <motion.span
                key={c.id}
                layout
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.12 } }}
                transition={{ type: "spring", stiffness: 520, damping: 32 }}
                title={isRelaxed(c) ? "Đã nới: bộ lọc này không được áp dụng để có kết quả" : undefined}
                className={`inline-flex h-8 items-center gap-1 rounded-full border bg-white pl-3 pr-1 text-[13px] ${isRelaxed(c) ? "border-dashed border-hl-ink/40 text-muted" : "border-ink-300"}`}
              >
                <span className="text-muted">{c.label}:</span>
                <b className={`font-semibold ${isRelaxed(c) ? "line-through decoration-1" : ""}`}>{c.value}</b>
                {isRelaxed(c) && <span className="rounded bg-hl px-1.5 py-0.5 text-[11px] font-semibold leading-none text-hl-ink">đã nới</span>}
                <button
                  type="button"
                  onClick={() => onRemove(c)}
                  aria-label={`Bỏ lọc ${c.label}: ${c.value}`}
                  className="grid size-6 place-items-center rounded-full text-muted transition-colors hover:bg-seal-100 hover:text-seal-700"
                >
                  <X size={14} strokeWidth={2.5} />
                </button>
              </motion.span>
            ) : (
              <motion.span
                key={c.id}
                layout
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 520, damping: 32 }}
                title="Ưu tiên mềm: chỉ ảnh hưởng thứ hạng, không loại sản phẩm"
                className="inline-flex h-8 items-center gap-1 rounded-full border border-dashed border-ink-300 bg-ink-50 px-3 text-[13px]"
              >
                <span className="text-muted">Ưu tiên {c.label.toLowerCase()}:</span>
                <b className="font-semibold">{c.value}</b>
              </motion.span>
            ),
          )}
        </AnimatePresence>
      </div>
      {relaxed.length > 0 && (
        <div role="status" className="flex items-start gap-2.5 rounded-lg bg-hl-soft px-3.5 py-2.5 text-[14px] text-hl-ink ring-1 ring-hl">
          <Info size={18} className="mt-0.5 shrink-0" />
          <p className="pretty">
            Có quá ít sản phẩm khớp tất cả điều kiện, nên Sắm đã bỏ lọc <b>{relaxed.map((r) => FILTER_LABEL[r] ?? r).join(", ")}</b> để vẫn có kết quả. Các sản phẩm bên dưới có thể không đúng hoàn toàn điều kiện này.
          </p>
        </div>
      )}
    </div>
  );
}
