import * as THREE from "three";
import { GEO, MAT, RENDER_ORDER } from "../materials";
import { signTexture } from "../textures";

let extinguisherLabel: THREE.MeshStandardMaterial | null = null;
function extinguisherLabelMaterial() {
  extinguisherLabel ??= new THREE.MeshStandardMaterial({
    map: signTexture("extLabel", { title: "FIRE EXTINGUISHER", subtitle: "Pull · Aim · Squeeze · Sweep", bg: "#ffffff", fg: "#b3121c", width: 512, height: 256 }),
    roughness: 0.5,
  });
  return extinguisherLabel;
}

export function Extinguisher() {
  const hose = GEO.custom(
    "extHose",
    () =>
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
          new THREE.Vector3(0.03, 0.58, 0.02),
          new THREE.Vector3(0.1, 0.5, 0.05),
          new THREE.Vector3(0.095, 0.25, 0.06),
          new THREE.Vector3(0.07, 0.12, 0.05),
        ]),
        24,
        0.008,
        8,
      ),
  );
  return (
    <group>
      <mesh geometry={GEO.box(0.22, 0.03, 0.22)} material={MAT.darkGrey} position={[0, 0.015, 0]} receiveShadow />
      <mesh geometry={GEO.cyl(0.075, 0.075, 0.44, 32)} material={MAT.red} position={[0, 0.25, 0]} castShadow />
      <mesh geometry={GEO.sphere(0.075, 28, 14)} material={MAT.red} position={[0, 0.47, 0]} scale={[1, 0.55, 1]} castShadow />
      <mesh geometry={GEO.cyl(0.02, 0.022, 0.05, 16)} material={MAT.chrome} position={[0, 0.53, 0]} />
      <mesh geometry={GEO.box(0.05, 0.04, 0.05)} material={MAT.chrome} position={[0, 0.57, 0]} castShadow />
      <mesh geometry={GEO.box(0.14, 0.014, 0.03)} material={MAT.black} position={[-0.04, 0.605, 0]} rotation-z={0.12} />
      <mesh geometry={GEO.cyl(0.014, 0.014, 0.01, 18)} material={MAT.white} position={[0.0, 0.57, 0.03]} rotation-x={Math.PI / 2} />
      <mesh geometry={hose} material={MAT.black} castShadow />
      <mesh geometry={GEO.cyl(0.012, 0.008, 0.06, 12)} material={MAT.black} position={[0.07, 0.1, 0.05]} />
      <mesh geometry={GEO.label(0.0758, 0.16, 2.2)} material={extinguisherLabelMaterial()} position={[0, 0.28, 0]} />
    </group>
  );
}

/** Wall-mounted: the origin is the wall plate centre, facing +z. */
export function Eyewash() {
  const bowl = GEO.lathe(
    "eyewashBowl",
    [
      [0, 0],
      [0.05, 0],
      [0.13, 0.05],
      [0.14, 0.06],
      [0.13, 0.062],
      [0.05, 0.012],
      [0, 0.012],
    ],
    40,
  );
  return (
    <group>
      <mesh geometry={GEO.box(0.34, 0.38, 0.02)} material={MAT.white} castShadow />
      <mesh geometry={GEO.cyl(0.015, 0.015, 0.12, 12)} material={MAT.chrome} position={[0, -0.06, 0.07]} rotation-x={Math.PI / 2} />
      <mesh geometry={bowl} material={MAT.green} position={[0, -0.05, 0.16]} castShadow />
      {[-0.04, 0.04].map((x) => (
        <group key={x} position={[x, -0.02, 0.16]}>
          <mesh geometry={GEO.cyl(0.008, 0.008, 0.05, 12)} material={MAT.chrome} />
          <mesh geometry={GEO.cyl(0.014, 0.014, 0.012, 16)} material={MAT.yellow} position={[0, 0.03, 0]} />
        </group>
      ))}
      <mesh geometry={GEO.rbox(0.18, 0.05, 0.02, 0.008)} material={MAT.green} position={[0, -0.12, 0.3]} castShadow />
      <mesh geometry={GEO.cyl(0.008, 0.008, 0.18, 10)} material={MAT.chrome} position={[0.09, -0.08, 0.22]} rotation-x={Math.PI / 2.3} />
    </group>
  );
}

