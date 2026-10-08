"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { Camera, Check, Clock, ImagePlus, Mic, Search, X } from "lucide-react";
import { suggest, transcribe } from "@/lib/api";
import { EXAMPLE_QUERIES } from "@/mocks/engine";
import { MicError, sttSupported, startCapture, warmVoices, type Capture } from "@/lib/speech";
import { acceptImage, runImageSearch, searchUrl } from "@/lib/searchActions";
import { stopSpeaking } from "@/lib/voiceFlow";
import { useSession } from "@/store/session";
import { useUi } from "@/store/ui";
import { useHydrated } from "@/lib/hooks";

const BARS = 24;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function micMessage(e: unknown): string {
  if (e instanceof MicError) {
    if (e.kind === "denied") return "Chưa cấp quyền micro. Bật micro cho trang này trong trình duyệt, hoặc gõ vào ô tìm kiếm.";
    if (e.kind === "missing") return "Không tìm thấy micro. Hãy cắm micro hoặc gõ vào ô tìm kiếm.";
    if (e.kind === "unsupported") return "Trình duyệt này chưa hỗ trợ ghi âm. Hãy gõ vào ô tìm kiếm.";
  }
  return "Không mở được micro. Hãy thử lại hoặc gõ vào ô tìm kiếm.";
}

