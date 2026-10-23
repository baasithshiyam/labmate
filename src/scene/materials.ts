import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

/**
 * Shared materials and geometries. Everything here lives for the whole session,
 * so meshes reference these instances through props and fiber never disposes them.
 */

const std = (color: string, roughness: number, metalness = 0, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });

export const MAT = {
  wall: std("#f3f6f9", 0.92),
  wallLower: std("#e7eef3", 0.9),
  ceiling: std("#fbfcfd", 0.95),
  benchTop: std("#23282e", 0.38),
  cabinet: std("#f2f5f8", 0.5),
  cabinetSide: std("#e4eaef", 0.55),
  plinth: std("#2f3740", 0.7),
  teal: std("#0fa3a3", 0.45),
  tealDark: std("#0b7c7f", 0.45),
  blue: std("#0b63b6", 0.45),
  navy: std("#0b2545", 0.5),
  steel: std("#c4c9d0", 0.32, 1),
  darkSteel: std("#6b7480", 0.42, 0.85),
  chrome: std("#eef1f4", 0.1, 1),
  white: std("#f6f7f5", 0.42),
  offWhite: std("#e9ebe8", 0.5),
  grey: std("#9aa3ad", 0.55),
  darkGrey: std("#4a525c", 0.55),
  black: std("#1d2126", 0.5),
  rubber: std("#141618", 0.85),
  red: std("#cf1f25", 0.4),
  green: std("#15934c", 0.45),
  yellow: std("#f2c230", 0.45),
  orangeRubber: std("#d76a2c", 0.7),
  cork: std("#b98d5e", 0.9),
  wood: std("#c69c72", 0.65),
  shelf: std("#dfe5ea", 0.5, 0.2),
  coat: std("#f7f7f4", 0.85),
  fabricTeal: std("#13807e", 0.85),
  skin: std("#9a6646", 0.62),
  hair: std("#1d1714", 0.7),
  eye: new THREE.MeshStandardMaterial({ color: "#16110f", roughness: 0.2 }),
  eyeWhite: std("#fbf8f3", 0.3),
  lip: std("#6e3a2c", 0.6),
  trouser: std("#26344a", 0.8),
  shoe: std("#1b1b1d", 0.45),
  lightPanel: new THREE.MeshBasicMaterial({ color: new THREE.Color(1.9, 1.9, 1.85), toneMapped: true }),
  glow: new THREE.MeshBasicMaterial({ color: "#a8fff2" }),
  screenOff: std("#0f1418", 0.25),
  glass: new THREE.MeshPhysicalMaterial({
    color: "#dcf3f6",
    roughness: 0.04,
    metalness: 0,
    transparent: true,
    opacity: 0.34,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    ior: 1.5,
    specularIntensity: 1,
    envMapIntensity: 1.8,
    depthWrite: false,
  }),
  glassThick: new THREE.MeshPhysicalMaterial({
    color: "#e8f7f6",
    roughness: 0.05,
    transparent: true,
    opacity: 0.26,
    clearcoat: 1,
    depthWrite: false,
  }),
  amberGlass: new THREE.MeshPhysicalMaterial({
    color: "#7a3c10",
    roughness: 0.08,
    transparent: true,
    opacity: 0.86,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
  }),
  windowGlass: new THREE.MeshPhysicalMaterial({
    color: "#dff2f7",
    roughness: 0.02,
    transparent: true,
    opacity: 0.1,
    depthWrite: false,
  }),
  plasticBottle: std("#f1f3ee", 0.38),
  clearPlastic: new THREE.MeshPhysicalMaterial({
    color: "#f4fbfb",
    roughness: 0.12,
    transparent: true,
    opacity: 0.32,
    clearcoat: 0.6,
    depthWrite: false,
  }),
};

/** Glass and liquids are sorted by renderOrder: liquid inside first, glass on top. */
export const RENDER_ORDER = { liquid: 1, glass: 2, foam: 3 } as const;

for (const m of [MAT.glass, MAT.glassThick, MAT.windowGlass, MAT.clearPlastic]) {
  m.side = THREE.FrontSide;
}

const geometries = new Map<string, THREE.BufferGeometry>();
function cached<T extends THREE.BufferGeometry>(key: string, make: () => T): T {
  let g = geometries.get(key) as T | undefined;
  if (!g) {
    g = make();
    geometries.set(key, g);
  }
  return g;
}

export const GEO = {
  box: (w: number, h: number, d: number) => cached(`box${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d)),
  rbox: (w: number, h: number, d: number, r = 0.01) =>
    cached(`rbox${w},${h},${d},${r}`, () => new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2))),
  cyl: (rt: number, rb: number, h: number, seg = 24, open = false) =>
    cached(`cyl${rt},${rb},${h},${seg},${open}`, () => new THREE.CylinderGeometry(rt, rb, h, seg, 1, open)),
  sphere: (r: number, ws = 24, hs = 16) => cached(`sph${r},${ws},${hs}`, () => new THREE.SphereGeometry(r, ws, hs)),
  capsule: (r: number, h: number, seg = 12) => cached(`cap${r},${h},${seg}`, () => new THREE.CapsuleGeometry(r, h, 4, seg, 1)),
  torus: (r: number, tube: number, arc = Math.PI * 2, rs = 10, ts = 32) =>
    cached(`tor${r},${tube},${arc},${rs},${ts}`, () => new THREE.TorusGeometry(r, tube, rs, ts, arc)),
  plane: (w: number, h: number) => cached(`pl${w},${h}`, () => new THREE.PlaneGeometry(w, h)),
  circle: (r: number, seg = 32) => cached(`cir${r},${seg}`, () => new THREE.CircleGeometry(r, seg)),
  /** Cylinder band facing +z, used for wrap-around labels. */
  label: (r: number, h: number, arc = 2.4) =>
    cached(`lab${r},${h},${arc}`, () => new THREE.CylinderGeometry(r, r, h, 24, 1, true, -arc / 2, arc)),
  lathe: (key: string, points: [number, number][], seg = 40) =>
    cached(`lathe-${key}`, () => new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(x, y)), seg)),
  custom: <T extends THREE.BufferGeometry>(key: string, make: () => T) => cached(key, make),
};

/** Builds a thin-walled lathe profile from an outer profile (bottom to rim) and a wall thickness. */
export function shellProfile(outer: [number, number][], wall: number, floor = wall * 1.6): [number, number][] {
  const inner = outer
    .slice()
    .reverse()
    .map(([x, y]) => [Math.max(0, x - wall), Math.max(floor, y)] as [number, number]);
  // Close at the centre of the floor.
  const last = inner[inner.length - 1];
  inner[inner.length - 1] = [0, last[1]];
  return [...outer, ...inner];
}
