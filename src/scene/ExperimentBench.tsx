import * as THREE from "three";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { chemicalById, rackOrder, shortNames, vesselById, vessels, type VesselId } from "../data";
import { currentGuideStep, useBench, type Pour } from "../state/store";
import { Interactive } from "./Interactive";
import { BENCH_TOP, RACK, VESSEL_POSITIONS } from "./layout";
import { GEO, MAT, RENDER_ORDER } from "./materials";
import { DropperBottle } from "./models/bottles";
import { GlassShell, levelFor, liquidGeometry, radiusAt, SHAPES, type VesselShape } from "./models/glassware";
import { tagTexture } from "./textures";

const BOTTLE_SCALE = 1.25;
/** Dropper tip height above the bottle's base, in bench units. */
const TIP = 0.104 * BOTTLE_SCALE;
const TUBE_LIFT = 0.016;
const DURATION = { drop: 2.1, splash: 2.0, pour: 2.4 } as const;
/** Seconds into a pour when the reagent is actually added. */
const COMMIT_AT = 1.0;

const now = () => performance.now() / 1000;

interface VesselDef {
  id: VesselId;
  shape: VesselShape;
  top: number;
  base: THREE.Vector3;
  ring: number;
  tag: string;
}

const DEFS: VesselDef[] = vessels.map((v) => {
  const [x, y, z] = VESSEL_POSITIONS[v.id];
  const tube = v.id.startsWith("tube");
  const shape = v.id === "flask" ? SHAPES.erlenmeyer : tube ? SHAPES.testTube : SHAPES.beaker;
  return {
    id: v.id,
    shape,
    top: shape.outer[shape.outer.length - 1][1],
    base: new THREE.Vector3(x, y + (tube ? TUBE_LIFT : 0), z),
    ring: tube ? 0.017 : v.id === "flask" ? 0.052 : 0.044,
    tag: v.id === "flask" ? "F" : tube ? v.id.slice(-1) : v.id.slice(-1),
  };
});
const DEF_BY_ID = new Map(DEFS.map((d) => [d.id, d]));

function rackPosition(id: string): THREE.Vector3 {
  for (let row = 0; row < rackOrder.length; row++) {
    const ids = rackOrder[row];
    const i = ids.indexOf(id);
    if (i < 0) continue;
    return new THREE.Vector3(
      RACK.x + (i - (ids.length - 1) / 2) * RACK.spacing,
      row === 0 ? BENCH_TOP + 0.05 : BENCH_TOP,
      row === 0 ? RACK.backZ : RACK.frontZ,
    );
  }
  return new THREE.Vector3();
}

const ease = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};

interface Pose {
  position: THREE.Vector3;
  tilt: number;
  /** 0–1 while liquid leaves the bottle. */
  flow: number;
  tip: THREE.Vector3;
}

/** Where the bottle is, and how far it is tipped, at time t into a pour. */
function pourPose(pour: Pour, t: number, out: Pose) {
  const T = DURATION[pour.amount];
  const def = DEF_BY_ID.get(pour.vessel)!;
  const rest = rackPosition(pour.reagent);
  const tiltMax = pour.amount === "drop" ? 2.55 : pour.amount === "pour" ? 2.05 : 1.8;
  const tilt = tiltMax * (ease((t - 0.55) / 0.35) - ease((t - (T - 0.9)) / 0.35));
  const tiltFrac = tilt / tiltMax;
  const tipTarget = new THREE.Vector3(def.base.x, def.base.y + def.top + 0.03 + (1 - tiltFrac) * 0.13, def.base.z);
  // Origin = tip target minus the rotated tip offset (rotation of -tilt about z).
  const hover = tipTarget.clone().sub(new THREE.Vector3(TIP * Math.sin(tilt), TIP * Math.cos(tilt), 0));
  const go = ease(t / 0.55);
  const back = ease((t - (T - 0.55)) / 0.55);
  const travel = go - back;
  out.position.lerpVectors(rest, hover, travel);
  out.position.y += Math.sin(Math.PI * travel) * 0.06 * (travel < 1 ? 1 : 0);
  out.tilt = tilt;
  out.flow = tiltFrac > 0.92 ? 1 : 0;
  out.tip.copy(out.position).add(new THREE.Vector3(TIP * Math.sin(tilt), TIP * Math.cos(tilt), 0));
}

