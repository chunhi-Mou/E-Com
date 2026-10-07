"use client";
import { useRef } from "react";
import { useRouter } from "next/navigation";
import { acceptImage, runImageSearch } from "@/lib/searchActions";

/** Button that opens the image picker and starts an image search. */
export function ImagePicker({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const router = useRouter();
  return (
    <>
      <button type="button" className={className} onClick={() => ref.current?.click()}>
        {children}
      </button>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f && acceptImage(f)) runImageSearch(router, f);
        }}
      />
    </>
  );
}
