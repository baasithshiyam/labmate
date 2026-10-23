import * as THREE from "three";
import { Suspense, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { useBench, useLab } from "../state/store";
import { ExperimentBench } from "./ExperimentBench";
import { VIEWPOINTS } from "./layout";
import { Lighting, TONE_MAPPING } from "./Lighting";
import { PlayerControls } from "./PlayerControls";
import { Room } from "./Room";
import { BenchArea, ChemicalStore, GlasswareZone, InstrumentsZone, Reception, SafetyCorner } from "./zones";

/** Compiles every material up front, then waits a few frames before revealing the lab. */
function SceneReady() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const [compiled, setCompiled] = useState(false);
  const [frames, setFrames] = useState(0);
  useEffect(() => {
    useLab.getState().setProgress(0.75, "Polishing the glassware");
    let cancelled = false;
    gl.compileAsync(scene, camera)
      .catch(() => undefined)
      .then(() => {
        if (cancelled) return;
        useLab.getState().setProgress(0.92, "Switching on the lights");
        setCompiled(true);
      });
    return () => {
      cancelled = true;
    };
  }, [gl, scene, camera]);
  useFrame(() => {
    if (!compiled || frames > 4) return;
    if (frames === 4) useLab.getState().setReady();
    setFrames((f) => f + 1);
  });
  return null;
}

export default function LabCanvas() {
  const quality = useLab((s) => s.quality);
  const high = quality === "high";
  const [dpr, setDpr] = useState<number | [number, number]>(high ? [1, 1.75] : [1, 1.5]);

  useEffect(() => {
    useBench.getState().setAnimate(true);
    useLab.getState().setProgress(0.55, "Building the lab");
  }, []);

  return (
    <Canvas
      className="!absolute inset-0"
      style={{ touchAction: "none" }}
      shadows={high ? "percentage" : false}
      dpr={dpr}
      camera={{ fov: 58, near: 0.02, far: 60, position: VIEWPOINTS.intro.position }}
      gl={{ antialias: true, toneMapping: TONE_MAPPING, toneMappingExposure: 1.0, powerPreference: "high-performance" }}
      onCreated={(state) => {
        useLab.getState().setProgress(0.65, "Setting up the lights");
        if (import.meta.env.DEV) {
          // Dev-only probe: dispatch a "lab-probe" event and read document.body.dataset.labProbe.
          window.addEventListener("lab-probe", () => {
            const { gl, scene, camera } = state;
            const ctx = gl.getContext();
            const pixel = new Uint8Array(4);
            const times: number[] = [];
            for (let i = 0; i < 5; i++) {
              const t0 = performance.now();
              gl.render(scene, camera);
              ctx.readPixels(0, 0, 1, 1, ctx.RGBA, ctx.UNSIGNED_BYTE, pixel);
              times.push(Math.round((performance.now() - t0) * 10) / 10);
            }
            let meshes = 0;
            let transparent = 0;
            scene.traverse((o) => {
              const mesh = o as THREE.Mesh;
              if (!mesh.isMesh) return;
              meshes++;
              if ((mesh.material as THREE.Material).transparent) transparent++;
            });
            document.body.dataset.labProbe = JSON.stringify({
              times,
              calls: gl.info.render.calls,
              triangles: gl.info.render.triangles,
              programs: gl.info.programs?.length,
              textures: gl.info.memory.textures,
              geometries: gl.info.memory.geometries,
              meshes,
              transparent,
              pixelRatio: gl.getPixelRatio(),
              camera: camera.position.toArray().map((v) => Math.round(v * 100) / 100),
            });
          });
        }
      }}
      onPointerMissed={() => useLab.getState().setHover(null)}
    >
      <color attach="background" args={["#e9eef2"]} />
      <PerformanceMonitor
        flipflops={3}
        onDecline={() => setDpr(1)}
        onIncline={() => setDpr(high ? [1, 1.75] : [1, 1.5])}
        onFallback={() => setDpr(1)}
      />
      <Lighting shadows={high} />
      <Suspense fallback={null}>
        <Room />
        <ChemicalStore />
        <GlasswareZone />
        <InstrumentsZone />
        <SafetyCorner />
        <Reception />
        <BenchArea />
        <ExperimentBench />
        <SceneReady />
      </Suspense>
      <PlayerControls />
    </Canvas>
  );
}
