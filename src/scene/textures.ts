import * as THREE from "three";
import { company, type Chemical, type Hazard } from "../data";
import { parseFormula } from "../lib/formula";
import { drawHazard } from "../lib/hazards";

export const FONT = '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
export const DISPLAY_FONT = '"Space Grotesk", "Inter", system-ui, sans-serif';
const MONO_FONT = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';

export const BRAND = {
  navy: "#0b2545",
  blue: "#0b63b6",
  teal: "#0fa3a3",
  tealLight: "#5fd4cf",
  ink: "#10233f",
};

const cache = new Map<string, THREE.CanvasTexture>();

function make(
  key: string,
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  setup?: (texture: THREE.CanvasTexture) => void,
): THREE.CanvasTexture {
  const hit = cache.get(key);
  if (hit) return hit;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  draw(ctx, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  setup?.(texture);
  cache.set(key, texture);
  return texture;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function drawFormula(ctx: CanvasRenderingContext2D, formula: string, x: number, y: number, size: number, weight = 600, align: "left" | "center" = "left") {
  const parts = parseFormula(formula);
  const fontFor = (sub: boolean) => `${weight} ${sub ? Math.round(size * 0.66) : size}px ${FONT}`;
  let width = 0;
  for (const p of parts) {
    ctx.font = fontFor(p.sub);
    width += ctx.measureText(p.text).width;
  }
  let cx = align === "center" ? x - width / 2 : x;
  ctx.textAlign = "left";
  for (const p of parts) {
    ctx.font = fontFor(p.sub);
    ctx.fillText(p.text, cx, p.sub ? y + size * 0.22 : y);
    cx += ctx.measureText(p.text).width;
  }
}

/** Band colour on chemical labels, chosen from the main hazard. */
export function labelColor(chemical: Chemical): string {
  const h = chemical.hazards;
  if (chemical.form === "Indicator") return "#7b2cbf";
  if (h.includes("toxic")) return "#7f1d1d";
  if (h.includes("corrosive")) return "#c1121f";
  if (h.includes("oxidiser")) return "#d98a00";
  if (h.includes("flammable")) return "#e85d04";
  if (h.length > 0) return "#475569";
  return BRAND.teal;
}

export function floorTexture() {
  return make(
    "floor",
    1024,
    1024,
    (ctx, w, h) => {
      const tile = w / 4;
      for (let i = 0; i < 4; i++)
        for (let j = 0; j < 4; j++) {
          const shade = 228 + ((i * 7 + j * 13) % 5);
          ctx.fillStyle = `rgb(${shade - 4}, ${shade}, ${shade + 3})`;
          ctx.fillRect(i * tile, j * tile, tile, tile);
        }
      let seed = 7;
      const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      for (let k = 0; k < 9000; k++) {
        const dark = rand() > 0.45;
        ctx.fillStyle = dark ? `rgba(70, 85, 100, ${0.05 + rand() * 0.12})` : `rgba(255,255,255,${0.2 + rand() * 0.3})`;
        ctx.fillRect(rand() * w, rand() * h, 1 + rand() * 2.2, 1 + rand() * 2.2);
      }
      ctx.strokeStyle = "rgba(150, 162, 175, 0.55)";
      ctx.lineWidth = 2;
      for (let i = 0; i <= 4; i++) {
        ctx.beginPath();
        ctx.moveTo(i * tile, 0);
        ctx.lineTo(i * tile, h);
        ctx.moveTo(0, i * tile);
        ctx.lineTo(w, i * tile);
        ctx.stroke();
      }
    },
    (t) => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(8, 6);
    },
  );
}

export function chemicalLabel(chemical: Chemical) {
  return make(`label-${chemical.id}`, 512, 256, (ctx, w, h) => {
    ctx.fillStyle = "#fbfbf7";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = labelColor(chemical);
    ctx.fillRect(0, 0, w, 50);
    ctx.fillStyle = "#ffffff";
    ctx.font = `700 24px ${FONT}`;
    ctx.textBaseline = "middle";
    ctx.fillText(chemical.form.toUpperCase(), 22, 26);
    ctx.textAlign = "right";
    ctx.font = `600 20px ${FONT}`;
    ctx.fillText("LAB REAGENT", w - 22, 26);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";

    ctx.fillStyle = BRAND.ink;
    ctx.font = `700 36px ${FONT}`;
    const lines = wrap(ctx, chemical.name, w - 44).slice(0, 2);
    lines.forEach((line, i) => ctx.fillText(line, 22, 96 + i * 40));
    const y = 96 + lines.length * 40 + 8;
    ctx.fillStyle = "#334155";
    drawFormula(ctx, chemical.formula, 22, y, 30, 600);
    if (chemical.cas) {
      ctx.fillStyle = "#64748b";
      ctx.font = `500 20px ${FONT}`;
      ctx.fillText(`CAS ${chemical.cas}`, 22, h - 22);
    }
    chemical.hazards.slice(0, 4).forEach((hazard, i, all) => {
      const size = 62;
      drawHazard(ctx, hazard, w - 16 - (all.length - i) * (size - 6), h - size - 10, size);
    });
  });
}

export function benchLabel(chemical: Chemical, short: string) {
  return make(`bench-${chemical.id}`, 256, 160, (ctx, w, h) => {
    ctx.fillStyle = "#fbfbf7";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = labelColor(chemical);
    ctx.fillRect(0, 0, w, 34);
    ctx.fillStyle = BRAND.ink;
    const size = short.length > 8 ? 34 : 46;
    drawFormula(ctx, short, w / 2, 96, size, 800, "center");
    ctx.fillStyle = "#475569";
    ctx.font = `600 18px ${FONT}`;
    ctx.textAlign = "center";
    const name = chemical.name.replace(/ \(.*\)/, "");
    ctx.fillText(name.length > 24 ? `${name.slice(0, 22)}…` : name, w / 2, 136);
  });
}

type SignIcon = "eye" | "cross" | "fire" | "goggles" | "flask" | "hood" | "none";

export function signTexture(key: string, opts: { title: string; subtitle?: string; bg: string; fg?: string; icon?: SignIcon; width?: number; height?: number }) {
  const width = opts.width ?? 512;
  const height = opts.height ?? 192;
  return make(`sign-${key}`, width, height, (ctx, w, h) => {
    roundRect(ctx, 0, 0, w, h, 18);
    ctx.fillStyle = opts.bg;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 8;
    roundRect(ctx, 10, 10, w - 20, h - 20, 12);
    ctx.stroke();
    const fg = opts.fg ?? "#ffffff";
    const icon = opts.icon ?? "none";
    const iconSize = h * 0.58;
    let textX = 34;
    if (icon !== "none") {
      drawSignIcon(ctx, icon, 34, (h - iconSize) / 2, iconSize, fg, opts.bg);
      textX = 34 + iconSize + 24;
    }
    ctx.fillStyle = fg;
    ctx.font = `800 ${Math.round(h * 0.2)}px ${FONT}`;
    ctx.textBaseline = "middle";
    const lines = wrap(ctx, opts.title, w - textX - 30);
    const lineH = h * 0.23;
    const top = h / 2 - ((lines.length - 1) * lineH) / 2 - (opts.subtitle ? h * 0.09 : 0);
    lines.forEach((line, i) => ctx.fillText(line, textX, top + i * lineH));
    if (opts.subtitle) {
      ctx.font = `600 ${Math.round(h * 0.12)}px ${FONT}`;
      ctx.globalAlpha = 0.9;
      ctx.fillText(opts.subtitle, textX, top + lines.length * lineH + h * 0.02);
      ctx.globalAlpha = 1;
    }
  });
}

function drawSignIcon(ctx: CanvasRenderingContext2D, icon: SignIcon, x: number, y: number, s: number, fg: string, bg: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = fg;
  ctx.strokeStyle = fg;
  ctx.lineWidth = s * 0.07;
  ctx.lineCap = "round";
  if (icon === "cross") {
    const t = s * 0.3;
    ctx.fillRect((s - t) / 2, s * 0.08, t, s * 0.84);
    ctx.fillRect(s * 0.08, (s - t) / 2, s * 0.84, t);
  } else if (icon === "eye") {
    ctx.beginPath();
    ctx.ellipse(s / 2, s / 2, s * 0.46, s * 0.26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s * 0.17, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s * 0.08, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(s * (0.3 + i * 0.2), s * 0.84);
      ctx.lineTo(s * (0.3 + i * 0.2), s * 0.98);
      ctx.stroke();
    }
  } else if (icon === "fire") {
    ctx.fill(new Path2D(`M${s * 0.5} ${s * 0.04} C${s * 0.62} ${s * 0.3} ${s * 0.86} ${s * 0.38} ${s * 0.86} ${s * 0.64} C${s * 0.86} ${s * 0.86} ${s * 0.7} ${s * 0.98} ${s * 0.5} ${s * 0.98} C${s * 0.28} ${s * 0.98} ${s * 0.14} ${s * 0.84} ${s * 0.14} ${s * 0.64} C${s * 0.14} ${s * 0.46} ${s * 0.3} ${s * 0.36} ${s * 0.38} ${s * 0.22} C${s * 0.4} ${s * 0.38} ${s * 0.46} ${s * 0.46} ${s * 0.52} ${s * 0.5} C${s * 0.48} ${s * 0.32} ${s * 0.46} ${s * 0.18} ${s * 0.5} ${s * 0.04} Z`));
  } else if (icon === "goggles") {
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s * 0.48, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = bg;
    roundRect(ctx, s * 0.12, s * 0.36, s * 0.34, s * 0.26, s * 0.08);
    ctx.fill();
    roundRect(ctx, s * 0.54, s * 0.36, s * 0.34, s * 0.26, s * 0.08);
    ctx.fill();
    ctx.fillRect(s * 0.44, s * 0.44, s * 0.12, s * 0.06);
  } else if (icon === "flask") {
    drawFlaskIcon(ctx, 0, 0, s, fg, bg);
  } else if (icon === "hood") {
    ctx.strokeRect(s * 0.12, s * 0.12, s * 0.76, s * 0.8);
    ctx.beginPath();
    ctx.moveTo(s * 0.12, s * 0.55);
    ctx.lineTo(s * 0.88, s * 0.55);
    ctx.stroke();
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(s * (0.3 + i * 0.2), s * 0.46);
      ctx.bezierCurveTo(s * (0.22 + i * 0.2), s * 0.36, s * (0.38 + i * 0.2), s * 0.3, s * (0.3 + i * 0.2), s * 0.2);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawFlaskIcon(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, fg: string, liquid: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s / 100, s / 100);
  const outline = new Path2D("M38 8 H62 V14 H58 V40 L82 84 C85 90 81 95 74 95 H26 C19 95 15 90 18 84 L42 40 V14 H38 Z");
  ctx.fillStyle = fg;
  ctx.fill(outline);
  ctx.fillStyle = liquid;
  ctx.fill(new Path2D("M30 66 C40 60 48 70 58 64 C64 60 68 62 71 64 L78 80 C80 85 77 88 72 88 H28 C23 88 20 85 22 80 Z"));
  ctx.restore();
}

export function logoTexture() {
  return make("logo", 1024, 300, (ctx, w, h) => {
    roundRect(ctx, 0, 0, w, h, 28);
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, BRAND.navy);
    g.addColorStop(1, "#0d3b66");
    ctx.fillStyle = g;
    ctx.fill();
    drawFlaskIcon(ctx, 54, 50, 200, BRAND.tealLight, BRAND.navy);
    ctx.fillStyle = "#ffffff";
    ctx.font = `700 118px ${DISPLAY_FONT}`;
    ctx.textBaseline = "alphabetic";
    ctx.fillText("Labmate", 286, 168);
    const lw = ctx.measureText("Labmate").width;
    ctx.fillStyle = BRAND.tealLight;
    ctx.fillText(".lk", 286 + lw, 168);
    ctx.fillStyle = "rgba(255,255,255,0.78)";
    ctx.font = `600 38px ${FONT}`;
    ctx.fillText("Laboratory supplies · Sri Lanka", 290, 232);
  });
}

export function bannerTexture() {
  return make("banner", 512, 1400, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, BRAND.navy);
    g.addColorStop(0.55, BRAND.blue);
    g.addColorStop(1, BRAND.teal);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    drawFlaskIcon(ctx, w / 2 - 90, 90, 180, "#ffffff", BRAND.blue);
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.font = `700 92px ${DISPLAY_FONT}`;
    ctx.fillText("Labmate", w / 2, 380);
    ctx.fillStyle = BRAND.tealLight;
    ctx.fillText(".lk", w / 2, 470);
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = `600 34px ${FONT}`;
    ctx.fillText("We supply", w / 2, 590);
    ctx.font = `700 40px ${FONT}`;
    company.supplies.forEach((line, i) => {
      ctx.fillStyle = "#ffffff";
      const lines = wrap(ctx, line, w - 80);
      lines.forEach((l, j) => ctx.fillText(l, w / 2, 670 + i * 110 + j * 46));
    });
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    roundRect(ctx, 60, h - 250, w - 120, 150, 24);
    ctx.fill();
    ctx.fillStyle = BRAND.navy;
    ctx.font = `700 34px ${FONT}`;
    ctx.fillText("Ask our sales agent", w / 2, h - 186);
    ctx.font = `600 36px ${FONT}`;
    ctx.fillStyle = BRAND.blue;
    ctx.fillText(company.phone, w / 2, h - 134);
  });
}

