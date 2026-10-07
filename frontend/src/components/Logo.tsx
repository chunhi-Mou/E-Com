import React from "react";

export function LuminaEmblem({ size = 38 }: { size?: number }) {
  const id = React.useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 transition-transform duration-300 hover:scale-105"
      aria-hidden="true"
    >
      <defs>
        {/* Dải gradient tím hoàng gia và thạch anh */}
        <linearGradient id={`l-grad-main-${id}`} x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#C084FC" />
          <stop offset="45%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#4C1D95" />
        </linearGradient>
        <linearGradient id={`l-grad-prism-${id}`} x1="12" y1="8" x2="36" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="50%" stopColor="#E9D5FF" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#A855F7" stopOpacity="0.4" />
        </linearGradient>
        <linearGradient id={`l-grad-glow-${id}`} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#DDD6FE" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#7C3AED" stopOpacity="0" />
        </linearGradient>
        <filter id={`l-glow-${id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Vòng nền lăng kính vát góc sang trọng */}
      <rect
        x="5"
        y="5"
        width="38"
        height="38"
        rx="12"
        fill={`url(#l-grad-main-${id})`}
        stroke="rgba(255, 255, 255, 0.4)"
        strokeWidth="1.2"
      />

      {/* Hào quang ánh sáng bao quanh */}
      <rect
        x="6"
        y="6"
        width="36"
        height="36"
        rx="11"
        fill="none"
        stroke={`url(#l-grad-glow-${id})`}
        strokeWidth="1.5"
      />

      {/* Lăng kính đa giác hình học tinh thể */}
      <path
        d="M24 10L36 17V31L24 38L12 31V17L24 10Z"
        fill="none"
        stroke="rgba(255, 255, 255, 0.35)"
        strokeWidth="1"
      />

      {/* Cách điệu Monogram L ánh kim sang trọng */}
      <path
        d="M19 16V32H30"
        stroke={`url(#l-grad-prism-${id})`}
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={`url(#l-glow-${id})`}
      />

      {/* Ngôi sao lấp lánh điểm xuyết (Sparkle of Intelligence) */}
      <circle cx="31" cy="17" r="2" fill="#FFFFFF" />
      <path d="M31 13V21M27 17H35" stroke="#FFFFFF" strokeWidth="0.8" strokeLinecap="round" opacity="0.8" />
    </svg>
  );
}

// Giữ lại SealMark để tương thích ngược với các file hiện hữu
export function SealMark({ size = 36 }: { size?: number }) {
  return <LuminaEmblem size={size} />;
}

export function Logo({
  className = "",
  showTagline = true,
  theme = "light",
}: {
  className?: string;
  showTagline?: boolean;
  theme?: "light" | "dark";
}) {
  const isDark = theme === "dark";
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LuminaEmblem size={38} />
      <span className="flex flex-col">
        <span
          className={`font-label text-[23px] font-extrabold tracking-[0.08em] leading-none ${
            isDark ? "text-ink-950" : "text-white"
          }`}
          style={{ letterSpacing: "0.12em" }}
        >
          LUMINA
        </span>
        {showTagline && (
          <span
            className={`text-[9px] font-semibold tracking-[0.24em] uppercase mt-0.5 ${
              isDark ? "text-ink-500" : "text-purple-200/90"
            }`}
          >
            INTELLIGENCE
          </span>
        )}
      </span>
    </span>
  );
}
