"use client";
import { motion, useReducedMotion } from "motion/react";
import { useId } from "react";

type Props = {
  lines: [string, string?];
  arc?: string;
  foot?: string;
  size?: number;
  tilt?: number;
  /** Animate the "thump" when mounted. */
  animate?: boolean;
  className?: string;
};

/** The company seal (con dấu). The signature of the product: it confirms an order or an addition to the cart. */
export function Stamp({ lines, arc = "SẮM · XÁC NHẬN", foot, size = 168, tilt = -8, animate = true, className = "" }: Props) {
  const reduce = useReducedMotion();
  const uid = useId().replace(/:/g, "");
  const body = (
    <svg width={size} height={size} viewBox="0 0 200 200" role="img" aria-label={lines.filter(Boolean).join(" ")} style={{ mixBlendMode: "multiply" }}>
      <defs>
        <filter id={`rough-${uid}`} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="4" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="2.4" />
        </filter>
        <path id={`arc-${uid}`} d="M 100 100 m -66 0 a 66 66 0 1 1 132 0" />
      </defs>
      <g filter={`url(#rough-${uid})`} fill="none" stroke="var(--color-seal-600)" opacity=".94">
        <circle cx="100" cy="100" r="93" strokeWidth="6" />
        <circle cx="100" cy="100" r="82" strokeWidth="1.8" />
        <circle cx="100" cy="100" r="50" strokeWidth="1.2" strokeDasharray="2 5" opacity=".7" />
        <text fill="var(--color-seal-600)" stroke="none" fontFamily="var(--font-barlow), sans-serif" fontWeight="700" fontSize="15" letterSpacing="3.4">
          <textPath href={`#arc-${uid}`} startOffset="50%" textAnchor="middle">
            {arc}
          </textPath>
        </text>
        <text x="100" y={lines[1] ? 106 : 116} textAnchor="middle" fill="var(--color-seal-600)" stroke="none" fontFamily="var(--font-barlow), sans-serif" fontWeight="700" fontSize={lines[1] ? 40 : 48} letterSpacing="1">
          {lines[0]}
        </text>
        {lines[1] && (
          <text x="100" y="142" textAnchor="middle" fill="var(--color-seal-600)" stroke="none" fontFamily="var(--font-barlow), sans-serif" fontWeight="700" fontSize="40" letterSpacing="1">
            {lines[1]}
          </text>
        )}
        {foot && (
          <text x="100" y="166" textAnchor="middle" fill="var(--color-seal-600)" stroke="none" fontFamily="var(--font-barlow), sans-serif" fontWeight="600" fontSize="13" letterSpacing="2">
            {foot}
          </text>
        )}
      </g>
    </svg>
  );
  if (!animate) return <div className={className} style={{ transform: `rotate(${tilt}deg)` }}>{body}</div>;
  return (
    <motion.div
      className={className}
      initial={reduce ? { opacity: 0 } : { scale: 1.9, opacity: 0, rotate: tilt - 14, filter: "blur(5px)" }}
      animate={reduce ? { opacity: 1 } : { scale: 1, opacity: 1, rotate: tilt, filter: "blur(0px)" }}
      transition={{ type: "spring", stiffness: 520, damping: 26, mass: 0.9, opacity: { duration: 0.12 }, filter: { duration: 0.22 } }}
    >
      {body}
    </motion.div>
  );
}