/** Wall-mounted: the origin is the box centre, facing +z. */
export function FirstAidKit() {
  return (
    <group>
      <mesh geometry={GEO.rbox(0.34, 0.26, 0.11, 0.02)} material={MAT.green} castShadow />
      <mesh geometry={GEO.box(0.04, 0.14, 0.004)} material={MAT.white} position={[0, 0, 0.056]} />
      <mesh geometry={GEO.box(0.14, 0.04, 0.004)} material={MAT.white} position={[0, 0, 0.056]} />
      <mesh geometry={GEO.rbox(0.1, 0.02, 0.03, 0.008)} material={MAT.darkGrey} position={[0, 0.14, 0]} />
    </group>
  );
}

export function Goggles() {
  return (
    <group>
      <mesh geometry={GEO.rbox(0.175, 0.068, 0.04, 0.025)} material={MAT.clearPlastic} position={[0, 0.034, 0]} renderOrder={RENDER_ORDER.glass} />
      <mesh geometry={GEO.rbox(0.18, 0.012, 0.046, 0.005)} material={MAT.tealDark} position={[0, 0.006, 0]} castShadow />
      <mesh geometry={GEO.rbox(0.18, 0.012, 0.046, 0.005)} material={MAT.tealDark} position={[0, 0.064, 0]} />
      {[-1, 1].map((side) => (
        <mesh key={side} geometry={GEO.box(0.018, 0.012, 0.02)} material={MAT.darkGrey} position={[side * 0.07, 0.07, 0]} />
      ))}
      <mesh geometry={GEO.torus(0.088, 0.006, Math.PI, 6, 24)} material={MAT.black} position={[0, 0.034, -0.01]} rotation-x={Math.PI / 2} />
    </group>
  );
}

/** Hangs from its hook at the origin. */
export function LabCoat() {
  return (
    <group>
      <mesh geometry={GEO.cyl(0.006, 0.006, 0.08, 8)} material={MAT.chrome} position={[0, 0, 0.04]} rotation-x={Math.PI / 2} />
      <group position={[0, -0.04, 0.09]}>
        <mesh geometry={GEO.capsule(0.06, 0.24, 10)} material={MAT.coat} position={[0, -0.04, 0]} rotation-z={Math.PI / 2} scale={[1, 1, 0.55]} castShadow />
        <mesh geometry={GEO.cyl(0.17, 0.23, 0.92, 18)} material={MAT.coat} position={[0, -0.52, 0]} scale={[1, 1, 0.38]} castShadow />
        {[-1, 1].map((side) => (
          <mesh key={side} geometry={GEO.cyl(0.05, 0.055, 0.62, 12)} material={MAT.coat} position={[side * 0.2, -0.36, 0.01]} rotation-z={side * 0.06} castShadow />
        ))}
        {[-1, 1].map((side) => (
          <mesh key={side} geometry={GEO.box(0.06, 0.22, 0.01)} material={MAT.offWhite} position={[side * 0.035, -0.17, 0.068]} rotation-z={side * -0.3} />
        ))}
        {[0, 1, 2].map((i) => (
          <mesh key={i} geometry={GEO.sphere(0.008, 10, 6)} material={MAT.grey} position={[0.01, -0.36 - i * 0.14, 0.08]} />
        ))}
        <mesh geometry={GEO.box(0.1, 0.08, 0.004)} material={MAT.offWhite} position={[-0.1, -0.68, 0.082]} />
      </group>
    </group>
  );
}

export function GloveBox() {
  return (
    <group>
      <mesh geometry={GEO.rbox(0.25, 0.1, 0.13, 0.008)} material={MAT.white} position={[0, 0.05, 0]} castShadow />
      <mesh geometry={GEO.box(0.252, 0.03, 0.132)} material={MAT.blue} position={[0, 0.03, 0]} />
      <mesh geometry={GEO.circle(0.03, 24)} material={MAT.black} position={[0, 0.1005, 0]} rotation-x={-Math.PI / 2} scale={[1.8, 1, 1]} />
      <mesh geometry={GEO.capsule(0.016, 0.03, 8)} material={MAT.blue} position={[0, 0.115, 0]} rotation-z={0.5} />
      <mesh geometry={GEO.capsule(0.012, 0.025, 8)} material={MAT.blue} position={[0.02, 0.125, 0.01]} rotation-z={-0.4} />
    </group>
  );
}
