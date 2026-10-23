/**
 * A deliberately simplified chemistry model for the virtual experiment bench.
 *
 * Vessel contents are stored as millilitres of each bench reagent. Every
 * analysis starts again from those totals: reagents are converted to mmol of
 * the species that matter, the reactions are applied in a fixed order, and the
 * remaining species decide pH, colour, precipitates and gas. Concentrations are
 * mmol/mL, which equals mol/L.
 */

export type Contents = Record<string, number>;

interface ReagentChem {
  strongAcid?: number;
  strongBase?: number;
  aceticAcid?: number;
  bicarbonate?: number;
  copper?: number;
  iron?: number;
  silver?: number;
  chloride?: number;
  thiocyanate?: number;
  iodide?: number;
  iodine?: number;
  peroxide?: number;
  starch?: number;
  soap?: number;
  indicator?: "universal" | "phenolphthalein";
}

/** Concentrations in mmol/mL (= mol/L) of the simulated bench solutions. */
export const REAGENTS: Record<string, ReagentChem> = {
  water: {},
  hcl: { strongAcid: 0.5, chloride: 0.5 },
  naoh: { strongBase: 0.5 },
  vinegar: { aceticAcid: 0.8 },
  nahco3: { bicarbonate: 0.5 },
  universal: { indicator: "universal" },
  phenolphthalein: { indicator: "phenolphthalein" },
  cuso4: { copper: 0.5 },
  fecl3: { iron: 0.1, chloride: 0.3 },
  kscn: { thiocyanate: 0.1 },
  agno3: { silver: 0.1 },
  nacl: { chloride: 0.5 },
  h2o2: { peroxide: 0.88 },
  ki: { iodide: 0.5 },
  starch: { starch: 1 },
  iodine: { iodine: 0.05, iodide: 0.1 },
  detergent: { soap: 1 },
};

const ACETIC_PKA = 4.76;
const PHENOLPHTHALEIN_START = 8.2;

export type PrecipitateId = "cuoh2" | "feoh3" | "agcl" | "agi" | "ag2o";

export interface Precipitate {
  id: PrecipitateId;
  name: string;
  color: string;
  mmol: number;
}

export type FeatureId =
  | "neutralisation"
  | "co2"
  | "o2"
  | "foam"
  | "fescn"
  | "starchIodine"
  | "iodineFormed"
  | "phenolphthaleinPink"
  | "universal";

export interface Analysis {
  volume: number;
  pH: number;
  /** Liquid colour as a hex string. */
  color: string;
  /** 0–1: how strongly coloured the liquid is. */
  coverage: number;
  opacity: number;
  /** 0–1: how cloudy the liquid is from precipitates. */
  turbidity: number;
  precipitates: Precipitate[];
  /** Total gas released so far, in mmol. */
  co2: number;
  o2: number;
  /** mmol of oxygen trapped as foam (needs detergent). */
  foam: number;
  features: FeatureId[];
}

const PRECIPITATE_INFO: Record<PrecipitateId, { name: string; color: string }> = {
  cuoh2: { name: "Copper(II) hydroxide", color: "#86bfe8" },
  feoh3: { name: "Iron(III) hydroxide", color: "#8f4a1c" },
  agcl: { name: "Silver chloride", color: "#f3f3f1" },
  agi: { name: "Silver iodide", color: "#efdf98" },
  ag2o: { name: "Silver(I) oxide", color: "#4b3a2b" },
};

export const EMPTY_ANALYSIS: Analysis = {
  volume: 0,
  pH: 7,
  color: "#dff3fb",
  coverage: 0,
  opacity: 0,
  turbidity: 0,
  precipitates: [],
  co2: 0,
  o2: 0,
  foam: 0,
  features: [],
};

export function totalVolume(contents: Contents): number {
  let volume = 0;
  for (const mL of Object.values(contents)) volume += mL;
  return volume;
}

