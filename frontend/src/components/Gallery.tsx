"use client";
import { useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "motion/react";
import { Expand, X } from "lucide-react";
import { Stamp } from "./Stamp";

/** Product gallery: hover zoom on pointer devices, click for a large view. The main image is the shared element from the card. */
export function Gallery({ images, name, stampKey, mainRef }: { images: string[]; name: string; stampKey: number; mainRef: React.RefObject<HTMLDivElement | null> }) {
  const [idx, setIdx] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const src = images[idx];

  const onMove = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || !box.current) return;
    const r = box.current.getBoundingClientRect();
    setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
  };

  return (
    <div className="flex flex-col gap-3 lg:flex-row-reverse">
      <Dialog.Root>
        <div ref={mainRef} className="relative min-w-0 flex-1" style={{ viewTransitionName: "product-image" }}>
          <div
            ref={box}
            onPointerMove={onMove}
            onPointerLeave={() => setZoom(null)}
            className="relative aspect-square overflow-hidden rounded-lg border border-line bg-ink-50"
          >
            {src && (
              <img
                key={src}
                src={src}
                alt={name}
                onLoad={() => setLoaded(true)}
                draggable={false}
                className={`h-full w-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
                style={zoom ? { transform: "scale(2)", transformOrigin: `${zoom.x}% ${zoom.y}%`, transition: "transform-origin 60ms linear, transform 200ms cubic-bezier(.16,1,.3,1)" } : { transition: "transform 240ms cubic-bezier(.16,1,.3,1), opacity .3s" }}
              />
            )}
            <Dialog.Trigger asChild>
              <button type="button" aria-label="Xem ảnh lớn" className="absolute inset-0 cursor-zoom-in">
                <span className="absolute bottom-3 right-3 grid size-9 place-items-center rounded-full bg-white/95 text-ink-700 shadow-sm">
                  <Expand size={17} />
                </span>
              </button>
            </Dialog.Trigger>
            <AnimatePresence>
              {stampKey > 0 && (
                <motion.div
                  key={stampKey}
                  exit={{ opacity: 0, transition: { duration: 0.25 } }}
                  className="pointer-events-none absolute inset-0 grid place-items-center"
                >
                  <Stamp lines={["ĐÃ THÊM", "VÀO GIỎ"]} arc="SẮM · GIỎ HÀNG" size={156} tilt={-9} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        <Dialog.Portal>
          <Dialog.Overlay className="sheet-overlay fixed inset-0 z-[80] bg-ink-950/80" />
          <Dialog.Content className="fixed inset-0 z-[81] grid place-items-center p-4 outline-none" onClick={(e) => e.target === e.currentTarget && (document.activeElement as HTMLElement | null)?.blur()}>
            <Dialog.Title className="sr-only">{name}</Dialog.Title>
            <Dialog.Description className="sr-only">Ảnh sản phẩm kích thước lớn</Dialog.Description>
            <Dialog.Close className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-white text-ink-900" aria-label="Đóng">
              <X size={20} />
            </Dialog.Close>
            <img src={src} alt={name} className="max-h-[88dvh] max-w-[min(92vw,88dvh)] rounded-lg bg-ink-50 object-contain" />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {images.length > 1 && (
        <div className="flex gap-2 lg:w-[72px] lg:flex-col" role="tablist" aria-label="Ảnh sản phẩm">
          {images.map((u, i) => (
            <button
              key={u}
              type="button"
              role="tab"
              aria-selected={i === idx}
              aria-label={`Ảnh ${i + 1}`}
              onClick={() => {
                setIdx(i);
                setLoaded(false);
              }}
              className={`relative size-[64px] shrink-0 overflow-hidden rounded-md border-2 transition-colors lg:size-[72px] ${i === idx ? "border-ink-600" : "border-line hover:border-ink-300"}`}
            >
              <img src={u} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
