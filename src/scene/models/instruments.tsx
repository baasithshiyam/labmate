import * as THREE from "three";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { GEO, MAT, RENDER_ORDER } from "../materials";
import { lcdTexture, signTexture } from "../textures";
import { Beaker } from "./glassware";

const screens = new Map<string, THREE.MeshBasicMaterial>();
function screen(key: string, lines: string[], fg?: string) {
  let m = screens.get(key);
  if (!m) {
    m = new THREE.MeshBasicMaterial({ map: lcdTexture(key, lines, fg) });
    screens.set(key, m);
  }
  return m;
}

const signs = new Map<string, THREE.MeshBasicMaterial>();
export function signMaterial(key: string, opts: Parameters<typeof signTexture>[1]) {
  let m = signs.get(key);
  if (!m) {
    m = new THREE.MeshBasicMaterial({ map: signTexture(key, opts), toneMapped: false });
    signs.set(key, m);
  }
  return m;
}

export function Microscope() {
  return (
    <group>
      <mesh geometry={GEO.rbox(0.2, 0.05, 0.26, 0.016)} material={MAT.white} position={[0, 0.025, 0]} castShadow receiveShadow />
      <mesh geometry={GEO.circle(0.016, 24)} material={MAT.glow} position={[0, 0.0505, 0.04]} rotation-x={-Math.PI / 2} />
      <mesh geometry={GEO.rbox(0.06, 0.27, 0.07, 0.016)} material={MAT.white} position={[0, 0.18, -0.08]} castShadow />
      <mesh geometry={GEO.rbox(0.07, 0.055, 0.17, 0.02)} material={MAT.white} position={[0, 0.315, -0.02]} castShadow />
      <mesh geometry={GEO.rbox(0.085, 0.06, 0.1, 0.016)} material={MAT.offWhite} position={[0, 0.355, 0.02]} castShadow />
      {[-0.022, 0.022].map((x) => (
        <group key={x} position={[x, 0.39, 0.0]} rotation-x={-0.62}>
          <mesh geometry={GEO.cyl(0.011, 0.011, 0.075, 18)} material={MAT.black} position={[0, 0.035, 0]} castShadow />
          <mesh geometry={GEO.cyl(0.013, 0.013, 0.018, 18)} material={MAT.rubber} position={[0, 0.078, 0]} />
        </group>
      ))}
      <mesh geometry={GEO.cyl(0.034, 0.03, 0.02, 24)} material={MAT.chrome} position={[0, 0.28, 0.045]} castShadow />
      {[0, 2.1, 4.2].map((a, i) => (
        <group key={a} position={[Math.cos(a) * 0.019, 0.255, 0.045 + Math.sin(a) * 0.019]}>
          <mesh geometry={GEO.cyl(0.0085, 0.0065, 0.038 + i * 0.006, 16)} material={MAT.chrome} castShadow />
          <mesh geometry={GEO.cyl(0.0088, 0.0088, 0.004, 16)} material={[MAT.red, MAT.yellow, MAT.blue][i]} position={[0, 0.008, 0]} />
        </group>
      ))}
      <mesh geometry={GEO.rbox(0.15, 0.012, 0.14, 0.004)} material={MAT.black} position={[0, 0.2, 0.045]} castShadow receiveShadow />
      <mesh geometry={GEO.box(0.075, 0.002, 0.025)} material={MAT.glassThick} position={[0, 0.207, 0.05]} renderOrder={RENDER_ORDER.glass} />
      {[-0.03, 0.03].map((x) => (
        <mesh key={x} geometry={GEO.box(0.006, 0.003, 0.05)} material={MAT.steel} position={[x, 0.208, 0.07]} />
      ))}
      <mesh geometry={GEO.cyl(0.018, 0.018, 0.03, 20)} material={MAT.black} position={[0, 0.178, 0.045]} />
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.045, 0.13, -0.08]} rotation-z={Math.PI / 2}>
          <mesh geometry={GEO.cyl(0.026, 0.026, 0.014, 24)} material={MAT.darkGrey} castShadow />
          <mesh geometry={GEO.cyl(0.016, 0.016, 0.03, 20)} material={MAT.grey} position={[0, side * 0.02, 0]} />
        </group>
      ))}
    </group>
  );
}