export function SearchBar() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const q = sp.get("q") ?? "";
  const hydrated = useHydrated();

  const text = useSession((s) => s.text);
  const setText = useSession((s) => s.setText);
  const image = useSession((s) => s.image);
  const setImage = useSession((s) => s.setImage);
  const voice = useSession((s) => s.voice);
  const patchVoice = useSession((s) => s.patchVoice);
  const setSearchOpen = useSession((s) => s.setSearchOpen);
  const { recent, pushRecent, clearRecent, voiceLang, setVoiceLang } = useUi();

  const [focused, setFocused] = useState(false);
  const [sugs, setSugs] = useState<string[]>([]);
  const [active, setActive] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const capRef = useRef<Capture | null>(null);
  const barsRef = useRef<(HTMLSpanElement | null)[]>([]);
  const finishRef = useRef<() => void>(() => {});

  const listening = voice.phase === "listening";
  const level = useMotionValue(0);
  const levelSpring = useSpring(level, { stiffness: 260, damping: 26 });
  const ringScale = useTransform(levelSpring, [0, 1], [1, 2.2]);
  const ringOpacity = useTransform(levelSpring, [0, 1], [0.18, 0.5]);

  // URL is the source of truth for the text on the results page
  useEffect(() => {
    if (pathname === "/search") setText(q);
    else setText("");
  }, [pathname, q, setText]);

  useEffect(() => {
    setSearchOpen(focused && !listening);
    return () => setSearchOpen(false);
  }, [focused, listening, setSearchOpen]);

  // Suggestions, debounced
  useEffect(() => {
    const t = text.trim();
    if (!focused || !t) return;
    let live = true;
    const id = setTimeout(() => {
      void suggest(t).then((r) => live && setSugs(r.filter((x) => x.toLowerCase() !== t.toLowerCase()).slice(0, 6)));
    }, 110);
    return () => {
      live = false;
      clearTimeout(id);
    };
  }, [text, focused]);

  const submit = useCallback(
    (value: string, modality?: "voice") => {
      const t = value.trim();
      if (!t && !image) {
        inputRef.current?.focus();
        return;
      }
      if (t) pushRecent(t);
      setFocused(false);
      inputRef.current?.blur();
      if (image) router.push(searchUrl({ text: t, modality: "image", imageId: image.id, nonce: Date.now() }));
      else router.push(searchUrl({ text: t, modality, nonce: modality ? Date.now() : undefined }));
    },
    [image, pushRecent, router],
  );

  // ---------- Voice ----------
  const finishVoice = useCallback(async () => {
    const cap = capRef.current;
    if (!cap) return;
    capRef.current = null;
    setFocused(false);
    (document.activeElement as HTMLElement | null)?.blur();
    patchVoice({ phase: "transcribing", open: true });
    const { blob, transcript } = await cap.stop();
    let final = "";
    if (blob && blob.size > 1500) {
      try {
        final = (await transcribe(blob, voiceLang)).text;
      } catch {
        // backend STT missing or failed: use the in-browser transcript
      }
    }
    if (!final.trim()) final = transcript;
    if (!final.trim()) {
      patchVoice({
        phase: "error",
        error: sttSupported()
          ? "Mình chưa nghe rõ. Hãy bấm micro và nói lại gần hơn, hoặc gõ vào ô tìm kiếm."
          : "Trình duyệt này chưa hỗ trợ nhận dạng giọng nói. Hãy dùng Chrome hoặc Edge, hoặc gõ vào ô tìm kiếm.",
      });
      return;
    }
    setText(final);
    patchVoice({ transcript: final, phase: "searching" });
    await sleep(420);
    pushRecent(final);
    router.push(searchUrl({ text: final, modality: "voice", nonce: Date.now() }));
  }, [patchVoice, pushRecent, router, setText, voiceLang]);

  useEffect(() => {
    finishRef.current = () => void finishVoice();
  }, [finishVoice]);

  const startVoice = useCallback(async () => {
    if (capRef.current) return;
    stopSpeaking();
    warmVoices(); // the browser loads its voices lazily; start now so the reply can be spoken on time
    setFocused(false);
    patchVoice({ phase: "listening", transcript: "", reply: null, total: null, error: null, open: false, speaking: false, speakHint: null });
    setText("");
    try {
      capRef.current = await startCapture({
        lang: voiceLang,
        onFrame: (lv, bins) => {
          level.set(lv);
          const els = barsRef.current;
          for (let i = 0; i < BARS; i++) {
            const el = els[i];
            if (el) el.style.transform = `scaleY(${Math.max(0.14, Math.pow(bins[Math.floor(i * 1.5)] / 255, 1.3)).toFixed(3)})`;
          }
        },
        onInterim: (t) => setText(t),
        onSilence: () => finishRef.current(),
      });
    } catch (e) {
      capRef.current = null;
      patchVoice({ phase: "error", error: micMessage(e), open: true });
    }
  }, [level, patchVoice, setText, voiceLang]);

  const cancelVoice = useCallback(() => {
    capRef.current?.cancel();
    capRef.current = null;
    level.set(0);
    setFocused(false);
    (document.activeElement as HTMLElement | null)?.blur();
    patchVoice({ phase: "idle", open: false, transcript: "" });
    setText(pathname === "/search" ? q : "");
  }, [level, patchVoice, pathname, q, setText]);

  useEffect(() => {
    return () => capRef.current?.cancel();
  }, []);

  // Escape cancels recording from anywhere
  useEffect(() => {
    if (!listening) return;
    const on = (e: KeyboardEvent) => e.key === "Escape" && cancelVoice();
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [listening, cancelVoice]);

  // Hero buttons ask the field to focus, listen or pick an image
  useEffect(() => {
    const on = (e: Event) => {
      const mode = (e as CustomEvent<"focus" | "voice" | "image">).detail;
      if (mode === "voice") void startVoice();
      else if (mode === "image") fileRef.current?.click();
      else {
        window.scrollTo({ top: 0, behavior: "smooth" });
        inputRef.current?.focus({ preventScroll: true });
      }
    };
    window.addEventListener("lumina:search", on);
    return () => window.removeEventListener("lumina:search", on);
  }, [startVoice]);

  // "/" focuses the search field
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && el && !/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) && !el.isContentEditable) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, []);

  // ---------- Items in the dropdown ----------
  const trimmed = text.trim();
  const shownSugs = focused && trimmed ? sugs : [];
  const items: { label: string; kind: "literal" | "sug" | "recent" | "example" }[] = trimmed
    ? [{ label: trimmed, kind: "literal" }, ...shownSugs.map((label) => ({ label, kind: "sug" as const }))]
    : [
        ...(hydrated ? recent.slice(0, 4).map((label) => ({ label, kind: "recent" as const })) : []),
        ...EXAMPLE_QUERIES.slice(0, 4).map((label) => ({ label, kind: "example" as const })),
      ];

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a <= 0 ? items.length - 1 : a - 1));
    } else if (e.key === "Escape") {
      setFocused(false);
      inputRef.current?.blur();
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = active >= 0 ? items[active]?.label : text;
      if (pick !== undefined) {
        setText(pick);
        submit(pick);
      }
    }
  };

  const onBlurWrap = (e: React.FocusEvent) => {
    if (!wrapRef.current?.contains(e.relatedTarget as Node)) {
      setFocused(false);
      setActive(-1);
    }
  };

  const removeImage = () => {
    setImage(null);
    if (pathname === "/search" && sp.get("m") === "image") {
      if (q) router.replace(searchUrl({ text: q }));
      else router.push("/");
    }
    inputRef.current?.focus();
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f && acceptImage(f)) {
      setFocused(false);
      runImageSearch(router, f);
    }
  };

  const fieldRing = listening
    ? "bg-white ring-2 ring-ink-500 shadow-[0_12px_32px_-14px_rgba(109,58,232,0.5)]"
    : focused
      ? "bg-white ring-2 ring-ink-500/80 shadow-[0_12px_32px_-14px_rgba(109,58,232,0.4)]"
      : "bg-paper ring-1 ring-line hover:ring-line-strong";

  return (
    <motion.div
      ref={wrapRef}
      onFocus={() => setFocused(true)}
      onBlur={onBlurWrap}
      className="relative mx-auto w-full"
      style={{ maxWidth: 640 }}
      animate={{ maxWidth: focused || listening ? 780 : 640 }}
      transition={{ type: "spring", stiffness: 380, damping: 36 }}
    >
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          submit(text);
        }}
        className={`flex h-11 items-center rounded-2xl pl-3.5 pr-1.5 text-fg transition-[box-shadow,background-color] duration-200 md:h-12 ${fieldRing}`}
      >
        {listening ? (
          <ListeningView
            text={text}
            ringScale={ringScale}
            ringOpacity={ringOpacity}
            barsRef={barsRef}
            lang={voiceLang}
            onLang={setVoiceLang}
            onCancel={cancelVoice}
            onDone={() => void finishVoice()}
          />
        ) : (
          <>
            {image ? (
              <motion.span
                layout
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="mr-2 flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-ink-50 py-0.5 pl-0.5 pr-1 ring-1 ring-ink-200"
              >
                <img src={image.url} alt="Ảnh dùng để tìm" className="size-7 rounded-[5px] object-cover" />
                <span className="hidden text-[12px] font-medium text-ink-700 sm:inline">Ảnh</span>
                <button type="button" onClick={removeImage} aria-label="Bỏ ảnh" className="grid size-5 place-items-center rounded text-ink-600 hover:bg-ink-100">
                  <X size={13} strokeWidth={2.5} />
                </button>
              </motion.span>
            ) : (
              <Search size={19} className={`mr-2.5 shrink-0 transition-colors duration-200 ${focused ? "text-ink-600" : "text-faint"}`} aria-hidden />
            )}
            <input
              ref={inputRef}
              type="search"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setActive(-1);
              }}
              onKeyDown={onKeyDown}
              placeholder={image ? "Thêm mô tả, ví dụ: màu trắng" : "Tìm áo mùa đông, giày trắng dưới 500k…"}
              aria-label="Tìm kiếm sản phẩm"
              aria-autocomplete="list"
              aria-expanded={focused}
              aria-controls="search-panel"
              role="combobox"
              autoComplete="off"
              enterKeyHint="search"
              className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-fg outline-none placeholder:text-faint md:text-[16px]"
            />
            {text && (
              <button
                type="button"
                onClick={() => {
                  setText("");
                  inputRef.current?.focus();
                }}
                aria-label="Xóa nội dung"
                className="grid size-8 shrink-0 place-items-center rounded-md text-faint transition-colors hover:bg-ink-50 hover:text-fg"
              >
                <X size={16} />
              </button>
            )}
            <span className="mx-1 h-6 w-px shrink-0 bg-line" aria-hidden />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              aria-label="Tìm bằng ảnh"
              title="Tìm bằng ảnh (kéo thả hoặc dán ảnh cũng được)"
              className="grid size-9 shrink-0 place-items-center rounded-xl text-muted transition-[background-color,color,transform] hover:bg-ink-50 hover:text-ink-600 active:scale-90"
            >
              <Camera size={20} />
            </button>
            <button
              type="button"
              onClick={() => void startVoice()}
              aria-label="Tìm bằng giọng nói"
              title="Tìm bằng giọng nói"
              className="grid size-9 shrink-0 place-items-center rounded-xl text-muted transition-[background-color,color,transform] hover:bg-ink-50 hover:text-ink-600 active:scale-90"
            >
              <Mic size={20} />
            </button>
            <button
              type="submit"
              aria-label="Tìm"
              className="ml-1 grid h-8 shrink-0 place-items-center rounded-xl bg-ink-600 px-3 text-[14px] font-semibold text-white transition-[background-color,transform] hover:bg-ink-700 active:scale-95 md:h-9 md:px-5"
            >
              <Search size={18} className="md:hidden" />
              <span className="hidden md:inline">Tìm</span>
            </button>
          </>
        )}
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPick} />
      </form>

      <AnimatePresence>
        {focused && !listening && (
          <motion.div
            id="search-panel"
            role="listbox"
            initial={{ opacity: 0, y: -6, scaleY: 0.97 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -4, transition: { duration: 0.1 } }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformOrigin: "top" }}
            className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-line bg-sheet text-fg shadow-pop"
          >
            {!trimmed && recent.length > 0 && hydrated && (
              <div className="flex items-center justify-between px-4 pb-1 pt-3 text-[12px] font-semibold text-muted">
                <span>Tìm gần đây</span>
                <button type="button" onClick={clearRecent} className="font-medium text-ink-600 hover:underline">
                  Xóa
                </button>
              </div>
            )}
            <ul className="py-1">
              {items.map((it, i) => (
                <motion.li
                  key={it.kind === "literal" ? "literal" : `${it.kind}-${it.label}`}
                  role="option"
                  aria-selected={active === i}
                  initial={{ opacity: 0, y: -3 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1], delay: Math.min(i, 6) * 0.03 }}
                >
                  {!trimmed && it.kind === "example" && i === (hydrated ? Math.min(recent.length, 4) : 0) && (
                    <div className="px-4 pb-1 pt-3 text-[12px] font-semibold text-muted">Thử tìm</div>
                  )}
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => {
                      setText(it.label);
                      submit(it.label);
                    }}
                    className="relative flex w-full items-center gap-3 px-4 py-2 text-left text-[15px]"
                  >
                    {active === i && (
                      <motion.span
                        layoutId="sug-highlight"
                        aria-hidden
                        className="absolute inset-x-1.5 inset-y-0.5 rounded-lg bg-ink-50"
                        transition={{ type: "spring", stiffness: 600, damping: 44 }}
                      />
                    )}
                    {it.kind === "recent" ? <Clock size={16} className="relative shrink-0 text-faint" /> : <Search size={16} className="relative shrink-0 text-faint" />}
                    <span className="relative truncate">
                      {it.kind === "literal" ? (
                        <>
                          Tìm <b className="font-semibold">“{it.label}”</b>
                        </>
                      ) : (
                        it.label
                      )}
                    </span>
                  </button>
                </motion.li>
              ))}
            </ul>
            {!trimmed && (
              <div className="grid grid-cols-1 border-t border-line sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => void startVoice()}
                  className="flex items-start gap-3 px-4 py-3 text-left hover:bg-ink-50"
                >
                  <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-seal-100 text-seal-600">
                    <Mic size={17} />
                  </span>
                  <span>
                    <span className="block text-[14px] font-semibold">Nói để tìm</span>
                    <span className="block text-[13px] text-muted">Thử: “tôi muốn mua áo mùa đông”</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex items-start gap-3 border-t border-line px-4 py-3 text-left hover:bg-ink-50 sm:border-l sm:border-t-0"
                >
                  <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-ink-100 text-ink-600">
                    <ImagePlus size={17} />
                  </span>
                  <span>
                    <span className="block text-[14px] font-semibold">Tìm bằng ảnh</span>
                    <span className="block text-[13px] text-muted">Chọn, kéo thả hoặc dán ảnh (Ctrl+V)</span>
                  </span>
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ListeningView({
  text, ringScale, ringOpacity, barsRef, lang, onLang, onCancel, onDone,
}: {
  text: string;
  ringScale: ReturnType<typeof useTransform<number, number>>;
  ringOpacity: ReturnType<typeof useTransform<number, number>>;
  barsRef: React.MutableRefObject<(HTMLSpanElement | null)[]>;
  lang: "vi" | "en";
  onLang: (l: "vi" | "en") => void;
  onCancel: () => void;
  onDone: () => void;
}) {
  return (
    <div className="fade-in flex h-full min-w-0 flex-1 items-center gap-3" role="status" aria-live="polite">
      <motion.span
        className="relative grid size-8 shrink-0 place-items-center"
        initial={{ scale: 0.4, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 520, damping: 18 }}
      >
        <motion.span style={{ scale: ringScale, opacity: ringOpacity }} className="absolute inset-0 rounded-full bg-seal-500" aria-hidden />
        <span className="relative grid size-8 place-items-center rounded-full bg-seal-600 text-white">
          <Mic size={16} />
        </span>
      </motion.span>
      <span className="flex h-7 shrink-0 items-center gap-[2px] max-sm:hidden" aria-hidden>
        {Array.from({ length: BARS }, (_, i) => (
          <span
            key={i}
            ref={(el) => {
              barsRef.current[i] = el;
            }}
            className="fade-in h-full w-[2.5px] origin-center rounded-full bg-seal-500"
            style={{ transform: "scaleY(0.14)", animationDelay: `${60 + i * 14}ms` }}
          />
        ))}
      </span>
      <span className={`min-w-0 flex-1 truncate text-[15px] md:text-[16px] ${text ? "text-fg" : "text-faint"}`}>
        {text || (lang === "vi" ? "Đang nghe, hãy nói…" : "Listening, go ahead…")}
      </span>
      <div className="flex shrink-0 overflow-hidden rounded-md border border-line text-[12px] font-semibold max-sm:hidden" role="group" aria-label="Ngôn ngữ nói">
        {(["vi", "en"] as const).map((l) => (
          <button
            key={l}
            type="button"
            aria-pressed={lang === l}
            onClick={() => onLang(l)}
            className={`px-2 py-1 uppercase transition-colors ${lang === l ? "bg-ink-600 text-white" : "text-muted hover:bg-ink-50"}`}
          >
            {l}
          </button>
        ))}
      </div>
      <button type="button" onClick={onCancel} aria-label="Hủy ghi âm" className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-ink-50 hover:text-fg">
        <X size={19} />
      </button>
      <button
        type="button"
        onClick={onDone}
        aria-label="Xong, tìm kiếm"
        className="grid size-9 shrink-0 place-items-center rounded-lg bg-seal-600 text-white transition-[background-color,transform] hover:bg-seal-700 active:scale-90"
      >
        <Check size={19} strokeWidth={2.5} />
      </button>
    </div>
  );
}