const ringSelected = new THREE.MeshBasicMaterial({ color: "#0fa3a3", transparent: true, opacity: 0.95, depthWrite: false });
const ringHint = new THREE.MeshBasicMaterial({ color: "#f59e0b", transparent: true, opacity: 0.9, depthWrite: false });
const ringFocus = new THREE.MeshBasicMaterial({ color: "#0b63b6", transparent: true, opacity: 0.85, depthWrite: false });

function BenchReagent({ id }: { id: string }) {
  const chemical = chemicalById.get(id)!;
  const rest = useMemo(() => rackPosition(id), [id]);
  const body = useRef<THREE.Group>(null);
  const selectedRing = useRef<THREE.Mesh>(null);
  const hintRing = useRef<THREE.Mesh>(null);
  const pose = useMemo<Pose>(() => ({ position: new THREE.Vector3(), tilt: 0, flow: 0, tip: new THREE.Vector3() }), []);

  useFrame((_, delta) => {
    const g = body.current;
    if (!g) return;
    const { pour, selectedReagent } = useBench.getState();
    if (pour && pour.reagent === id) {
      pourPose(pour, now() - pour.start, pose);
      g.position.copy(pose.position).sub(rest);
      g.rotation.z = -pose.tilt;
    } else {
      const lift = selectedReagent === id ? 0.035 : 0;
      g.position.x = THREE.MathUtils.damp(g.position.x, 0, 10, delta);
      g.position.y = THREE.MathUtils.damp(g.position.y, lift, 10, delta);
      g.position.z = THREE.MathUtils.damp(g.position.z, 0, 10, delta);
      g.rotation.z = THREE.MathUtils.damp(g.rotation.z, 0, 10, delta);
    }
    const step = currentGuideStep();
    if (selectedRing.current) selectedRing.current.visible = selectedReagent === id;
    if (hintRing.current) hintRing.current.visible = !!step && step.reagent === id && selectedReagent !== id && !pour;
  });

  return (
    <Interactive
      label={chemical.name}
      activeIn="bench"
      position={rest}
      hoverScale={1.08}
      onSelect={() => {
        if (!useBench.getState().pour) useBench.getState().selectReagent(id);
      }}
    >
      <group ref={body}>
        <group scale={BOTTLE_SCALE}>
          <DropperBottle chemical={chemical} short={shortNames[id] ?? chemical.formula} />
        </group>
      </group>
      <mesh ref={selectedRing} geometry={GEO.torus(0.032, 0.003, Math.PI * 2, 6, 32)} material={ringSelected} rotation-x={-Math.PI / 2} position={[0, 0.003, 0]} visible={false} />
      <mesh ref={hintRing} geometry={GEO.torus(0.032, 0.003, Math.PI * 2, 6, 32)} material={ringHint} rotation-x={-Math.PI / 2} position={[0, 0.003, 0]} visible={false} />
    </Interactive>
  );
}

const AQUA = new THREE.Color("#a9dcea");

function VesselLiquid({ def }: { def: VesselDef }) {
  const mesh = useRef<THREE.Mesh>(null);
  const level = useRef(def.shape.inner[0][1]);
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#dff3fb", roughness: 0.08, transparent: true, opacity: 0, emissive: "#dff3fb", emissiveIntensity: 0.22 }),
    [],
  );
  const target = useMemo(() => new THREE.Color(), []);
  useFrame((_, delta) => {
    const m = mesh.current;
    if (!m) return;
    const v = useBench.getState().vessels[def.id];
    const capacity = vesselById.get(def.id)!.capacity;
    const goal = v.analysis.volume > 0 ? levelFor(def.shape, v.analysis.volume / capacity) : def.shape.inner[0][1];
    level.current = THREE.MathUtils.damp(level.current, goal, 3.5, delta);
    const geometry = liquidGeometry(def.shape, level.current);
    m.visible = !!geometry;
    if (geometry && m.geometry !== geometry) m.geometry = geometry;
    const k = 1 - Math.exp(-3.5 * delta);
    target.set(v.analysis.color);
    // Nearly colourless solutions get a faint aqua tint so they read against the dark bench.
    if (v.analysis.coverage < 0.3 && v.analysis.turbidity < 0.3) target.lerp(AQUA, 0.45 * (1 - v.analysis.coverage / 0.3));
    material.color.lerp(target, k);
    material.emissive.lerp(target, k);
    const opacity = v.analysis.volume > 0 ? Math.max(0.58, v.analysis.opacity) : 0;
    material.opacity = THREE.MathUtils.damp(material.opacity, opacity, 4, delta);
    m.userData.level = level.current;
  });
  return <mesh ref={mesh} name={`liquid-${def.id}`} material={material} renderOrder={RENDER_ORDER.liquid} />;
}

