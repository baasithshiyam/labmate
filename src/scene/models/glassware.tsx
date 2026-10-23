import * as THREE from "three";
import { useMemo } from "react";
import { GEO, MAT, RENDER_ORDER, shellProfile } from "../materials";
import { graduationTexture } from "../textures";

type P = [number, number];

export interface VesselShape {
  key: string;
  outer: P[];
  /** Interior profile from the floor centre up to the rim; liquids are cut from it. */
  inner: P[];
  wall: number;
  /** Height of the liquid surface at the vessel's nominal capacity. */
  fullHeight: number;
}

function tubeOuter(r: number, h: number, lip: number, segments = 8): P[] {
  const pts: P[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * (Math.PI / 2);
    pts.push([r * Math.sin(t), r - r * Math.cos(t)]);
  }
  pts.push([r, h], [r + lip, h]);
  return pts;
}

export const SHAPES = {
  beaker: {
    key: "beaker",
    outer: [
      [0, 0],
      [0.031, 0],
      [0.034, 0.003],
      [0.034, 0.088],
      [0.0365, 0.092],
    ],
    inner: [
      [0, 0.003],
      [0.0316, 0.003],
      [0.0321, 0.0048],
      [0.0321, 0.088],
    ],
    wall: 0.0018,
    fullHeight: 0.08,
  },
  erlenmeyer: {
    key: "erlenmeyer",
    outer: [
      [0, 0],
      [0.04, 0],
      [0.0435, 0.004],
      [0.0135, 0.082],
      [0.0125, 0.088],
      [0.0125, 0.112],
      [0.0145, 0.115],
    ],
    inner: [
      [0, 0.003],
      [0.0404, 0.003],
      [0.0413, 0.0062],
      [0.0118, 0.083],
      [0.0108, 0.09],
      [0.0108, 0.112],
    ],
    wall: 0.0018,
    fullHeight: 0.084,
  },
  testTube: {
    key: "testTube",
    outer: tubeOuter(0.0105, 0.15, 0.0013),
    inner: tubeOuter(0.0094, 0.149, 0, 8).slice(0, -1).map(([x, y]) => [x, y + 0.0011] as P),
    wall: 0.0011,
    fullHeight: 0.125,
  },
} satisfies Record<string, VesselShape>;

/** Volume (m³) of an interior profile below height h, from stacked frustums. */
function volumeBelow(inner: P[], h: number) {
  let v = 0;
  for (let i = 0; i < inner.length - 1; i++) {
    const [r1, y1] = inner[i];
    const [r2raw, y2raw] = inner[i + 1];
    if (y2raw <= y1) continue;
    if (h <= y1) break;
    const y2 = Math.min(y2raw, h);
    const r2 = r1 + ((r2raw - r1) * (y2 - y1)) / (y2raw - y1);
    v += (Math.PI * (y2 - y1) * (r1 * r1 + r1 * r2 + r2 * r2)) / 3;
  }
  return v;
}

/** Interior radius of a vessel at height y. */
export function radiusAt(shape: VesselShape, y: number): number {
  const inner = shape.inner;
  for (let i = 1; i < inner.length; i++) {
    const [x1, y1] = inner[i];
    if (y1 >= y) {
      const [x0, y0] = inner[i - 1];
      return y1 === y0 ? Math.max(x0, x1) : x0 + ((x1 - x0) * (y - y0)) / (y1 - y0);
    }
  }
  return inner[inner.length - 1][0];
}

