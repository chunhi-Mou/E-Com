"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ImagePlus } from "lucide-react";
import { runImageSearch } from "@/lib/searchActions";

/** Page-wide drag-and-drop and clipboard paste for image search. */
export function ImageDropzone() {
  const router = useRouter();
  const [drag, setDrag] = useState(false);
  const depth = useRef(0);

  useEffect(() => {
    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth.current += 1;
      setDrag(true);
    };
    const over = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault();
    };
    const leave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setDrag(false);
    };
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth.current = 0;
      setDrag(false);
      const f = e.dataTransfer?.files?.[0];
      if (f) runImageSearch(router, f);
    };
    const paste = (e: ClipboardEvent) => {
      const f = Array.from(e.clipboardData?.files ?? []).find((x) => x.type.startsWith("image/"));
      if (f) {
        e.preventDefault();
        runImageSearch(router, f);
      }
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragover", over);
    window.addEventListener("dragleave", leave);
    window.addEventListener("drop", drop);
    window.addEventListener("paste", paste);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragover", over);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("drop", drop);
      window.removeEventListener("paste", paste);
    };
  }, [router]);

  return (
    <AnimatePresence>
      {drag && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.12 } }}
          transition={{ duration: 0.16 }}
          className="pointer-events-none fixed inset-0 z-[90] grid place-items-center bg-ink-950/80 p-6"
          aria-hidden
        >
          <motion.div
            initial={{ scale: 0.96 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="flex w-full max-w-xl flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-hl px-8 py-14 text-center text-white"
          >
            <ImagePlus size={44} className="text-hl" strokeWidth={1.6} />
            <p className="text-[22px] font-bold">Thả ảnh để tìm sản phẩm giống</p>
            <p className="text-[15px] text-white/75">Có thể gõ thêm mô tả, ví dụ “màu trắng”, để thu hẹp kết quả.</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
