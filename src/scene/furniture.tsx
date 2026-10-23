import * as THREE from "three";
import { useMemo } from "react";
import { GEO, MAT } from "./materials";
import { bannerTexture, logoTexture, signTexture } from "./textures";

const CAB_H = 0.88;

/** A run of base cabinets with doors on the +z face (and optionally the -z face). Origin at the floor centre. */
export function BaseCabinets({ width, depth, backDoors = false }: { width: number; depth: number; backDoors?: boolean }) {
  const doors = Math.max(1, Math.round(width / 0.6));
  const doorW = width / doors;
  const faces = backDoors ? [1, -1] : [1];
  return (
    <group>
      <mesh geometry={GEO.box(width - 0.04, 0.1, depth - 0.1)} material={MAT.plinth} position={[0, 0.05, 0]} />
      <mesh geometry={GEO.box(width, CAB_H - 0.1, depth)} material={MAT.cabinet} position={[0, 0.1 + (CAB_H - 0.1) / 2, 0]} castShadow receiveShadow />
      {faces.map((face) => (
        <group key={face} position={[0, 0, (face * depth) / 2]} rotation-y={face === 1 ? 0 : Math.PI}>
          {Array.from({ length: doors - 1 }, (_, i) => (
            <mesh key={i} geometry={GEO.box(0.005, CAB_H - 0.14, 0.004)} material={MAT.cabinetSide} position={[-width / 2 + doorW * (i + 1), 0.1 + (CAB_H - 0.1) / 2, 0.001]} />
          ))}
          <mesh geometry={GEO.box(width - 0.02, 0.005, 0.004)} material={MAT.cabinetSide} position={[0, CAB_H - 0.17, 0.001]} />
          {Array.from({ length: doors }, (_, i) => (
            <mesh
              key={i}
              geometry={GEO.rbox(0.12, 0.014, 0.02, 0.005)}
              material={MAT.teal}
              position={[-width / 2 + doorW * (i + 0.5), CAB_H - 0.11, 0.012]}
            />
          ))}
        </group>
      ))}
    </group>
  );
}

export function Benchtop({ width, depth, y = CAB_H + 0.02 }: { width: number; depth: number; y?: number }) {
  return <mesh geometry={GEO.box(width, 0.04, depth)} material={MAT.benchTop} position={[0, y + 0.02, 0]} castShadow receiveShadow />;
}

/** The central island: cabinets both sides, black epoxy top, and a gas tap and sockets on the spine. */
export function IslandBench({ width, depth }: { width: number; depth: number }) {
  return (
    <group>
      <BaseCabinets width={width} depth={depth - 0.06} backDoors />
      <Benchtop width={width + 0.04} depth={depth + 0.04} />
      {[-1.6, 1.0].map((x) => (
        <group key={x} position={[x, 0.94, -depth / 2 + 0.12]}>
          <mesh geometry={GEO.cyl(0.012, 0.016, 0.12, 12)} material={MAT.chrome} position={[0, 0.06, 0]} />
          <mesh geometry={GEO.box(0.05, 0.012, 0.012)} material={MAT.yellow} position={[0, 0.1, 0.02]} />
        </group>
      ))}
    </group>
  );
}

/** Open steel shelving against a wall, facing +z. Shelf surfaces sit at `levels`. */
export function Shelving({
  width,
  depth,
  height,
  levels,
  accent = MAT.teal,
  back = MAT.wallLower,
}: {
  width: number;
  depth: number;
  height: number;
  levels: number[];
  accent?: THREE.Material;
  back?: THREE.Material;
}) {
  return (
    <group>
      <mesh geometry={GEO.box(width, height, 0.02)} material={back} position={[0, height / 2, -depth / 2 + 0.01]} receiveShadow />
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} geometry={GEO.box(0.035, height, 0.035)} material={MAT.shelf} position={[(sx * (width - 0.035)) / 2, height / 2, (sz * (depth - 0.035)) / 2]} castShadow />
        )),
      )}
      {levels.map((y) => (
        <group key={y}>
          <mesh geometry={GEO.box(width - 0.02, 0.025, depth)} material={MAT.shelf} position={[0, y - 0.0125, 0]} castShadow receiveShadow />
          <mesh geometry={GEO.box(width - 0.02, 0.03, 0.006)} material={accent} position={[0, y - 0.012, depth / 2 + 0.002]} />
        </group>
      ))}
    </group>
  );
}