export function speechBubbleTexture(text: string, hint: string) {
  return make(`bubble-${text}`, 512, 208, (ctx, w) => {
    ctx.shadowColor = "rgba(15, 35, 60, 0.25)";
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 4;
    roundRect(ctx, 16, 12, w - 32, 140, 40);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(w / 2 - 22, 150);
    ctx.lineTo(w / 2, 186);
    ctx.lineTo(w / 2 + 22, 150);
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.textAlign = "center";
    ctx.fillStyle = BRAND.ink;
    ctx.font = `700 46px ${FONT}`;
    ctx.fillText(text, w / 2, 80);
    ctx.fillStyle = BRAND.teal;
    ctx.font = `600 28px ${FONT}`;
    ctx.fillText(hint, w / 2, 124);
  });
}

export function lcdTexture(key: string, lines: string[], fg = "#7ef9d8", bg = "#0d1b1e") {
  return make(`lcd-${key}`, 256, 128, (ctx, w, h) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = fg;
    ctx.textBaseline = "middle";
    const size = lines.length > 1 ? 40 : 56;
    ctx.font = `600 ${size}px ${MONO_FONT}`;
    lines.forEach((line, i) => {
      ctx.globalAlpha = i === 0 ? 1 : 0.7;
      ctx.font = `600 ${i === 0 ? size : size * 0.6}px ${MONO_FONT}`;
      ctx.fillText(line, 16, h / 2 + (i - (lines.length - 1) / 2) * (size * 0.95));
    });
  });
}

