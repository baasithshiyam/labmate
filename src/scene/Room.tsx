import * as THREE from "three";
import { useMemo, useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useLab } from "../state/store";
import { logoMaterial, Plant } from "./furniture";
import { Blocker, CLICK_SLOP } from "./Interactive";
import { ROOM } from "./layout";
import { GEO, MAT, RENDER_ORDER } from "./materials";
import { signMaterial } from "./models/instruments";
import { floorTexture, ghsPosterTexture, periodicTableTexture, skyTexture } from "./textures";

const { halfW: W, halfD: D, height: H, doorHalfWidth: DW, doorHeight: DH } = ROOM;
const T = 0.15;

/** Window opening in the +x wall. */
const WIN = { z0: -4.6, z1: 1.6, y0: 1.15, y1: 2.75 };

function Wall({ size, position }: { size: [number, number, number]; position: [number, number, number] }) {
  return <mesh geometry={GEO.box(...size)} material={MAT.wall} position={position} receiveShadow castShadow />;
}

function Floor() {
  const marker = useRef<THREE.Mesh>(null);
  const material = useMemo(() => new THREE.MeshStandardMaterial({ map: floorTexture(), roughness: 0.55 }), []);

  const move = (e: ThreeEvent<PointerEvent>) => {
    const m = marker.current;
    if (!m) return;
    const lab = useLab.getState();
    m.visible = lab.mode === "explore" && !lab.inspect && !lab.agentOpen;
    m.position.set(e.point.x, 0.004, e.point.z);
  };
  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > CLICK_SLOP) return;
    const lab = useLab.getState();
    if (lab.mode !== "explore" || lab.inspect || lab.agentOpen) return;
    lab.walkTo(e.point.x, e.point.z);
  };

  return (
    <group>
      <mesh
        geometry={GEO.plane(W * 2, D * 2)}
        material={material}
        rotation-x={-Math.PI / 2}
        receiveShadow
        onPointerMove={move}
        onPointerOver={(e) => {
          e.stopPropagation();
          useLab.getState().setHover(null);
        }}
        onPointerOut={() => marker.current && (marker.current.visible = false)}
        onClick={click}
      />
      <mesh ref={marker} geometry={GEO.custom("floorMarker", () => new THREE.RingGeometry(0.16, 0.22, 40))} rotation-x={-Math.PI / 2} visible={false}>
        <meshBasicMaterial color="#0fa3a3" transparent opacity={0.75} depthWrite={false} />
      </mesh>
    </group>
  );
}

/** Sliding glass entrance doors that open when the camera is close. */
function Doors() {
  const left = useRef<THREE.Group>(null);
  const right = useRef<THREE.Group>(null);
  const open = useRef(0);
  useFrame((state, delta) => {
    const c = state.camera.position;
    const near = c.z > 4.4 && c.z < 8.3 && Math.abs(c.x) < 2.6 && useLab.getState().mode !== "intro";
    open.current = THREE.MathUtils.damp(open.current, near ? 1 : 0, 3.2, delta);
    if (left.current) left.current.position.x = -DW / 2 - open.current * (DW - 0.05);
    if (right.current) right.current.position.x = DW / 2 + open.current * (DW - 0.05);
  });
  const panel = (
    <group>
      <mesh geometry={GEO.box(DW, DH - 0.04, 0.012)} material={MAT.windowGlass} position={[0, DH / 2, 0]} renderOrder={RENDER_ORDER.glass} />
      <mesh geometry={GEO.box(DW, 0.05, 0.04)} material={MAT.darkSteel} position={[0, 0.025, 0]} />
      <mesh geometry={GEO.box(DW, 0.05, 0.04)} material={MAT.darkSteel} position={[0, DH - 0.025, 0]} />
      {[-1, 1].map((s) => (
        <mesh key={s} geometry={GEO.box(0.04, DH, 0.04)} material={MAT.darkSteel} position={[(s * (DW - 0.04)) / 2, DH / 2, 0]} />
      ))}
      <mesh geometry={GEO.box(DW - 0.04, 0.08, 0.014)} material={MAT.teal} position={[0, 1.05, 0]} />
    </group>
  );
  return (
    <group position={[0, 0, D + 0.02]}>
      <group ref={left}>{panel}</group>
      <group ref={right}>{panel}</group>
      <mesh geometry={GEO.box(DW * 2 + 0.2, 0.08, 0.12)} material={MAT.darkSteel} position={[0, DH + 0.04, 0]} />
    </group>
  );
}