/** Rising bubbles, and froth on the surface, while gas is being released. */
function Bubbles({ def }: { def: VesselDef }) {
  const COUNT = 60;
  const mesh = useRef<THREE.InstancedMesh>(null);
  const froth = useRef<THREE.Mesh>(null);
  const seeds = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => ({
        a: (i * 2.399) % (Math.PI * 2),
        r: 0.15 + ((i * 37) % 10) / 12,
        speed: 0.7 + ((i * 13) % 7) / 5,
        phase: (i * 0.618) % 1,
        size: 0.0019 + ((i * 7) % 5) * 0.0006,
      })),
    [],
  );
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const material = useMemo(() => new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.05, transparent: true, opacity: 0.85, emissive: "#ffffff", emissiveIntensity: 0.2 }), []);
  const frothMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: "#fbfdfd", roughness: 0.6, transparent: true, opacity: 0, depthWrite: false }), []);
  useFrame(() => {
    const m = mesh.current;
    const f = froth.current;
    if (!m || !f) return;
    const v = useBench.getState().vessels[def.id];
    const age = now() - v.fx.gasAt;
    const duration = Math.min(10, 3.5 + v.fx.gasAmount * 0.8);
    const intensity = v.analysis.volume > 0 && age < duration ? 1 - age / duration : 0;
    m.visible = intensity > 0;
    f.visible = intensity > 0;
    if (!m.visible) return;
    const floor = def.shape.inner[0][1];
    const top = levelFor(def.shape, v.analysis.volume / vesselById.get(def.id)!.capacity);
    const t = now();
    seeds.forEach((s, i) => {
      const active = i / COUNT < intensity * 1.2;
      const u = (t * s.speed * 0.9 + s.phase) % 1;
      const y = floor + 0.002 + u * Math.max(0.001, top - floor - 0.002);
      const r = radiusAt(def.shape, y) * Math.min(0.85, s.r * 0.75);
      dummy.position.set(Math.cos(s.a + u * 2) * r, y, Math.sin(s.a + u * 2) * r);
      dummy.scale.setScalar(active ? s.size * (0.6 + u * 0.7) : 0);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    f.position.y = top + 0.0015;
    f.scale.setScalar(radiusAt(def.shape, top) * 0.96);
    frothMaterial.opacity = Math.min(0.85, intensity * 1.3);
  });
  return (
    <group>
      <instancedMesh ref={mesh} args={[GEO.sphere(1, 8, 6), material, COUNT]} frustumCulled={false} renderOrder={RENDER_ORDER.liquid + 0.5} dispose={null} />
      <mesh ref={froth} geometry={GEO.circle(1, 32)} material={frothMaterial} rotation-x={-Math.PI / 2} renderOrder={RENDER_ORDER.liquid + 0.6} visible={false} />
    </group>
  );
}

/** Solid particles that cloud the liquid and then settle to the bottom. */
function Precipitate({ def }: { def: VesselDef }) {
  const COUNT = 90;
  const mesh = useRef<THREE.InstancedMesh>(null);
  const sediment = useRef<THREE.Mesh>(null);
  const seeds = useMemo(
    () => Array.from({ length: COUNT }, (_, i) => ({ a: (i * 2.399) % (Math.PI * 2), r: Math.sqrt(((i * 53) % 97) / 97), y: ((i * 31) % 89) / 89, delay: (i % 9) * 0.35, stack: ((i * 17) % 11) / 11, size: 0.0016 + ((i * 7) % 6) * 0.0003 })),
    [],
  );
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const material = useMemo(() => new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.9 }), []);
  const sedimentMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.9, transparent: true, opacity: 0 }), []);
  useFrame(() => {
    const m = mesh.current;
    if (!m || !sediment.current) return;
    const v = useBench.getState().vessels[def.id];
    const precipitates = v.analysis.precipitates;
    const total = precipitates.reduce((sum, p) => sum + p.mmol, 0);
    m.visible = total > 0;
    sediment.current.visible = total > 0;
    if (!m.visible) return;
    const main = precipitates.reduce((a, b) => (b.mmol > a.mmol ? b : a));
    material.color.set(main.color);
    sedimentMaterial.color.set(main.color);
    const floor = def.shape.inner[0][1];
    const top = levelFor(def.shape, v.analysis.volume / vesselById.get(def.id)!.capacity);
    const shown = Math.round(Math.min(1, 0.25 + v.analysis.turbidity) * COUNT);
    const age = now() - v.fx.precipitateAt;
    const t = now();
    seeds.forEach((s, i) => {
      const settle = Math.min(1, Math.max(0, (age - s.delay) / 6));
      const eased = settle * settle * (3 - 2 * settle);
      const y0 = floor + 0.003 + s.y * Math.max(0.002, top - floor - 0.006);
      const y = y0 + (floor + 0.0025 + s.stack * 0.004 - y0) * eased;
      const r = radiusAt(def.shape, y) * 0.85 * s.r;
      const a = s.a + t * 0.25 * (1 - eased);
      dummy.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
      dummy.scale.setScalar(i < shown ? s.size : 0);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    sedimentMaterial.opacity = Math.min(0.95, 0.2 + Math.min(1, age / 6) * 0.75);
  });
  const bottomRadius = radiusAt(def.shape, def.shape.inner[0][1] + 0.003) * 0.92;
  return (
    <group>
      <instancedMesh ref={mesh} args={[GEO.custom("pptGeo", () => new THREE.IcosahedronGeometry(1, 0)), material, COUNT]} frustumCulled={false} dispose={null} />
      <mesh ref={sediment} geometry={GEO.circle(Math.max(0.004, bottomRadius), 24)} material={sedimentMaterial} rotation-x={-Math.PI / 2} position={[0, def.shape.inner[0][1] + 0.0025, 0]} visible={false} />
    </group>
  );
}

const bezier = (a: number, b: number, c: number, t: number) => (1 - t) * (1 - t) * a + 2 * (1 - t) * t * b + t * t * c;

/** Foam that rises out of the vessel's neck as a thick column, then flops over and piles up on the bench. */
function Foam({ def }: { def: VesselDef }) {
  const COUNT = 220;
  const mesh = useRef<THREE.InstancedMesh>(null);
  const seeds = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => ({
        p: i / COUNT,
        spread: ((i * 0.618) % 1) * 2 - 1,
        ring: (i * 2.399) % (Math.PI * 2),
        jitter: ((i * 29) % 17) / 17,
        size: 0.6 + ((i * 11) % 9) / 14,
      })),
    [],
  );
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const material = useMemo(() => new THREE.MeshStandardMaterial({ color: "#fbfaf2", roughness: 0.35, emissive: "#fffdf0", emissiveIntensity: 0.08 }), []);
  const cream = useMemo(() => new THREE.Color("#fffdf4"), []);
  useFrame(() => {
    const m = mesh.current;
    if (!m) return;
    const v = useBench.getState().vessels[def.id];
    const amount = v.fx.foamAmount;
    m.visible = amount > 0 && v.analysis.volume > 0;
    if (!m.visible) return;
    const k = Math.min(1.4, Math.max(0.6, amount / 7));
    const age = now() - v.fx.foamAt;
    const front = Math.min(1, age / 3.8);
    const mouth = radiusAt(def.shape, def.top - 0.004);
    material.color.set(v.analysis.color).lerp(cream, 0.72);
    const rise = 0.17 * k;
    const reach = 0.09 * k;
    const t = now();
    seeds.forEach((s, i) => {
      // Each blob sits at a fixed place along the foam's path; the path grows as the front advances.
      const p = s.p * front;
      const dir = Math.PI / 2 + s.spread * (0.25 + 0.9 * Math.max(0, p - 0.55));
      const dx = Math.cos(dir);
      const dz = Math.sin(dir);
      let along = 0;
      let y = 0;
      if (p < 0.4) {
        y = def.top - 0.02 + (p / 0.4) * rise;
      } else if (p < 0.65) {
        const q = (p - 0.4) / 0.25;
        along = bezier(0, reach * 0.15, reach, q);
        y = bezier(def.top - 0.02 + rise, def.top + rise * 1.25, def.top + rise * 0.55, q);
      } else {
        const q = (p - 0.65) / 0.35;
        along = reach + q * reach * 1.3;
        y = THREE.MathUtils.lerp(def.top + rise * 0.55, 0.012 + s.jitter * 0.03 * k, Math.pow(q, 0.8));
      }
      const thickness = (mouth * 0.9 + 0.006) * (0.4 + s.jitter * 0.6) * (p > 0.65 ? 1.6 : 1);
      const wobble = 1 + Math.sin(t * 2.5 + i) * 0.04;
      dummy.position.set(dx * along + Math.cos(s.ring) * thickness, y + Math.sin(s.ring) * thickness * 0.5, dz * along + Math.sin(s.ring) * thickness);
      const grow = Math.min(1, (front * COUNT - i) / 12);
      dummy.scale.setScalar(grow > 0 ? (0.0085 + 0.0075 * s.size) * k * grow * wobble : 0);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={mesh} args={[GEO.custom("foamGeo", () => new THREE.IcosahedronGeometry(1, 1)), material, COUNT]} frustumCulled={false} renderOrder={RENDER_ORDER.foam} dispose={null} />;
}

const tagMaterials = new Map<string, THREE.MeshBasicMaterial>();
function tagMaterial(text: string) {
  let m = tagMaterials.get(text);
  if (!m) {
    m = new THREE.MeshBasicMaterial({ map: tagTexture(text), transparent: true });
    tagMaterials.set(text, m);
  }
  return m;
}

function BenchVessel({ def }: { def: VesselDef }) {
  const focusRing = useRef<THREE.Mesh>(null);
  const hintRing = useRef<THREE.Mesh>(null);
  const targetRing = useRef<THREE.Mesh>(null);
  const name = vesselById.get(def.id)!.name;
  useFrame(() => {
    const { focus, selectedReagent, pour } = useBench.getState();
    const step = currentGuideStep();
    if (focusRing.current) focusRing.current.visible = focus === def.id && !selectedReagent;
    if (hintRing.current) hintRing.current.visible = !!step && step.vessel === def.id && !pour && (selectedReagent === step.reagent || !selectedReagent);
    if (targetRing.current) targetRing.current.visible = !!selectedReagent && !pour && !(step && step.vessel === def.id);
  });
  const tube = def.id.startsWith("tube");
  return (
    <group position={def.base}>
      <Interactive label={name} activeIn="bench" hoverScale={1.03} onSelect={() => useBench.getState().clickVessel(def.id)}>
        <VesselLiquid def={def} />
        <Bubbles def={def} />
        <Precipitate def={def} />
        <GlassShell shape={def.shape} />
        {/* A generous invisible hit area makes thin test tubes easy to tap. */}
        <mesh geometry={GEO.cyl(def.ring + 0.012, def.ring + 0.012, def.top + 0.03, 12)} position={[0, (def.top + 0.03) / 2, 0]} visible={false} />
      </Interactive>
      <Foam def={def} />
      <group position={[0, tube ? -TUBE_LIFT : 0, 0]}>
        <mesh ref={focusRing} geometry={GEO.torus(def.ring, 0.003, Math.PI * 2, 6, 40)} material={ringFocus} rotation-x={-Math.PI / 2} position={[0, 0.003, 0]} visible={false} />
        <mesh ref={hintRing} geometry={GEO.torus(def.ring + 0.006, 0.0035, Math.PI * 2, 6, 40)} material={ringHint} rotation-x={-Math.PI / 2} position={[0, 0.004, 0]} visible={false} />
        <mesh ref={targetRing} geometry={GEO.torus(def.ring, 0.0022, Math.PI * 2, 6, 40)} material={ringSelected} rotation-x={-Math.PI / 2} position={[0, 0.003, 0]} visible={false} />
        <mesh geometry={GEO.plane(tube ? 0.04 : 0.05, tube ? 0.02 : 0.025)} material={tagMaterial(def.tag)} rotation-x={-Math.PI / 2} position={[0, 0.002, tube ? 0.06 : def.ring + 0.03]} />
      </group>
    </group>
  );
}

/** Drives the pour timeline: commits the addition mid-pour, draws the stream or drops, then ends it. */
function PourDriver() {
  const stream = useRef<THREE.Mesh>(null);
  const drops = useRef<THREE.Group>(null);
  const committed = useRef(-1);
  const pose = useMemo<Pose>(() => ({ position: new THREE.Vector3(), tilt: 0, flow: 0, tip: new THREE.Vector3() }), []);
  const streamMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: "#dff3fb", roughness: 0.05, transparent: true, opacity: 0.7 }), []);
  useFrame((state) => {
    const bench = useBench.getState();
    const pour = bench.pour;
    const s = stream.current;
    const d = drops.current;
    if (!s || !d) return;
    if (!pour) {
      s.visible = false;
      d.visible = false;
      return;
    }
    const t = now() - pour.start;
    if (t >= COMMIT_AT && committed.current !== pour.start) {
      committed.current = pour.start;
      bench.commitPour();
    }
    if (t >= DURATION[pour.amount]) {
      bench.finishPour();
      return;
    }
    pourPose(pour, t, pose);
    const def = DEF_BY_ID.get(pour.vessel)!;
    const liquid = state.scene.getObjectByName(`liquid-${def.id}`);
    const surface = def.base.y + ((liquid?.userData.level as number | undefined) ?? def.shape.inner[0][1]);
    const color = chemicalById.get(pour.reagent)!.color;
    streamMaterial.color.set(color);
    if (pour.amount === "drop") {
      s.visible = false;
      d.visible = pose.flow > 0;
      d.children.forEach((drop, i) => {
        const u = (t * 2.6 + i / d.children.length) % 1;
        drop.position.set(pose.tip.x, pose.tip.y + (surface - pose.tip.y) * u * u, pose.tip.z);
      });
    } else {
      d.visible = false;
      s.visible = pose.flow > 0;
      const length = Math.max(0.005, pose.tip.y - surface);
      const width = pour.amount === "pour" ? 1.5 : 1;
      s.position.set(pose.tip.x, pose.tip.y - length / 2, pose.tip.z);
      s.scale.set(width * (1 + Math.sin(t * 40) * 0.08), length, width);
    }
  });
  return (
    <group>
      <mesh ref={stream} geometry={GEO.cyl(0.0024, 0.0018, 1, 10, true)} material={streamMaterial} visible={false} renderOrder={RENDER_ORDER.glass + 1} />
      <group ref={drops} visible={false}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} geometry={GEO.sphere(0.0035, 10, 8)} material={streamMaterial} scale={[1, 1.3, 1]} />
        ))}
      </group>
    </group>
  );
}

