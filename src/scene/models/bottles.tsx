import * as THREE from "three";
import { useLayoutEffect, useMemo, useRef } from "react";
import type { Chemical } from "../../data";
import { GEO, MAT, RENDER_ORDER, shellProfile } from "../materials";
import { benchLabel, chemicalLabel, labelColor } from "../textures";
import { staticLiquidMaterial, StaticLiquid, type VesselShape } from "./glassware";

type P = [number, number];

const BOTTLE: VesselShape = {
  key: "stockBottle",
  outer: [
    [0, 0],
    [0.038, 0],
    [0.042, 0.006],
    [0.042, 0.13],
    [0.036, 0.152],
    [0.02, 0.168],
    [0.016, 0.172],
    [0.016, 0.19],
  ],
  inner: [
    [0, 0.004],
    [0.0392, 0.004],
    [0.0398, 0.008],
    [0.0398, 0.128],
    [0.034, 0.15],
    [0.0185, 0.166],
  ],
  wall: 0.0022,
  fullHeight: 0.14,
};

const DROPPER: VesselShape = {
  key: "dropperBottle",
  outer: [
    [0, 0],
    [0.019, 0],
    [0.021, 0.003],
    [0.021, 0.05],
    [0.016, 0.06],
    [0.0085, 0.066],
    [0.0085, 0.074],
  ],
  inner: [
    [0, 0.003],
    [0.0192, 0.003],
    [0.0194, 0.006],
    [0.0194, 0.049],
    [0.0148, 0.058],
  ],
  wall: 0.0016,
  fullHeight: 0.05,
};

const labelMaterials = new Map<string, THREE.MeshStandardMaterial>();
function labelMaterial(key: string, map: THREE.Texture) {
  let m = labelMaterials.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ map, roughness: 0.6 });
    labelMaterials.set(key, m);
  }
  return m;
}

const capMaterials = new Map<string, THREE.MeshStandardMaterial>();
export function capMaterial(color: string) {
  let m = capMaterials.get(color);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: 0.45 });
    capMaterials.set(color, m);
  }
  return m;
}

export const STOCK_BOTTLE_HEIGHT = 0.218;

/** A 500 mL reagent bottle, wide-mouth jar for solids, or plastic bottle, with a printed label. */
export function StockBottle({ chemical }: { chemical: Chemical }) {
  const label = labelMaterial(`stock-${chemical.id}`, chemicalLabel(chemical));
  const cap = capMaterial(labelColor(chemical));

  if (chemical.bottle === "jar") {
    const jar: P[] = [
      [0, 0],
      [0.038, 0],
      [0.041, 0.004],
      [0.041, 0.095],
      [0.035, 0.103],
      [0.035, 0.112],
    ];
    return (
      <group>
        <mesh geometry={GEO.cyl(0.037, 0.037, 0.06, 28)} material={staticLiquidMaterial(chemical.color, 0.95)} position={[0, 0.034, 0]} renderOrder={RENDER_ORDER.liquid} />
        <mesh geometry={GEO.lathe("jar", shellProfile(jar, 0.002), 36)} material={MAT.clearPlastic} renderOrder={RENDER_ORDER.glass} castShadow />
        <mesh geometry={GEO.cyl(0.0375, 0.0375, 0.03, 32)} material={MAT.white} position={[0, 0.127, 0]} castShadow />
        <mesh geometry={GEO.label(0.0415, 0.062, 2.6)} material={label} position={[0, 0.052, 0]} />
      </group>
    );
  }

  const body =
    chemical.bottle === "amber" ? MAT.amberGlass : chemical.bottle === "plastic" ? MAT.plasticBottle : MAT.glass;
  const showLiquid = chemical.bottle === "clear";
  return (
    <group>
      {showLiquid && <StaticLiquid shape={BOTTLE} fraction={0.82} color={chemical.color} opacity={0.55} />}
      <mesh
        geometry={GEO.lathe("stockBottle", shellProfile(BOTTLE.outer, BOTTLE.wall), 36)}
        material={body}
        renderOrder={body.transparent ? RENDER_ORDER.glass : 0}
        castShadow
      />
      <mesh geometry={GEO.cyl(0.0195, 0.0195, 0.028, 28)} material={cap} position={[0, 0.204, 0]} castShadow />
      <mesh geometry={GEO.torus(0.0195, 0.0016, Math.PI * 2, 6, 28)} material={cap} rotation-x={Math.PI / 2} position={[0, 0.191, 0]} />
      <mesh geometry={GEO.label(0.0428, 0.078, 2.5)} material={label} position={[0, 0.07, 0]} />
    </group>
  );
}

