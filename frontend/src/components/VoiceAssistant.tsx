"use client";
import { AnimatePresence, motion } from "motion/react";
import { Check, Loader2, Mic, TriangleAlert, Volume2, VolumeX, X } from "lucide-react";
import { replay, stopSpeaking } from "@/lib/voiceFlow";
import { useSession } from "@/store/session";
import { useUi } from "@/store/ui";

const STEPS = ["Nhận giọng nói", "Tìm sản phẩm", "Trả lời"];

function stepState(phase: string, i: number): "done" | "current" | "todo" {
  const at = phase === "transcribing" ? 0 : phase === "searching" ? 1 : phase === "answered" ? 3 : -1;
  return i < at ? "done" : i === at ? "current" : "todo";
}

/** Compact panel after a voice search: transcript, spoken reply, result count. Dismissible. */
export function VoiceAssistant() {
  const v = useSession((s) => s.voice);
  const close = useSession((s) => s.closeVoice);
  const { speakReplies, setSpeakReplies } = useUi();
  const error = v.phase === "error";

  return (
    <AnimatePresence>
      {v.open && (
        <motion.aside
          key="voice"
          role="complementary"
          aria-label="Trợ lý giọng nói"
          initial={{ opacity: 0, y: 28, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, transition: { duration: 0.14 } }}
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
          className="fixed inset-x-3 bottom-3 z-[60] overflow-hidden rounded-xl border border-line bg-sheet shadow-pop sm:left-auto sm:right-5 sm:bottom-5 sm:w-[380px]"
        >
          <div className="flex items-center gap-2.5 bg-ink-800 px-4 py-2.5 text-white">
            <span className={`grid size-7 place-items-center rounded-full ${error ? "bg-seal-600" : "bg-white/15"}`}>
              {error ? <TriangleAlert size={15} /> : <Mic size={15} />}
            </span>
            <p className="flex-1 text-[14px] font-semibold">{error ? "Chưa tìm được bằng giọng nói" : "Trợ lý giọng nói"}</p>
            <button
              type="button"
              onClick={() => {
                stopSpeaking();
                close();
              }}
              aria-label="Đóng trợ lý"
              className="on-ink grid size-7 place-items-center rounded-md hover:bg-white/15"
            >
              <X size={16} />
            </button>
          </div>

          <div className="space-y-3 px-4 py-3.5">
            {error ? (
              <p className="pretty text-[14px] text-fg">{v.error}</p>
            ) : (
              <>
                <ol className="flex items-center gap-1.5 text-[12px]" aria-label="Tiến trình">
                  {STEPS.map((s, i) => {
                    const st = stepState(v.phase, i);
                    return (
                      <li key={s} className="flex flex-1 items-center gap-1.5">
                        <span
                          className={`grid size-5 shrink-0 place-items-center rounded-full transition-colors duration-200 ${
                            st === "done" ? "bg-ok text-white" : st === "current" ? "bg-ink-600 text-white" : "bg-ink-100 text-faint"
                          }`}
                        >
                          {st === "done" ? <Check size={12} strokeWidth={3} /> : st === "current" ? <Loader2 size={12} className="animate-spin" /> : <span className="size-1.5 rounded-full bg-current" />}
                        </span>
                        <span className={st === "todo" ? "text-faint" : "font-medium text-fg"}>{s}</span>
                      </li>
                    );
                  })}
                </ol>

                {v.transcript && (
                  <div>
                    <p className="text-[12px] font-medium text-muted">Bạn nói</p>
                    <p className="pretty mt-0.5 text-[17px] font-medium leading-snug">“{v.transcript}”</p>
                  </div>
                )}

                <AnimatePresence initial={false}>
                  {v.reply && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="overflow-hidden">
                      <div className="rounded-lg bg-ink-50 p-3">
                        <p className="text-[12px] font-medium text-muted">Lumina trả lời</p>
                        <p className="pretty mt-0.5 text-[15px] leading-snug">{v.reply}</p>
                        <div className="mt-2.5 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => (v.speaking ? stopSpeaking() : replay())}
                            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-ink-600 px-3 text-[13px] font-semibold text-white hover:bg-ink-700"
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
                            className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] text-muted hover:bg-ink-100"
                          >
                            {speakReplies ? <Volume2 size={15} /> : <VolumeX size={15} />}
                            {speakReplies ? "Tự đọc: bật" : "Tự đọc: tắt"}
                          </button>
                        </div>
                        {v.speakHint && (
                          <p role="status" className="mt-2.5 flex items-start gap-1.5 text-[12.5px] leading-snug text-hl-ink">
                            <TriangleAlert size={14} className="mt-px shrink-0" />
                            <span>{v.speakHint}</span>
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {v.total !== null && (
                  <p className="text-[13px] text-muted">
                    <span className="num font-bold text-fg">{v.total}</span> sản phẩm trong kết quả bên dưới
                  </p>
                )}
              </>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