function Windows() {
  const sky = useMemo(() => new THREE.MeshBasicMaterial({ map: skyTexture(), toneMapped: false }), []);
  const len = WIN.z1 - WIN.z0;
  const mullions = [WIN.z0 + len / 3, WIN.z0 + (2 * len) / 3];
  return (
    <group>
      <mesh geometry={GEO.plane(18, 7)} material={sky} position={[W + 3.2, 2.0, -1.5]} rotation-y={-Math.PI / 2} />
      <mesh geometry={GEO.plane(len, WIN.y1 - WIN.y0)} material={MAT.windowGlass} position={[W - 0.02, (WIN.y0 + WIN.y1) / 2, (WIN.z0 + WIN.z1) / 2]} rotation-y={-Math.PI / 2} renderOrder={RENDER_ORDER.glass} />
      {mullions.map((z) => (
        <mesh key={z} geometry={GEO.box(0.08, WIN.y1 - WIN.y0, 0.06)} material={MAT.darkSteel} position={[W - 0.02, (WIN.y0 + WIN.y1) / 2, z]} />
      ))}
      <mesh geometry={GEO.box(0.22, 0.04, len + 0.1)} material={MAT.white} position={[W - 0.08, WIN.y0 - 0.02, (WIN.z0 + WIN.z1) / 2]} receiveShadow />
      {[WIN.y0, WIN.y1].map((y) => (
        <mesh key={y} geometry={GEO.box(0.1, 0.05, len)} material={MAT.darkSteel} position={[W - 0.02, y, (WIN.z0 + WIN.z1) / 2]} />
      ))}
    </group>
  );
}

function Walls() {
  const winLen = WIN.z1 - WIN.z0;
  return (
    <Blocker>
      {/* Back (-z) and left (-x) walls */}
      <Wall size={[W * 2 + T * 2, H, T]} position={[0, H / 2, -D - T / 2]} />
      <Wall size={[T, H, D * 2]} position={[-W - T / 2, H / 2, 0]} />
      {/* Right (+x) wall with the window opening */}
      <Wall size={[T, H, WIN.z0 + D]} position={[W + T / 2, H / 2, (-D + WIN.z0) / 2]} />
      <Wall size={[T, H, D - WIN.z1]} position={[W + T / 2, H / 2, (D + WIN.z1) / 2]} />
      <Wall size={[T, WIN.y0, winLen]} position={[W + T / 2, WIN.y0 / 2, (WIN.z0 + WIN.z1) / 2]} />
      <Wall size={[T, H - WIN.y1, winLen]} position={[W + T / 2, (H + WIN.y1) / 2, (WIN.z0 + WIN.z1) / 2]} />
      {/* Front (+z) wall with the door opening */}
      <Wall size={[W - DW + T, H, T]} position={[-(W + DW + T) / 2, H / 2, D + T / 2]} />
      <Wall size={[W - DW + T, H, T]} position={[(W + DW + T) / 2, H / 2, D + T / 2]} />
      <Wall size={[DW * 2, H - DH, T]} position={[0, (H + DH) / 2, D + T / 2]} />
      {/* Ceiling: it does not cast shadows, so the overhead key light reaches the room. */}
      <mesh geometry={GEO.plane(W * 2, D * 2)} material={MAT.ceiling} position={[0, H, 0]} rotation-x={Math.PI / 2} />
      {/* Coved skirting and a teal accent line */}
      {[
        [[W * 2, 0.12, 0.02], [0, 0.06, -D + 0.01]],
        [[0.02, 0.12, D * 2], [-W + 0.01, 0.06, 0]],
        [[0.02, 0.12, D * 2], [W - 0.01, 0.06, 0]],
        [[W - DW, 0.12, 0.02], [-(W + DW) / 2, 0.06, D - 0.01]],
        [[W - DW, 0.12, 0.02], [(W + DW) / 2, 0.06, D - 0.01]],
        [[W * 2, 0.05, 0.012], [0, 1.22, -D + 0.006]],
        [[0.012, 0.05, D * 2], [-W + 0.006, 1.22, 0]],
      ].map(([size, position], i) => (
        <mesh key={i} geometry={GEO.box(...(size as [number, number, number]))} material={MAT.tealDark} position={position as [number, number, number]} />
      ))}
    </Blocker>
  );
}

