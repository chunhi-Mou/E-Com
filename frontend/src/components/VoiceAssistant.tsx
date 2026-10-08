"use client";
import { Fragment, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { TriangleAlert, Volume2, VolumeX, X } from "lucide-react";
import { replay, stopSpeaking } from "@/lib/voiceFlow";
import { useSession } from "@/store/session";
import { useUi } from "@/store/ui";
import { LumiOrb, type Mood } from "./assistant/LumiOrb";

const EXPO = [0.16, 1, 0.3, 1] as const;

function Dots() {
  return (
    <span className="inline-flex items-end gap-[3px]" aria-hidden>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="size-[5px] rounded-full bg-ink-500"
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 0.7, ease: "easeInOut", repeat: Infinity, delay: i * 0.12 }}
        />
      ))}
    </span>
  );
}

/** The reply fades in word by word, roughly as fast as it is spoken. */
function Words({ text }: { text: string }) {
  return (
    <p className="pretty text-[15px] leading-snug">
      {text.split(" ").map((w, i) => (
        <Fragment key={i}>
          <motion.span className="inline-block" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: EXPO, delay: Math.min(i * 0.03, 1.2) }}>
            {w}
          </motion.span>{" "}
        </Fragment>
      ))}
    </p>
  );
}

/**
 * Voice assistant as a small orb in the corner. It wakes when the shopper starts talking, shows what it is doing through
 * its face, answers in a compact bubble, and disappears on its own right after it has finished speaking.
 */
