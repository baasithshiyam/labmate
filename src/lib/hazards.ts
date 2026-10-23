import type { Hazard } from "../data";

export const HAZARD_INFO: Record<Hazard, { label: string; meaning: string }> = {
  corrosive: { label: "Corrosive", meaning: "Can burn skin, damage eyes and attack metals." },
  flammable: { label: "Flammable", meaning: "Catches fire easily. Keep away from heat and flames." },
  oxidiser: { label: "Oxidiser", meaning: "Can cause or intensify a fire." },
  toxic: { label: "Acute toxicity", meaning: "Can be toxic or fatal in small amounts." },
  harmful: { label: "Harmful / irritant", meaning: "May irritate skin, eyes or airways, or be harmful if swallowed." },
  health: { label: "Serious health hazard", meaning: "May cause long-term effects such as organ damage." },
  environment: { label: "Environmental hazard", meaning: "Toxic to aquatic life." },
};

const circle = (cx: number, cy: number, r: number) =>
  `M${cx} ${cy} m-${r} 0 a${r} ${r} 0 1 0 ${r * 2} 0 a${r} ${r} 0 1 0 -${r * 2} 0 Z`;

/** Simplified pictogram glyphs on a 100 x 100 grid, drawn inside a red diamond. */
export const HAZARD_GLYPHS: Record<Hazard, { fill: string[]; holes?: string[] }> = {
  flammable: {
    fill: [
      "M50 14 C56 28 68 34 68 52 C68 66 60 74 50 74 C40 74 32 66 32 54 C32 44 38 38 42 32 C42 40 45 45 49 47 C47 36 47 24 50 14 Z",
      "M30 78 H70 V84 H30 Z",
    ],
  },
  oxidiser: {
    fill: [
      "M50 14 C54 22 62 26 62 36 C62 42 57 46 50 46 C43 46 38 42 38 36 C38 30 42 27 44 24 C44 29 46 31 48 32 C47 26 47 20 50 14 Z",
      circle(50, 62, 14),
      "M30 80 H70 V85 H30 Z",
    ],
    holes: [circle(50, 62, 7)],
  },
  corrosive: {
    fill: [
      "M24 22 L36 18 L40 30 L28 34 Z",
      "M60 18 L72 22 L68 34 L56 30 Z",
      circle(31, 40, 3),
      circle(33, 49, 3),
      circle(64, 40, 3),
      circle(62, 49, 3),
      "M18 58 H44 V64 H18 Z",
      "M54 58 C60 56 66 56 72 58 L82 62 V68 H54 Z",
      "M22 72 H78 V78 H22 Z",
    ],
  },
  toxic: {
    fill: [
      "M50 18 C38 18 31 26 31 37 C31 44 35 48 40 50 V57 H60 V50 C65 48 69 44 69 37 C69 26 62 18 50 18 Z",
      "M26 62 L32 58 L74 80 L68 84 Z",
      "M74 62 L68 58 L26 80 L32 84 Z",
    ],
    holes: [circle(42, 37, 5), circle(58, 37, 5)],
  },
  harmful: {
    fill: ["M45 18 H55 L53 60 H47 Z", circle(50, 68, 6)],
  },
  health: {
    fill: [circle(50, 20, 8), "M34 82 V48 C34 38 41 32 50 32 C59 32 66 38 66 48 V82 Z"],
    holes: ["M50 44 L53 52 L61 50 L55 56 L61 63 L53 61 L50 69 L47 61 L39 63 L45 56 L39 50 L47 52 Z"],
  },
  environment: {
    fill: [
      "M30 74 V40 L22 30 L25 28 L31 36 V24 H35 V38 L42 30 L45 32 L35 44 V74 Z",
      "M18 76 H82 V80 H18 Z",
      "M50 64 C56 56 68 56 76 64 C68 72 56 72 50 64 Z",
      "M76 64 L84 58 V70 Z",
    ],
    holes: [circle(58, 62, 1.6)],
  },
};

export const DIAMOND_PATH = "M50 4 L96 50 L50 96 L4 50 Z";
export const HAZARD_RED = "#e3000f";

/** Draws a pictogram into a canvas at (x, y) with the given size in pixels. */
export function drawHazard(ctx: CanvasRenderingContext2D, hazard: Hazard, x: number, y: number, size: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 100, size / 100);
  const diamond = new Path2D(DIAMOND_PATH);
  ctx.fillStyle = "#ffffff";
  ctx.fill(diamond);
  ctx.lineWidth = 7;
  ctx.strokeStyle = HAZARD_RED;
  ctx.lineJoin = "round";
  ctx.stroke(diamond);
  ctx.translate(50, 50);
  ctx.scale(0.62, 0.62);
  ctx.translate(-50, -50);
  const glyph = HAZARD_GLYPHS[hazard];
  ctx.fillStyle = "#111111";
  for (const d of glyph.fill) ctx.fill(new Path2D(d));
  ctx.fillStyle = "#ffffff";
  for (const d of glyph.holes ?? []) ctx.fill(new Path2D(d));
  ctx.restore();
}
