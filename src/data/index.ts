import chemicalsJson from "./chemicals.json";
import companyJson from "./company.json";
import experimentsJson from "./experiments.json";
import itemsJson from "./items.json";
import type { Chemical, Company, Experiment, LabItem, VesselId, ZoneId } from "./types";

export * from "./types";

export const company = companyJson as Company;
export const items = itemsJson as LabItem[];
export const chemicals = chemicalsJson as Chemical[];
export const experiments = experimentsJson as Experiment[];

export const itemById = new Map(items.map((item) => [item.id, item]));
export const chemicalById = new Map(chemicals.map((chemical) => [chemical.id, chemical]));
export const benchChemicals = chemicals.filter((chemical) => chemical.bench);

export const zones: { id: ZoneId; label: string; blurb: string }[] = [
  { id: "entrance", label: "Entrance", blurb: "Where your visit begins" },
  { id: "reception", label: "Sales desk", blurb: "Talk to the Labmate sales agent" },
  { id: "chemicals", label: "Chemical store", blurb: "Reagents, solvents and indicators" },
  { id: "glassware", label: "Glassware", blurb: "Beakers, flasks, cylinders and more" },
  { id: "instruments", label: "Instruments", blurb: "Microscope, balance, centrifuge and meters" },
  { id: "safety", label: "Safety corner", blurb: "Fume hood, eyewash and protective gear" },
  { id: "bench", label: "Experiment bench", blurb: "Try simulated reactions" },
];

export const vessels: { id: VesselId; name: string; capacity: number }[] = [
  { id: "beakerA", name: "Beaker A", capacity: 100 },
  { id: "beakerB", name: "Beaker B", capacity: 100 },
  { id: "flask", name: "Conical flask", capacity: 100 },
  { id: "tube1", name: "Test tube 1", capacity: 20 },
  { id: "tube2", name: "Test tube 2", capacity: 20 },
  { id: "tube3", name: "Test tube 3", capacity: 20 },
];

export const vesselById = new Map(vessels.map((vessel) => [vessel.id, vessel]));

export const pourVolumes = { drop: 0.5, splash: 5, pour: 20 } as const;

/** Short names printed on the bench dropper bottles. */
export const shortNames: Record<string, string> = {
  water: "H2O",
  hcl: "HCl",
  naoh: "NaOH",
  vinegar: "Vinegar",
  nahco3: "NaHCO3",
  universal: "Univ. ind.",
  phenolphthalein: "Phenolph.",
  starch: "Starch",
  iodine: "Iodine",
  cuso4: "CuSO4",
  fecl3: "FeCl3",
  kscn: "KSCN",
  agno3: "AgNO3",
  nacl: "NaCl",
  h2o2: "H2O2",
  ki: "KI",
  detergent: "Soap",
};

/** Order of bottles on the bench rack: back row first. */
export const rackOrder = [
  ["water", "hcl", "naoh", "vinegar", "nahco3", "universal", "phenolphthalein", "starch", "iodine"],
  ["cuso4", "fecl3", "kscn", "agno3", "nacl", "h2o2", "ki", "detergent"],
];