export function analyze(contents: Contents): Analysis {
  const V = totalVolume(contents);
  if (V <= 0) return EMPTY_ANALYSIS;

  const amount = (key: keyof ReagentChem) => {
    let sum = 0;
    for (const [id, mL] of Object.entries(contents)) {
      const value = REAGENTS[id]?.[key];
      if (typeof value === "number") sum += value * mL;
    }
    return sum;
  };
  const fraction = (id: string) => (contents[id] ?? 0) / V;

  let strongAcid = amount("strongAcid");
  let strongBase = amount("strongBase");
  let acetic = amount("aceticAcid");
  let bicarbonate = amount("bicarbonate");
  let copper = amount("copper");
  let iron = amount("iron");
  let silver = amount("silver");
  let chloride = amount("chloride");
  let thiocyanate = amount("thiocyanate");
  let iodide = amount("iodide");
  let iodine = amount("iodine");
  const peroxide = amount("peroxide");
  const starch = amount("starch");
  const soap = amount("soap");

  const features: FeatureId[] = [];
  const precipitates: Precipitate[] = [];
  const addPrecipitate = (id: PrecipitateId, mmol: number) => {
    if (mmol > 1e-6) precipitates.push({ id, ...PRECIPITATE_INFO[id], mmol });
  };

  // 1. Strong acid + strong base -> salt + water.
  const neutralised = Math.min(strongAcid, strongBase);
  strongAcid -= neutralised;
  strongBase -= neutralised;
  if (neutralised > 1e-6) features.push("neutralisation");

  // 2. Acids + hydrogen carbonate -> carbon dioxide.
  let co2 = Math.min(strongAcid, bicarbonate);
  strongAcid -= co2;
  bicarbonate -= co2;
  const fromAcetic = Math.min(acetic, bicarbonate);
  acetic -= fromAcetic;
  bicarbonate -= fromAcetic;
  co2 += fromAcetic;
  let acetate = fromAcetic;
  if (co2 > 1e-6) features.push("co2");

  // 3. Strong base + acetic acid -> acetate.
  const aceticNeutralised = Math.min(strongBase, acetic);
  strongBase -= aceticNeutralised;
  acetic -= aceticNeutralised;
  acetate += aceticNeutralised;
  if (aceticNeutralised > 1e-6 && !features.includes("neutralisation")) features.push("neutralisation");

  // 4. Silver halides (far less soluble than the hydroxide, so they form first).
  const agcl = Math.min(silver, chloride);
  silver -= agcl;
  chloride -= agcl;
  addPrecipitate("agcl", agcl);
  const agi = Math.min(silver, iodide);
  silver -= agi;
  iodide -= agi;
  addPrecipitate("agi", agi);

  // 5. Metal hydroxide precipitates use up the remaining hydroxide.
  const feoh3 = Math.min(iron, strongBase / 3);
  iron -= feoh3;
  strongBase -= feoh3 * 3;
  addPrecipitate("feoh3", feoh3);
  const cuoh2 = Math.min(copper, strongBase / 2);
  copper -= cuoh2;
  strongBase -= cuoh2 * 2;
  addPrecipitate("cuoh2", cuoh2);
  const silverOxide = Math.min(silver, strongBase);
  silver -= silverOxide;
  strongBase -= silverOxide;
  addPrecipitate("ag2o", silverOxide / 2);

  // 6. Iron(III) + thiocyanate -> blood-red complex.
  const fescn = Math.min(iron, thiocyanate);
  iron -= fescn;
  thiocyanate -= fescn;
  if (fescn > 1e-6) features.push("fescn");

  // 7. Iodide catalyses peroxide decomposition and is partly oxidised to iodine.
  let o2 = 0;
  if (peroxide > 1e-6 && iodide > 1e-6) {
    o2 = peroxide / 2;
    features.push("o2");
    const formed = Math.min(iodide, peroxide) * 0.02;
    iodide -= formed;
    iodine += formed;
    if (formed > 1e-6) features.push("iodineFormed");
  }
  const foam = soap > 1e-6 && o2 > 0.2 ? o2 : 0;
  if (foam > 0) features.push("foam");

  // 8. Starch + iodine -> blue-black complex.
  const starchIodine = Math.min(starch * 0.05, iodine);
  iodine -= starchIodine;
  if (starchIodine > 1e-6) features.push("starchIodine");

  const pH = computePH({ strongAcid, strongBase, acetic, acetate, bicarbonate, V });

  // Colour: each coloured species contributes a weight from its concentration.
  const colorants: [string, number][] = [
    ["#2a7fd4", (copper / V) * 5],
    ["#d89a1c", (iron / V) * 25],
    ["#a30d10", (fescn / V) * 300],
    ["#8a4b0e", (iodine / V) * 120],
    ["#141a4a", (starchIodine / V) * 600],
    ["#f0f0ea", (starch / V) * 0.3],
    ["#efe3c0", fraction("vinegar") * 0.05],
    ["#79c35a", (soap / V) * 0.8],
  ];
  const universal = fraction("universal");
  if (universal > 0) {
    colorants.push([universalIndicatorColor(pH), universal * 150]);
    features.push("universal");
  }
  const phenolphthalein = fraction("phenolphthalein");
  if (phenolphthalein > 0) {
    const pinkness = smoothstep(PHENOLPHTHALEIN_START, 9.6, pH);
    if (pinkness > 0.05) features.push("phenolphthaleinPink");
    colorants.push(["#ff2b93", phenolphthalein * 150 * pinkness]);
  }

  let weight = 0;
  let r = 0;
  let g = 0;
  let b = 0;
  for (const [hex, w] of colorants) {
    if (w <= 0) continue;
    const [cr, cg, cb] = hexToRgb(hex);
    r += cr * w;
    g += cg * w;
    b += cb * w;
    weight += w;
  }
  const coverage = 1 - Math.exp(-weight);
  let rgb = hexToRgb(EMPTY_ANALYSIS.color);
  if (weight > 0) rgb = mixRgb(rgb, [r / weight, g / weight, b / weight], coverage);

  let precipitateMmol = 0;
  let pr = 0;
  let pg = 0;
  let pb = 0;
  for (const p of precipitates) {
    const [cr, cg, cb] = hexToRgb(p.color);
    pr += cr * p.mmol;
    pg += cg * p.mmol;
    pb += cb * p.mmol;
    precipitateMmol += p.mmol;
  }
  const turbidity = 1 - Math.exp(-(precipitateMmol / V) * 40);
  if (precipitateMmol > 0) {
    rgb = mixRgb(rgb, [pr / precipitateMmol, pg / precipitateMmol, pb / precipitateMmol], turbidity * 0.85);
  }

  return {
    volume: V,
    pH,
    color: rgbToHex(rgb),
    coverage,
    opacity: Math.min(0.95, 0.3 + 0.55 * coverage + 0.45 * turbidity),
    turbidity,
    precipitates,
    co2,
    o2,
    foam,
    features,
  };
}

