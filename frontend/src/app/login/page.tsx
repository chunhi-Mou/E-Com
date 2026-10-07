"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AlertCircle, ArrowRight, Check, Eye, EyeOff, Lock, User } from "lucide-react";
import { useAuth } from "@/store/auth";
import { useCurtain } from "@/store/curtain";
import { Logo } from "@/components/Logo";
import { Intro } from "@/components/auth/Intro";
import { LoginShowcase } from "@/components/auth/LoginShowcase";

const EXPO = [0.16, 1, 0.3, 1] as const;
const SEEN_KEY = "lumina_intro_seen";

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.075, delayChildren: 0.06 } } };
const rise = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.75, ease: EXPO } } };

const inputCls =
  "h-12 w-full rounded-xl border border-line bg-white pl-11 text-[15px] text-fg outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-faint hover:border-line-strong focus:border-ink-500 focus:ring-4 focus:ring-ink-500/15";

export default function LoginPage() {
  const router = useRouter();
  const login = useAuth((s) => s.login);
  const reduce = useReducedMotion();

  // pending: deciding (white cover, no flash) / intro: playing / done: gone
  const [phase, setPhase] = useState<"pending" | "intro" | "done">("pending");
  const [entered, setEntered] = useState(false);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const submitRef = useRef<HTMLButtonElement>(null);
  const shakeRef = useRef<HTMLDivElement>(null);

  // The intro plays once per browser session; reduced-motion users never see it.
  useEffect(() => {
    useCurtain.getState().reset();
    router.prefetch("/");
    const id = requestAnimationFrame(() => {
      let seen = false;
      try {
        seen = sessionStorage.getItem(SEEN_KEY) === "1";
      } catch {}
      if (seen || reduce) {
        setPhase("done");
        setEntered(true);
      } else {
        setPhase("intro");
      }
    });
    return () => cancelAnimationFrame(id);
  }, [reduce, router]);

  // Mark as seen only once it has played: StrictMode runs the effect above twice in dev.
  const onIntroLeaving = useCallback(() => {
    setEntered(true);
    try {
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {}
  }, []);
  const onIntroDone = useCallback(() => setPhase("done"), []);

  const replayIntro = () => {
    setEntered(false);
    setPhase("intro");
  };

  // Shake without remounting, so focus and typed values stay put.
  const shake = () =>
    shakeRef.current?.animate(
      { transform: ["translateX(0)", "translateX(-9px)", "translateX(9px)", "translateX(-6px)", "translateX(6px)", "translateX(-3px)", "translateX(3px)", "translateX(0)"] },
      { duration: 420, easing: "ease-out" },
    );

  const fillDemo = () => {
    setUsername("admin");
    setPassword("admin1234");
    setErrorMsg(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || isSuccess) return;
    if (!username.trim() || !password.trim()) {
      setErrorMsg("Vui lòng nhập đầy đủ tài khoản và mật khẩu");
      shake();
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    setTimeout(() => {
      const res = login(username, password);
      setIsSubmitting(false);

      if (res.success) {
        setIsSuccess(true);
        if (reduce) {
          router.push("/");
          return;
        }
        const r = submitRef.current?.getBoundingClientRect();
        const origin = r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        setTimeout(() => useCurtain.getState().cover(origin, "/"), 260);
      } else {
        setErrorMsg(res.message || "Tài khoản hoặc mật khẩu không chính xác");
        shake();
      }
    }, 300);
  };

  return (
    <div className="relative min-h-dvh bg-white lg:grid lg:grid-cols-[minmax(440px,0.85fr)_1.15fr] lg:gap-4 lg:p-4">
      {/* Form side */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate={entered ? "show" : "hidden"}
        className="flex min-h-dvh flex-col px-6 py-8 sm:px-12 lg:min-h-0 lg:px-14 lg:py-10 xl:px-20"
      >
        <motion.div variants={rise}>
          <Logo />
        </motion.div>

        <div className="flex flex-1 items-center py-10">
          <div ref={shakeRef} className="w-full max-w-[400px]">
            <motion.h1 variants={rise} className="text-[clamp(2rem,3.4vw,2.6rem)] font-extrabold leading-[1.05] tracking-[-0.04em]">
              Đăng nhập
            </motion.h1>
            <motion.p variants={rise} className="mt-3 text-[16px] leading-relaxed text-muted">
              Chào mừng trở lại. Nhập tài khoản để vào cửa hàng.
            </motion.p>

            <AnimatePresence initial={false}>
              {errorMsg && (
                <motion.div
                  role="alert"
                  initial={{ opacity: 0, height: 0, y: -6 }}
                  animate={{ opacity: 1, height: "auto", y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: EXPO }}
                  className="overflow-hidden"
                >
                  <div className="mt-6 flex items-start gap-2.5 rounded-xl bg-rose-50 px-4 py-3 text-[13.5px] font-medium text-rose-800 ring-1 ring-rose-200">
                    <AlertCircle size={17} className="mt-px shrink-0 text-rose-600" />
                    <span>{errorMsg}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
              <motion.div variants={rise}>
                <label htmlFor="username" className="mb-2 block text-[13.5px] font-semibold">
                  Tài khoản
                </label>
                <div className="relative">
                  <User size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-faint" />
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setErrorMsg(null);
                    }}
                    placeholder="admin"
                    autoComplete="username"
                    className={`${inputCls} pr-4`}
                  />
                </div>
              </motion.div>

              <motion.div variants={rise}>
                <label htmlFor="password" className="mb-2 block text-[13.5px] font-semibold">
                  Mật khẩu
                </label>
                <div className="relative">
                  <Lock size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-faint" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setErrorMsg(null);
                    }}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className={`${inputCls} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-faint transition-colors hover:bg-paper hover:text-fg"
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </motion.div>

              <motion.div variants={rise} className="pt-1">
                <button
                  ref={submitRef}
                  type="submit"
                  disabled={isSubmitting || isSuccess}
                  className={`group relative flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl text-[15px] font-semibold text-white shadow-[0_14px_28px_-14px_rgba(109,58,232,0.85)] transition-[background-color,transform,box-shadow] duration-300 active:scale-[0.985] ${
                    isSuccess ? "bg-ink-700" : "bg-ink-600 hover:bg-ink-700 hover:shadow-[0_18px_32px_-14px_rgba(109,58,232,0.95)]"
                  }`}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {isSuccess ? (
                      <motion.span key="ok" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 22 }} className="flex items-center gap-2">
                        <Check size={19} strokeWidth={2.75} /> Đã xác thực
                      </motion.span>
                    ) : isSubmitting ? (
                      <motion.span key="load" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="size-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    ) : (
                      <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                        Đăng nhập
                        <ArrowRight size={17} className="transition-transform duration-200 group-hover:translate-x-1" />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              </motion.div>
            </form>

            <motion.div variants={rise} className="mt-7 flex items-center justify-between gap-3 border-t border-line pt-5 text-[13.5px]">
              <p className="text-muted">
                Tài khoản demo: <span className="font-semibold text-fg">admin</span> / <span className="font-semibold text-fg">admin1234</span>
              </p>
              <button type="button" onClick={fillDemo} className="shrink-0 font-semibold text-ink-600 transition-colors hover:text-ink-700">
                Điền nhanh
              </button>
            </motion.div>
          </div>
        </div>

        <motion.div variants={rise} className="flex items-center justify-between text-[12.5px] text-faint">
          <span>© Lumina</span>
          <button type="button" onClick={replayIntro} className="transition-colors hover:text-ink-600">
            Xem lại giới thiệu
          </button>
        </motion.div>
      </motion.div>

      {/* Showcase side */}
      <motion.div
        initial={{ opacity: 0, x: 36, scale: 0.985 }}
        animate={entered ? { opacity: 1, x: 0, scale: 1 } : { opacity: 0, x: 36, scale: 0.985 }}
        transition={{ duration: 0.9, ease: EXPO, delay: 0.1 }}
        className="max-lg:hidden"
      >
        <LoginShowcase />
      </motion.div>

      {phase === "pending" && <div className="fixed inset-0 z-50 bg-white" />}
      {phase === "intro" && <Intro onLeaving={onIntroLeaving} onDone={onIntroDone} />}
    </div>
  );
}
