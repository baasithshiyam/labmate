import * as THREE from "three";
import { useRef, type ReactNode } from "react";
import { useFrame, type ThreeElements, type ThreeEvent } from "@react-three/fiber";
import { useLab, type Mode } from "../state/store";

/** Pixels a pointer may travel between down and up and still count as a click (not a look-drag). */
export const CLICK_SLOP = 8;

type GroupProps = Omit<ThreeElements["group"], "children">;

interface InteractiveProps extends GroupProps {
  label: string;
  /** The mode in which this object responds. */
  activeIn?: Mode;
  onSelect: () => void;
  hoverScale?: number;
  children: ReactNode;
}

function isActive(mode: Mode) {
  const s = useLab.getState();
  return s.mode === mode && !s.inspect && !s.agentOpen && s.view === "3d";
}

/** Wraps scene objects that can be hovered and clicked: shows a tooltip and grows slightly on hover. */
export function Interactive({ label, activeIn = "explore", onSelect, hoverScale = 1.045, children, ...group }: InteractiveProps) {
  const inner = useRef<THREE.Group>(null);
  const hovered = useRef(false);

  useFrame((_, delta) => {
    const g = inner.current;
    if (!g) return;
    const target = hovered.current && isActive(activeIn) ? hoverScale : 1;
    if (Math.abs(g.scale.x - target) < 1e-4) return;
    g.scale.setScalar(THREE.MathUtils.damp(g.scale.x, target, 14, delta));
  });

  const over = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    hovered.current = true;
    if (isActive(activeIn)) useLab.getState().setHover(label);
  };
  const out = () => {
    hovered.current = false;
    if (useLab.getState().hover === label) useLab.getState().setHover(null);
  };
  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > CLICK_SLOP || !isActive(activeIn)) return;
    onSelect();
  };

  return (
    <group {...group} onPointerOver={over} onPointerOut={out} onClick={click}>
      <group ref={inner}>{children}</group>
    </group>
  );
}

const stop = (e: ThreeEvent<PointerEvent | MouseEvent>) => e.stopPropagation();

/** Static structure that should block clicks and hovers from reaching objects behind it. */
export function Blocker({ children, ...group }: GroupProps & { children: ReactNode }) {
  return (
    <group {...group} onPointerOver={stop} onClick={stop}>
      {children}
    </group>
  );
}
