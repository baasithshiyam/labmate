import { create } from "zustand";
import { analyze, diff, EMPTY_ANALYSIS, EXPLANATIONS, describePH, type Analysis, type BenchEvent, type Contents } from "../chem/engine";
import {
  chemicalById,
  experiments,
  pourVolumes,
  vesselById,
  vessels,
  type PourAmount,
  type VesselId,
  type ZoneId,
} from "../data";

export type Mode = "intro" | "explore" | "bench";
export type Inspect = { type: "item" | "chemical"; id: string } | null;
export type TravelTarget = ZoneId | "agent";

interface LabState {
  ready: boolean;
  progress: number;
  progressLabel: string;
  view: "3d" | "2d";
  quality: "high" | "low";
  mode: Mode;
  zone: ZoneId;
  inspect: Inspect;
  agentOpen: boolean;
  helpOpen: boolean;
  hover: string | null;
  travel: { target: TravelTarget | { x: number; z: number }; nonce: number } | null;
  /** performance.now() in seconds until which the agent's mouth animates. */
  talkUntil: number;
  setProgress: (progress: number, label: string) => void;
  walkTo: (x: number, z: number) => void;
  talk: (seconds: number) => void;
  setReady: () => void;
  setView: (view: "3d" | "2d") => void;
  setQuality: (quality: "high" | "low") => void;
  enterLab: () => void;
  setZone: (zone: ZoneId) => void;
  travelTo: (target: TravelTarget) => void;
  openInspect: (inspect: Inspect) => void;
  closeInspect: () => void;
  openAgent: () => void;
  closeAgent: () => void;
  setHelp: (open: boolean) => void;
  setHover: (label: string | null) => void;
  leaveBench: () => void;
}

let travelNonce = 0;

export const useLab = create<LabState>((set, get) => ({
  ready: false,
  progress: 0,
  progressLabel: "Preparing the lab",
  view: "3d",
  quality: "high",
  mode: "intro",
  zone: "entrance",
  inspect: null,
  agentOpen: false,
  helpOpen: false,
  hover: null,
  travel: null,
  talkUntil: 0,
  setProgress: (progress, progressLabel) => set((s) => ({ progress: Math.max(s.progress, progress), progressLabel })),
  walkTo: (x, z) => {
    if (get().mode !== "explore") return;
    set({ travel: { target: { x, z }, nonce: ++travelNonce } });
  },
  talk: (seconds) => set({ talkUntil: performance.now() / 1000 + seconds }),
  setReady: () => set({ ready: true, progress: 1, progressLabel: "Ready" }),
  setView: (view) => {
    if (view === get().view) return;
    // The 3D lab remounts from the entrance, so it reloads and the visit starts again.
    if (view === "3d") set({ view, hover: null, mode: "intro", ready: false, progress: 0, inspect: null, agentOpen: false, zone: "entrance" });
    else set({ view, hover: null, inspect: null, agentOpen: false, mode: "explore" });
  },
  setQuality: (quality) => set({ quality }),
  enterLab: () => {
    if (get().mode !== "intro") return;
    set({ mode: "explore", travel: { target: "entrance", nonce: ++travelNonce } });
  },
  setZone: (zone) => {
    if (get().zone !== zone) set({ zone });
  },
  travelTo: (target) => {
    const mode: Mode = target === "bench" ? "bench" : "explore";
    set({
      mode,
      inspect: null,
      agentOpen: target === "agent",
      hover: null,
      travel: { target, nonce: ++travelNonce },
      zone: target === "agent" ? "reception" : target,
    });
  },
  openInspect: (inspect) => set({ inspect, agentOpen: false, hover: null }),
  closeInspect: () => set({ inspect: null }),
  openAgent: () => get().travelTo("agent"),
  closeAgent: () => set({ agentOpen: false }),
  setHelp: (helpOpen) => set({ helpOpen }),
  setHover: (hover) => {
    if (get().hover !== hover) set({ hover });
  },
  leaveBench: () => {
    useBench.getState().selectReagent(null);
    set({ mode: "explore", travel: { target: "bench", nonce: ++travelNonce } });
  },
}));

