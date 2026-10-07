"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, LayoutGrid } from "lucide-react";
import { getCategories } from "@/lib/api";
import { useAsync } from "@/lib/hooks";
import { searchUrl } from "@/lib/searchActions";
import type { Category } from "@/lib/types";

export function buildTree(cats: Category[]) {
  const roots = cats.filter((c) => !c.parent);
  const kids = (slug: string) => cats.filter((c) => c.parent === slug);
  return roots.map((r) => ({ ...r, children: kids(r.slug).map((c) => ({ ...c, children: kids(c.slug) })) }));
}

/** Desktop category strip under the search row, with a full tree in a popover. */
export function CategoryNav() {
  const { data } = useAsync(getCategories, "cats");
  const tree = useMemo(() => (data ? buildTree(data) : []), [data]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <nav aria-label="Danh mục" className="border-t border-white/10 max-lg:hidden">
      <div className="shell flex h-10 items-center gap-1 text-[14px]" ref={ref}>
        <div className="relative">
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className="flex h-8 items-center gap-2 rounded-md bg-white/10 pl-2.5 pr-2 font-semibold text-white transition-colors hover:bg-white/18"
          >
            <LayoutGrid size={16} />
            Tất cả danh mục
            <ChevronDown size={15} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
          </button>
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4, transition: { duration: 0.1 } }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="absolute left-0 top-[calc(100%+6px)] z-50 w-[min(920px,92vw)] rounded-xl border border-line bg-sheet p-5 text-fg shadow-pop"
              >
                <div className="grid grid-cols-3 gap-x-8 gap-y-5 xl:grid-cols-4">
                  {tree.map((r) => (
                    <div key={r.slug}>
                      <Link href={searchUrl({ category: r.slug })} onClick={() => setOpen(false)} className="text-[14px] font-bold hover:text-ink-600">
                        {r.name}
                      </Link>
                      <ul className="mt-1.5 space-y-1">
                        {r.children.flatMap((c) => (c.children.length ? c.children : [c])).map((c) => (
                          <li key={c.slug}>
                            <Link href={searchUrl({ category: c.slug })} onClick={() => setOpen(false)} className="text-[13.5px] text-muted hover:text-ink-600 hover:underline">
                              {c.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {tree.slice(0, 7).map((r) => (
          <Link key={r.slug} href={searchUrl({ category: r.slug })} className="rounded-md px-2.5 py-1.5 text-white/85 transition-colors hover:bg-white/10 hover:text-white">
            {r.name}
          </Link>
        ))}
      </div>
    </nav>
  );
}
