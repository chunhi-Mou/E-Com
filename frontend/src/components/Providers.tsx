"use client";
import { MotionConfig } from "motion/react";
import { useEffect } from "react";
import { getMode } from "@/lib/api";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    void getMode();
  }, []);
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