export function SinkUnit({ width }: { width: number }) {
  const faucet = GEO.custom(
    "faucet",
    () =>
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(0, 0.25, 0),
          new THREE.Vector3(0, 0.33, 0.08),
          new THREE.Vector3(0, 0.26, 0.17),
        ]),
        24,
        0.012,
        10,
      ),
  );
  return (
    <group>
      <BaseCabinets width={width} depth={0.62} />
      <mesh geometry={GEO.box(width, 0.04, 0.64)} material={MAT.benchTop} position={[-0, 0.92 - 0.0, 0]} receiveShadow />
      <mesh geometry={GEO.box(0.62, 0.012, 0.42)} material={MAT.darkSteel} position={[0, 0.935, 0.03]} />
      <mesh geometry={GEO.box(0.58, 0.01, 0.38)} material={MAT.black} position={[0, 0.937, 0.03]} />
      <mesh geometry={faucet} material={MAT.chrome} position={[0, 0.94, -0.24]} castShadow />
      {[-0.1, 0.1].map((x) => (
        <mesh key={x} geometry={GEO.cyl(0.018, 0.018, 0.04, 12)} material={x < 0 ? MAT.blue : MAT.red} position={[x, 0.97, -0.24]} />
      ))}
    </group>
  );
}

let logoMat: THREE.MeshBasicMaterial | null = null;
export function logoMaterial() {
  logoMat ??= new THREE.MeshBasicMaterial({ map: logoTexture(), toneMapped: false });
  return logoMat;
}

/** Reception desk facing +z, with the Labmate logo on its front panel. */
export function ReceptionCounter({ length, depth, height }: { length: number; depth: number; height: number }) {
  const deskSign = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: signTexture("salesDesk", { title: "Sales desk", subtitle: "Ask about products and orders", bg: "#0fa3a3", width: 512, height: 140 }),
        toneMapped: false,
      }),
    [],
  );
  return (
    <group>
      <mesh geometry={GEO.box(length, 0.08, depth - 0.06)} material={MAT.plinth} position={[0, 0.04, -0.02]} />
      <mesh geometry={GEO.rbox(length, height - 0.08, depth, 0.02)} material={MAT.white} position={[0, 0.08 + (height - 0.08) / 2, 0]} castShadow receiveShadow />
      <mesh geometry={GEO.box(length + 0.06, 0.035, depth + 0.1)} material={MAT.wood} position={[0, height + 0.0175, 0.02]} castShadow receiveShadow />
      <mesh geometry={GEO.box(length - 0.1, 0.12, 0.008)} material={MAT.teal} position={[0, 0.2, depth / 2 + 0.004]} />
      <mesh geometry={GEO.plane(1.2, 0.35)} material={logoMaterial()} position={[0, 0.66, depth / 2 + 0.006]} />
      <mesh geometry={GEO.plane(0.62, 0.17)} material={deskSign} position={[0, 0.34, depth / 2 + 0.006]} />
      {/* Monitor and keyboard on the agent's side */}
      <group position={[1.02, height + 0.035, -0.14]} rotation-y={Math.PI + 0.6}>
        <mesh geometry={GEO.box(0.12, 0.01, 0.1)} material={MAT.darkGrey} />
        <mesh geometry={GEO.box(0.03, 0.2, 0.02)} material={MAT.darkGrey} position={[0, 0.1, -0.02]} />
        <mesh geometry={GEO.rbox(0.42, 0.26, 0.025, 0.008)} material={MAT.black} position={[0, 0.3, 0]} castShadow />
      </group>
      <mesh geometry={GEO.rbox(0.36, 0.015, 0.12, 0.004)} material={MAT.darkGrey} position={[0.78, height + 0.043, -0.05]} rotation-y={0.5} />
      {/* Brochure stand on the visitor side */}
      <group position={[-1.0, height + 0.035, 0.12]} scale={0.8}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} geometry={GEO.box(0.12, 0.17, 0.006)} material={[MAT.blue, MAT.teal, MAT.navy][i]} position={[(i - 1) * 0.13, 0.085, 0]} rotation-x={-0.2} castShadow />
        ))}
      </group>
    </group>
  );
}

