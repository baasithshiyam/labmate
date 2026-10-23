import { useEffect, useState } from "react";
import { ArrowRight, LayoutGrid } from "lucide-react";
import { company } from "../data";
import { useLab } from "../state/store";
import { Logo } from "./bits";

function FlaskLoader() {
  return (
    <div className="relative size-28">
      <svg viewBox="0 0 100 100" className="size-full" aria-hidden>
        <defs>
          <clipPath id="flask-clip">
            <path d="M40 10h20v6h-3v24l23 42c3 6-1 11-7 11H23c-6 0-10-5-7-11l23-42V16h-3z" />
          </clipPath>
        </defs>
        <g clipPath="url(#flask-clip)">
          <rect width="100" height="100" fill="rgba(255,255,255,0.08)" />
          <path className="origin-center" d="M0 64 C15 58 30 70 50 64 S85 58 100 64 V100 H0Z" fill="#5fd4cf">
            <animate attributeName="d" dur="2.4s" repeatCount="indefinite" values="M0 64 C15 58 30 70 50 64 S85 58 100 64 V100 H0Z;M0 64 C15 70 30 58 50 64 S85 70 100 64 V100 H0Z;M0 64 C15 58 30 70 50 64 S85 58 100 64 V100 H0Z" />
          </path>
        </g>
        <path d="M40 10h20v6h-3v24l23 42c3 6-1 11-7 11H23c-6 0-10-5-7-11l23-42V16h-3z" fill="none" stroke="white" strokeWidth="3" strokeLinejoin="round" />
      </svg>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="absolute size-2 rounded-full bg-white/80"
          style={{ left: `${40 + i * 9}%`, bottom: "16%", animation: `bubble-up 1.8s ${i * 0.5}s ease-in infinite` }}
        />
      ))}
    </div>
  );
}

export function LoadingScreen() {
  const ready = useLab((s) => s.ready);
  const progress = useLab((s) => s.progress);
  const label = useLab((s) => s.progressLabel);
  const [shown, setShown] = useState(0);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (gone) return;
    let frame = 0;
    const tick = () => {
      setShown((v) => Math.min(1, v + (progress - v) * 0.08 + 0.0015));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [progress, gone]);

  useEffect(() => {
    if (!ready) {
      setGone(false);
      return;
    }
    const id = setTimeout(() => setGone(true), 700);
    return () => clearTimeout(id);
  }, [ready]);

  if (gone) return null;
  const pct = Math.min(100, Math.round(Math.min(shown, progress) * 100));
  return (
    <div
      className={`fixed inset-0 z-[60] flex flex-col items-center justify-center bg-gradient-to-br from-navy via-navy-2 to-[#0b4f6c] text-white transition-opacity duration-700 ${ready ? "pointer-events-none opacity-0" : "opacity-100"}`}
      role="status"
      aria-live="polite"
    >
      <FlaskLoader />
      <div className="mt-6">
        <Logo light />
      </div>
      <p className="mt-2 text-sm text-white/70">Virtual Laboratory</p>
      <div className="mt-8 h-1.5 w-64 overflow-hidden rounded-full bg-white/15">
        <div className="h-full rounded-full bg-teal-light transition-[width] duration-300" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-3 text-xs font-medium text-white/70">
        {label}… {pct}%
      </p>
    </div>
  );
}

export function Intro() {
  const mode = useLab((s) => s.mode);
  const ready = useLab((s) => s.ready);
  const enter = useLab((s) => s.enterLab);
  const setView = useLab((s) => s.setView);
  useEffect(() => {
    if (mode !== "intro" || !ready) return;
    const onKey = (e: KeyboardEvent) => e.key === "Enter" && enter();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, ready, enter]);
  if (mode !== "intro") return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex items-end bg-gradient-to-t from-navy/85 via-navy/35 to-transparent sm:items-center sm:bg-gradient-to-r sm:from-navy/85 sm:via-navy/45 sm:to-transparent">
      <div className="pointer-events-auto w-full max-w-xl p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-white sm:p-12">
        <div className="animate-rise">
          <Logo light />
        </div>
        <h1 className="animate-rise mt-5 font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl" style={{ animationDelay: "80ms" }}>
          Step inside the lab.
        </h1>
        <p className="animate-rise mt-4 max-w-md text-base leading-relaxed text-white/85 sm:text-lg" style={{ animationDelay: "160ms" }}>
          Walk through our virtual laboratory, inspect chemicals, glassware and instruments, try safe simulated experiments, and talk to
          our sales agent.
        </p>
        <div className="animate-rise mt-7 flex flex-wrap items-center gap-3" style={{ animationDelay: "240ms" }}>
          <button
            type="button"
            onClick={enter}
            disabled={!ready}
            className="inline-flex items-center gap-2 rounded-full bg-teal px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-teal/30 transition hover:bg-[#0b8f8f] active:scale-[0.98] disabled:opacity-60"
          >
            Enter the lab <ArrowRight className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => setView("2d")}
            className="inline-flex items-center gap-2 rounded-full border border-white/30 px-5 py-3.5 text-sm font-semibold text-white/90 transition hover:bg-white/10"
          >
            <LayoutGrid className="size-4" /> Simple 2D view
          </button>
        </div>
        <p className="animate-rise mt-8 text-xs text-white/60" style={{ animationDelay: "320ms" }}>
          {company.name} · {company.phone} · {company.email}
        </p>
      </div>
    </div>
  );
}
