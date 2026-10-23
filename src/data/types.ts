export type ZoneId = "entrance" | "reception" | "chemicals" | "glassware" | "instruments" | "safety" | "bench";

export type ModelId =
  | "microscope"
  | "spectrophotometer"
  | "centrifuge"
  | "balance"
  | "phMeter"
  | "micropipette"
  | "hotplate"
  | "bunsen"
  | "fumeHood"
  | "beaker"
  | "erlenmeyer"
  | "roundFlask"
  | "volumetricFlask"
  | "gradCylinder"
  | "testTubeRack"
  | "funnel"
  | "petriDish"
  | "buretteStand"
  | "extinguisher"
  | "eyewash"
  | "firstAid"
  | "goggles"
  | "labCoat"
  | "gloves";

export interface LabItem {
  id: string;
  name: string;
  kind: "Instrument" | "Equipment" | "Glassware" | "Safety" | "Consumable";
  zone: ZoneId;
  model: ModelId;
  summary: string;
  uses: string[];
  tips: string[];
}

export type Hazard = "corrosive" | "flammable" | "oxidiser" | "toxic" | "harmful" | "health" | "environment";

export type BottleStyle = "clear" | "amber" | "plastic" | "jar";

export interface Chemical {
  id: string;
  name: string;
  formula: string;
  cas: string | null;
  form: "Solution" | "Liquid" | "Solid" | "Indicator";
  summary: string;
  uses: string[];
  hazards: Hazard[];
  handling: string;
  /** Colour of the substance as seen in its bottle. */
  color: string;
  bottle: BottleStyle;
  /** True when the chemical is also a reagent at the experiment bench. */
  bench: boolean;
}

export interface Company {
  name: string;
  country: string;
  supplies: string[];
  phone: string;
  phoneIntl: string;
  email: string;
  address: string | null;
  mapUrl: string | null;
  hours: string | null;
  agentTitle: string;
}

export type VesselId = "beakerA" | "beakerB" | "flask" | "tube1" | "tube2" | "tube3";

export type PourAmount = "drop" | "splash" | "pour";

export interface ExperimentStep {
  reagent: string;
  amount: PourAmount;
  vessel: VesselId;
}

export interface Experiment {
  id: string;
  title: string;
  goal: string;
  steps: ExperimentStep[];
  explanation: string;
  note?: string;
}
