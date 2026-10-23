import { useEffect, useMemo, useState } from "react";
import { BookOpen, Check, ChevronDown, Eraser, FlaskConical, ListChecks, LogOut, RotateCcw, ScrollText, Sparkles, X } from "lucide-react";
import { EXPLANATIONS, describePH, universalIndicatorColor, type FeatureId } from "../chem/engine";
import { chemicalById, experiments, pourVolumes, rackOrder, shortNames, vesselById, vessels, type PourAmount } from "../data";
import { currentGuideStep, useBench, useLab } from "../state/store";
import { Formula } from "./bits";

const AMOUNTS: { id: PourAmount; label: string }[] = [
  { id: "drop", label: "Drop" },
  { id: "splash", label: "Splash" },
  { id: "pour", label: "Pour" },
];

const amountText = (a: PourAmount) => (a === "drop" ? "a drop" : a === "splash" ? "a splash (5 mL)" : "a pour (20 mL)");
const REAGENTS = rackOrder.flat();

export const SIMULATION_NOTE = "Simulation for learning only. Real experiments need training, supervision and protective equipment.";

export function AmountPicker() {
  const amount = useBench((s) => s.amount);
  const setAmount = useBench((s) => s.setAmount);
  return (
    <div role="radiogroup" aria-label="Amount to add" className="inline-flex rounded-full bg-mist p-1">
      {AMOUNTS.map((a) => (
        <button
          key={a.id}
          type="button"
          role="radio"
          aria-checked={amount === a.id}
          onClick={() => setAmount(a.id)}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition sm:px-3.5 ${amount === a.id ? "bg-white text-ink shadow-sm" : "text-slate-500 hover:text-ink"}`}
        >
          {a.label} <span className="font-medium text-slate-400">{pourVolumes[a.id]} mL</span>
        </button>
      ))}
    </div>
  );
}

export function ReagentTray({ layout = "row" }: { layout?: "row" | "grid" }) {
  const selected = useBench((s) => s.selectedReagent);
  const pouring = useBench((s) => !!s.pour);
  const guide = useBench((s) => s.guide);
  const step = guide ? currentGuideStep() : null;
  const select = useBench((s) => s.selectReagent);
  return (
    <div
      className={
        layout === "row"
          ? "scrollbar-thin flex gap-1.5 overflow-x-auto pb-1"
          : "grid grid-cols-3 gap-1.5 sm:grid-cols-4"
      }
    >
      {REAGENTS.map((id) => {
        const chemical = chemicalById.get(id)!;
        const active = selected === id;
        const hinted = step?.reagent === id && !active;
        return (
          <button
            key={id}
            type="button"
            disabled={pouring}
            onClick={() => select(id)}
            aria-pressed={active}
            title={chemical.name}
            className={`group flex shrink-0 items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition disabled:opacity-50 ${
              active ? "border-teal bg-teal/10 ring-2 ring-teal/30" : hinted ? "border-amber-400 bg-amber-50" : "border-line bg-white hover:border-teal/60"
            } ${layout === "row" ? "min-w-[7.5rem]" : ""}`}
          >
            <span
              className="size-4 shrink-0 rounded-full border border-black/10"
              style={{ background: id === "universal" ? "conic-gradient(#ee1c25,#f8c611,#4db849,#0ab8b6,#3853a4,#63459d,#ee1c25)" : chemical.color }}
            />
            <span className="min-w-0">
              <Formula value={shortNames[id]} className="block truncate text-xs font-bold text-ink" />
              <span className="block truncate text-[10px] text-slate-500">{chemical.name.replace(/ \(.*\)/, "")}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function VesselTargets() {
  const selected = useBench((s) => s.selectedReagent);
  const pouring = useBench((s) => !!s.pour);
  const click = useBench((s) => s.clickVessel);
  const step = currentGuideStep();
  if (!selected) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs font-semibold text-slate-500">Add to:</span>
      {vessels.map((v) => (
        <button
          key={v.id}
          type="button"
          disabled={pouring}
          onClick={() => click(v.id)}
          className={`rounded-full border px-3 py-1 text-xs font-semibold transition disabled:opacity-50 ${
            step?.vessel === v.id && step.reagent === selected ? "border-amber-400 bg-amber-50 text-amber-800" : "border-line bg-white text-ink hover:border-teal"
          }`}
        >
          {v.name}
        </button>
      ))}
    </div>
  );
}

export function BenchHint() {
  const selected = useBench((s) => s.selectedReagent);
  const amount = useBench((s) => s.amount);
  const pour = useBench((s) => s.pour);
  const guide = useBench((s) => s.guide);
  const view = useLab((s) => s.view);
  const step = guide && !guide.done ? currentGuideStep() : null;
  const experiment = guide ? experiments.find((e) => e.id === guide.id) : null;
  let text: string;
  if (pour) text = `Adding ${amountText(pour.amount)} of ${chemicalById.get(pour.reagent)!.name.toLowerCase()}…`;
  else if (step && experiment)
    text = `Step ${guide!.step + 1} of ${experiment.steps.length}: add ${amountText(step.amount)} of ${chemicalById.get(step.reagent)!.name.toLowerCase()} to ${vesselById.get(step.vessel)!.name.toLowerCase()}.`;
  else if (selected)
    text = `${chemicalById.get(selected)!.name} selected. ${view === "3d" ? "Click" : "Choose"} a vessel to add ${amountText(amount)}.`;
  else text = view === "3d" ? "Pick a reagent bottle, then click a beaker, flask or test tube." : "Pick a reagent, then choose a vessel.";
  return (
    <p className="text-sm font-medium text-ink" aria-live="polite">
      {text}
    </p>
  );
}

const pHGradient = `linear-gradient(90deg, ${Array.from({ length: 15 }, (_, i) => universalIndicatorColor(i)).join(", ")})`;

export function VesselCard({ compact = false }: { compact?: boolean }) {
  const focus = useBench((s) => s.focus);
  const vessel = useBench((s) => (focus ? s.vessels[focus] : null));
  const empty = useBench((s) => s.empty);
  if (!focus || !vessel) {
    return (
      <div className="rounded-2xl border border-dashed border-line p-4 text-sm text-slate-500">
        Select a beaker, flask or test tube to see its contents and a simulated pH reading.
      </div>
    );
  }
  const info = vesselById.get(focus)!;
  const a = vessel.analysis;
  const observations: { title: string; text: string }[] = [
    ...a.precipitates.map((p) => EXPLANATIONS[p.id]),
    ...a.features.map((f: FeatureId) => EXPLANATIONS[f]),
  ];
  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <div className="flex items-center gap-2">
        <span className="size-3.5 rounded-full border border-black/10" style={{ background: a.volume > 0 ? a.color : "transparent" }} />
        <h3 className="flex-1 font-display text-lg font-bold text-navy">{info.name}</h3>
        <button
          type="button"
          onClick={() => empty(focus)}
          disabled={a.volume === 0}
          className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:border-teal hover:text-ink disabled:opacity-40"
        >
          <Eraser className="size-3.5" /> Empty
        </button>
      </div>
      <div className="mt-3">
        <div className="flex justify-between text-xs text-slate-500">
          <span>Volume</span>
          <span className="font-semibold text-ink">
            {a.volume.toFixed(a.volume < 10 ? 1 : 0)} / {info.capacity} mL
          </span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-mist">
          <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${Math.min(100, (a.volume / info.capacity) * 100)}%` }} />
        </div>
      </div>
      {a.volume > 0 && (
        <>
          <div className="mt-3">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Simulated pH meter</span>
              <span className="font-semibold text-ink">
                pH {a.pH.toFixed(1)} · {describePH(a.pH)}
              </span>
            </div>
            <div className="relative mt-1 h-2 rounded-full" style={{ background: pHGradient }}>
              <span className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-ink shadow" style={{ left: `${(a.pH / 14) * 100}%` }} />
            </div>
          </div>
          <ul className="mt-3 flex flex-wrap gap-1">
            {Object.entries(vessel.contents).map(([id, mL]) => (
              <li key={id} className="rounded-full bg-mist px-2 py-0.5 text-[11px] font-medium text-slate-600">
                {chemicalById.get(id)!.name.replace(/ \(.*\)/, "")} · {mL < 10 ? mL.toFixed(1) : Math.round(mL)} mL
              </li>
            ))}
          </ul>
          {observations.length > 0 && (
            <ul className="mt-3 space-y-2">
              {observations.slice(0, compact ? 1 : 3).map((o) => (
                <li key={o.title} className="rounded-xl bg-teal/8 px-3 py-2 text-xs leading-relaxed text-slate-700">
                  <span className="font-semibold text-[#087a7a]">{o.title}.</span> {o.text}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

export function GuideCard({ collapsible = false, compact = false }: { collapsible?: boolean; compact?: boolean }) {
  const guide = useBench((s) => s.guide);
  const start = useBench((s) => s.startGuide);
  const stop = useBench((s) => s.stopGuide);
  const [open, setOpen] = useState(!collapsible);
  const [allSteps, setAllSteps] = useState(!compact);
  const experiment = guide ? experiments.find((e) => e.id === guide.id) : null;

  if (guide && experiment) {
    return (
      <div className="rounded-2xl border border-line bg-white p-4">
        <div className="flex items-start gap-2">
          <Sparkles className="mt-0.5 size-4 text-amber-500" />
          <div className="flex-1">
            <h3 className="font-display text-lg font-bold leading-tight text-navy">{experiment.title}</h3>
            <p className="text-xs text-slate-500">{experiment.goal}</p>
          </div>
          <button type="button" onClick={stop} aria-label="Stop guided experiment" className="grid size-8 place-items-center rounded-full text-slate-500 hover:bg-slate-100">
            <X className="size-4" />
          </button>
        </div>
        {compact && (
          <div className="mt-3 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-mist">
              <div className="h-full rounded-full bg-teal transition-all" style={{ width: `${(guide.step / experiment.steps.length) * 100}%` }} />
            </div>
            <button type="button" onClick={() => setAllSteps((v) => !v)} className="text-[11px] font-semibold text-[#087a7a] hover:underline">
              {allSteps ? "Current step" : "All steps"}
            </button>
          </div>
        )}
        <ol className="mt-3 space-y-1.5">
          {experiment.steps.map((step, i) => {
            const done = i < guide.step;
            const current = i === guide.step && !guide.done;
            if (!allSteps && !current) return null;
            return (
              <li key={i} className={`flex items-start gap-2 rounded-lg px-2 py-1.5 text-xs ${current ? "bg-amber-50 text-amber-900" : done ? "text-slate-400" : "text-slate-600"}`}>
                <span className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded-full text-[10px] font-bold ${done ? "bg-teal text-white" : current ? "bg-amber-400 text-white" : "bg-mist text-slate-500"}`}>
                  {done ? <Check className="size-3" /> : i + 1}
                </span>
                <span className={done ? "line-through" : ""}>
                  Add {amountText(step.amount)} of {chemicalById.get(step.reagent)!.name.toLowerCase()} to {vesselById.get(step.vessel)!.name.toLowerCase()}
                </span>
              </li>
            );
          })}
        </ol>
        {guide.done && (
          <div className="animate-rise mt-3 rounded-xl bg-teal/10 p-3 text-xs leading-relaxed text-slate-700">
            <div className="mb-1 flex items-center gap-1.5 font-semibold text-[#087a7a]">
              <BookOpen className="size-3.5" /> Why it happens
            </div>
            {experiment.explanation}
            {experiment.note && <p className="mt-2 font-medium text-amber-800">{experiment.note}</p>}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <button type="button" className="flex w-full items-center gap-2 text-left" onClick={() => collapsible && setOpen((o) => !o)} aria-expanded={open}>
        <ListChecks className="size-4 text-teal" />
        <h3 className="flex-1 font-display text-lg font-bold text-navy">Guided experiments</h3>
        {collapsible && <ChevronDown className={`size-4 transition ${open ? "rotate-180" : ""}`} />}
      </button>
      {open && (
        <ul className="mt-2 space-y-1">
          {experiments.map((e) => (
            <li key={e.id}>
              <button type="button" onClick={() => start(e.id)} className="w-full rounded-xl px-2.5 py-2 text-left transition hover:bg-mist">
                <div className="text-sm font-semibold text-ink">{e.title}</div>
                <div className="text-xs text-slate-500">{e.goal}</div>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && <p className="mt-2 text-xs text-slate-500">Or mix anything you like: every combination is simulated.</p>}
    </div>
  );
}

const TONE = {
  action: "text-slate-500",
  observation: "text-ink",
  warning: "text-amber-700",
  success: "text-[#087a7a]",
};

export function BenchLog({ limit = 8 }: { limit?: number }) {
  const log = useBench((s) => s.log);
  const reset = useBench((s) => s.resetAll);
  const recent = useMemo(() => log.slice(-limit).reverse(), [log, limit]);
  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <div className="flex items-center gap-2">
        <ScrollText className="size-4 text-teal" />
        <h3 className="flex-1 font-display text-lg font-bold text-navy">Lab notebook</h3>
        <button type="button" onClick={reset} className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-xs font-semibold text-slate-600 hover:border-teal hover:text-ink">
          <RotateCcw className="size-3.5" /> Reset bench
        </button>
      </div>
      {recent.length === 0 ? (
        <p className="mt-2 text-xs text-slate-500">What you add and observe will be written here.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {recent.map((e) => (
            <li key={e.id} className={`text-xs leading-relaxed ${TONE[e.tone]}`}>
              <span className="font-semibold">{e.title}</span>
              {e.text && <span className="text-slate-600"> — {e.text}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NotebookToggle() {
  const count = useBench((s) => s.log.length);
  const [open, setOpen] = useState(false);
  return (
    <div className="pointer-events-auto flex min-h-0 flex-col items-end gap-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="panel inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold text-ink hover:bg-white"
      >
        <ScrollText className="size-4 text-teal" /> Lab notebook
        {count > 0 && <span className="rounded-full bg-teal px-1.5 text-[11px] text-white">{count}</span>}
        <ChevronDown className={`size-4 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="scrollbar-thin min-h-0 w-full overflow-y-auto rounded-2xl shadow-xl">
          <BenchLog limit={8} />
        </div>
      )}
    </div>
  );
}

/** The bench controls laid over the 3D view. */
export function BenchPanel() {
  const mode = useLab((s) => s.mode);
  const leave = useLab((s) => s.leaveBench);
  const [tab, setTab] = useState<"reagents" | "vessel" | "guide" | "log">("reagents");
  const focus = useBench((s) => s.focus);
  const [sheetOpen, setSheetOpen] = useState(true);

  useEffect(() => {
    if (focus) setTab((t) => (t === "reagents" ? t : "vessel"));
  }, [focus]);

  if (mode !== "bench") return null;

  const tabs = [
    { id: "reagents", label: "Reagents", icon: FlaskConical },
    { id: "vessel", label: "Vessel", icon: Eraser },
    { id: "guide", label: "Guides", icon: ListChecks },
    { id: "log", label: "Notebook", icon: ScrollText },
  ] as const;

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-0 z-20 flex items-start justify-between gap-2 p-3 sm:p-4">
        <button
          type="button"
          onClick={leave}
          className="panel pointer-events-auto inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-white"
        >
          <LogOut className="size-4" /> Leave bench
        </button>
        <div className="panel pointer-events-auto hidden max-w-md rounded-2xl px-4 py-2 text-center md:block">
          <div className="font-display text-base font-bold text-navy">Experiment bench</div>
          <div className="text-[11px] text-slate-500">{SIMULATION_NOTE}</div>
        </div>
        <div className="w-[8.5rem] max-md:hidden" />
      </div>

      {/* Desktop: short cards along the top edge and a reagent tray along the bottom, leaving the bench in view */}
      <div className="scrollbar-thin fixed left-4 top-20 z-20 hidden max-h-[44vh] w-72 overflow-y-auto rounded-2xl shadow-xl lg:block">
        <GuideCard collapsible compact />
      </div>
      <div className="pointer-events-none fixed right-4 top-20 z-20 hidden max-h-[calc(100vh-15rem)] w-80 flex-col gap-2 lg:flex">
        {focus && (
          <div className="scrollbar-thin pointer-events-auto min-h-0 shrink overflow-y-auto rounded-2xl shadow-xl">
            <VesselCard compact />
          </div>
        )}
        <NotebookToggle />
      </div>
      <div className="panel fixed inset-x-4 bottom-4 z-20 hidden rounded-3xl p-3 lg:block">
        <div className="flex flex-wrap items-center gap-3 px-1 pb-2">
          <AmountPicker />
          <div className="min-w-0 flex-1">
            <BenchHint />
          </div>
          <VesselTargets />
        </div>
        <ReagentTray />
      </div>

      {/* Phones and tablets: one bottom sheet with tabs */}
      <div className="panel fixed inset-x-0 bottom-0 z-20 flex max-h-[48vh] flex-col rounded-t-3xl lg:hidden">
        <div className="flex items-center gap-1 border-b border-line px-2 pt-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTab(t.id);
                setSheetOpen(true);
              }}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-t-xl px-2 py-2 text-xs font-semibold transition ${tab === t.id && sheetOpen ? "bg-white text-ink" : "text-slate-500"}`}
            >
              <t.icon className="size-3.5" /> {t.label}
            </button>
          ))}
          <button type="button" aria-label={sheetOpen ? "Collapse" : "Expand"} onClick={() => setSheetOpen((o) => !o)} className="grid size-8 place-items-center text-slate-500">
            <ChevronDown className={`size-4 transition ${sheetOpen ? "" : "rotate-180"}`} />
          </button>
        </div>
        <div className="px-3 pt-2 pb-1">
          <BenchHint />
        </div>
        {sheetOpen && (
          <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1">
            {tab === "reagents" && (
              <div className="space-y-2">
                <AmountPicker />
                <VesselTargets />
                <ReagentTray layout="grid" />
              </div>
            )}
            {tab === "vessel" && <VesselCard />}
            {tab === "guide" && <GuideCard />}
            {tab === "log" && <BenchLog />}
          </div>
        )}
      </div>
    </>
  );
}
