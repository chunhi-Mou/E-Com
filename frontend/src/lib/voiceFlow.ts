"use client";
import { assistantReply } from "./api";
import { composeReply } from "./assistant";
import { speakReply, type Speaker } from "./speech";
import type { SearchResponse } from "./types";
import { useSession } from "@/store/session";
import { useUi } from "@/store/ui";

let speaker: Speaker | null = null;
let last: { text: string; audioUrl?: string; lang: "vi" | "en" } | null = null;

export function stopSpeaking() {
  speaker?.stop();
  speaker = null;
  useSession.getState().patchVoice({ speaking: false });
}

export async function speak(text: string, audioUrl: string | undefined, lang: "vi" | "en") {
  stopSpeaking();
  last = { text, audioUrl, lang };
  const patch = useSession.getState().patchVoice;
  patch({ speaking: true });
  const s = await speakReply({ text, audioUrl, lang, onEnd: () => patch({ speaking: false }) });
  if (!s) patch({ speaking: false });
  speaker = s;
}

export function replay() {
  if (last) void speak(last.text, last.audioUrl, last.lang);
}

/** After a voice search returns: build the assistant reply (backend, else local) and speak it. */
export async function finishVoiceFlow(resp: SearchResponse) {
  const patch = useSession.getState().patchVoice;
  const lang = resp.representation.language ?? useUi.getState().voiceLang;
  const names = resp.results.slice(0, 3).map((r) => r.product.name);
  let text: string;
  let audio: string | undefined;
  try {
    const r = await assistantReply({ representation: resp.representation, total: resp.total, top_names: names });
    text = r.text;
    audio = r.audio_url || undefined;
  } catch {
    text = composeReply(resp.representation, resp.total, names);
  }
  patch({ phase: "answered", reply: text, total: resp.total });
  if (useUi.getState().speakReplies) await speak(text, audio, lang);
}
