/** Lens mark: a violet tile with a white search ring. `inverse` flips it for violet backgrounds. */
export function LuminaEmblem({ size = 36, inverse = false }: { size?: number; inverse?: boolean }) {
  const tile = inverse ? "#FFFFFF" : "#6D3AE8";
  const glyph = inverse ? "#6D3AE8" : "#FFFFFF";
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0" aria-hidden="true">
      <rect width="40" height="40" rx="12" fill={tile} />
      <circle cx="18.5" cy="18.5" r="7.5" stroke={glyph} strokeWidth="3" />
      <path d="M24.5 24.5L30 30" stroke={glyph} strokeWidth="3" strokeLinecap="round" />
      <circle cx="15.8" cy="15.8" r="1.7" fill={glyph} opacity="0.85" />
    </svg>
  );
}

// Kept so existing imports keep working
export function SealMark({ size = 36 }: { size?: number }) {
  return <LuminaEmblem size={size} />;
}

export function Logo({ className = "", inverse = false, size = 34 }: { className?: string; inverse?: boolean; size?: number }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LuminaEmblem size={size} inverse={inverse} />
      <span className={`text-[21px] font-extrabold leading-none tracking-[-0.035em] ${inverse ? "text-white" : "text-fg"}`}>Lumina</span>
    </span>
  );
}