export interface VesselFx {
  gasAt: number;
  gasAmount: number;
  foamAt: number;
  foamAmount: number;
  precipitateAt: number;
  changedAt: number;
}

export interface VesselState {
  contents: Contents;
  analysis: Analysis;
  fx: VesselFx;
}

export interface LogEntry {
  id: number;
  vessel: VesselId | null;
  tone: "action" | "observation" | "warning" | "success";
  title: string;
  text?: string;
}

export interface Pour {
  reagent: string;
  vessel: VesselId;
  amount: PourAmount;
  start: number;
}

interface BenchState {
  vessels: Record<VesselId, VesselState>;
  selectedReagent: string | null;
  amount: PourAmount;
  focus: VesselId | null;
  pour: Pour | null;
  animate: boolean;
  log: LogEntry[];
  guide: { id: string; step: number; done: boolean } | null;
  selectReagent: (id: string | null) => void;
  setAmount: (amount: PourAmount) => void;
  setFocus: (vessel: VesselId | null) => void;
  setAnimate: (animate: boolean) => void;
  /** Click on a vessel: pours the selected reagent, or focuses the vessel when nothing is selected. */
  clickVessel: (vessel: VesselId) => void;
  commitPour: () => void;
  finishPour: () => void;
  empty: (vessel: VesselId) => void;
  resetAll: () => void;
  startGuide: (id: string) => void;
  stopGuide: () => void;
}

const now = () => performance.now() / 1000;

const freshFx = (): VesselFx => ({ gasAt: -1e9, gasAmount: 0, foamAt: -1e9, foamAmount: 0, precipitateAt: -1e9, changedAt: -1e9 });

const freshVessels = () =>
  Object.fromEntries(vessels.map((v) => [v.id, { contents: {}, analysis: EMPTY_ANALYSIS, fx: freshFx() }])) as Record<
    VesselId,
    VesselState
  >;

let logId = 0;
const entry = (e: Omit<LogEntry, "id">): LogEntry => ({ ...e, id: ++logId });

function describeEvent(event: BenchEvent, vessel: VesselId): LogEntry | null {
  switch (event.type) {
    case "gas":
      return entry({ vessel, tone: "observation", ...EXPLANATIONS[event.gas] });
    case "foam":
      return entry({ vessel, tone: "observation", ...EXPLANATIONS.foam });
    case "precipitate":
      return entry({ vessel, tone: "observation", ...EXPLANATIONS[event.id] });
    case "feature":
      return entry({ vessel, tone: "observation", ...EXPLANATIONS[event.id] });
    case "featureLost":
      return entry({
        vessel,
        tone: "observation",
        title: "Pink disappears",
        text: "The solution is no longer alkaline, so phenolphthalein turns colourless again.",
      });
    case "ph":
      return entry({
        vessel,
        tone: "observation",
        title: `pH ${event.from.toFixed(1)} → ${event.to.toFixed(1)}`,
        text: `The solution is now ${describePH(event.to)}.`,
      });
  }
}

