import type { ComponentType } from "react";
import type { ModelId } from "../../data";
import {
  Beaker,
  BuretteStand,
  Erlenmeyer,
  Funnel,
  GraduatedCylinder,
  PetriDishes,
  RoundBottomFlask,
  TestTubeRack,
  VolumetricFlask,
} from "./glassware";
import {
  AnalyticalBalance,
  BunsenBurner,
  Centrifuge,
  FumeHood,
  HotplateStirrer,
  MicropipetteStand,
  Microscope,
  PhMeter,
  Spectrophotometer,
} from "./instruments";
import { Extinguisher, Eyewash, FirstAidKit, GloveBox, Goggles, LabCoat } from "./safety";

export const MODELS: Record<ModelId, ComponentType> = {
  microscope: Microscope,
  spectrophotometer: Spectrophotometer,
  centrifuge: Centrifuge,
  balance: AnalyticalBalance,
  phMeter: PhMeter,
  micropipette: MicropipetteStand,
  hotplate: HotplateStirrer,
  bunsen: BunsenBurner,
  fumeHood: FumeHood,
  beaker: () => <Beaker liquid="#7cc7e8" fill={0.55} />,
  erlenmeyer: () => <Erlenmeyer liquid="#ff7ab8" fill={0.4} />,
  roundFlask: RoundBottomFlask,
  volumetricFlask: VolumetricFlask,
  gradCylinder: GraduatedCylinder,
  testTubeRack: TestTubeRack,
  funnel: Funnel,
  petriDish: PetriDishes,
  buretteStand: BuretteStand,
  extinguisher: Extinguisher,
  eyewash: Eyewash,
  firstAid: FirstAidKit,
  goggles: Goggles,
  labCoat: LabCoat,
  gloves: GloveBox,
};