export function Spectrophotometer() {
  return (
    <group>
      <mesh geometry={GEO.rbox(0.42, 0.12, 0.34, 0.02)} material={MAT.white} position={[0, 0.06, 0]} castShadow receiveShadow />
      <mesh geometry={GEO.rbox(0.42, 0.07, 0.17, 0.02)} material={MAT.offWhite} position={[0, 0.145, -0.085]} castShadow />
      <mesh geometry={GEO.rbox(0.15, 0.022, 0.13, 0.008)} material={MAT.darkGrey} position={[0.11, 0.19, -0.085]} castShadow />
      <mesh geometry={GEO.box(0.05, 0.008, 0.012)} material={MAT.black} position={[0.11, 0.204, -0.02]} />
      <group position={[-0.05, 0.128, 0.085]} rotation-x={-0.42}>
        <mesh geometry={GEO.box(0.3, 0.01, 0.15)} material={MAT.darkGrey} />
        <mesh geometry={GEO.plane(0.13, 0.065)} material={screen("spectro", ["600.0 nm", "Abs 0.000"])} position={[-0.07, 0.0055, -0.02]} rotation-x={-Math.PI / 2} />
        {Array.from({ length: 8 }, (_, i) => (
          <mesh key={i} geometry={GEO.rbox(0.022, 0.008, 0.018, 0.003)} material={i === 7 ? MAT.teal : MAT.grey} position={[0.04 + (i % 4) * 0.028, 0.007, -0.03 + Math.floor(i / 4) * 0.03]} />
        ))}
      </group>
    </group>
  );
}

export function Centrifuge() {
  return (
    <group>
      <mesh geometry={GEO.rbox(0.34, 0.17, 0.4, 0.05)} material={MAT.white} position={[0, 0.085, 0]} castShadow receiveShadow />
      <mesh geometry={GEO.cyl(0.145, 0.15, 0.03, 40)} material={MAT.grey} position={[0, 0.185, -0.03]} castShadow />
      <mesh geometry={GEO.cyl(0.095, 0.095, 0.004, 40)} material={MAT.glassThick} position={[0, 0.202, -0.03]} renderOrder={RENDER_ORDER.glass} />
      <mesh geometry={GEO.cyl(0.07, 0.07, 0.01, 6)} material={MAT.darkSteel} position={[0, 0.19, -0.03]} />
      <group position={[0, 0.09, 0.2]}>
        <mesh geometry={GEO.box(0.24, 0.07, 0.008)} material={MAT.darkGrey} />
        <mesh geometry={GEO.plane(0.1, 0.05)} material={screen("centrifuge", ["0 rpm", "00:00"])} position={[-0.05, 0, 0.0045]} />
        <mesh geometry={GEO.cyl(0.012, 0.012, 0.01, 20)} material={MAT.green} position={[0.06, 0, 0.006]} rotation-x={Math.PI / 2} />
        <mesh geometry={GEO.cyl(0.012, 0.012, 0.01, 20)} material={MAT.red} position={[0.095, 0, 0.006]} rotation-x={Math.PI / 2} />
      </group>
    </group>
  );
}

