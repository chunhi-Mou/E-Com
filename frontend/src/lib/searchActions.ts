"use client";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { useSession } from "@/store/session";
import { useUi } from "@/store/ui";
import { useToasts } from "@/store/toast";

export const MAX_IMAGE_MB = 10;

export function searchUrl(opts: { text?: string; modality?: "voice" | "image"; imageId?: number; category?: string; nonce?: number }): string {
  const p = new URLSearchParams();
  if (opts.text) p.set("q", opts.text);
  if (opts.category) p.set("c", opts.category);
  if (opts.modality) p.set("m", opts.modality);
  if (opts.imageId) p.set("i", String(opts.imageId));
  if (opts.nonce) p.set("v", String(opts.nonce));
  return `/search?${p.toString()}`;
}

export function acceptImage(file: File | undefined | null): file is File {
  if (!file) return false;
  if (!file.type.startsWith("image/")) {
    useToasts.getState().push({ text: "Tệp này không phải ảnh. Hãy chọn ảnh JPG, PNG hoặc WebP.", tone: "error" });
    return false;
  }
  if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
    useToasts.getState().push({ text: `Ảnh lớn hơn ${MAX_IMAGE_MB} MB. Hãy chọn ảnh nhỏ hơn.`, tone: "error" });
    return false;
  }
  return true;
}

/** Attach an image (picker, drop or paste) and search right away, combined with whatever text is in the field. */
export function runImageSearch(router: AppRouterInstance, file: File) {
  if (!acceptImage(file)) return;
  const s = useSession.getState();
  s.setImage(file);
  const text = s.text.trim();
  if (text) useUi.getState().pushRecent(text);
  const id = useSession.getState().image?.id;
  router.push(searchUrl({ text, modality: "image", imageId: id }));
}
