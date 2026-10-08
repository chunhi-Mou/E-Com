"use client";
import { assistantReply } from "./api";
import { composeReply, MAX_REPLY_WORDS, wordCount } from "./assistant";
import { speakReply, type SpeakFail, type Speaker } from "./speech";
import type { SearchResponse } from "./types";
import { useSession } from "@/store/session";
import { useUi } from "@/store/ui";

/** How long the spoken reply waits for the backend assistant before using the local sentence. */
const REPLY_BUDGET_MS = 3000;

const FAIL_HINT: Record<SpeakFail, string> = {
  "no-voice": "Trình duyệt chưa có giọng đọc tiếng Việt. Hãy thêm giọng này trong cài đặt hệ điều hành, hoặc dùng Edge hoặc Chrome bản mới.",
  blocked: "Trình duyệt đang chặn tự phát âm thanh. Bấm “Nghe lại” để nghe.",
  "no-start": "Giọng đọc không bắt đầu được. Kiểm tra âm lượng và thiết bị phát, rồi bấm “Nghe lại”.",
  failed: "Không phát được giọng đọc. Kiểm tra âm lượng rồi bấm “Nghe lại”.",
};

let speaker: Speaker | null = null;
let seq = 0; // each speak() call owns a number; a newer call or stopSpeaking() cancels older pending ones
let last: { text: string; audioUrl?: string; lang: "vi" | "en" } | null = null;

export function stopSpeaking() {
  seq++;
  speaker?.stop();
  speaker = null;
  useSession.getState().patchVoice({ speaking: false });
}

export async function speak(text: string, audioUrl: string | undefined, lang: "vi" | "en") {
  stopSpeaking();
  const mine = seq;
  last = { text, audioUrl, lang };
  const patch = useSession.getState().patchVoice;
  patch({ speaking: true, speakHint: null });
  const s = await speakReply({
    text,
    audioUrl,
    lang,
    onEnd: () => seq === mine && patch({ speaking: false }),
    onFail: (r) => seq === mine && patch({ speakHint: FAIL_HINT[r] }),
  }).catch(() => {
    if (seq === mine) patch({ speaking: false, speakHint: FAIL_HINT.failed }); // never leave the orb stuck on "speaking"
    return null;
  });
  if (seq !== mine) {
    s?.stop(); // a newer reply took over while voices were loading
    return;
  }
  if (!s) patch({ speaking: false });
  speaker = s;
}

export function replay() {
  if (last) void speak(last.text, last.audioUrl, last.lang);
}

/** Browsers refuse to speak on a page the user has not touched yet (a reload, the back button, a pasted link). */
const canAutoSpeak = () => typeof navigator === "undefined" || !navigator.userActivation || navigator.userActivation.hasBeenActive;

const within = <T,>(p: Promise<T>, ms: number) =>
  new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    p.then(
      (v) => (clearTimeout(t), resolve(v)),
      (e) => (clearTimeout(t), reject(e)),
    );
  });

/** After a voice search returns: build the assistant reply (backend if quick, else local) and speak it. */
export async function finishVoiceFlow(resp: SearchResponse) {
  const patch = useSession.getState().patchVoice;
  const lang = resp.representation.language ?? useUi.getState().voiceLang;
  let text = composeReply(resp.representation, resp.total);
  let audio: string | undefined;
  try {
    const r = await within(assistantReply({ representation: resp.representation, total: resp.total, top_names: [] }), REPLY_BUDGET_MS);
    // An over-long answer (and the audio rendered from it) is dropped for the short local sentence.
    if (wordCount(r.text) <= MAX_REPLY_WORDS) {
      text = r.text;
      audio = r.audio_url || undefined;
    }
  } catch {
    // slow or unavailable backend: the local sentence is already good enough to read out
  }
  patch({ phase: "answered", reply: text, total: resp.total, open: true });
  if (!useUi.getState().speakReplies) return;
  if (!canAutoSpeak()) {
    patch({ speakHint: FAIL_HINT.blocked });
    return;
  }
  await speak(text, audio, lang);
}
