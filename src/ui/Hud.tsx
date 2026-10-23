import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Beaker, CircleHelp, DoorOpen, FlaskConical, LayoutGrid, MessageCircle, Microscope, ShieldCheck, TestTubes, X } from "lucide-react";
import { zones, type ZoneId } from "../data";
import { joystick } from "../lib/input";
import { useLab } from "../state/store";
import { Logo } from "./bits";

const ZONE_ICONS: Record<ZoneId, typeof Beaker> = {
  entrance: DoorOpen,
  reception: MessageCircle,
  chemicals: FlaskConical,
  glassware: TestTubes,
  instruments: Microscope,
  safety: ShieldCheck,
  bench: Beaker,
};

const isTouch = () => typeof matchMedia !== "undefined" && matchMedia("(pointer: coarse)").matches;

/** Shown once per visit; hiding it behind a panel counts as having seen it. */
let hintSeen = false;

function FirstHint() {
  const [show, setShow] = useState(!hintSeen);
  useEffect(() => {
    const id = setTimeout(() => setShow(false), 11000);
    return () => {
      clearTimeout(id);
      hintSeen = true;
    };
  }, []);
  if (!show) return null;
  const touch = isTouch();
  return (
    <div className="panel animate-rise pointer-events-auto fixed left-1/2 top-20 z-20 flex w-[min(92vw,34rem)] -translate-x-1/2 items-start gap-3 rounded-2xl px-4 py-3 text-sm">
      <div className="flex-1 leading-relaxed text-slate-700">
        <span className="font-semibold text-ink">Welcome in!</span>{" "}
        {touch
          ? "Drag to look around, use the joystick to walk, and tap anything to inspect it."
          : "Drag to look around, walk with WASD or the arrow keys, click the floor to walk there, and click anything to inspect it."}{" "}
        The sales agent at the desk can help you.
      </div>
      <button type="button" aria-label="Dismiss" onClick={() => setShow(false)} className="grid size-7 place-items-center rounded-full text-slate-500 hover:bg-slate-100">
        <X className="size-4" />
      </button>
    </div>
  );
}