export const DROPPER_HEIGHT = 0.1;

/** A 30 mL dropper bottle used on the experiment bench. */
export function DropperBottle({ chemical, short }: { chemical: Chemical; short: string }) {
  const label = labelMaterial(`bench-${chemical.id}`, benchLabel(chemical, short));
  const amber = chemical.bottle === "amber";
  return (
    <group>
      {!amber && <StaticLiquid shape={DROPPER} fraction={0.85} color={chemical.color} opacity={0.6} />}
      <mesh
        geometry={GEO.lathe("dropper", shellProfile(DROPPER.outer, DROPPER.wall), 32)}
        material={amber ? MAT.amberGlass : MAT.glass}
        renderOrder={RENDER_ORDER.glass}
      />
      <mesh geometry={GEO.cyl(0.0105, 0.0105, 0.013, 20)} material={MAT.white} position={[0, 0.0805, 0]} />
      <mesh geometry={GEO.capsule(0.0078, 0.012, 12)} material={MAT.rubber} position={[0, 0.0965, 0]} />
      <mesh geometry={GEO.label(0.0214, 0.034, 2.9)} material={label} position={[0, 0.027, 0]} />
    </group>
  );
}

export interface FillerSlot {
  position: [number, number, number];
  kind: number;
  scale: number;
}

const FILLER_BODY_COLORS = ["#6a3410", "#f1f3ee", "#f1f3ee", "#cfe7ee", "#6a3410", "#e8ecef"];
const FILLER_CAP_COLORS = ["#1d2126", "#0fa3a3", "#c1121f", "#0b63b6", "#e85d04", "#475569"];

/** Many unlabelled bottles drawn as two instanced meshes, to fill out shelves cheaply. */
export function FillerBottles({ slots }: { slots: FillerSlot[] }) {
  const bodies = useRef<THREE.InstancedMesh>(null);
  const caps = useRef<THREE.InstancedMesh>(null);
  const bodyMaterial = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.32 }), []);
  const capMat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.45 }), []);

  useLayoutEffect(() => {
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    slots.forEach((slot, i) => {
      dummy.position.set(...slot.position);
      dummy.scale.setScalar(slot.scale);
      dummy.updateMatrix();
      bodies.current!.setMatrixAt(i, dummy.matrix);
      caps.current!.setMatrixAt(i, dummy.matrix);
      bodies.current!.setColorAt(i, color.set(FILLER_BODY_COLORS[slot.kind % FILLER_BODY_COLORS.length]));
      caps.current!.setColorAt(i, color.set(FILLER_CAP_COLORS[(slot.kind * 7 + i) % FILLER_CAP_COLORS.length]));
    });
    for (const mesh of [bodies.current!, caps.current!]) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
  }, [slots]);

  const bodyGeometry = GEO.lathe("fillerBody", BOTTLE.outer, 20);
  const capGeometry = useMemo(() => GEO.cyl(0.0195, 0.0195, 0.028, 16).clone().translate(0, 0.204, 0), []);
  return (
    <group>
      <instancedMesh ref={bodies} args={[bodyGeometry, bodyMaterial, slots.length]} castShadow receiveShadow dispose={null} />
      <instancedMesh ref={caps} args={[capGeometry, capMat, slots.length]} castShadow dispose={null} />
    </group>
  );
}