function computePH(s: {
  strongAcid: number;
  strongBase: number;
  acetic: number;
  acetate: number;
  bicarbonate: number;
  V: number;
}): number {
  const { strongAcid, strongBase, acetic, acetate, bicarbonate, V } = s;
  const eps = 1e-9;
  if (strongAcid > eps) return clampPH(-Math.log10(strongAcid / V + 1e-7));
  if (strongBase > eps) return clampPH(14 + Math.log10(strongBase / V + 1e-7));
  if (acetic > eps && acetate > eps) return clampPH(ACETIC_PKA + Math.log10(acetate / acetic));
  if (acetic > eps) return clampPH(Math.min(7, 0.5 * (ACETIC_PKA - Math.log10(acetic / V))));
  // Hydrogen carbonate is amphoteric: its solutions sit near pH 8.3 at any concentration.
  if (bicarbonate > eps) return 8.3;
  if (acetate > eps) return clampPH(Math.max(7, 7 + 0.5 * (ACETIC_PKA + Math.log10(acetate / V))));
  return 7;
}

function clampPH(pH: number) {
  return Math.min(14, Math.max(0, pH));
}

/** Universal indicator colour chart, pH 0 to 14. */
const UNIVERSAL_SCALE = [
  "#d7191c", "#ee1c25", "#f26724", "#f8c611", "#f5ed1c", "#b5d333", "#84c341", "#4db849",
  "#33a94b", "#22b46b", "#0ab8b6", "#4690cd", "#3853a4", "#5a51a2", "#63459d",
];

export function universalIndicatorColor(pH: number): string {
  const p = Math.min(14, Math.max(0, pH));
  const i = Math.min(13, Math.floor(p));
  return rgbToHex(mixRgb(hexToRgb(UNIVERSAL_SCALE[i]), hexToRgb(UNIVERSAL_SCALE[i + 1]), p - i));
}

export function describePH(pH: number): string {
  if (pH < 3) return "strongly acidic";
  if (pH < 6.5) return "acidic";
  if (pH <= 7.5) return "neutral";
  if (pH <= 11) return "alkaline";
  return "strongly alkaline";
}