function TubeRack() {
  const plate = GEO.custom("benchRackPlate", () => {
    const shape = new THREE.Shape();
    shape.moveTo(-0.125, -0.035);
    shape.lineTo(0.125, -0.035);
    shape.lineTo(0.125, 0.035);
    shape.lineTo(-0.125, 0.035);
    shape.closePath();
    for (const x of [-0.08, 0, 0.08]) {
      const hole = new THREE.Path();
      hole.absarc(x, 0, 0.0125, 0, Math.PI * 2, false);
      shape.holes.push(hole);
    }
    const g = new THREE.ExtrudeGeometry(shape, { depth: 0.008, bevelEnabled: false });
    g.rotateX(-Math.PI / 2);
    return g;
  });
  const [x, , z] = VESSEL_POSITIONS.tube2;
  return (
    <group position={[x, BENCH_TOP, z]}>
      <mesh geometry={GEO.box(0.25, 0.01, 0.07)} material={MAT.white} position={[0, 0.005, 0]} receiveShadow />
      <mesh geometry={plate} material={MAT.white} position={[0, 0.095, 0]} castShadow />
      {[-1, 1].map((s) => (
        <mesh key={s} geometry={GEO.box(0.01, 0.1, 0.07)} material={MAT.white} position={[s * 0.12, 0.05, 0]} castShadow />
      ))}
    </group>
  );
}

function ReagentRack() {
  return (
    <group position={[RACK.x, BENCH_TOP, RACK.backZ]}>
      <mesh geometry={GEO.rbox(RACK.spacing * 9 + 0.04, 0.05, 0.12, 0.008)} material={MAT.white} position={[0, 0.025, 0]} castShadow receiveShadow />
      <mesh geometry={GEO.box(RACK.spacing * 9 + 0.04, 0.012, 0.004)} material={MAT.teal} position={[0, 0.03, 0.061]} />
    </group>
  );
}

export function ExperimentBench() {
  useFrame(() => {
    const pulse = 0.45 + Math.sin(now() * 5) * 0.4;
    ringHint.opacity = pulse;
  });
  return (
    <group>
      <ReagentRack />
      <TubeRack />
      {rackOrder.flat().map((id) => (
        <BenchReagent key={id} id={id} />
      ))}
      {DEFS.map((def) => (
        <BenchVessel key={def.id} def={def} />
      ))}
      <PourDriver />
    </group>
  );
}