export function AnalyticalBalance() {
  const w = 0.2;
  const h = 0.22;
  const d = 0.22;
  return (
    <group>
      <mesh geometry={GEO.rbox(0.22, 0.07, 0.34, 0.02)} material={MAT.white} position={[0, 0.035, 0]} castShadow receiveShadow />
      <mesh geometry={GEO.box(0.15, 0.035, 0.006)} material={screen("balance", ["0.0000 g"])} position={[0, 0.035, 0.171]} />
      <group position={[0, 0.07 + h / 2, -0.055]}>
        <mesh geometry={GEO.box(w, h, d)} material={MAT.glass} renderOrder={RENDER_ORDER.glass} />
        {[
          [-1, -1],
          [1, -1],
          [-1, 1],
          [1, 1],
        ].map(([sx, sz]) => (
          <mesh key={`${sx}${sz}`} geometry={GEO.box(0.01, h, 0.01)} material={MAT.offWhite} position={[(sx * w) / 2, 0, (sz * d) / 2]} castShadow />
        ))}
        <mesh geometry={GEO.box(w + 0.01, 0.012, d + 0.01)} material={MAT.offWhite} position={[0, h / 2, 0]} castShadow />
      </group>
      <mesh geometry={GEO.cyl(0.045, 0.045, 0.004, 32)} material={MAT.chrome} position={[0, 0.082, -0.055]} />
      <mesh geometry={GEO.cyl(0.006, 0.006, 0.01, 12)} material={MAT.chrome} position={[0, 0.075, -0.055]} />
    </group>
  );
}

export function PhMeter() {
  const cable = GEO.custom(
    "phCable",
    () =>
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
          new THREE.Vector3(-0.02, 0.05, -0.08),
          new THREE.Vector3(0.02, 0.12, -0.14),
          new THREE.Vector3(0.12, 0.3, -0.12),
          new THREE.Vector3(0.16, 0.29, 0.05),
        ]),
        32,
        0.0025,
        6,
      ),
  );
  return (
    <group>
      <mesh geometry={GEO.rbox(0.16, 0.06, 0.19, 0.015)} material={MAT.white} position={[-0.03, 0.03, 0]} castShadow receiveShadow />
      <mesh geometry={GEO.plane(0.1, 0.05)} material={screen("ph", ["7.00 pH", "25.0 °C"])} position={[-0.03, 0.0605, 0.02]} rotation-x={-Math.PI / 2} />
      {[0, 1, 2].map((i) => (
        <mesh key={i} geometry={GEO.rbox(0.024, 0.008, 0.016, 0.003)} material={i === 0 ? MAT.teal : MAT.grey} position={[-0.06 + i * 0.03, 0.064, 0.07]} />
      ))}
      <mesh geometry={GEO.cyl(0.035, 0.035, 0.012, 24)} material={MAT.darkGrey} position={[0.12, 0.006, -0.08]} castShadow />
      <mesh geometry={GEO.cyl(0.005, 0.005, 0.34, 10)} material={MAT.steel} position={[0.12, 0.17, -0.08]} castShadow />
      <mesh geometry={GEO.box(0.02, 0.02, 0.16)} material={MAT.darkGrey} position={[0.14, 0.3, -0.01]} castShadow />
      <mesh geometry={GEO.cyl(0.006, 0.006, 0.17, 12)} material={MAT.black} position={[0.16, 0.2, 0.06]} />
      <mesh geometry={GEO.cyl(0.0065, 0.0065, 0.03, 12)} material={MAT.glassThick} position={[0.16, 0.1, 0.06]} renderOrder={RENDER_ORDER.glass} />
      <group position={[0.16, 0, 0.06]}>
        <Beaker liquid="#cfeef5" fill={0.6} label="pH 7" />
      </group>
      <mesh geometry={cable} material={MAT.black} />
    </group>
  );
}

function Pipette({ color }: { color: THREE.Material }) {
  return (
    <group>
      <mesh geometry={GEO.cyl(0.0035, 0.0012, 0.05, 10)} material={MAT.yellow} position={[0, 0.025, 0]} />
      <mesh geometry={GEO.cyl(0.007, 0.0035, 0.07, 14)} material={MAT.offWhite} position={[0, 0.085, 0]} />
      <mesh geometry={GEO.cyl(0.0125, 0.0115, 0.12, 18)} material={color} position={[0, 0.18, 0]} castShadow />
      <mesh geometry={GEO.box(0.012, 0.03, 0.026)} material={MAT.offWhite} position={[0, 0.235, 0.012]} />
      <mesh geometry={GEO.cyl(0.006, 0.006, 0.03, 12)} material={MAT.grey} position={[0, 0.255, 0]} />
      <mesh geometry={GEO.cyl(0.009, 0.009, 0.008, 16)} material={color} position={[0, 0.272, 0]} />
    </group>
  );
}

