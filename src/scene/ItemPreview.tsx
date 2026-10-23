import { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Bounds, Center, ContactShadows, OrbitControls } from "@react-three/drei";
import { chemicalById, itemById } from "../data";
import type { Inspect } from "../state/store";
import { LabEnvironment, TONE_MAPPING } from "./Lighting";
import { MODELS } from "./models";
import { StockBottle } from "./models/bottles";

function Model({ inspect }: { inspect: NonNullable<Inspect> }) {
  if (inspect.type === "chemical") return <StockBottle chemical={chemicalById.get(inspect.id)!} />;
  const Component = MODELS[itemById.get(inspect.id)!.model];
  return <Component />;
}

/** A small turntable viewer: drag to rotate, scroll or pinch to zoom. */
export default function ItemPreview({ inspect }: { inspect: NonNullable<Inspect> }) {
  const [size, setSize] = useState(1);
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ fov: 32, position: [0.5, 0.35, 0.9], near: 0.01, far: 50 }}
      gl={{ antialias: true, toneMapping: TONE_MAPPING }}
      style={{ touchAction: "none" }}
    >
      <color attach="background" args={["#eef3f6"]} />
      <hemisphereLight args={["#ffffff", "#c3ccd3", 0.8]} />
      <directionalLight position={[2, 4, 3]} intensity={1.4} />
      <LabEnvironment resolution={128} intensity={0.9} />
      <Bounds fit clip observe margin={1.3}>
        <Center top key={`${inspect.type}-${inspect.id}`} onCentered={({ width, depth }) => setSize(Math.max(width, depth))}>
          <Model inspect={inspect} />
        </Center>
      </Bounds>
      <ContactShadows key={size} position={[0, 0, 0]} opacity={0.35} scale={size * 2.2} blur={2.2} far={size} frames={1} />
      <OrbitControls makeDefault autoRotate autoRotateSpeed={1.1} enablePan={false} enableDamping />
    </Canvas>
  );
}
