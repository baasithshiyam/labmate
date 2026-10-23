import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useLab } from "../../state/store";
import { GEO, MAT } from "../materials";
import { BRAND, signTexture, speechBubbleTexture } from "../textures";

const tmp = new THREE.Vector3();
const local = new THREE.Vector3();

interface AgentProps {
  /** Disable camera tracking and the speech bubble, for the preview viewer. */
  still?: boolean;
}

/** The Labmate sales agent: a stylised figure in a lab coat who breathes, blinks, follows the visitor and waves. */
export function Agent({ still = false }: AgentProps) {
  const root = useRef<THREE.Group>(null);
  const torso = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const eyes = useRef<THREE.Group>(null);
  const mouth = useRef<THREE.Mesh>(null);
  const rightShoulder = useRef<THREE.Group>(null);
  const rightElbow = useRef<THREE.Group>(null);
  const leftShoulder = useRef<THREE.Group>(null);
  const bubble = useRef<THREE.Sprite>(null);
  const wave = useRef({ start: -100, lastNear: -100 });
  const blink = useRef({ next: 2.5 });

  const badge = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: signTexture("badge", { title: "Labmate.lk", subtitle: "Sales Agent", bg: BRAND.teal, width: 256, height: 128 }),
      }),
    [],
  );
  const bubbleMaterial = useMemo(
    () => new THREE.SpriteMaterial({ map: speechBubbleTexture("Hi! Need help?", "Tap me to talk"), depthTest: true, transparent: true }),
    [],
  );

  useEffect(
    () =>
      useLab.subscribe((s, prev) => {
        if (s.agentOpen && !prev.agentOpen) wave.current.start = performance.now() / 1000;
        if (s.hover?.startsWith("Sales agent") && !prev.hover?.startsWith("Sales agent")) {
          const t = performance.now() / 1000;
          if (t - wave.current.start > 3) wave.current.start = t;
        }
      }),
    [],
  );

  useFrame((state, delta) => {
    const t = performance.now() / 1000;
    const lab = useLab.getState();

    if (torso.current) torso.current.scale.y = 1 + Math.sin(t * 1.7) * 0.008;

    // Turn the head towards the visitor, within comfortable limits.
    if (head.current && root.current) {
      let yaw = Math.sin(t * 0.4) * 0.15;
      let pitch = 0;
      if (!still) {
        head.current.getWorldPosition(tmp);
        local.copy(state.camera.position);
        root.current.worldToLocal(local);
        local.sub(root.current.worldToLocal(tmp));
        yaw = THREE.MathUtils.clamp(Math.atan2(local.x, local.z), -0.75, 0.75);
        pitch = THREE.MathUtils.clamp(-Math.atan2(local.y, Math.hypot(local.x, local.z)), -0.3, 0.3);
        // Greet visitors who walk up to the desk.
        const dist = Math.hypot(local.x, local.z);
        if (dist < 3.2 && t - wave.current.lastNear > 25 && lab.mode === "explore") {
          wave.current.lastNear = t;
          wave.current.start = t;
        }
      }
      head.current.rotation.y = THREE.MathUtils.damp(head.current.rotation.y, yaw, 5, delta);
      head.current.rotation.x = THREE.MathUtils.damp(head.current.rotation.x, pitch, 5, delta);
    }

    if (eyes.current) {
      if (t > blink.current.next) blink.current.next = t + 2.5 + Math.random() * 3;
      const closing = blink.current.next - t < 0.13;
      eyes.current.scale.y = THREE.MathUtils.damp(eyes.current.scale.y, closing ? 0.1 : 1, 30, delta);
    }

    if (mouth.current) {
      const talking = lab.talkUntil > t;
      const open = talking ? 1.2 + Math.abs(Math.sin(t * 13)) * 1.6 : 1;
      mouth.current.scale.y = THREE.MathUtils.damp(mouth.current.scale.y, open, 18, delta);
    }

    // Right arm: rest pose, or a wave for about 2.4 s.
    const waveT = t - wave.current.start;
    const waving = waveT < 2.4;
    if (rightShoulder.current && rightElbow.current) {
      const raise = waving ? Math.min(1, waveT * 4, (2.4 - waveT) * 4) : 0;
      rightShoulder.current.rotation.z = THREE.MathUtils.damp(rightShoulder.current.rotation.z, 0.12 + raise * 2.35, 10, delta);
      rightShoulder.current.rotation.x = THREE.MathUtils.damp(rightShoulder.current.rotation.x, -raise * 0.25, 10, delta);
      const swing = waving ? Math.sin(waveT * 11) * 0.45 : 0;
      rightElbow.current.rotation.z = THREE.MathUtils.damp(rightElbow.current.rotation.z, raise * (0.5 + swing), 14, delta);
    }
    if (leftShoulder.current) {
      const talking = lab.talkUntil > t;
      leftShoulder.current.rotation.x = THREE.MathUtils.damp(leftShoulder.current.rotation.x, talking ? -0.55 + Math.sin(t * 2.2) * 0.12 : -0.05, 4, delta);
    }

    if (bubble.current) {
      const show = !still && lab.mode === "explore" && !lab.agentOpen && !lab.inspect;
      bubble.current.visible = show;
      bubble.current.position.y = 2.08 + Math.sin(t * 2) * 0.025;
    }
  });

  return (
    <group ref={root}>
      {/* Legs and shoes */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.09, 0, 0]}>
          <mesh geometry={GEO.capsule(0.068, 0.62, 10)} material={MAT.trouser} position={[0, 0.44, 0]} castShadow />
          <mesh geometry={GEO.rbox(0.1, 0.07, 0.24, 0.03)} material={MAT.shoe} position={[0, 0.035, 0.04]} castShadow />
        </group>
      ))}

      <group ref={torso} position={[0, 0.86, 0]}>
        {/* Coat skirt and body */}
        <mesh geometry={GEO.cyl(0.215, 0.26, 0.34, 20)} material={MAT.coat} position={[0, -0.12, 0]} scale={[1, 1, 0.62]} castShadow />
        <mesh geometry={GEO.cyl(0.215, 0.205, 0.5, 20)} material={MAT.coat} position={[0, 0.3, 0]} scale={[1, 1, 0.62]} castShadow />
        <mesh geometry={GEO.capsule(0.09, 0.3, 10)} material={MAT.coat} position={[0, 0.56, 0]} rotation-z={Math.PI / 2} scale={[1, 1, 0.75]} castShadow />
        {/* Teal shirt and lapels */}
        <mesh geometry={GEO.box(0.12, 0.3, 0.02)} material={MAT.fabricTeal} position={[0, 0.42, 0.122]} />
        {[-1, 1].map((side) => (
          <mesh key={side} geometry={GEO.box(0.07, 0.32, 0.012)} material={MAT.offWhite} position={[side * 0.068, 0.41, 0.13]} rotation-z={side * -0.28} />
        ))}
        <mesh geometry={GEO.plane(0.1, 0.05)} material={badge} position={[0.11, 0.42, 0.137]} rotation-y={0.08} />
        <mesh geometry={GEO.box(0.006, 0.05, 0.004)} material={MAT.blue} position={[-0.1, 0.43, 0.135]} />
        {[0, 1, 2].map((i) => (
          <mesh key={i} geometry={GEO.sphere(0.009, 10, 6)} material={MAT.grey} position={[0.005, 0.18 - i * 0.12, 0.135]} />
        ))}

        {/* Neck and head */}
        <mesh geometry={GEO.cyl(0.05, 0.055, 0.1, 14)} material={MAT.skin} position={[0, 0.66, 0]} />
        <group ref={head} position={[0, 0.7, 0]}>
          <mesh geometry={GEO.sphere(0.118, 32, 24)} material={MAT.skin} position={[0, 0.12, 0]} scale={[0.92, 1.06, 0.98]} castShadow />
          <mesh geometry={GEO.sphere(0.124, 28, 16)} material={MAT.hair} position={[0, 0.16, -0.012]} scale={[0.96, 0.84, 1]} />
          <mesh geometry={GEO.capsule(0.045, 0.12, 8)} material={MAT.hair} position={[0, 0.215, 0.07]} rotation-z={Math.PI / 2} scale={[1, 1, 0.6]} />
          {[-1, 1].map((side) => (
            <mesh key={side} geometry={GEO.sphere(0.026, 12, 8)} material={MAT.skin} position={[side * 0.108, 0.115, 0]} scale={[0.5, 1, 0.8]} />
          ))}
          <group ref={eyes} position={[0, 0.13, 0.1]}>
            {[-1, 1].map((side) => (
              <group key={side} position={[side * 0.04, 0, 0]}>
                <mesh geometry={GEO.sphere(0.017, 14, 10)} material={MAT.eyeWhite} scale={[1, 1, 0.5]} />
                <mesh geometry={GEO.sphere(0.0105, 12, 8)} material={MAT.eye} position={[0, -0.001, 0.007]} />
              </group>
            ))}
          </group>
          {[-1, 1].map((side) => (
            <mesh key={side} geometry={GEO.box(0.034, 0.007, 0.01)} material={MAT.hair} position={[side * 0.042, 0.163, 0.105]} rotation-z={side * -0.12} />
          ))}
          {/* Round glasses */}
          {[-1, 1].map((side) => (
            <mesh key={side} geometry={GEO.torus(0.027, 0.0028, Math.PI * 2, 6, 24)} material={MAT.darkSteel} position={[side * 0.041, 0.13, 0.118]} />
          ))}
          <mesh geometry={GEO.box(0.025, 0.004, 0.004)} material={MAT.darkSteel} position={[0, 0.135, 0.12]} />
          <mesh geometry={GEO.sphere(0.016, 12, 8)} material={MAT.skin} position={[0, 0.095, 0.118]} scale={[0.8, 1, 0.9]} />
          <mesh ref={mouth} geometry={GEO.torus(0.026, 0.0055, Math.PI, 6, 16)} material={MAT.lip} position={[0, 0.062, 0.104]} rotation-z={Math.PI} />
        </group>

        {/* Arms: shoulder pivot, upper arm, elbow pivot, forearm, hand */}
        {[-1, 1].map((side) => (
          <group key={side} ref={side === 1 ? rightShoulder : leftShoulder} position={[side * 0.25, 0.54, 0]} rotation-z={side * 0.12}>
            <mesh geometry={GEO.capsule(0.055, 0.22, 10)} material={MAT.coat} position={[0, -0.14, 0]} castShadow />
            <group ref={side === 1 ? rightElbow : undefined} position={[0, -0.28, 0]}>
              <mesh geometry={GEO.capsule(0.048, 0.2, 10)} material={MAT.coat} position={[0, -0.12, 0]} castShadow />
              <mesh geometry={GEO.sphere(0.045, 14, 10)} material={MAT.skin} position={[0, -0.27, 0]} scale={[0.9, 1.1, 0.7]} />
            </group>
          </group>
        ))}
      </group>

      <sprite ref={bubble} material={bubbleMaterial} position={[0, 2.08, 0]} scale={[0.62, 0.252, 1]} />
    </group>
  );
}