export const useBench = create<BenchState>((set, get) => ({
  vessels: freshVessels(),
  selectedReagent: null,
  amount: "splash",
  focus: null,
  pour: null,
  animate: true,
  log: [],
  guide: null,
  selectReagent: (selectedReagent) => set((s) => ({ selectedReagent: s.selectedReagent === selectedReagent ? null : selectedReagent })),
  setAmount: (amount) => set({ amount }),
  setFocus: (focus) => set({ focus }),
  setAnimate: (animate) => set({ animate }),
  clickVessel: (vessel) => {
    const { selectedReagent, amount, pour, animate } = get();
    if (pour) return;
    if (!selectedReagent) {
      set({ focus: vessel });
      return;
    }
    const info = vesselById.get(vessel)!;
    if (info.capacity - get().vessels[vessel].analysis.volume < 0.05) {
      set({
        focus: vessel,
        log: [...get().log, entry({ vessel, tone: "warning", title: `${info.name} is full`, text: "Empty it before adding more." })],
      });
      return;
    }
    set({ focus: vessel, pour: { reagent: selectedReagent, vessel, amount, start: now() } });
    if (!animate) {
      get().commitPour();
      get().finishPour();
    }
  },
  commitPour: () => {
    const { pour, vessels: all, log, guide } = get();
    if (!pour) return;
    const vessel = all[pour.vessel];
    const capacity = vesselById.get(pour.vessel)!.capacity;
    const room = capacity - vessel.analysis.volume;
    const name = vesselById.get(pour.vessel)!.name;
    const chemical = chemicalById.get(pour.reagent)!;
    if (room < 0.05) {
      set({ log: [...log, entry({ vessel: pour.vessel, tone: "warning", title: `${name} is full`, text: "Empty it before adding more." })] });
      return;
    }
    const mL = Math.min(pourVolumes[pour.amount], room);
    const contents = { ...vessel.contents, [pour.reagent]: (vessel.contents[pour.reagent] ?? 0) + mL };
    const analysis = analyze(contents);
    const events = diff(vessel.analysis, analysis);
    const t = now();
    const fx = { ...vessel.fx, changedAt: t };
    for (const event of events) {
      if (event.type === "gas") {
        fx.gasAt = t;
        fx.gasAmount = event.mmol;
      }
      if (event.type === "foam") {
        fx.foamAt = t;
        fx.foamAmount = analysis.foam;
        fx.gasAt = t;
        fx.gasAmount = analysis.o2;
      }
      if (event.type === "precipitate") fx.precipitateAt = t;
    }

    const added: LogEntry[] = [
      entry({
        vessel: pour.vessel,
        tone: "action",
        title: `Added ${mL < 1 ? `${mL} mL` : `${Math.round(mL)} mL`} of ${chemical.name.toLowerCase()} to ${name.toLowerCase()}`,
      }),
    ];
    for (const event of events) {
      const described = describeEvent(event, pour.vessel);
      if (described) added.push(described);
    }

    let nextGuide = guide;
    if (guide && !guide.done) {
      const experiment = experiments.find((e) => e.id === guide.id)!;
      const step = experiment.steps[guide.step];
      if (step && step.reagent === pour.reagent && step.vessel === pour.vessel) {
        const nextStep = guide.step + 1;
        const done = nextStep >= experiment.steps.length;
        nextGuide = { ...guide, step: nextStep, done };
        if (done) {
          added.push(entry({ vessel: pour.vessel, tone: "success", title: `${experiment.title} complete`, text: experiment.explanation }));
        }
      }
    }

    set({
      vessels: { ...all, [pour.vessel]: { contents, analysis, fx } },
      log: [...log, ...added].slice(-60),
      guide: nextGuide,
    });
    if (nextGuide && !nextGuide.done) {
      const experiment = experiments.find((e) => e.id === nextGuide.id)!;
      const step = experiment.steps[nextGuide.step];
      set({ amount: step.amount, selectedReagent: null });
    }
  },
  finishPour: () => set({ pour: null }),
  empty: (vessel) => {
    const { vessels: all, log } = get();
    set({
      vessels: { ...all, [vessel]: { contents: {}, analysis: EMPTY_ANALYSIS, fx: freshFx() } },
      log: [...log, entry({ vessel, tone: "action", title: `Emptied and rinsed ${vesselById.get(vessel)!.name.toLowerCase()}` })],
    });
  },
  resetAll: () => set({ vessels: freshVessels(), log: [], guide: null, selectedReagent: null, focus: null, pour: null }),
  startGuide: (id) => {
    const experiment = experiments.find((e) => e.id === id)!;
    const used = new Set(experiment.steps.map((s) => s.vessel));
    const all = { ...get().vessels };
    for (const v of used) all[v] = { contents: {}, analysis: EMPTY_ANALYSIS, fx: freshFx() };
    set({
      vessels: all,
      guide: { id, step: 0, done: false },
      amount: experiment.steps[0].amount,
      selectedReagent: null,
      focus: experiment.steps[0].vessel,
      log: [...get().log, entry({ vessel: null, tone: "action", title: `Started: ${experiment.title}`, text: experiment.goal })],
    });
  },
  stopGuide: () => set({ guide: null }),
}));

export function currentGuideStep() {
  const guide = useBench.getState().guide;
  if (!guide || guide.done) return null;
  return experiments.find((e) => e.id === guide.id)?.steps[guide.step] ?? null;
}