export function MicropipetteStand() {
  return (
    <group>
      <mesh geometry={GEO.cyl(0.075, 0.08, 0.016, 32)} material={MAT.darkGrey} position={[0, 0.008, 0]} castShadow receiveShadow />
      <mesh geometry={GEO.cyl(0.008, 0.008, 0.3, 12)} material={MAT.grey} position={[0, 0.16, 0]} castShadow />
      <mesh geometry={GEO.cyl(0.06, 0.06, 0.012, 24)} material={MAT.darkGrey} position={[0, 0.3, 0]} castShadow />
      {[MAT.teal, MAT.blue, MAT.tealDark].map((m, i) => {
        const a = (i / 3) * Math.PI * 2 + 0.5;
        return (
          <group key={i} position={[Math.sin(a) * 0.05, 0.03, Math.cos(a) * 0.05]} rotation={[Math.cos(a) * 0.05, 0, -Math.sin(a) * 0.05]}>
            <Pipette color={m} />
          </group>
        );
      })}
      <group position={[0.15, 0, 0.02]}>
        <mesh geometry={GEO.rbox(0.11, 0.06, 0.08, 0.006)} material={MAT.blue} position={[0, 0.03, 0]} castShadow />
        <mesh geometry={GEO.box(0.1, 0.002, 0.07)} material={MAT.yellow} position={[0, 0.061, 0]} />
        <mesh geometry={GEO.rbox(0.112, 0.03, 0.082, 0.006)} material={MAT.clearPlastic} position={[0, 0.076, 0]} renderOrder={RENDER_ORDER.glass} />
      </group>
    </group>
  );
}

function StirBar() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 6;
  });
  return <mesh ref={ref} geometry={GEO.capsule(0.004, 0.022, 8)} material={MAT.white} position={[0, 0.008, 0]} rotation-z={Math.PI / 2} />;
}

export function HotplateStirrer() {
  return (
    <group>
      <mesh geometry={GEO.rbox(0.2, 0.1, 0.3, 0.015)} material={MAT.white} position={[0, 0.05, 0]} castShadow receiveShadow />
      <mesh geometry={GEO.rbox(0.18, 0.012, 0.18, 0.006)} material={MAT.offWhite} position={[0, 0.106, -0.04]} receiveShadow />
      {[-0.05, 0.05].map((x) => (
        <mesh key={x} geometry={GEO.cyl(0.017, 0.017, 0.014, 20)} material={MAT.darkGrey} position={[x, 0.05, 0.155]} rotation-x={Math.PI / 2} />
      ))}
      <mesh geometry={GEO.box(0.012, 0.006, 0.004)} material={MAT.glow} position={[0, 0.075, 0.151]} />
      <group position={[0, 0.112, -0.04]}>
        <group position={[0, 0.003, 0]}>
          <StirBar />
        </group>
        <Beaker liquid="#cdeff2" fill={0.55} />
      </group>
    </group>
  );
}

export function BunsenBurner() {
  const hose = GEO.custom(
    "bunsenHose",
    () =>
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
          new THREE.Vector3(0.025, 0.03, 0),
          new THREE.Vector3(0.08, 0.012, 0.0),
          new THREE.Vector3(0.16, 0.01, -0.08),
          new THREE.Vector3(0.2, 0.015, -0.2),
        ]),
        24,
        0.006,
        8,
      ),
  );
  return (
    <group>
      <mesh geometry={GEO.cyl(0.045, 0.05, 0.016, 28)} material={MAT.darkGrey} position={[0, 0.008, 0]} castShadow receiveShadow />
      <mesh geometry={GEO.cyl(0.008, 0.008, 0.15, 16)} material={MAT.chrome} position={[0, 0.09, 0]} castShadow />
      <mesh geometry={GEO.cyl(0.011, 0.011, 0.024, 16)} material={MAT.steel} position={[0, 0.035, 0]} />
      <mesh geometry={GEO.cyl(0.005, 0.005, 0.03, 10)} material={MAT.steel} position={[0.022, 0.03, 0]} rotation-z={Math.PI / 2} />
      <mesh geometry={hose} material={MAT.orangeRubber} castShadow />
    </group>
  );
}