export function graduationTexture(label: string) {
  return make(`grad-${label}`, 256, 512, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(255,255,255,0.95)";
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.lineWidth = 5;
    const top = 60;
    const bottom = h - 40;
    for (let i = 0; i <= 10; i++) {
      const y = bottom - ((bottom - top) * i) / 10;
      ctx.beginPath();
      ctx.moveTo(w * 0.36, y);
      ctx.lineTo(w * (i % 2 === 0 ? 0.64 : 0.54), y);
      ctx.stroke();
    }
    ctx.font = `700 34px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText(label, w / 2, 36);
  });
}

/** Shelf-edge label naming the bottle above it. */
export function shelfTagTexture(name: string) {
  return make(`shelfTag-${name}`, 512, 112, (ctx, w, h) => {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = BRAND.teal;
    ctx.fillRect(0, 0, 14, h);
    ctx.fillStyle = BRAND.ink;
    ctx.font = `700 40px ${FONT}`;
    ctx.textBaseline = "middle";
    const short = name.replace(/ \(.*\)/, "");
    let text = short;
    while (ctx.measureText(text).width > w - 50 && text.length > 4) text = text.slice(0, -1);
    ctx.fillText(text === short ? text : `${text.trimEnd()}…`, 32, h / 2 + 2);
  });
}

export function tagTexture(text: string) {
  return make(`tag-${text}`, 256, 128, (ctx, w, h) => {
    roundRect(ctx, 4, 4, w - 8, h - 8, 56);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = BRAND.teal;
    ctx.stroke();
    ctx.fillStyle = BRAND.ink;
    ctx.font = `800 ${text.length > 2 ? 52 : 70}px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, w / 2, h / 2 + 4);
  });
}