export function VoiceAssistant() {
  const v = useSession((s) => s.voice);
  const close = useSession((s) => s.closeVoice);
  const reset = useSession((s) => s.resetVoice);
  const pathname = usePathname();
  const { speakReplies, setSpeakReplies } = useUi();

  const cycle = `${v.phase}|${v.reply ?? ""}|${v.error ?? ""}`;
  const [hold, setHold] = useState(false); // pointer or focus inside the bubble: do not vanish under someone reading it

  const show = v.open || v.phase === "listening";
  const settled = (v.phase === "answered" || v.phase === "error") && !v.speaking;

  // Remember that this answer was spoken aloud, so the orb knows when "finished talking" has happened.
  const spoke = useRef<string | null>(null);
  useEffect(() => {
    if (v.speaking) spoke.current = cycle;
  }, [v.speaking, cycle]);

  // When the current answer appeared, so a speech engine that reports "finished" too early cannot hide the orb mid-sentence.
  const born = useRef({ cycle: "", at: 0 });
  useEffect(() => {
    if (born.current.cycle !== cycle) born.current = { cycle, at: Date.now() };
  }, [cycle]);

  useEffect(() => {
    if (!v.open || !settled || hold) return;
    const text = v.reply ?? v.error ?? "";
    const spoken = spoke.current === cycle;
    const quiet = !speakReplies || !!v.speakHint; // nothing will be read out: leave a moment to read it instead
    // Spoken: stay at least as long as the sentence takes to say, then vanish just after the last word.
    // Not yet started: give the voice a few seconds to begin.
    const floor = 2000 + text.split(/\s+/).filter(Boolean).length * 400;
    const elapsed = born.current.cycle === cycle ? Date.now() - born.current.at : 0;
    const wait = spoken
      ? Math.max(900, floor - elapsed)
      : quiet || v.phase === "error"
        ? Math.min(5000, 2200 + text.length * 18)
        : 4000;
    const id = setTimeout(close, wait);
    return () => clearTimeout(id);
  }, [v.open, v.phase, settled, hold, cycle, close, v.reply, v.error, v.speakHint, speakReplies]);

  // An answer (or error) belongs to the page it appeared on. Once the shopper navigates elsewhere, forget it and stop any
  // speech still playing. Never mid-conversation: only a page change after the exchange finished counts.
  const finished = v.phase === "answered" || v.phase === "error";
  const shownOn = useRef<string | null>(null);
  useEffect(() => {
    if (!finished) {
      shownOn.current = null;
    } else if (shownOn.current === null) {
      shownOn.current = pathname;
    } else if (shownOn.current !== pathname) {
      shownOn.current = null;
      stopSpeaking();
      reset();
    }
  }, [finished, pathname, reset]);

  const mood: Mood =
    v.phase === "error" ? "error" : v.phase === "listening" ? "listening" : v.phase === "transcribing" || v.phase === "searching" ? "thinking" : v.speaking ? "speaking" : "happy";
  const bubble = (v.phase === "transcribing" || v.phase === "searching" || v.phase === "answered" || v.phase === "error");
  const error = v.phase === "error";

  const dismiss = () => {
    stopSpeaking();
    close();
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.aside
          key="lumi"
          role="complementary"
          aria-label="Trợ lý giọng nói Lumi"
          className="fixed bottom-20 right-4 z-[60] md:bottom-6 md:right-5"
          initial={{ opacity: 0, scale: 0.3, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.4, y: 18, transition: { duration: 0.26, ease: [0.4, 0, 1, 1] } }}
          transition={{ type: "spring", stiffness: 380, damping: 26 }}
        >
          <AnimatePresence>
            {bubble && (
              <motion.div
                key="bubble"
                style={{ transformOrigin: "bottom right" }}
                initial={{ opacity: 0, scale: 0.85, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 6, transition: { duration: 0.14 } }}
                transition={{ type: "spring", stiffness: 460, damping: 32 }}
                onPointerEnter={() => setHold(true)}
                onPointerLeave={() => setHold(false)}
                onFocus={() => setHold(true)}
                onBlur={() => setHold(false)}
                aria-live="polite"
                className="absolute bottom-[calc(100%+12px)] right-0 w-[min(320px,calc(100vw-2rem))] rounded-2xl rounded-br-md border border-line bg-sheet p-3.5 shadow-pop"
              >
                {v.transcript && (
                  <p className="truncate pr-6 text-[12.5px] text-muted">
                    Bạn nói: <span className="font-medium text-fg">“{v.transcript}”</span>
                  </p>
                )}

                {(v.phase === "transcribing" || v.phase === "searching") && (
                  <p className="mt-1.5 flex items-center gap-2 text-[14px] font-medium">
                    <Dots /> {v.phase === "transcribing" ? "Đang nghe lại câu của bạn" : "Đang tìm sản phẩm"}
                  </p>
                )}

                {error && (
                  <p className="mt-1.5 flex items-start gap-2 text-[14px] text-fg">
                    <TriangleAlert size={16} className="mt-0.5 shrink-0 text-seal-600" />
                    <span className="pretty">{v.error}</span>
                  </p>
                )}

                {v.phase === "answered" && v.reply && (
                  <div className="mt-1.5">
                    <Words key={v.reply} text={v.reply} />
                    <div className="mt-2.5 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => (v.speaking ? stopSpeaking() : replay())}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-ink-600 px-3 text-[13px] font-semibold text-white transition-[background-color,transform] hover:bg-ink-700 active:scale-95"
                      >
                        {v.speaking ? (
                          <span className="flex h-3.5 items-center gap-[2px]" aria-hidden>
                            {[0, 1, 2, 3].map((i) => (
                              <span key={i} className="voice-bar h-full w-[2.5px] rounded-full bg-white" style={{ animationDelay: `${i * 110}ms` }} />
                            ))}
                          </span>
                        ) : (
                          <Volume2 size={15} />
                        )}
                        {v.speaking ? "Dừng" : "Nghe lại"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (speakReplies) stopSpeaking();
                          setSpeakReplies(!speakReplies);
                        }}
                        aria-pressed={!speakReplies}
                        aria-label={speakReplies ? "Tắt tự đọc câu trả lời" : "Bật tự đọc câu trả lời"}
                        title={speakReplies ? "Tự đọc: bật" : "Tự đọc: tắt"}
                        className="grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-ink-50 hover:text-ink-700"
                      >
                        {speakReplies ? <Volume2 size={16} /> : <VolumeX size={16} />}
                      </button>
                      {v.total !== null && (
                        <span className="num ml-auto text-[12.5px] text-muted">
                          <b className="font-bold text-fg">{v.total}</b> sản phẩm
                        </span>
                      )}
                    </div>
                    {v.speakHint && (
                      <p role="status" className="mt-2 flex items-start gap-1.5 text-[12.5px] leading-snug text-hl-ink">
                        <TriangleAlert size={14} className="mt-px shrink-0" />
                        <span>{v.speakHint}</span>
                      </p>
                    )}
                  </div>
                )}

                <div className="absolute right-1.5 top-1.5 flex">
                  <button
                    type="button"
                    onClick={dismiss}
                    aria-label="Đóng trợ lý"
                    title="Đóng"
                    className="grid size-7 place-items-center rounded-md text-faint transition-colors hover:bg-ink-50 hover:text-fg"
                  >
                    <X size={15} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            type="button"
            onClick={dismiss}
            aria-label="Đóng trợ lý"
            whileHover={{ scale: 1.07 }}
            whileTap={{ scale: 0.92 }}
            transition={{ type: "spring", stiffness: 500, damping: 26 }}
            className="relative block rounded-full"
          >
            <LumiOrb mood={mood} />
          </motion.button>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
