import { useEffect, useMemo, useState } from "react";
import { Box, MessageCircle } from "lucide-react";
import { chemicals, company, items, vesselById, vessels, zones, type VesselId, type ZoneId } from "../data";
import { hasWebGL2 } from "../lib/device";
import { useBench, useLab } from "../state/store";
import { AgentChat } from "./AgentChat";
import { AmountPicker, BenchHint, BenchLog, GuideCard, ReagentTray, SIMULATION_NOTE, VesselCard } from "./BenchUI";
import { Formula, HazardIcon, Logo } from "./bits";
import { InfoPanel, KindIcon } from "./InfoPanel";

const OUTLINES: Record<"beaker" | "flask" | "tube", { outline: string; inner: string; top: number; bottom: number }> = {
  beaker: { outline: "M10 6 H54 V74 Q54 80 48 80 H16 Q10 80 10 74 Z", inner: "M12 8 H52 V73 Q52 78 47 78 H17 Q12 78 12 73 Z", top: 12, bottom: 78 },
  flask: { outline: "M25 4 H39 V30 L58 72 Q61 80 53 80 H11 Q3 80 6 72 L25 30 Z", inner: "M27 6 H37 V31 L56 72 Q58 78 52 78 H12 Q6 78 8 72 L27 31 Z", top: 22, bottom: 78 },
  tube: { outline: "M22 2 H42 V68 A10 10 0 0 1 22 68 Z", inner: "M24 3 H40 V68 A8 8 0 0 1 24 68 Z", top: 8, bottom: 76 },
};