export type BenchEvent =
  | { type: "gas"; gas: "co2" | "o2"; mmol: number }
  | { type: "foam"; mmol: number }
  | { type: "precipitate"; id: PrecipitateId }
  | { type: "feature"; id: FeatureId }
  | { type: "featureLost"; id: FeatureId }
  | { type: "ph"; from: number; to: number };

/** Compares the analyses before and after an addition and reports what a person would notice. */
export function diff(before: Analysis, after: Analysis): BenchEvent[] {
  const events: BenchEvent[] = [];
  const co2 = after.co2 - before.co2;
  if (co2 > 0.005) events.push({ type: "gas", gas: "co2", mmol: co2 });
  const o2 = after.o2 - before.o2;
  if (after.foam - before.foam > 0.05) events.push({ type: "foam", mmol: after.foam - before.foam });
  else if (o2 > 0.005) events.push({ type: "gas", gas: "o2", mmol: o2 });

  for (const p of after.precipitates) {
    const previous = before.precipitates.find((q) => q.id === p.id)?.mmol ?? 0;
    if (p.mmol - previous > 1e-4) events.push({ type: "precipitate", id: p.id });
  }
  const visual: FeatureId[] = ["fescn", "starchIodine", "iodineFormed", "phenolphthaleinPink", "neutralisation"];
  for (const id of visual) {
    const had = before.features.includes(id);
    const has = after.features.includes(id);
    if (has && !had) events.push({ type: "feature", id });
    if (had && !has && id === "phenolphthaleinPink") events.push({ type: "featureLost", id });
  }
  if (Math.abs(after.pH - before.pH) >= 0.5 && before.volume > 0) {
    events.push({ type: "ph", from: before.pH, to: after.pH });
  }
  return events;
}

export const EXPLANATIONS: Record<FeatureId | PrecipitateId, { title: string; text: string }> = {
  neutralisation: {
    title: "Neutralisation",
    text: "The acid and alkali react to form a salt and water, so the pH moves towards 7.",
  },
  co2: {
    title: "Fizzing: carbon dioxide",
    text: "The acid reacts with hydrogen carbonate ions, releasing carbon dioxide gas.",
  },
  o2: {
    title: "Bubbling: oxygen",
    text: "Iodide ions catalyse the breakdown of hydrogen peroxide into water and oxygen gas.",
  },
  foam: {
    title: "Foam eruption",
    text: "The detergent traps the oxygen gas in countless bubbles, so foam pours out of the vessel.",
  },
  fescn: {
    title: "Blood-red complex",
    text: "Iron(III) ions combine with thiocyanate ions to form the deep red [Fe(SCN)]²⁺ ion.",
  },
  starchIodine: {
    title: "Blue-black colour",
    text: "Iodine slots into the coiled starch molecules, forming a blue-black complex. This is the test for starch.",
  },
  iodineFormed: {
    title: "Yellow-brown tint",
    text: "Hydrogen peroxide oxidises some of the iodide ions to iodine, which is yellow-brown.",
  },
  phenolphthaleinPink: {
    title: "Pink colour",
    text: "Phenolphthalein turns pink when the solution is alkaline (above about pH 8.2).",
  },
  universal: {
    title: "Universal indicator",
    text: "The colour shows the pH: red is strongly acidic, green is neutral, purple is strongly alkaline.",
  },
  cuoh2: {
    title: "Pale blue precipitate",
    text: "Copper(II) ions react with hydroxide ions to form insoluble copper(II) hydroxide.",
  },
  feoh3: {
    title: "Red-brown precipitate",
    text: "Iron(III) ions react with hydroxide ions to form insoluble iron(III) hydroxide.",
  },
  agcl: {
    title: "White precipitate",
    text: "Silver ions and chloride ions form insoluble silver chloride. This is the classic test for chloride ions.",
  },
  agi: {
    title: "Pale yellow precipitate",
    text: "Silver ions and iodide ions form insoluble silver iodide.",
  },
  ag2o: {
    title: "Brown precipitate",
    text: "Silver ions react with hydroxide ions to form brown silver(I) oxide.",
  },
};

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

type RGB = [number, number, number];

export function hexToRgb(hex: string): RGB {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]: RGB): string {
  const to = (v: number) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

function mixRgb(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
