import type { ReactNode } from "react";
import type { Hazard } from "../data";
import { parseFormula } from "../lib/formula";
import { DIAMOND_PATH, HAZARD_GLYPHS, HAZARD_INFO, HAZARD_RED } from "../lib/hazards";

export function Formula({ value, className }: { value: string; className?: string }) {
  return (
    <span className={className}>
      {parseFormula(value).map((part, i) => (part.sub ? <sub key={i}>{part.text}</sub> : <span key={i}>{part.text}</span>))}
    </span>
  );
}

export function HazardIcon({ hazard, size = 36 }: { hazard: Hazard; size?: number }) {
  const glyph = HAZARD_GLYPHS[hazard];
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={HAZARD_INFO[hazard].label}>
      <path d={DIAMOND_PATH} fill="#fff" stroke={HAZARD_RED} strokeWidth={7} strokeLinejoin="round" />
      <g transform="translate(50 50) scale(0.62) translate(-50 -50)">
        {glyph.fill.map((d, i) => (
          <path key={i} d={d} fill="#111" />
        ))}
        {glyph.holes?.map((d, i) => <path key={`h${i}`} d={d} fill="#fff" />)}
      </g>
    </svg>
  );
}

export function Logo({ compact = false, light = false }: { compact?: boolean; light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg viewBox="0 0 64 64" className={compact ? "size-7" : "size-9"} aria-hidden>
        <rect width="64" height="64" rx="14" fill="#0b2545" />
        <path d="M25 10h14v4h-2.5v13.5L49 50c1.8 3.4-.6 6-4.2 6H19.2c-3.6 0-6-2.6-4.2-6l12.5-22.5V14H25z" fill="#5fd4cf" />
        <path d="M20 44c5-3 9 2 14-1 3-2 6-1 8 0l3 6c1 2-.4 3.5-2.4 3.5H21.4c-2 0-3.4-1.5-2.4-3.5z" fill="#0b2545" />
      </svg>
      <span className={`font-display font-bold tracking-tight ${compact ? "text-lg" : "text-xl"} ${light ? "text-white" : "text-navy"}`}>
        Labmate<span className="text-teal">.lk</span>
      </span>
    </span>
  );
}

export function IconButton({ label, onClick, children, className = "" }: { label: string; onClick: () => void; children: ReactNode; className?: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`grid size-10 shrink-0 place-items-center rounded-full text-ink transition hover:bg-ink/8 active:scale-95 ${className}`}
    >
      {children}
    </button>
  );
}

export function Tag({ children, tone = "teal" }: { children: ReactNode; tone?: "teal" | "navy" | "amber" | "slate" }) {
  const tones = {
    teal: "bg-teal/12 text-[#087a7a]",
    navy: "bg-navy/8 text-navy",
    amber: "bg-amber-100 text-amber-800",
    slate: "bg-slate-100 text-slate-600",
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}
