import * as THREE from "three";
import { useEffect, useLayoutEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { isTypingTarget, joystick, prefersReducedMotion } from "../lib/input";
import { useLab, type TravelTarget } from "../state/store";
import { BENCH_EXIT, EYE_HEIGHT, lookFrom, resolveCollisions, VIEWPOINTS, zoneAt, type Viewpoint } from "./layout";

const LOOK_SPEED = { mouse: 0.0042, touch: 0.0065 };
const WALK_SPEED = 2.0;
const RUN_SPEED = 3.4;
const PITCH_LIMIT = 1.15;

interface Tween {
  from: { position: THREE.Vector3; yaw: number; pitch: number };
  to: { position: THREE.Vector3; yaw: number; pitch: number };
  t: number;
  duration: number;
  /** Locked tweens ignore input until they finish (entering the lab, sitting at the bench). */
  locked: boolean;
}

function lerpAngle(a: number, b: number, t: number) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Viewpoints that need more room on tall, narrow screens. */
function viewpointFor(target: TravelTarget, aspect: number, mode: string): Viewpoint {
  const portrait = aspect < 0.85;
  if (target === "bench" && mode === "explore") return BENCH_EXIT;
  if (target === "bench" && portrait) return lookFrom([-1.18, 1.85, 1.1], [-1.18, 0.7, -0.6]);
  // On phones the chat covers the lower half, so look down and keep the agent near the top of the screen.
  if (target === "agent" && portrait) return lookFrom([2.4, 1.6, 4.4], [2.4, 1.06, 1.98]);
  if (target === "entrance" && portrait) return lookFrom([0.2, EYE_HEIGHT, 4.9], [2.2, 1.35, 2.0]);
  return VIEWPOINTS[target];
}

export function PlayerControls() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const gl = useThree((s) => s.gl);
  const s = useRef({
    yaw: VIEWPOINTS.intro.yaw,
    pitch: VIEWPOINTS.intro.pitch,
    position: new THREE.Vector3(...VIEWPOINTS.intro.position),
    velocity: new THREE.Vector3(),
    tween: null as Tween | null,
    keys: new Set<string>(),
    drag: null as { id: number; x: number; y: number; type: string } | null,
    zoneTimer: 0,
    bob: 0,
  });

  useLayoutEffect(() => {
    camera.rotation.order = "YXZ";
  }, [camera]);

  useEffect(() => {
    const startTween = (target: TravelTarget | { x: number; z: number }) => {
      const st = s.current;
      const { size } = { size: gl.domElement.getBoundingClientRect() };
      const aspect = size.width / Math.max(1, size.height);
      const lab = useLab.getState();
      let to: Viewpoint;
      if (typeof target === "string") {
        to = viewpointFor(target, aspect, lab.mode);
      } else {
        const [x, z] = resolveCollisions(target.x, target.z);
        to = { position: [x, EYE_HEIGHT, z], yaw: st.yaw, pitch: Math.min(st.pitch, 0.1) };
      }
      const toPosition = new THREE.Vector3(...to.position);
      const distance = toPosition.distanceTo(st.position);
      const fromIntro = st.position.z > 7;
      const reduced = prefersReducedMotion();
      st.tween = {
        from: { position: st.position.clone(), yaw: st.yaw, pitch: st.pitch },
        to: { position: toPosition, yaw: to.yaw, pitch: to.pitch },
        t: 0,
        duration: reduced ? 0.35 : fromIntro ? 3.0 : THREE.MathUtils.clamp(distance / 2.6, 0.7, 2.4),
        locked: fromIntro || target === "bench" || target === "agent",
      };
      st.velocity.set(0, 0, 0);
    };
    return useLab.subscribe((state, prev) => {
      if (state.travel && state.travel !== prev.travel) startTween(state.travel.target);
    });
  }, [gl]);

  useEffect(() => {
    const el = gl.domElement;
    const canLook = () => {
      const lab = useLab.getState();
      return lab.mode === "explore" && !lab.inspect && !lab.agentOpen && !s.current.tween?.locked;
    };
    const down = (e: PointerEvent) => {
      if (!canLook() || s.current.drag) return;
      s.current.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, type: e.pointerType };
    };
    const move = (e: PointerEvent) => {
      const drag = s.current.drag;
      if (!drag || drag.id !== e.pointerId) return;
      if (!canLook()) {
        s.current.drag = null;
        return;
      }
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      drag.x = e.clientX;
      drag.y = e.clientY;
      if (Math.abs(dx) + Math.abs(dy) > 0 && s.current.tween && !s.current.tween.locked) s.current.tween = null;
      const k = drag.type === "touch" ? LOOK_SPEED.touch : LOOK_SPEED.mouse;
      s.current.yaw += dx * k;
      s.current.pitch = THREE.MathUtils.clamp(s.current.pitch + dy * k, -PITCH_LIMIT, PITCH_LIMIT);
    };
    const up = (e: PointerEvent) => {
      if (s.current.drag?.id === e.pointerId) s.current.drag = null;
    };
    const keydown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (["w", "a", "s", "d", "q", "e", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Shift"].includes(key)) {
        s.current.keys.add(key);
        if (key.startsWith("Arrow")) e.preventDefault();
      }
    };
    const keyup = (e: KeyboardEvent) => {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      s.current.keys.delete(key);
    };
    const clear = () => s.current.keys.clear();
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    window.addEventListener("keydown", keydown);
    window.addEventListener("keyup", keyup);
    window.addEventListener("blur", clear);
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("keyup", keyup);
      window.removeEventListener("blur", clear);
    };
  }, [gl]);

  useFrame((state, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const st = s.current;
    const lab = useLab.getState();
    const aspect = state.size.width / Math.max(1, state.size.height);
    const fov = aspect < 0.85 ? 70 : 58;
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }

    let moving = 0;
    if (st.tween) {
      const tw = st.tween;
      tw.t = Math.min(1, tw.t + dt / tw.duration);
      const e = easeInOut(tw.t);
      st.position.lerpVectors(tw.from.position, tw.to.position, e);
      st.yaw = lerpAngle(tw.from.yaw, tw.to.yaw, e);
      st.pitch = THREE.MathUtils.lerp(tw.from.pitch, tw.to.pitch, e);
      if (tw.t >= 1) st.tween = null;
    } else if (lab.mode === "explore" && !lab.inspect && !lab.agentOpen) {
      const k = st.keys;
      const forward = (k.has("w") || k.has("ArrowUp") ? 1 : 0) - (k.has("s") || k.has("ArrowDown") ? 1 : 0) - joystick.y;
      const strafe = (k.has("d") ? 1 : 0) - (k.has("a") ? 1 : 0) + joystick.x;
      const turn = (k.has("ArrowLeft") || k.has("q") ? 1 : 0) - (k.has("ArrowRight") || k.has("e") ? 1 : 0);
      st.yaw += turn * 1.9 * dt;
      const speed = k.has("Shift") ? RUN_SPEED : WALK_SPEED;
      const len = Math.hypot(forward, strafe);
      const f = len > 1 ? forward / len : forward;
      const r = len > 1 ? strafe / len : strafe;
      const sin = Math.sin(st.yaw);
      const cos = Math.cos(st.yaw);
      const targetX = (-sin * f + cos * r) * speed;
      const targetZ = (-cos * f - sin * r) * speed;
      st.velocity.x = THREE.MathUtils.damp(st.velocity.x, targetX, 9, dt);
      st.velocity.z = THREE.MathUtils.damp(st.velocity.z, targetZ, 9, dt);
      const [x, z] = resolveCollisions(st.position.x + st.velocity.x * dt, st.position.z + st.velocity.z * dt);
      st.position.set(x, EYE_HEIGHT, z);
      moving = Math.hypot(st.velocity.x, st.velocity.z) / WALK_SPEED;
    }

    if (lab.mode === "intro" && !st.tween) {
      const t = state.clock.elapsedTime;
      st.yaw = VIEWPOINTS.intro.yaw + Math.sin(t * 0.35) * 0.04;
      st.pitch = VIEWPOINTS.intro.pitch + Math.sin(t * 0.27) * 0.015;
    }

    if (!prefersReducedMotion()) st.bob += dt * 9 * Math.min(1.4, moving);
    const bob = Math.sin(st.bob) * 0.018 * Math.min(1, moving);
    camera.position.set(st.position.x, st.position.y + bob, st.position.z);
    camera.rotation.set(st.pitch, st.yaw, 0);

    st.zoneTimer += dt;
    if (st.zoneTimer > 0.4 && lab.mode === "explore" && !lab.agentOpen) {
      st.zoneTimer = 0;
      lab.setZone(zoneAt(st.position.x, st.position.z));
    }
  });

  return null;
}