export function blobShadowTexture() {
  return make("blob", 128, 128, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, "rgba(0,0,0,0.5)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}

export function skyTexture() {
  return make("sky", 1024, 512, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#8fcdf0");
    g.addColorStop(0.65, "#d7eef8");
    g.addColorStop(1, "#eef7f2");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    for (const [x, y, s] of [
      [140, 90, 1],
      [520, 60, 1.3],
      [840, 120, 0.9],
    ]) {
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.ellipse(x + i * 34 * s, y + (i % 2) * 8, 46 * s, 22 * s, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.fillStyle = "#9cc7a6";
    ctx.beginPath();
    ctx.moveTo(0, h * 0.78);
    for (let x = 0; x <= w; x += 32) ctx.lineTo(x, h * 0.72 + Math.sin(x * 0.012) * 18 + Math.sin(x * 0.031) * 9);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.fill();
    // Palms and a low tree line.
    const palm = (x: number, base: number, height: number, lean: number) => {
      ctx.strokeStyle = "#4e6b4a";
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(x, base);
      ctx.quadraticCurveTo(x + lean * 0.4, base - height * 0.5, x + lean, base - height);
      ctx.stroke();
      ctx.strokeStyle = "#3f7a45";
      ctx.lineWidth = 6;
      const tx = x + lean;
      const ty = base - height;
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI + (i / 6) * Math.PI;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.quadraticCurveTo(tx + Math.cos(a) * 40, ty + Math.sin(a) * 30 - 10, tx + Math.cos(a) * 70, ty + Math.sin(a) * 24 + 26);
        ctx.stroke();
      }
    };
    palm(150, h * 0.86, 190, 30);
    palm(420, h * 0.88, 230, -26);
    palm(760, h * 0.86, 200, 22);
    palm(930, h * 0.9, 160, -18);
    ctx.fillStyle = "#5f9467";
    for (let x = 0; x < w; x += 46) {
      ctx.beginPath();
      ctx.arc(x, h * 0.9 + Math.sin(x) * 6, 40, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

const CATEGORY_COLORS = {
  alkali: "#ffd6a5",
  alkaline: "#fdffb6",
  transition: "#cfe1f7",
  post: "#d9ed92",
  metalloid: "#caffbf",
  nonmetal: "#9bf6ff",
  halogen: "#a0c4ff",
  noble: "#e0c3fc",
  lanthanide: "#ffc6ff",
  actinide: "#ffadad",
} as const;

const SYMBOLS =
  "H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og".split(
    " ",
  );

function elementCategory(z: number): keyof typeof CATEGORY_COLORS {
  if ([3, 11, 19, 37, 55, 87].includes(z)) return "alkali";
  if ([4, 12, 20, 38, 56, 88].includes(z)) return "alkaline";
  if ([2, 10, 18, 36, 54, 86, 118].includes(z)) return "noble";
  if ([9, 17, 35, 53, 85, 117].includes(z)) return "halogen";
  if ([1, 6, 7, 8, 15, 16, 34].includes(z)) return "nonmetal";
  if ([5, 14, 32, 33, 51, 52].includes(z)) return "metalloid";
  if (z >= 57 && z <= 71) return "lanthanide";
  if (z >= 89 && z <= 103) return "actinide";
  if ((z >= 21 && z <= 30) || (z >= 39 && z <= 48) || (z >= 72 && z <= 80) || (z >= 104 && z <= 112)) return "transition";
  return "post";
}

/** Column (1-18) and row (1-7, or 9-10 for the f-block) of an element in the standard layout. */
function elementCell(z: number): [number, number] {
  if (z === 1) return [1, 1];
  if (z === 2) return [18, 1];
  const starts = [3, 11, 19, 37, 55, 87];
  let period = 2;
  for (let i = starts.length - 1; i >= 0; i--)
    if (z >= starts[i]) {
      period = i + 2;
      break;
    }
  const idx = z - starts[period - 2];
  if (period <= 3) return idx < 2 ? [idx + 1, period] : [13 + idx - 2, period];
  if (period <= 5) return [idx + 1, period];
  if (idx < 2) return [idx + 1, period];
  if (idx < 17) return [3 + idx - 2, period + 3];
  return [4 + idx - 17, period];
}

export function periodicTableTexture() {
  return make("periodic", 2048, 1200, (ctx, w) => {
    ctx.fillStyle = "#fdfdfb";
    ctx.fillRect(0, 0, w, 1200);
    ctx.fillStyle = BRAND.ink;
    ctx.font = `700 64px ${DISPLAY_FONT}`;
    ctx.textAlign = "center";
    ctx.fillText("Periodic Table of the Elements", w / 2, 86);
    const cell = 106;
    const gap = 5;
    const left = (w - 18 * (cell + gap)) / 2;
    const top = 130;
    for (let z = 1; z <= SYMBOLS.length; z++) {
      const [col, row] = elementCell(z);
      const x = left + (col - 1) * (cell + gap);
      const y = top + (row - 1) * (cell + gap) + (row >= 9 ? -cell * 0.6 : 0);
      ctx.fillStyle = CATEGORY_COLORS[elementCategory(z)];
      roundRect(ctx, x, y, cell, cell, 8);
      ctx.fill();
      ctx.fillStyle = "#334155";
      ctx.font = `600 20px ${FONT}`;
      ctx.textAlign = "left";
      ctx.fillText(String(z), x + 8, y + 24);
      ctx.fillStyle = BRAND.ink;
      ctx.font = `700 46px ${FONT}`;
      ctx.textAlign = "center";
      ctx.fillText(SYMBOLS[z - 1], x + cell / 2, y + 80);
    }
  });
}

export function ghsPosterTexture() {
  const hazards: Hazard[] = ["flammable", "oxidiser", "corrosive", "toxic", "harmful", "health", "environment"];
  const labels: Record<Hazard, string> = {
    flammable: "Flammable",
    oxidiser: "Oxidiser",
    corrosive: "Corrosive",
    toxic: "Toxic",
    harmful: "Harmful",
    health: "Health hazard",
    environment: "Environment",
  };
  return make("ghs", 1024, 1320, (ctx, w) => {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, 1320);
    ctx.fillStyle = BRAND.navy;
    ctx.fillRect(0, 0, w, 170);
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.font = `800 66px ${FONT}`;
    ctx.fillText("Know your hazard symbols", w / 2, 92);
    ctx.font = `600 34px ${FONT}`;
    ctx.fillStyle = BRAND.tealLight;
    ctx.fillText("GHS pictograms", w / 2, 144);
    hazards.forEach((hazard, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const cx = col === 0 ? w * 0.27 : w * 0.73;
      const y = 210 + row * 275;
      const size = i === 6 ? 210 : 210;
      const x = i === 6 ? w / 2 - size / 2 : cx - size / 2;
      drawHazard(ctx, hazard, x, y, size);
      ctx.fillStyle = BRAND.ink;
      ctx.font = `700 40px ${FONT}`;
      ctx.fillText(labels[hazard], i === 6 ? w / 2 : cx, y + size + 44);
    });
  });
}
