import * as THREE from "three";
import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";

/** Reflections come from a baked environment of light cards that match the room's ceiling panels and windows. */
export function LabEnvironment({ resolution = 256, intensity = 0.85 }: { resolution?: number; intensity?: number }) {
  return (
    <Environment resolution={resolution} frames={1} environmentIntensity={intensity}>
      <color attach="background" args={["#dfe6ec"]} />
      {[-5.5, -2, 1.5, 5].flatMap((x) =>
        [-3.5, -0.5, 2.5].map((z) => (
          <Lightformer key={`${x}${z}`} form="rect" intensity={2.4} position={[x, 3.3, z]} rotation-x={Math.PI / 2} scale={[1.2, 0.6, 1]} />
        )),
      )}
      <Lightformer form="rect" intensity={2.2} color="#e3f3ff" position={[8, 2, -1.5]} rotation-y={-Math.PI / 2} scale={[6, 1.6, 1]} />
      <Lightformer form="rect" intensity={0.55} color="#f3f6f9" position={[0, 1.6, -6]} scale={[16, 3.2, 1]} />
      <Lightformer form="rect" intensity={0.45} color="#f3f6f9" position={[-8, 1.6, 0]} rotation-y={Math.PI / 2} scale={[12, 3.2, 1]} />
      <Lightformer form="rect" intensity={0.35} color="#f3f6f9" position={[0, 1.6, 6]} rotation-y={Math.PI} scale={[16, 3.2, 1]} />
      <Lightformer form="rect" intensity={0.25} color="#d9dfe3" position={[0, 0, 0]} rotation-x={-Math.PI / 2} scale={[16, 12, 1]} />
    </Environment>
  );
}

/** Overhead key light with one shadow map, rendered for the first frames only because the room is static. */
export function Lighting({ shadows }: { shadows: boolean }) {
  const gl = useThree((s) => s.gl);
  const frames = useRef(0);
  useFrame(() => {
    if (!shadows || frames.current < 0) return;
    frames.current++;
    if (frames.current > 12) {
      gl.shadowMap.autoUpdate = false;
      gl.shadowMap.needsUpdate = true;
      frames.current = -1;
    }
  });
  return (
    <>
      <hemisphereLight args={["#ffffff", "#b9c5cd", 0.7]} />
      <directionalLight
        position={[2.5, 9, 3.5]}
        intensity={1.55}
        color="#fffaf2"
        castShadow={shadows}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-radius={3}
      >
        <orthographicCamera attach="shadow-camera" args={[-10.5, 10.5, 8.5, -8.5, 1, 24]} />
      </directionalLight>
      <directionalLight position={[-6, 4, 2]} intensity={0.25} color="#e8f4ff" />
      <LabEnvironment resolution={shadows ? 256 : 128} />
    </>
  );
}

export const TONE_MAPPING = THREE.NeutralToneMapping;
