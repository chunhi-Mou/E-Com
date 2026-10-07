"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { SlidersHorizontal, X } from "lucide-react";

export function FilterSheet({ count, total, children }: { count: number; total: number; children: React.ReactNode }) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button type="button" className="relative flex h-10 items-center gap-2 rounded-lg border border-line-strong bg-white px-3.5 text-[14px] font-semibold">
          <SlidersHorizontal size={17} />
          Bộ lọc
          {count > 0 && <span className="num grid size-5 place-items-center rounded-full bg-ink-600 text-[11px] text-white">{count}</span>}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="sheet-overlay fixed inset-0 z-[80] bg-ink-950/50" />
        <Dialog.Content className="sheet-content fixed inset-x-0 bottom-0 z-[81] flex max-h-[86dvh] flex-col rounded-t-2xl bg-sheet shadow-pop outline-none">
          <div className="mx-auto mt-2 h-1 w-9 rounded-full bg-line-strong" aria-hidden />
          <div className="flex items-center justify-between px-4 pb-2 pt-2">
            <Dialog.Title className="text-[17px] font-bold">Bộ lọc</Dialog.Title>
            <Dialog.Close className="grid size-9 place-items-center rounded-lg hover:bg-ink-50" aria-label="Đóng">
              <X size={20} />
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">Lọc kết quả theo danh mục, giá, màu và thương hiệu</Dialog.Description>
          <div className="flex-1 overflow-y-auto px-4 pb-4">{children}</div>
          <div className="border-t border-line bg-sheet p-3 pb-[max(12px,env(safe-area-inset-bottom))]">
            <Dialog.Close className="h-11 w-full rounded-lg bg-ink-600 text-[15px] font-semibold text-white active:bg-ink-700">
              Xem <span className="num">{total}</span> sản phẩm
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