export function Stool() {
  return (
    <group>
      <mesh geometry={GEO.torus(0.19, 0.012, Math.PI * 2, 8, 28)} material={MAT.steel} position={[0, 0.02, 0]} rotation-x={Math.PI / 2} />
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} geometry={GEO.box(0.03, 0.02, 0.38)} material={MAT.darkSteel} position={[0, 0.02, 0]} rotation-y={(i * Math.PI) / 4} />
      ))}
      <mesh geometry={GEO.cyl(0.02, 0.02, 0.6, 12)} material={MAT.chrome} position={[0, 0.32, 0]} castShadow />
      <mesh geometry={GEO.cyl(0.18, 0.17, 0.06, 28)} material={MAT.navy} position={[0, 0.65, 0]} castShadow />
    </group>
  );
}

export function WallShelf({ width, backing }: { width: number; backing?: THREE.Material }) {
  return (
    <group>
      {backing && <mesh geometry={GEO.box(width + 0.1, 0.62, 0.012)} material={backing} position={[0, 0.25, 0.006]} />}
      <mesh geometry={GEO.box(width, 0.025, 0.22)} material={MAT.shelf} position={[0, 0, 0.11]} castShadow receiveShadow />
      {[-1, 1].map((s) => (
        <mesh key={s} geometry={GEO.box(0.02, 0.12, 0.18)} material={MAT.darkSteel} position={[(s * width) / 2.6, -0.07, 0.09]} />
      ))}
    </group>
  );
}

/** Pull-up banner stand facing +z. */
export function RollBanner() {
  const material = useMemo(() => new THREE.MeshBasicMaterial({ map: bannerTexture(), toneMapped: false }), []);
  return (
    <group>
      <mesh geometry={GEO.rbox(0.68, 0.06, 0.22, 0.02)} material={MAT.darkSteel} position={[0, 0.03, 0]} castShadow />
      <mesh geometry={GEO.box(0.6, 1.64, 0.006)} material={material} position={[0, 0.88, 0]} castShadow />
      <mesh geometry={GEO.box(0.62, 0.02, 0.02)} material={MAT.darkSteel} position={[0, 1.71, 0]} />
    </group>
  );
}

export function Plant() {
  const leaves = useMemo(
    () => [
      [0, 0.75, 0, 0.22],
      [0.12, 0.62, 0.05, 0.17],
      [-0.12, 0.66, -0.04, 0.18],
      [0.04, 0.9, -0.06, 0.15],
      [-0.06, 0.55, 0.1, 0.15],
    ],
    [],
  );
  const leafMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#2f7d4f", roughness: 0.7, flatShading: true }), []);
  return (
    <group>
      <mesh geometry={GEO.cyl(0.17, 0.13, 0.36, 20)} material={MAT.white} position={[0, 0.18, 0]} castShadow receiveShadow />
      <mesh geometry={GEO.cyl(0.155, 0.155, 0.02, 20)} material={MAT.cork} position={[0, 0.35, 0]} />
      <mesh geometry={GEO.cyl(0.015, 0.02, 0.5, 8)} material={MAT.cork} position={[0, 0.6, 0]} />
      {leaves.map(([x, y, z, r], i) => (
        <mesh key={i} geometry={GEO.custom(`leaf${r}`, () => new THREE.IcosahedronGeometry(r, 1))} material={leafMat} position={[x, y, z]} castShadow />
      ))}
    </group>
  );
}
