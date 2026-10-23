import * as THREE from "three";
import { useMemo, type ReactNode } from "react";
import { chemicalById, chemicals, itemById, type ModelId } from "../data";
import { useLab } from "../state/store";
import { BaseCabinets, Benchtop, IslandBench, ReceptionCounter, RollBanner, Shelving, SinkUnit, Stool, WallShelf } from "./furniture";
import { Interactive } from "./Interactive";
import { AGENT_POSITION, ISLAND, RECEPTION, ROOM } from "./layout";
import { GEO, MAT } from "./materials";
import { MODELS } from "./models";
import { Agent } from "./models/Agent";
import { FillerBottles, StockBottle, type FillerSlot } from "./models/bottles";
import { Beaker, Erlenmeyer, GraduatedCylinder, Funnel, PetriDishes, VolumetricFlask } from "./models/glassware";
import { signMaterial } from "./models/instruments";
import { shelfTagTexture } from "./textures";

const D = ROOM.halfD;
const W = ROOM.halfW;
const SHELF_LEVELS = [0.12, 0.52, 0.94, 1.36, 1.78];
const SHELF = { width: 2.6, depth: 0.45, height: 2.1 };

type Vec3 = [number, number, number];

function inspectItem(id: string) {
  useLab.getState().openInspect({ type: "item", id });
}

/** A clickable lab item rendered from the model registry, or from custom children. */
function Item({ id, position, rotation = 0, scale = 1, children }: { id: string; position: Vec3; rotation?: number; scale?: number; children?: ReactNode }) {
  const item = itemById.get(id)!;
  const Model = MODELS[item.model as ModelId];
  return (
    <Interactive label={item.name} position={position} rotation-y={rotation} scale={scale} onSelect={() => inspectItem(id)}>
      {children ?? <Model />}
    </Interactive>
  );
}

function ChemicalBottle({ id, position, rotation = 0, scale = 1 }: { id: string; position: Vec3; rotation?: number; scale?: number }) {
  const chemical = chemicalById.get(id)!;
  return (
    <Interactive
      label={chemical.name}
      position={position}
      rotation-y={rotation}
      scale={scale}
      onSelect={() => useLab.getState().openInspect({ type: "chemical", id })}
    >
      <StockBottle chemical={chemical} />
    </Interactive>
  );
}

function ZoneSign({ id, title, subtitle, position, rotation = 0, icon = "flask" }: { id: string; title: string; subtitle: string; position: Vec3; rotation?: number; icon?: "flask" | "eye" | "cross" | "fire" | "goggles" | "hood" }) {
  return (
    <mesh
      geometry={GEO.plane(1.3, 0.42)}
      material={signMaterial(`zone-${id}`, { title, subtitle, bg: "#0b2545", icon, width: 640, height: 206 })}
      position={position}
      rotation-y={rotation}
    />
  );
}

const shelfTags = new Map<string, THREE.MeshBasicMaterial>();
function shelfTagMaterial(name: string) {
  let m = shelfTags.get(name);
  if (!m) {
    m = new THREE.MeshBasicMaterial({ map: shelfTagTexture(name) });
    shelfTags.set(name, m);
  }
  return m;
}

/** Fume hood acids live in the hood; everything else fills the two chemical shelving units. */
const HOOD_CHEMICALS = ["h2so4", "hno3", "nh3"];

export function ChemicalStore() {
  const units = [-6.0, -3.2];
  const z = -D + SHELF.depth / 2 + 0.02;
  const { bottles, fillers } = useMemo(() => {
    const onShelves = chemicals.filter((c) => !HOOD_CHEMICALS.includes(c.id));
    const bottles: { id: string; position: Vec3 }[] = [];
    const fillers: FillerSlot[] = [];
    let seed = 11;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    let k = 0;
    for (const level of SHELF_LEVELS.slice(1)) {
      for (const cx of units) {
        const featured = [-0.78, 0, 0.78].map((dx) => cx + dx);
        for (const x of featured) {
          const chemical = onShelves[k++];
          if (chemical) bottles.push({ id: chemical.id, position: [x, level, z + 0.12] });
        }
        // Smaller unlabelled stock sits further back, leaving a gap around each featured bottle.
        for (let x = cx - 1.2; x <= cx + 1.21; x += 0.085) {
          const nearFeatured = featured.some((fx) => Math.abs(fx - x) < 0.13);
          if (!nearFeatured) fillers.push({ position: [x, level, z - 0.13], kind: Math.floor(rand() * 6), scale: 0.62 + rand() * 0.18 });
        }
      }
    }
    return { bottles, fillers };
  }, []);

  return (
    <group>
      {units.map((x) => (
        <group key={x} position={[x, 0, z]}>
          <Shelving width={SHELF.width} depth={SHELF.depth} height={SHELF.height} levels={SHELF_LEVELS} />
          {/* Bulk containers on the bottom shelf */}
          {[-0.9, -0.3, 0.3, 0.9].map((dx, i) => (
            <mesh key={dx} geometry={i % 2 ? GEO.cyl(0.13, 0.13, 0.34, 24) : GEO.rbox(0.3, 0.32, 0.3, 0.03)} material={i % 2 ? MAT.blue : MAT.white} position={[dx, SHELF_LEVELS[0] + (i % 2 ? 0.17 : 0.16), 0]} castShadow />
          ))}
        </group>
      ))}
      <FillerBottles slots={fillers} />
      {bottles.map((b) => (
        <group key={b.id}>
          <ChemicalBottle id={b.id} position={b.position} scale={1.15} />
          <mesh
            geometry={GEO.plane(0.2, 0.044)}
            material={shelfTagMaterial(chemicalById.get(b.id)!.name)}
            position={[b.position[0], b.position[1] - 0.012, z + SHELF.depth / 2 + 0.006]}
          />
        </group>
      ))}
      <ZoneSign id="chemicals" title="Chemical store" subtitle="Reagents · solvents · indicators" position={[-4.6, 2.55, -D + 0.01]} />
    </group>
  );
}

