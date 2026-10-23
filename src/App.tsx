import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { useLab } from "./state/store";
import { AgentDialog } from "./ui/AgentChat";
import { BenchPanel } from "./ui/BenchUI";
import { Fallback2D } from "./ui/Fallback2D";
import { HelpDialog, Hud, Tooltip } from "./ui/Hud";
import { InfoPanel } from "./ui/InfoPanel";
import { Intro, LoadingScreen } from "./ui/Screens";

const LabCanvas = lazy(() =>
  import("./scene/LabCanvas").then((module) => {
    useLab.getState().setProgress(0.45, "Building the lab");
    return module;
  }),
);

/** If WebGL fails at runtime (context creation, lost GPU), fall back to the 2D guide. */
class WebGLBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.error("3D lab failed, switching to the 2D guide", error);
    useLab.getState().setView("2d");
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function useFontsReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    // Canvas textures draw text once, so the web fonts must be loaded first (but never wait forever).
    const fonts = Promise.all([
      document.fonts.load('700 40px "Inter"'),
      document.fonts.load('600 40px "Inter"'),
      document.fonts.load('700 40px "Space Grotesk"'),
    ]);
    const timeout = new Promise((resolve) => setTimeout(resolve, 2500));
    Promise.race([fonts, timeout])
      .catch(() => undefined)
      .then(() => setReady(true));
  }, []);
  return ready;
}

export default function App() {
  const view = useLab((s) => s.view);
  const fontsReady = useFontsReady();

  useEffect(() => {
    if (view === "3d") useLab.getState().setProgress(0.15, "Loading the 3D engine");
  }, [view]);

  if (view === "2d") return <Fallback2D />;

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#e9eef2]">
      <WebGLBoundary>
        {fontsReady && (
          <Suspense fallback={null}>
            <LabCanvas />
          </Suspense>
        )}
      </WebGLBoundary>
      <Intro />
      <Hud />
      <BenchPanel />
      <InfoPanel />
      <AgentDialog />
      <HelpDialog />
      <Tooltip />
      <LoadingScreen />
    </div>
  );
}
