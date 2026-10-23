import { lazy, Suspense, useEffect, type ReactNode } from "react";
import { FlaskConical, Mail, MessageCircle, Microscope, Move3d, ShieldCheck, TestTubes, X } from "lucide-react";
import { chemicalById, company, itemById, zones, type Chemical, type LabItem } from "../data";
import { enquiryMailto } from "../lib/agent";
import { HAZARD_INFO } from "../lib/hazards";
import { useBench, useLab } from "../state/store";
import { Formula, HazardIcon, Tag } from "./bits";

const ItemPreview = lazy(() => import("../scene/ItemPreview"));

export function KindIcon({ kind, className = "size-5" }: { kind: LabItem["kind"] | "Chemical"; className?: string }) {
  if (kind === "Instrument") return <Microscope className={className} />;
  if (kind === "Safety") return <ShieldCheck className={className} />;
  if (kind === "Glassware" || kind === "Consumable") return <TestTubes className={className} />;
  return <FlaskConical className={className} />;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-5">
      <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">{title}</h3>
      {children}
    </section>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5 text-sm leading-relaxed text-slate-700">
      {items.map((t) => (
        <li key={t} className="flex gap-2">
          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-teal" />
          {t}
        </li>
      ))}
    </ul>
  );
}

function ItemBody({ item }: { item: LabItem }) {
  return (
    <>
      <p className="mt-3 text-[15px] leading-relaxed text-slate-700">{item.summary}</p>
      <Section title="Used for">
        <Bullets items={item.uses} />
      </Section>
      <Section title="Good practice">
        <Bullets items={item.tips} />
      </Section>
    </>
  );
}

function ChemicalBody({ chemical }: { chemical: Chemical }) {
  return (
    <>
      <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <Formula value={chemical.formula} className="font-display text-2xl font-bold text-navy" />
        {chemical.cas && <span className="text-sm text-slate-500">CAS {chemical.cas}</span>}
      </div>
      <p className="mt-3 text-[15px] leading-relaxed text-slate-700">{chemical.summary}</p>
      <Section title="Used for">
        <Bullets items={chemical.uses} />
      </Section>
      <Section title="Hazards of the stock chemical">
        {chemical.hazards.length === 0 ? (
          <p className="text-sm text-slate-600">No hazard pictograms. Normal laboratory care still applies.</p>
        ) : (
          <ul className="space-y-2">
            {chemical.hazards.map((h) => (
              <li key={h} className="flex items-center gap-3 rounded-xl border border-line bg-white px-3 py-2">
                <HazardIcon hazard={h} size={38} />
                <div className="text-sm">
                  <div className="font-semibold text-ink">{HAZARD_INFO[h].label}</div>
                  <div className="text-slate-600">{HAZARD_INFO[h].meaning}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>
      <Section title="Handling">
        <p className="text-sm leading-relaxed text-slate-700">{chemical.handling}</p>
      </Section>
    </>
  );
}

export function InfoPanel() {
  const inspect = useLab((s) => s.inspect);
  const view = useLab((s) => s.view);
  const close = useLab((s) => s.closeInspect);

  useEffect(() => {
    if (!inspect) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [inspect, close]);

  if (!inspect) return null;
  const item = inspect.type === "item" ? itemById.get(inspect.id) : undefined;
  const chemical = inspect.type === "chemical" ? chemicalById.get(inspect.id) : undefined;
  const name = item?.name ?? chemical?.name ?? "";
  const zone = item ? zones.find((z) => z.id === item.zone)?.label : undefined;

  const tryAtBench = () => {
    close();
    if (view === "3d") useLab.getState().travelTo("bench");
    else document.getElementById("bench")?.scrollIntoView({ behavior: "smooth" });
    if (useBench.getState().selectedReagent !== inspect.id) useBench.getState().selectReagent(inspect.id);
  };

  return (
    <>
      <div className="fixed inset-0 z-30 bg-navy/20 sm:hidden" onClick={close} aria-hidden />
      <aside
        role="dialog"
        aria-label={name}
        className="panel animate-rise fixed inset-x-0 bottom-0 z-40 flex max-h-[86vh] flex-col overflow-hidden rounded-t-3xl sm:inset-x-auto sm:right-4 sm:top-4 sm:bottom-4 sm:max-h-none sm:w-[420px] sm:rounded-3xl"
      >
        <div className="relative h-60 shrink-0 bg-mist sm:h-64">
          {view === "3d" ? (
            <Suspense fallback={<div className="grid h-full place-items-center text-sm text-slate-500">Loading model…</div>}>
              <ItemPreview inspect={inspect} />
            </Suspense>
          ) : (
            <div className="grid h-full place-items-center text-teal">
              <KindIcon kind={item?.kind ?? "Chemical"} className="size-20" />
            </div>
          )}
          {view === "3d" && (
            <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-white/85 px-2.5 py-1 text-xs font-medium text-slate-600">
              <Move3d className="size-3.5" /> Drag to rotate · scroll to zoom
            </div>
          )}
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute right-3 top-3 grid size-10 place-items-center rounded-full bg-white/90 text-ink shadow transition hover:bg-white"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-4">
          <div className="flex flex-wrap gap-1.5">
            <Tag>{item?.kind ?? chemical?.form}</Tag>
            {zone && <Tag tone="navy">{zone}</Tag>}
            {chemical?.bench && <Tag tone="amber">Used at the experiment bench</Tag>}
          </div>
          <h2 className="mt-2 font-display text-2xl font-bold leading-tight text-navy">{name}</h2>
          {item && <ItemBody item={item} />}
          {chemical && <ChemicalBody chemical={chemical} />}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-line bg-white/70 p-4">
          {chemical?.bench && (
            <button type="button" onClick={tryAtBench} className="flex-1 rounded-full bg-teal px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0b8f8f]">
              Try it at the bench
            </button>
          )}
          <a
            href={enquiryMailto(`Enquiry: ${name}`)}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-teal"
          >
            <Mail className="size-4" /> Ask {company.name}
          </a>
          {view === "3d" && (
            <button
              type="button"
              onClick={() => useLab.getState().openAgent()}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-teal"
            >
              <MessageCircle className="size-4" /> Sales agent
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