export function Hud() {
  const mode = useLab((s) => s.mode);
  const zone = useLab((s) => s.zone);
  const agentOpen = useLab((s) => s.agentOpen);
  const inspect = useLab((s) => s.inspect);
  const travelTo = useLab((s) => s.travelTo);
  const setHelp = useLab((s) => s.setHelp);
  const setView = useLab((s) => s.setView);
  if (mode !== "explore") return null;
  const current = zones.find((z) => z.id === zone);
  return (
    <>
      <header className="pointer-events-none fixed inset-x-0 top-0 z-20 flex items-start justify-between gap-2 p-3 sm:p-4">
        <div className="panel pointer-events-auto flex items-center gap-3 rounded-full py-1.5 pl-2 pr-4">
          <Logo compact />
          <span className="hidden h-5 w-px bg-line sm:block" />
          <span className="hidden text-sm font-semibold text-slate-600 sm:block">{current?.label}</span>
        </div>
        <div className="panel pointer-events-auto flex items-center gap-1 rounded-full p-1">
          <button
            type="button"
            onClick={() => travelTo("agent")}
            className="inline-flex items-center gap-2 rounded-full bg-teal px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-[#0b8f8f] active:scale-95"
          >
            <MessageCircle className="size-4" />
            <span className="hidden sm:inline">Talk to sales</span>
          </button>
          <button type="button" aria-label="Help and controls" title="Help and controls" onClick={() => setHelp(true)} className="grid size-9 place-items-center rounded-full text-ink hover:bg-ink/8">
            <CircleHelp className="size-5" />
          </button>
          <button type="button" aria-label="Switch to the 2D guide" title="Switch to the 2D guide" onClick={() => setView("2d")} className="grid size-9 place-items-center rounded-full text-ink hover:bg-ink/8">
            <LayoutGrid className="size-5" />
          </button>
        </div>
      </header>

      {!agentOpen && !inspect && (
        <nav aria-label="Go to an area of the lab" className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <ul className="panel scrollbar-thin pointer-events-auto flex max-w-full gap-1 overflow-x-auto rounded-full p-1">
            {zones
              .filter((z) => z.id !== "entrance")
              .map((z) => {
                const Icon = ZONE_ICONS[z.id];
                const active = z.id === zone;
                return (
                  <li key={z.id}>
                    <button
                      type="button"
                      onClick={() => travelTo(z.id === "reception" ? "agent" : z.id)}
                      title={z.blurb}
                      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold transition sm:text-sm ${
                        active ? "bg-navy text-white" : z.id === "bench" ? "text-[#087a7a] hover:bg-teal/10" : "text-slate-600 hover:bg-ink/6 hover:text-ink"
                      }`}
                    >
                      <Icon className="size-4" />
                      {z.label}
                    </button>
                  </li>
                );
              })}
          </ul>
        </nav>
      )}
      {!agentOpen && !inspect && <FirstHint />}
      {isTouch() && !agentOpen && !inspect && <Joystick />}
    </>
  );
}

function Joystick() {
  const base = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const active = useRef<number | null>(null);
  const R = 44;
  const update = (e: ReactPointerEvent) => {
    const rect = base.current!.getBoundingClientRect();
    let dx = e.clientX - (rect.left + rect.width / 2);
    let dy = e.clientY - (rect.top + rect.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > R) {
      dx = (dx / len) * R;
      dy = (dy / len) * R;
    }
    setKnob({ x: dx, y: dy });
    joystick.x = dx / R;
    joystick.y = dy / R;
  };
  const end = () => {
    active.current = null;
    setKnob({ x: 0, y: 0 });
    joystick.x = 0;
    joystick.y = 0;
  };
  useEffect(() => end, []);
  return (
    <div
      ref={base}
      role="application"
      aria-label="Walk joystick"
      className="fixed bottom-24 left-5 z-20 size-32 touch-none rounded-full border border-white/70 bg-white/35 backdrop-blur-md"
      onPointerDown={(e) => {
        active.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        update(e);
      }}
      onPointerMove={(e) => active.current === e.pointerId && update(e)}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <div
        className="absolute left-1/2 top-1/2 size-14 rounded-full bg-white shadow-lg"
        style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
      />
    </div>
  );
}

/** Label that follows the pointer over interactive objects, and sets the cursor. */
export function Tooltip() {
  const hover = useLab((s) => s.hover);
  const mode = useLab((s) => s.mode);
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (el.current) el.current.style.transform = `translate(${e.clientX + 16}px, ${e.clientY + 18}px)`;
    };
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, []);
  useEffect(() => {
    document.body.style.cursor = hover ? "pointer" : "";
  }, [hover]);
  return (
    <div ref={el} className="pointer-events-none fixed left-0 top-0 z-50" aria-hidden>
      {hover && !isTouch() && (
        <div className="rounded-lg bg-navy/95 px-2.5 py-1.5 text-xs font-semibold text-white shadow-lg">
          {hover}
          <span className="ml-1.5 font-normal text-teal-light">{mode === "bench" ? "Click to use" : hover.startsWith("Sales") ? "" : "Click to inspect"}</span>
        </div>
      )}
    </div>
  );
}

export function HelpDialog() {
  const open = useLab((s) => s.helpOpen);
  const setHelp = useLab((s) => s.setHelp);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setHelp(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setHelp]);
  if (!open) return null;
  const rows: [string, string][] = [
    ["Look around", "Drag with the mouse or a finger"],
    ["Walk", "W A S D, the arrow keys, or the on-screen joystick"],
    ["Turn", "Left and right arrow keys, or Q and E"],
    ["Walk somewhere", "Click or tap the floor"],
    ["Run", "Hold Shift"],
    ["Inspect", "Click or tap any chemical, instrument or piece of glassware"],
    ["Experiment", "Go to the experiment bench, pick a reagent, then a vessel"],
    ["Close panels", "Esc"],
  ];
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-navy/30 p-4" onClick={() => setHelp(false)}>
      <div role="dialog" aria-label="Controls" className="panel animate-rise w-full max-w-md rounded-3xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center">
          <h2 className="flex-1 font-display text-2xl font-bold text-navy">How to explore</h2>
          <button type="button" aria-label="Close" onClick={() => setHelp(false)} className="grid size-9 place-items-center rounded-full hover:bg-slate-100">
            <X className="size-5" />
          </button>
        </div>
        <dl className="mt-4 divide-y divide-line">
          {rows.map(([k, v]) => (
            <div key={k} className="flex gap-4 py-2.5 text-sm">
              <dt className="w-32 shrink-0 font-semibold text-ink">{k}</dt>
              <dd className="text-slate-600">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
