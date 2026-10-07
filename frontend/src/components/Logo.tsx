export function SealMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" className="shrink-0">
      <circle cx="20" cy="20" r="19" fill="var(--color-seal-600)" />
      <circle cx="20" cy="20" r="15.2" fill="none" stroke="#fff" strokeOpacity=".78" strokeWidth="1.4" />
      <text x="20" y="27.6" textAnchor="middle" fontFamily="var(--font-barlow), sans-serif" fontWeight="700" fontSize="22" fill="#fff">
        S
      </text>
    </svg>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <SealMark />
      <span className="text-[22px] font-extrabold leading-none tracking-[-0.02em] text-white">Sắm</span>
    </span>
  );
}