/** Height of the liquid surface when the vessel holds `fraction` of its capacity. */
export function levelFor(shape: VesselShape, fraction: number): number {
  const floor = shape.inner[0][1];
  if (fraction <= 0) return floor;
  const target = volumeBelow(shape.inner, shape.fullHeight) * Math.min(1, fraction);
  let lo = floor;
  let hi = shape.fullHeight;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (volumeBelow(shape.inner, mid) < target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Lathe geometry of the liquid up to `level`, including its flat surface. Cached per 0.5 mm step. */
export function liquidGeometry(shape: VesselShape, level: number, inset = 0.0004): THREE.BufferGeometry | null {
  const floor = shape.inner[0][1];
  const quantised = Math.round(level * 2000) / 2000;
  if (quantised <= floor + 0.0005) return null;
  return GEO.custom(`liquid-${shape.key}-${quantised}-${inset}`, () => {
    const pts: P[] = [];
    for (let i = 0; i < shape.inner.length; i++) {
      const [x, y] = shape.inner[i];
      if (y >= quantised) {
        const [px, py] = shape.inner[i - 1];
        const t = (quantised - py) / (y - py);
        pts.push([Math.max(0, px + (x - px) * t - inset), quantised]);
        break;
      }
      pts.push([Math.max(0, x - inset), y]);
    }
    const last = pts[pts.length - 1];
    if (last[1] < quantised) pts.push([last[0], quantised]);
    pts.push([0, quantised]);
    return new THREE.LatheGeometry(
      pts.map(([x, y]) => new THREE.Vector2(x, y)),
      36,
    );
  });
}

export function GlassShell({ shape, material = MAT.glass }: { shape: VesselShape; material?: THREE.Material }) {
  const geometry = GEO.lathe(`shell-${shape.key}`, shellProfile(shape.outer, shape.wall), 40);
  return <mesh geometry={geometry} material={material} renderOrder={RENDER_ORDER.glass} />;
}

const liquidMaterials = new Map<string, THREE.MeshStandardMaterial>();
export function staticLiquidMaterial(color: string, opacity = 0.75) {
  const key = `${color}-${opacity}`;
  let m = liquidMaterials.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.12,
      transparent: true,
      opacity,
      emissive: color,
      emissiveIntensity: 0.12,
    });
    liquidMaterials.set(key, m);
  }
  return m;
}

export function StaticLiquid({ shape, fraction, color, opacity }: { shape: VesselShape; fraction: number; color: string; opacity?: number }) {
  const geometry = liquidGeometry(shape, levelFor(shape, fraction), 0.0006);
  if (!geometry) return null;
  return <mesh geometry={geometry} material={staticLiquidMaterial(color, opacity)} renderOrder={RENDER_ORDER.liquid} />;
}

const gradMaterials = new Map<string, THREE.MeshBasicMaterial>();
function graduationMaterial(label: string) {
  let m = gradMaterials.get(label);
  if (!m) {
    m = new THREE.MeshBasicMaterial({ map: graduationTexture(label), transparent: true, depthWrite: false, opacity: 0.9 });
    gradMaterials.set(label, m);
  }
  return m;
}

/** White printed graduation marks on the front of straight-sided glass. */
export function Graduations({ radius, y, height, label }: { radius: number; y: number; height: number; label: string }) {
  return (
    <mesh
      geometry={GEO.label(radius + 0.0006, height, 0.9)}
      material={graduationMaterial(label)}
      position={[0, y, 0]}
      renderOrder={RENDER_ORDER.glass + 1}
    />
  );
}

export function Beaker({ liquid, fill = 0.5, label = "100 mL" }: { liquid?: string; fill?: number; label?: string }) {
  const s = SHAPES.beaker;
  return (
    <group>
      {liquid && <StaticLiquid shape={s} fraction={fill} color={liquid} />}
      <GlassShell shape={s} />
      <Graduations radius={0.034} y={0.047} height={0.07} label={label} />
    </group>
  );
}

export function Erlenmeyer({ liquid, fill = 0.4 }: { liquid?: string; fill?: number }) {
  const s = SHAPES.erlenmeyer;
  return (
    <group>
      {liquid && <StaticLiquid shape={s} fraction={fill} color={liquid} />}
      <GlassShell shape={s} />
    </group>
  );
}

export function TestTube({ liquid, fill = 0.4 }: { liquid?: string; fill?: number }) {
  const s = SHAPES.testTube;
  return (
    <group>
      {liquid && <StaticLiquid shape={s} fraction={fill} color={liquid} />}
      <GlassShell shape={s} />
    </group>
  );
}

