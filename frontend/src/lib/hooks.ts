"use client";
import { useEffect, useState, useSyncExternalStore } from "react";

const noop = () => () => {};
/** True after hydration; use it to gate values that come from localStorage. */
export function useHydrated(): boolean {
  return useSyncExternalStore(noop, () => true, () => false);
}

export type Async<T> = { data: T | null; error: Error | null; loading: boolean };

type Res<T> = { key: string; tick: number; data: T | null; error: Error | null };

/** Minimal fetch hook: re-runs when `key` changes, ignores stale results. */
export function useAsync<T>(fn: () => Promise<T>, key: string, initial: T | null = null): Async<T> & { reload: () => void } {
  const [res, setRes] = useState<Res<T> | null>(initial ? { key, tick: 0, data: initial, error: null } : null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true;
    fn().then(
      (data) => live && setRes({ key, tick, data, error: null }),
      (error: Error) => live && setRes((s) => ({ key, tick, data: s && s.key === key ? s.data : null, error })),
    );
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, tick]);
  const fresh = res !== null && res.key === key;
  return {
    data: fresh ? res.data : null,
    error: fresh ? res.error : null,
    loading: !fresh || res.tick !== tick,
    reload: () => setTick((t) => t + 1),
  };
}

export function useMediaQuery(q: string): boolean {
  const [m, setM] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const on = () => setM(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [q]);
  return m;
}
