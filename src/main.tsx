import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { initialQuality, initialView } from "./lib/device";
import { useLab } from "./state/store";
import "./index.css";

useLab.setState({ view: initialView(), quality: initialQuality() });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
