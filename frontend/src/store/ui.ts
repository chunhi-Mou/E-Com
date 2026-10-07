"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

type UiState = {
  inspect: boolean;
  toggleInspect: () => void;
  speakReplies: boolean;
  setSpeakReplies: (v: boolean) => void;
  voiceLang: "vi" | "en";
  setVoiceLang: (l: "vi" | "en") => void;
  recent: string[];
  pushRecent: (q: string) => void;
  clearRecent: () => void;
};

export const useUi = create<UiState>()(
  persist(
    (set) => ({
      inspect: false,
      toggleInspect: () => set((s) => ({ inspect: !s.inspect })),
      speakReplies: true,
      setSpeakReplies: (v) => set({ speakReplies: v }),
      voiceLang: "vi",
      setVoiceLang: (l) => set({ voiceLang: l }),
      recent: [],
      pushRecent: (q) =>
        set((s) => ({ recent: [q, ...s.recent.filter((x) => x !== q)].slice(0, 6) })),
      clearRecent: () => set({ recent: [] }),
    }),
    { name: "sam-ui-v1" },
  ),
);
