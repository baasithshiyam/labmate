import type { VesselId, ZoneId } from "../data";

/** Room interior spans x -HALF_W..HALF_W and z -HALF_D..HALF_D; the entrance is on the +z wall. */
export const ROOM = { halfW: 8, halfD: 6, height: 3.4, doorHalfWidth: 1.1, doorHeight: 2.5 } as const;
export const EYE_HEIGHT = 1.62;
export const BENCH_TOP = 0.94;

export interface Viewpoint {
  position: [number, number, number];
  yaw: number;
  pitch: number;
}

/** Builds a viewpoint looking from `position` at `target`. Yaw 0 looks down -z. */
export function lookFrom(position: [number, number, number], target: [number, number, number]): Viewpoint {
  const dx = target[0] - position[0];
  const dy = target[1] - position[1];
  const dz = target[2] - position[2];
  return {
    position,
    yaw: Math.atan2(-dx, -dz),
    pitch: Math.atan2(dy, Math.hypot(dx, dz)),
  };
}

export const ISLAND = { center: [-1.2, -0.4] as const, size: [4.4, 1.5] as const };
export const RECEPTION = { center: [2.4, 2.6] as const, length: 2.4, depth: 0.6, height: 1.05 };
export const AGENT_POSITION: [number, number, number] = [2.4, 0, 1.98];

export const VIEWPOINTS: Record<ZoneId | "intro" | "agent", Viewpoint> = {
  intro: lookFrom([0, EYE_HEIGHT, 9.2], [0, 1.45, 0]),
  entrance: lookFrom([0.2, EYE_HEIGHT, 4.7], [1.4, 1.2, 0]),
  reception: lookFrom([2.4, EYE_HEIGHT, 4.15], [2.4, 1.35, 2.0]),
  // Looks slightly right of the agent so they sit beside the chat panel.
  agent: lookFrom([2.4, 1.56, 3.7], [2.75, 1.45, 1.98]),
  chemicals: lookFrom([-4.6, EYE_HEIGHT, -2.95], [-4.6, 1.15, -5.6]),
  glassware: lookFrom([4.6, EYE_HEIGHT, -2.95], [4.6, 1.15, -5.6]),
  instruments: lookFrom([5.25, EYE_HEIGHT, -1.6], [7.4, 1.08, -1.6]),
  safety: lookFrom([-4.8, EYE_HEIGHT, 1.9], [-8, 1.3, 1.9]),
  bench: lookFrom([-1.18, 1.36, 0.42], [-1.18, 0.98, -0.55]),
};

/** Standing spot used when leaving the bench or the agent. */
export const BENCH_EXIT = lookFrom([-1.2, EYE_HEIGHT, 1.6], [-1.2, 1.0, -0.6]);

/** Axis-aligned obstacles on the floor plan: [minX, minZ, maxX, maxZ]. */
export const COLLIDERS: [number, number, number, number][] = [
  [ISLAND.center[0] - ISLAND.size[0] / 2, ISLAND.center[1] - ISLAND.size[1] / 2, ISLAND.center[0] + ISLAND.size[0] / 2, ISLAND.center[1] + ISLAND.size[1] / 2],
  [RECEPTION.center[0] - RECEPTION.length / 2, 1.6, RECEPTION.center[0] + RECEPTION.length / 2, RECEPTION.center[1] + RECEPTION.depth / 2],
  // Banner beside the desk
  [3.5, 1.6, 4.2, 1.95],
  // Chemical shelving, sink, glassware shelving and counter along the back wall
  [-7.35, -6, -1.85, -5.5],
  [-0.85, -6, 0.85, -5.35],
  [1.85, -6, 7.35, -5.35],
  // Instrument counter under the windows
  [7.28, -4.45, 8, 1.25],
  // Fume hood and extinguisher on the left wall
  [-8, -3.52, -7.08, -1.68],
  [-8, 2.65, -7.68, 2.95],
  // Stools behind the island and plants by the door
  [-2.8, -1.75, -2.4, -1.35],
  [0.0, -1.75, 0.4, -1.35],
  [-1.95, 5.35, -1.55, 5.75],
  [7.1, 5.3, 7.5, 5.7],
];

export const WALK_BOUNDS = { minX: -7.65, maxX: 7.65, minZ: -5.75, maxZ: 5.65 };
export const PLAYER_RADIUS = 0.35;

/** Pushes a point out of every collider and back inside the room. */
export function resolveCollisions(x: number, z: number): [number, number] {
  let px = Math.min(WALK_BOUNDS.maxX, Math.max(WALK_BOUNDS.minX, x));
  let pz = Math.min(WALK_BOUNDS.maxZ, Math.max(WALK_BOUNDS.minZ, z));
  for (const [minX, minZ, maxX, maxZ] of COLLIDERS) {
    const cx = Math.min(maxX, Math.max(minX, px));
    const cz = Math.min(maxZ, Math.max(minZ, pz));
    const dx = px - cx;
    const dz = pz - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 >= PLAYER_RADIUS * PLAYER_RADIUS) continue;
    if (d2 > 1e-8) {
      const d = Math.sqrt(d2);
      px = cx + (dx / d) * PLAYER_RADIUS;
      pz = cz + (dz / d) * PLAYER_RADIUS;
    } else {
      // Inside the box: leave by the nearest face.
      const exits = [px - minX, maxX - px, pz - minZ, maxZ - pz];
      const i = exits.indexOf(Math.min(...exits));
      if (i === 0) px = minX - PLAYER_RADIUS;
      if (i === 1) px = maxX + PLAYER_RADIUS;
      if (i === 2) pz = minZ - PLAYER_RADIUS;
      if (i === 3) pz = maxZ + PLAYER_RADIUS;
    }
  }
  return [px, pz];
}

/** Which zone a standing position belongs to, for the HUD. */
export function zoneAt(x: number, z: number): ZoneId {
  if (z > 3.4 && Math.abs(x) < 2) return "entrance";
  if (x > 1 && z > 1.2) return "reception";
  if (x < -5 && z > -1.5) return "safety";
  if (x > 5) return "instruments";
  if (z < -2.2 && x < 0) return "chemicals";
  if (z < -2.2 && x >= 0) return "glassware";
  if (x < -5) return "safety";
  return "bench";
}

/** Bench positions: reagent rack along the back edge, vessels in front. */
export const RACK = { x: -1.18, backZ: -0.98, frontZ: -0.81, spacing: 0.112 };
export const VESSEL_POSITIONS: Record<VesselId, [number, number, number]> = {
  beakerA: [-1.62, BENCH_TOP, -0.36],
  beakerB: [-1.38, BENCH_TOP, -0.36],
  flask: [-1.12, BENCH_TOP, -0.36],
  tube1: [-0.88, BENCH_TOP, -0.38],
  tube2: [-0.8, BENCH_TOP, -0.38],
  tube3: [-0.72, BENCH_TOP, -0.38],
};