export function TestTubeRack({ liquids = ["#4db849", "#1e7fd6", "", "#e0a526", "#ff2b93", ""] }: { liquids?: string[] }) {
  const n = liquids.length;
  const spacing = 0.045;
  const width = n * spacing + 0.03;
  return (
    <group>
      {[0.012, 0.1].map((y) => (
        <mesh key={y} geometry={GEO.rbox(width, 0.008, 0.07, 0.003)} material={MAT.white} position={[0, y, 0]} castShadow />
      ))}
      {[-1, 1].map((side) => (
        <mesh key={side} geometry={GEO.box(0.008, 0.11, 0.07)} material={MAT.white} position={[(side * width) / 2, 0.055, 0]} castShadow />
      ))}
      {liquids.map((color, i) => (
        <group key={i} position={[(i - (n - 1) / 2) * spacing, 0.016, 0]}>
          <TestTube liquid={color || undefined} fill={0.35 + (i % 3) * 0.12} />
        </group>
      ))}
    </group>
  );
}

export function GraduatedCylinder({ liquid = "#dff3fb", fill = 0.55 }: { liquid?: string; fill?: number }) {
  const shape = useMemo<VesselShape>(
    () => ({
      key: "cylinder",
      outer: [
        [0, 0.008],
        [0.0165, 0.008],
        [0.0165, 0.245],
        [0.019, 0.25],
      ],
      inner: [
        [0, 0.012],
        [0.0152, 0.012],
        [0.0152, 0.244],
      ],
      wall: 0.0013,
      fullHeight: 0.23,
    }),
    [],
  );
  return (
    <group>
      <mesh geometry={GEO.cyl(0.042, 0.045, 0.01, 6)} material={MAT.glassThick} position={[0, 0.005, 0]} renderOrder={RENDER_ORDER.glass} />
      <StaticLiquid shape={shape} fraction={fill} color={liquid} opacity={0.45} />
      <GlassShell shape={shape} />
      <Graduations radius={0.0165} y={0.13} height={0.2} label="100 mL" />
    </group>
  );
}

export function RoundBottomFlask({ liquid = "#f5c04a", fill = 0.35 }: { liquid?: string; fill?: number }) {
  const shape = useMemo<VesselShape>(() => {
    const r = 0.055;
    const outer: P[] = [];
    for (let i = 0; i <= 14; i++) {
      const t = -Math.PI / 2 + (i / 14) * (Math.PI - 0.22);
      outer.push([Math.max(0, r * Math.cos(t)), r + r * Math.sin(t)]);
    }
    outer.push([0.012, 0.118], [0.012, 0.165], [0.0145, 0.168]);
    const inner = outer.slice(0, -1).map(([x, y]) => [Math.max(0, x - 0.0016), y + 0.0016] as P);
    inner[0] = [0, 0.0016];
    return { key: "roundFlask", outer, inner, wall: 0.0016, fullHeight: 0.1 };
  }, []);
  return (
    <group>
      <mesh geometry={GEO.torus(0.04, 0.012, Math.PI * 2, 10, 28)} material={MAT.cork} rotation-x={Math.PI / 2} position={[0, 0.012, 0]} castShadow />
      <group position={[0, 0.012, 0]}>
        <StaticLiquid shape={shape} fraction={fill} color={liquid} opacity={0.6} />
        <GlassShell shape={shape} />
      </group>
    </group>
  );
}

export function VolumetricFlask({ liquid = "#bfe9f0", fill = 1 }: { liquid?: string; fill?: number }) {
  const shape = useMemo<VesselShape>(() => {
    const outer: P[] = [[0, 0], [0.036, 0], [0.042, 0.006]];
    for (let i = 1; i <= 8; i++) {
      const t = (i / 8) * (Math.PI / 2);
      outer.push([0.042 * Math.cos(t) + 0.0001, 0.006 + 0.05 * Math.sin(t)]);
    }
    outer.push([0.0085, 0.062], [0.0085, 0.19], [0.0105, 0.193]);
    const inner = outer.slice(0, -1).map(([x, y]) => [Math.max(0, x - 0.0015), y + 0.0015] as P);
    inner[0] = [0, 0.0015];
    return { key: "volFlask", outer, inner, wall: 0.0015, fullHeight: 0.15 };
  }, []);
  return (
    <group>
      <StaticLiquid shape={shape} fraction={fill} color={liquid} opacity={0.45} />
      <GlassShell shape={shape} />
      <mesh geometry={GEO.cyl(0.0088, 0.0088, 0.0015, 24, true)} material={MAT.white} position={[0, 0.15, 0]} />
      <mesh geometry={GEO.cyl(0.0105, 0.0085, 0.022, 16)} material={MAT.blue} position={[0, 0.203, 0]} castShadow />
    </group>
  );
}