function CeilingLights() {
  const xs = [-5.5, -2, 1.5, 5];
  const zs = [-3.5, -0.5, 2.5];
  return (
    <group>
      {xs.flatMap((x) =>
        zs.map((z) => (
          <group key={`${x}${z}`} position={[x, H - 0.012, z]}>
            <mesh geometry={GEO.box(1.24, 0.02, 0.64)} material={MAT.grey} />
            <mesh geometry={GEO.box(1.18, 0.012, 0.58)} material={MAT.lightPanel} position={[0, -0.012, 0]} />
          </group>
        )),
      )}
    </group>
  );
}

/** The small lobby outside the entrance, where the visit starts. */
function Lobby() {
  const LD = 4.8;
  const floor = useMemo(() => new THREE.MeshStandardMaterial({ color: "#d3d8dc", roughness: 0.6 }), []);
  return (
    <Blocker position={[0, 0, D + T]}>
      <mesh geometry={GEO.plane(6, LD)} material={floor} rotation-x={-Math.PI / 2} position={[0, 0, LD / 2]} receiveShadow />
      <mesh geometry={GEO.plane(6, LD)} material={MAT.ceiling} rotation-x={Math.PI / 2} position={[0, 3.2, LD / 2]} />
      {[-3, 3].map((x) => (
        <mesh key={x} geometry={GEO.box(0.1, 3.2, LD)} material={MAT.wallLower} position={[x, 1.6, LD / 2]} />
      ))}
      <mesh geometry={GEO.box(6, 3.2, 0.1)} material={MAT.wallLower} position={[0, 1.6, LD]} />
      <mesh geometry={GEO.plane(1.7, 0.5)} material={logoMaterial()} position={[0, 2.88, 0.01]} />
      <mesh geometry={GEO.box(1.6, 0.02, 0.5)} material={MAT.lightPanel} position={[0, 3.19, 1.6]} />
      <group position={[-2.3, 0, 0.6]}>
        <Plant />
      </group>
      <group position={[2.3, 0, 0.6]}>
        <Plant />
      </group>
    </Blocker>
  );
}

function Posters() {
  const periodic = useMemo(() => new THREE.MeshStandardMaterial({ map: periodicTableTexture(), roughness: 0.7 }), []);
  const ghs = useMemo(() => new THREE.MeshStandardMaterial({ map: ghsPosterTexture(), roughness: 0.7 }), []);
  return (
    <group>
      <mesh geometry={GEO.box(2.44, 1.44, 0.02)} material={MAT.navy} position={[0, 1.95, -D + 0.01]} />
      <mesh geometry={GEO.plane(2.4, 1.406)} material={periodic} position={[0, 1.95, -D + 0.022]} />
      <mesh geometry={GEO.plane(1.36, 0.4)} material={logoMaterial()} position={[0, 2.98, -D + 0.01]} />
      <mesh geometry={GEO.plane(0.78, 1.0)} material={ghs} position={[-W + 0.01, 2.08, 1.15]} rotation-y={Math.PI / 2} />
      <mesh
        geometry={GEO.plane(0.66, 0.25)}
        material={signMaterial("goggles", { title: "Safety goggles must be worn", bg: "#0b63b6", icon: "goggles" })}
        position={[-2.0, 1.9, D - 0.01]}
        rotation-y={Math.PI}
      />
    </group>
  );
}

export function Room() {
  return (
    <group>
      <Floor />
      <Walls />
      <Windows />
      <CeilingLights />
      <Doors />
      <Lobby />
      <Posters />
      <group position={[-1.75, 0, D - 0.45]}>
        <Plant />
      </group>
      <group position={[7.3, 0, D - 0.5]}>
        <Plant />
      </group>
    </group>
  );
}