/** Built facing +z; the zone rotates it against the wall. */
export function FumeHood() {
  const W = 1.8;
  const D = 0.9;
  return (
    <group>
      <mesh geometry={GEO.box(W, 0.1, D - 0.06)} material={MAT.plinth} position={[0, 0.05, -0.03]} />
      <mesh geometry={GEO.box(W, 0.78, D - 0.02)} material={MAT.cabinet} position={[0, 0.49, -0.01]} castShadow receiveShadow />
      {[-0.45, 0, 0.45].map((x) => (
        <mesh key={x} geometry={GEO.box(0.006, 0.74, 0.004)} material={MAT.cabinetSide} position={[x, 0.49, D / 2 - 0.018]} />
      ))}
      {[-0.67, -0.23, 0.23, 0.67].map((x) => (
        <mesh key={x} geometry={GEO.rbox(0.012, 0.16, 0.02, 0.004)} material={MAT.teal} position={[x + (x < 0 ? 0.17 : -0.17), 0.72, D / 2]} />
      ))}
      <mesh geometry={GEO.box(W, 0.04, D)} material={MAT.benchTop} position={[0, 0.9, 0]} receiveShadow />
      {[-1, 1].map((side) => (
        <mesh key={side} geometry={GEO.box(0.08, 1.4, D)} material={MAT.white} position={[(side * (W - 0.08)) / 2, 1.62, 0]} castShadow receiveShadow />
      ))}
      <mesh geometry={GEO.box(W - 0.16, 1.4, 0.04)} material={MAT.wallLower} position={[0, 1.62, -D / 2 + 0.02]} receiveShadow />
      <mesh geometry={GEO.box(W, 0.26, D)} material={MAT.white} position={[0, 2.45, 0]} castShadow />
      <mesh geometry={GEO.box(W - 0.3, 0.02, 0.08)} material={MAT.lightPanel} position={[0, 2.31, -0.15]} />
      <mesh
        geometry={GEO.plane(0.62, 0.2)}
        material={signMaterial("hood", { title: "FUME HOOD", subtitle: "Keep the sash low", bg: "#0b2545", icon: "hood" })}
        position={[-0.45, 2.45, D / 2 + 0.002]}
      />
      <mesh geometry={GEO.plane(0.16, 0.08)} material={screen("hoodFlow", ["0.5 m/s", "FLOW OK"], "#7ef9a0")} position={[0.6, 2.45, D / 2 + 0.002]} />
      <group position={[0, 0, D / 2 - 0.02]}>
        <mesh geometry={GEO.plane(W - 0.18, 0.7)} material={MAT.windowGlass} position={[0, 1.62, 0]} renderOrder={RENDER_ORDER.glass} />
        <mesh geometry={GEO.plane(W - 0.18, 0.3)} material={MAT.windowGlass} position={[0, 2.16, -0.03]} renderOrder={RENDER_ORDER.glass} />
        {[1.27, 1.97].map((y) => (
          <mesh key={y} geometry={GEO.box(W - 0.16, 0.035, 0.03)} material={MAT.darkSteel} position={[0, y, 0]} castShadow />
        ))}
        <mesh geometry={GEO.cyl(0.012, 0.012, 1.2, 12)} material={MAT.chrome} position={[0, 1.24, 0.04]} rotation-z={Math.PI / 2} />
      </group>
      <mesh geometry={GEO.cyl(0.16, 0.16, 0.86, 24)} material={MAT.steel} position={[0, 3.0, -0.12]} />
    </group>
  );
}
