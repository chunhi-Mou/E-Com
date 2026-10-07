"use client";
import { create } from "zustand";

/**
 * The violet curtain that carries the user from login into the store.
 * covering: circle grows from the button. covered: route changes underneath.
 * revealing: circle shrinks toward the search field. idle: not mounted.
 */
export type CurtainPhase = "idle" | "covering" | "covered" | "revealing";

type CurtainState = {
  phase: CurtainPhase;
  origin: { x: number; y: number };
  /** Route to open once the screen is covered. */
  target: string;
  /** The page behind the curtain has its first data and can be shown. */
  ready: boolean;
  cover: (origin: { x: number; y: number }, target: string) => void;
  covered: () => void;
  reveal: () => void;
  markReady: () => void;
  reset: () => void;
};

export const useCurtain = create<CurtainState>((set, get) => ({
  phase: "idle",
  origin: { x: 0, y: 0 },
  target: "/",
  ready: false,
  cover: (origin, target) => set({ phase: "covering", origin, target, ready: false }),
  covered: () => get().phase === "covering" && set({ phase: "covered" }),
  reveal: () => get().phase === "covered" && set({ phase: "revealing" }),
  markReady: () => !get().ready && set({ ready: true }),
  reset: () => set({ phase: "idle", ready: false }),
}));