export function Funnel() {
  const shape = useMemo<VesselShape>(
    () => ({
      key: "funnel",
      outer: [
        [0.0035, 0],
        [0.0045, 0.06],
        [0.052, 0.12],
        [0.054, 0.123],
      ],
      inner: [
        [0, 0],
        [0.003, 0.06],
        [0.05, 0.12],
      ],
      wall: 0.0018,
      fullHeight: 0.1,
    }),
    [],
  );
  const geometry = GEO.lathe("funnel", shellProfile(shape.outer, shape.wall, 0), 40);
  return (
    <group>
      <mesh geometry={GEO.cyl(0.03, 0.03, 0.05, 20, true)} material={MAT.glass} position={[0, 0.025, 0]} renderOrder={RENDER_ORDER.glass} />
      <mesh geometry={geometry} material={MAT.glass} position={[0, 0.05, 0]} renderOrder={RENDER_ORDER.glass} />
    </group>
  );
}

export function PetriDishes({ count = 4 }: { count?: number }) {
  return (
    <group>
      {Array.from({ length: count }, (_, i) => (
        <group key={i} position={[0, i * 0.014, 0]}>
          <mesh geometry={GEO.cyl(0.045, 0.045, 0.004, 32)} material={staticLiquidMaterial("#efd9a0", 0.85)} position={[0, 0.004, 0]} />
          <mesh geometry={GEO.cyl(0.0475, 0.0475, 0.013, 36, true)} material={MAT.clearPlastic} position={[0, 0.0065, 0]} renderOrder={RENDER_ORDER.glass} />
          <mesh geometry={GEO.cyl(0.0475, 0.0475, 0.0012, 36)} material={MAT.clearPlastic} position={[0, 0.0131, 0]} renderOrder={RENDER_ORDER.glass} />
        </group>
      ))}
    </group>
  );
}

export function BuretteStand() {
  return (
    <group>
      <mesh geometry={GEO.rbox(0.2, 0.014, 0.3, 0.004)} material={MAT.darkGrey} position={[0, 0.007, 0]} castShadow receiveShadow />
      <mesh geometry={GEO.cyl(0.006, 0.006, 0.78, 12)} material={MAT.steel} position={[0, 0.39, -0.1]} castShadow />
      <mesh geometry={GEO.box(0.03, 0.03, 0.03)} material={MAT.darkSteel} position={[0, 0.6, -0.1]} />
      <mesh geometry={GEO.box(0.012, 0.012, 0.1)} material={MAT.steel} position={[0, 0.6, -0.05]} />
      <mesh geometry={GEO.box(0.03, 0.02, 0.012)} material={MAT.orangeRubber} position={[0, 0.6, 0]} />
      <group position={[0, 0.2, 0]}>
        <mesh geometry={GEO.cyl(0.0042, 0.0042, 0.42, 14)} material={staticLiquidMaterial("#dff3fb", 0.5)} position={[0, 0.27, 0]} renderOrder={RENDER_ORDER.liquid} />
        <mesh geometry={GEO.cyl(0.0062, 0.0062, 0.55, 16, true)} material={MAT.glass} position={[0, 0.3, 0]} renderOrder={RENDER_ORDER.glass} />
        <Graduations radius={0.0062} y={0.32} height={0.4} label="50" />
        <mesh geometry={GEO.cyl(0.0062, 0.0015, 0.04, 12)} material={MAT.glass} position={[0, 0.005, 0]} renderOrder={RENDER_ORDER.glass} />
        <mesh geometry={GEO.box(0.03, 0.006, 0.006)} material={MAT.blue} position={[0, 0.03, 0]} />
      </group>
      <group position={[0, 0.014, 0.0]}>
        <Erlenmeyer liquid="#ff7ab8" fill={0.35} />
      </group>
    </group>
  );
}