export function GlasswareZone() {
  const z = -D + SHELF.depth / 2 + 0.02;
  const counterZ = -D + 0.31;
  const front = z + 0.06;
  return (
    <group>
      <group position={[3.2, 0, z]}>
        <Shelving width={SHELF.width} depth={SHELF.depth} height={SHELF.height} levels={SHELF_LEVELS} accent={MAT.teal} back={MAT.navy} />
      </group>
      <Item id="beaker" position={[2.45, SHELF_LEVELS[1], front]} scale={1.5}>
        <group>
          <group scale={1.45} position={[-0.13, 0, 0]}>
            <Beaker label="250 mL" />
          </group>
          <group scale={1.15}>
            <Beaker liquid="#7cc7e8" fill={0.5} />
          </group>
          <group position={[0.11, 0, 0]} scale={0.85}>
            <Beaker label="50 mL" />
          </group>
        </group>
      </Item>
      <Item id="erlenmeyer" position={[3.75, SHELF_LEVELS[1], front]} scale={1.5}>
        <group>
          <group scale={1.3} position={[-0.08, 0, 0]}>
            <Erlenmeyer />
          </group>
          <group position={[0.09, 0, 0]}>
            <Erlenmeyer liquid="#ff7ab8" fill={0.35} />
          </group>
        </group>
      </Item>
      <Item id="gradCylinder" position={[2.45, SHELF_LEVELS[2], front]} scale={1.35}>
        <group>
          <GraduatedCylinder />
          <group position={[0.1, 0, 0]} scale={0.8}>
            <GraduatedCylinder liquid="#bfe9f0" fill={0.3} />
          </group>
        </group>
      </Item>
      <Item id="volumetricFlask" position={[3.75, SHELF_LEVELS[2], front]} scale={1.4}>
        <group>
          <VolumetricFlask />
          <group position={[0.11, 0, 0]} scale={0.8}>
            <VolumetricFlask liquid="#f6e7a6" />
          </group>
        </group>
      </Item>
      <Item id="petriDish" position={[2.45, SHELF_LEVELS[3], front]} scale={1.6}>
        <group>
          <PetriDishes count={5} />
          <group position={[0.11, 0, 0]}>
            <PetriDishes count={3} />
          </group>
        </group>
      </Item>
      <Item id="funnel" position={[3.75, SHELF_LEVELS[3], front]} scale={1.6}>
        <group>
          <Funnel />
          <group position={[0.12, 0, 0]}>
            <Funnel />
          </group>
        </group>
      </Item>
      {/* Spare glassware on the top shelf */}
      {[2.25, 2.6, 2.95, 3.45, 3.8, 4.15].map((x, i) => (
        <group key={x} position={[x, SHELF_LEVELS[4], z]} scale={i % 2 ? 1.6 : 1.9}>
          {i % 3 === 2 ? <Erlenmeyer /> : <Beaker />}
        </group>
      ))}

      <group position={[6.0, 0, counterZ]}>
        <BaseCabinets width={2.6} depth={0.62} />
        <Benchtop width={2.62} depth={0.64} />
      </group>
      <Item id="buretteStand" position={[5.1, 0.94, counterZ + 0.05]} scale={1.15} />
      <Item id="roundFlask" position={[5.9, 0.94, counterZ + 0.08]} scale={1.5} />
      <Item id="testTubes" position={[6.65, 0.94, counterZ + 0.08]} scale={1.5} />
      <group position={[6.0, 1.6, -D]}>
        <WallShelf width={2.2} backing={MAT.navy} />
        {[-0.8, -0.5, -0.2, 0.2, 0.5, 0.8].map((x, i) => (
          <group key={x} position={[x, 0.0125, 0.11]} scale={i % 2 ? 1.5 : 1.8}>
            {i % 2 ? <Erlenmeyer liquid={i === 3 ? "#9be7c4" : undefined} /> : <Beaker />}
          </group>
        ))}
      </group>
      <ZoneSign id="glassware" title="Glassware" subtitle="Beakers · flasks · cylinders" position={[4.6, 2.55, -D + 0.01]} />
    </group>
  );
}

