import { describe, expect, it } from "vitest";
import { understand } from "./agent";

const intentOf = (text: string) => {
  const r = understand(text);
  return { card: r.card, first: r.actions[0], text: r.text };
};

describe("sales agent", () => {
  it("shares contact details", () => {
    expect(intentOf("What's your phone number?").card).toBe("contact");
    expect(intentOf("how can I email you").card).toBe("contact");
  });

  it("answers location questions without inventing an address", () => {
    const r = intentOf("Where are you located?");
    expect(r.text).toMatch(/isn't listed/);
    expect(r.card).toBe("contact");
  });

  it("routes price questions to a quotation request", () => {
    const r = understand("How much does a microscope cost?");
    expect(r.actions.some((a) => a.type === "link" && a.href.startsWith("mailto:"))).toBe(true);
  });

  it("finds products by name, formula and everyday names", () => {
    for (const [text, id] of [
      ["where is the microscope", "microscope"],
      ["do you have NaOH", "naoh"],
      ["I need baking soda", "nahco3"],
      ["show me the fume hood", "fumeHood"],
      ["test tubes please", "testTubes"],
    ]) {
      const r = understand(text);
      const inspect = r.actions.find((a) => a.type === "inspect");
      expect(inspect && inspect.type === "inspect" ? inspect.id : null, text).toBe(id);
    }
  });

  it("falls back politely", () => {
    expect(understand("qwerty zxcv").text).toMatch(/not sure/);
  });
});