/** A flat drawing of a vessel whose liquid, cloudiness and fizz follow the same simulation as the 3D bench. */
function VesselGlyph({ id }: { id: VesselId }) {
  const vessel = useBench((s) => s.vessels[id]);
  const focus = useBench((s) => s.focus);
  const selected = useBench((s) => s.selectedReagent);
  const click = useBench((s) => s.clickVessel);
  const info = vesselById.get(id)!;
  const kind = id === "flask" ? "flask" : id.startsWith("tube") ? "tube" : "beaker";
  const shape = OUTLINES[kind];
  const a = vessel.analysis;
  const fraction = Math.min(1, a.volume / info.capacity);
  const y = shape.bottom - (shape.bottom - shape.top) * fraction;
  const [now, setNow] = useState(() => performance.now() / 1000);
  const fizzing = now - vessel.fx.gasAt < 6;
  const foaming = vessel.fx.foamAmount > 0;
  useEffect(() => {
    if (!fizzing) return;
    const t = setInterval(() => setNow(performance.now() / 1000), 500);
    return () => clearInterval(t);
  }, [fizzing]);
  useEffect(() => setNow(performance.now() / 1000), [vessel]);
  const clipId = `clip-${id}`;
  return (
    <button
      type="button"
      onClick={() => click(id)}
      className={`group flex flex-col items-center gap-1 rounded-2xl border bg-white px-3 pb-2 pt-3 transition ${focus === id ? "border-brand ring-2 ring-brand/20" : selected ? "border-teal/60 hover:border-teal" : "border-line hover:border-teal/60"}`}
      aria-label={`${info.name}${selected ? `: add the selected reagent` : ""}`}
    >
      <svg viewBox="0 0 64 84" className="h-24 w-16">
        <defs>
          <clipPath id={clipId}>
            <path d={shape.inner} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clipId})`}>
          {a.volume > 0 && <rect x="0" y={y} width="64" height={84 - y} fill={a.color} opacity={a.opacity} style={{ transition: "all 0.6s" }} />}
          {a.precipitates.length > 0 && <rect x="0" y={shape.bottom - 6} width="64" height="8" fill={a.precipitates[0].color} opacity="0.9" />}
          {fizzing &&
            [0, 1, 2, 3, 4].map((i) => (
              <circle key={i} cx={18 + i * 7} cy={shape.bottom - 4} r="1.6" fill="white" opacity="0.9" style={{ animation: `bubble-up ${1.2 + i * 0.2}s ${i * 0.15}s infinite` }} />
            ))}
        </g>
        {foaming && <path d="M14 10 C6 0 22 -6 32 2 C42 -6 58 0 50 10 C60 14 54 22 44 18 C38 24 26 24 20 18 C10 22 4 14 14 10 Z" fill="#fffdf4" stroke="#e7e3d6" />}
        <path d={shape.outline} fill="rgba(210,235,240,0.25)" stroke="#9fb3c2" strokeWidth="2" />
      </svg>
      <span className="text-xs font-semibold text-ink">{info.name}</span>
    </button>
  );
}

export function Fallback2D() {
  const setView = useLab((s) => s.setView);
  const openInspect = useLab((s) => s.openInspect);
  const [zone, setZone] = useState<ZoneId>("chemicals");
  const canUse3D = useMemo(() => hasWebGL2(), []);

  useEffect(() => {
    useBench.getState().setAnimate(false);
    return () => useBench.getState().setAnimate(true);
  }, []);

  const zoneItems = items.filter((i) => i.zone === zone);
  const zoneTabs = zones.filter((z) => z.id !== "entrance" && z.id !== "reception");

  return (
    <div className="h-full overflow-y-auto bg-mist">
      <header className="sticky top-0 z-20 border-b border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Logo compact />
          <span className="hidden text-sm font-semibold text-slate-500 sm:block">Virtual lab guide</span>
          <div className="flex-1" />
          <a href="#agent" className="inline-flex items-center gap-2 rounded-full bg-teal px-3.5 py-2 text-sm font-semibold text-white hover:bg-[#0b8f8f]">
            <MessageCircle className="size-4" /> <span className="hidden sm:inline">Sales agent</span>
          </a>
          {canUse3D && (
            <button type="button" onClick={() => setView("3d")} className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3.5 py-2 text-sm font-semibold text-ink hover:border-teal">
              <Box className="size-4" /> 3D lab
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-12 px-4 py-8">
        <section>
          <h1 className="font-display text-3xl font-bold tracking-tight text-navy sm:text-4xl">Explore the Labmate lab</h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            {canUse3D
              ? "This is the simple view of our virtual lab. Switch to 3D at any time to walk around it."
              : "Your browser can't show the 3D lab, so here is everything in it as a simple guide."}{" "}
            {company.name} supplies {company.supplies.join(", ").toLowerCase()}.
          </p>
        </section>

        <section aria-labelledby="explore-heading">
          <h2 id="explore-heading" className="font-display text-2xl font-bold text-navy">
            What's in the lab
          </h2>
          <div role="tablist" className="scrollbar-thin mt-4 flex gap-1.5 overflow-x-auto pb-1">
            {zoneTabs.map((z) => (
              <button
                key={z.id}
                type="button"
                role="tab"
                aria-selected={zone === z.id}
                onClick={() => setZone(z.id)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${zone === z.id ? "bg-navy text-white" : "bg-white text-slate-600 hover:text-ink"}`}
              >
                {z.label}
              </button>
            ))}
          </div>
          {zone === "chemicals" ? (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {chemicals.map((c) => (
                <li key={c.id}>
                  <button type="button" onClick={() => openInspect({ type: "chemical", id: c.id })} className="flex h-full w-full flex-col rounded-2xl border border-line bg-white p-4 text-left transition hover:border-teal">
                    <div className="flex items-start gap-2">
                      <div className="flex-1">
                        <div className="font-semibold text-ink">{c.name}</div>
                        <Formula value={c.formula} className="text-sm text-slate-500" />
                      </div>
                      <div className="flex -space-x-1.5">
                        {c.hazards.slice(0, 3).map((h) => (
                          <HazardIcon key={h} hazard={h} size={26} />
                        ))}
                      </div>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-slate-600">{c.summary}</p>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {zoneItems.map((item) => (
                <li key={item.id}>
                  <button type="button" onClick={() => openInspect({ type: "item", id: item.id })} className="flex h-full w-full gap-3 rounded-2xl border border-line bg-white p-4 text-left transition hover:border-teal">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-teal/10 text-teal">
                      <KindIcon kind={item.kind} />
                    </span>
                    <span>
                      <span className="block font-semibold text-ink">{item.name}</span>
                      <span className="mt-1 line-clamp-2 block text-sm text-slate-600">{item.summary}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section id="bench" aria-labelledby="bench-heading" className="scroll-mt-20">
          <h2 id="bench-heading" className="font-display text-2xl font-bold text-navy">
            Experiment bench
          </h2>
          <p className="mt-1 text-sm text-slate-600">{SIMULATION_NOTE}</p>
          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_20rem]">
            <div className="space-y-4 rounded-3xl border border-line bg-white p-4">
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {vessels.map((v) => (
                  <VesselGlyph key={v.id} id={v.id} />
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <AmountPicker />
                <div className="min-w-0 flex-1">
                  <BenchHint />
                </div>
              </div>
              <ReagentTray layout="grid" />
            </div>
            <div className="space-y-4">
              <VesselCard />
              <GuideCard />
              <BenchLog />
            </div>
          </div>
        </section>

        <section id="agent" aria-labelledby="agent-heading" className="scroll-mt-20 pb-10">
          <h2 id="agent-heading" className="font-display text-2xl font-bold text-navy">
            Talk to our sales agent
          </h2>
          <div className="mt-4 max-w-xl">
            <AgentChat inline />
          </div>
        </section>
      </main>
      <InfoPanel />
    </div>
  );
}
