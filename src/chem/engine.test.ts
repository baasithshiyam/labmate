import { describe, expect, it } from "vitest";
import { benchChemicals, experiments, pourVolumes } from "../data";
import { analyze, diff, hexToRgb, REAGENTS, universalIndicatorColor, type Contents } from "./engine";

describe("pH model", () => {
  it("treats pure water as neutral", () => {
    expect(analyze({ water: 20 }).pH).toBeCloseTo(7, 5);
  });

  it("gives dilute hydrochloric acid a low pH and sodium hydroxide a high one", () => {
    expect(analyze({ hcl: 10 }).pH).toBeLessThan(1);
    expect(analyze({ naoh: 10 }).pH).toBeGreaterThan(13);
  });

  it("neutralises equal amounts of strong acid and strong base", () => {
    const result = analyze({ hcl: 10, naoh: 10 });
    expect(result.pH).toBeCloseTo(7, 5);
    expect(result.features).toContain("neutralisation");
  });

  it("models vinegar as a weak acid around pH 2.4", () => {
    expect(analyze({ vinegar: 10 }).pH).toBeGreaterThan(2.2);
    expect(analyze({ vinegar: 10 }).pH).toBeLessThan(2.7);
  });

  it("buffers a half-neutralised weak acid at its pKa", () => {
    // 10 mL of 0.8 M acetic acid = 8 mmol; 8 mL of 0.5 M NaOH = 4 mmol.
    expect(analyze({ vinegar: 10, naoh: 8 }).pH).toBeCloseTo(4.76, 2);
  });

  it("keeps sodium hydrogen carbonate mildly alkaline", () => {
    expect(analyze({ nahco3: 10 }).pH).toBeCloseTo(8.3, 5);
  });
});

describe("reactions", () => {
  it("releases carbon dioxide from vinegar and baking soda", () => {
    const result = analyze({ nahco3: 20, vinegar: 20 });
    expect(result.co2).toBeCloseTo(10, 5);
    expect(result.features).toContain("co2");
  });

  it("forms copper(II) hydroxide and uses up hydroxide first", () => {
    const result = analyze({ cuso4: 5, naoh: 5 });
    expect(result.precipitates.map((p) => p.id)).toContain("cuoh2");
    expect(result.pH).toBeLessThan(8);
    expect(result.turbidity).toBeGreaterThan(0.9);
  });

  it("forms white silver chloride with chloride from salt or acid", () => {
    expect(analyze({ agno3: 5, nacl: 0.5 }).precipitates[0].id).toBe("agcl");
    expect(analyze({ agno3: 5, hcl: 0.5 }).precipitates[0].id).toBe("agcl");
  });

  it("turns iron(III) and thiocyanate blood red", () => {
    const result = analyze({ water: 5, fecl3: 0.5, kscn: 0.5 });
    expect(result.features).toContain("fescn");
    const [r, g, b] = hexToRgb(result.color);
    expect(r).toBeGreaterThan(g + 60);
    expect(r).toBeGreaterThan(b + 60);
  });

  it("turns starch blue-black with iodine", () => {
    const result = analyze({ starch: 5, iodine: 0.5 });
    expect(result.features).toContain("starchIodine");
    const [r, g, b] = hexToRgb(result.color);
    expect(r + g + b).toBeLessThan(250);
  });

  it("only makes foam from peroxide and iodide when detergent is present", () => {
    expect(analyze({ h2o2: 20, ki: 5 }).foam).toBe(0);
    expect(analyze({ h2o2: 20, ki: 5 }).o2).toBeGreaterThan(0);
    expect(analyze({ h2o2: 20, ki: 5, detergent: 0.5 }).foam).toBeGreaterThan(0);
  });
});

describe("indicators", () => {
  it("runs universal indicator from red to purple", () => {
    const [ar, , ab] = hexToRgb(universalIndicatorColor(1));
    const [nr, ng] = hexToRgb(universalIndicatorColor(7));
    const [pr, , pb] = hexToRgb(universalIndicatorColor(13.5));
    expect(ar).toBeGreaterThan(ab);
    expect(ng).toBeGreaterThan(nr);
    expect(pb).toBeGreaterThan(pr);
  });

  it("only turns phenolphthalein pink in alkaline solution", () => {
    expect(analyze({ water: 20, phenolphthalein: 0.5 }).features).not.toContain("phenolphthaleinPink");
    expect(analyze({ water: 20, phenolphthalein: 0.5, naoh: 0.5 }).features).toContain("phenolphthaleinPink");
  });
});

describe("data", () => {
  it("has chemistry for every bench chemical and a chemical entry for every reagent", () => {
    const benchIds = benchChemicals.map((c) => c.id).sort();
    expect(Object.keys(REAGENTS).sort()).toEqual(benchIds);
  });

  it("produces a visible result for every guided experiment", () => {
    for (const experiment of experiments) {
      const byVessel = new Map<string, Contents>();
      const events = [];
      for (const step of experiment.steps) {
        const contents = byVessel.get(step.vessel) ?? {};
        const before = analyze(contents);
        const next = { ...contents, [step.reagent]: (contents[step.reagent] ?? 0) + pourVolumes[step.amount] };
        byVessel.set(step.vessel, next);
        events.push(...diff(before, analyze(next)));
      }
      expect(events.length, experiment.id).toBeGreaterThan(0);
    }
  });
});