const INSTRUMENTS = ["microscope", "spectrophotometer", "centrifuge", "balance", "phMeter", "micropipette"];

export function InstrumentsZone() {
  const x = W - 0.35;
  const top = 0.94;
  const rot = -Math.PI / 2;
  return (
    <group>
      <group position={[x, 0, -1.6]} rotation-y={rot}>
        <BaseCabinets width={5.6} depth={0.7} />
        <Benchtop width={5.62} depth={0.72} />
      </group>
      {INSTRUMENTS.map((id, i) => (
        <Item key={id} id={id} position={[x + 0.02, top, -1.6 + (i - 2.5) * 0.76]} rotation={rot} scale={1.35} />
      ))}
      <ZoneSign id="instruments" title="Instruments" subtitle="Analysis · measurement · imaging" position={[W - 0.01, 3.05, -1.6]} rotation={rot} />
    </group>
  );
}

export function SafetyCorner() {
  const wall = -W;
  const rot = Math.PI / 2;
  return (
    <group>
      <Item id="fumeHood" position={[wall + 0.45, 0, -2.6]} rotation={rot} />
      {HOOD_CHEMICALS.map((id, i) => (
        <ChemicalBottle key={id} id={id} position={[wall + 0.42, 0.94, -3.05 + i * 0.3]} rotation={rot} />
      ))}

      <group position={[wall, 1.15, -0.9]} rotation-y={rot}>
        <WallShelf width={0.75} />
        <Item id="goggles" position={[-0.17, 0.0125, 0.11]} />
        <Item id="gloves" position={[0.17, 0.0125, 0.11]} />
      </group>
      <Item id="eyewash" position={[wall + 0.01, 1.05, 0.2]} rotation={rot} />
      <mesh geometry={GEO.plane(0.5, 0.19)} material={signMaterial("eyewash", { title: "Eye wash", bg: "#15934c", icon: "eye" })} position={[wall + 0.01, 1.62, 0.2]} rotation-y={rot} />
      <Item id="firstAid" position={[wall + 0.06, 1.42, 1.95]} rotation={rot} />
      <mesh geometry={GEO.plane(0.46, 0.17)} material={signMaterial("firstaid", { title: "First aid", bg: "#15934c", icon: "cross" })} position={[wall + 0.01, 1.76, 1.95]} rotation-y={rot} />
      <Item id="extinguisher" position={[wall + 0.18, 0, 2.8]} rotation={rot} />
      <mesh geometry={GEO.plane(0.5, 0.19)} material={signMaterial("extinguisher", { title: "Fire extinguisher", bg: "#cf1f25", icon: "fire" })} position={[wall + 0.01, 1.35, 2.8]} rotation-y={rot} />
      <mesh geometry={GEO.box(0.04, 0.05, 1.3)} material={MAT.darkSteel} position={[wall + 0.02, 1.86, 4.2]} />
      {[3.85, 4.5].map((z) => (
        <Item key={z} id="labCoat" position={[wall + 0.02, 1.86, z]} rotation={rot} />
      ))}
      <ZoneSign id="safety" title="Safety corner" subtitle="Protect yourself first" position={[wall + 0.01, 2.75, 1.6]} rotation={rot} icon="goggles" />
    </group>
  );
}

export function Reception() {
  return (
    <group>
      <group position={[RECEPTION.center[0], 0, RECEPTION.center[1]]}>
        <ReceptionCounter length={RECEPTION.length} depth={RECEPTION.depth} height={RECEPTION.height} />
      </group>
      <Interactive label="Sales agent — tap to talk" position={AGENT_POSITION} hoverScale={1.02} onSelect={() => useLab.getState().openAgent()}>
        <Agent />
      </Interactive>
      <group position={[3.85, 0, 1.78]} rotation-y={-0.5}>
        <RollBanner />
      </group>
    </group>
  );
}

/** Furniture around the experiment bench; the interactive bench itself is in ExperimentBench. */
export function BenchArea() {
  return (
    <group>
      <group position={[ISLAND.center[0], 0, ISLAND.center[1]]}>
        <IslandBench width={ISLAND.size[0]} depth={ISLAND.size[1]} />
      </group>
      <Item id="hotplate" position={[-3.0, 0.94, -0.35]} rotation={0.2} />
      <Item id="bunsen" position={[0.45, 0.94, -0.45]} rotation={-0.3} />
      {[-2.6, 0.2].map((x) => (
        <group key={x} position={[x, 0, -1.55]}>
          <Stool />
        </group>
      ))}
      <group position={[0, 0, -D + 0.31]}>
        <SinkUnit width={1.6} />
      </group>
    </group>
  );
}
