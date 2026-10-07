"use client";
import { MotionConfig } from "motion/react";
import { useEffect } from "react";
import { getMode } from "@/lib/api";

import { useAuth } from "@/store/auth";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    void getMode();
    useAuth.getState().setHydrated();
  }, []);
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
