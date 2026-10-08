"use client";
import { create } from "zustand";

export type VoicePhase = "idle" | "listening" | "transcribing" | "searching" | "answered" | "error";

export type SearchImage = { file: File; url: string; id: number };

type SessionState = {
  image: SearchImage | null;
  setImage: (f: File | null) => void;
  voice: {
    phase: VoicePhase;
    transcript: string;
    reply: string | null;
    total: number | null;
    error: string | null;
    open: boolean;
    speaking: boolean;
    /** Why the spoken reply did not play, shown next to "Nghe lại". */
    speakHint: string | null;
  };
  patchVoice: (p: Partial<SessionState["voice"]>) => void;
  closeVoice: () => void;
  /** Forget the whole voice exchange (transcript, reply, count) once the shopper has left the results it was about. */
  resetVoice: () => void;
  text: string;
  setText: (t: string) => void;
  searchOpen: boolean;
  setSearchOpen: (v: boolean) => void;
};

let imageId = 0;

const VOICE_IDLE: SessionState["voice"] = { phase: "idle", transcript: "", reply: null, total: null, error: null, open: false, speaking: false, speakHint: null };

export const useSession = create<SessionState>((set, get) => ({
  image: null,
  setImage: (f) => {
    const prev = get().image;
    if (prev) URL.revokeObjectURL(prev.url);
    set({ image: f ? { file: f, url: URL.createObjectURL(f), id: ++imageId } : null });
  },
  voice: VOICE_IDLE,
  patchVoice: (p) => set((s) => ({ voice: { ...s.voice, ...p } })),
  closeVoice: () =>
    set((s) => ({ voice: { ...s.voice, open: false, speaking: false, phase: s.voice.phase === "listening" ? "idle" : s.voice.phase } })),
  resetVoice: () => set({ voice: VOICE_IDLE }),
  text: "",
  setText: (t) => set({ text: t }),
  searchOpen: false,
  setSearchOpen: (v) => set({ searchOpen: v }),
}));
