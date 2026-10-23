export function hasWebGL2(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!canvas.getContext("webgl2");
  } catch {
    return false;
  }
}

/** A conservative first guess at what the device can render; the performance monitor refines resolution later. */
export function initialQuality(): "high" | "low" {
  const params = new URLSearchParams(location.search);
  const forced = params.get("quality");
  if (forced === "high" || forced === "low") return forced;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const memory = nav.deviceMemory ?? 8;
  const cores = nav.hardwareConcurrency ?? 8;
  const coarse = matchMedia("(pointer: coarse)").matches;
  const small = Math.min(screen.width, screen.height) < 600;
  if (memory <= 4 || cores <= 4 || (coarse && small)) return "low";
  return "high";
}

export function initialView(): "3d" | "2d" {
  const params = new URLSearchParams(location.search);
  if (params.get("view") === "2d") return "2d";
  return hasWebGL2() ? "3d" : "2d";
}
