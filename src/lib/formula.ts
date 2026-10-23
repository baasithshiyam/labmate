export interface FormulaPart {
  text: string;
  sub: boolean;
}

/** Splits a formula such as "CH3COOH" or "(C6H10O5)n" into normal and subscript runs. */
export function parseFormula(formula: string): FormulaPart[] {
  const parts: FormulaPart[] = [];
  const push = (ch: string, sub: boolean) => {
    const last = parts[parts.length - 1];
    if (last && last.sub === sub) last.text += ch;
    else parts.push({ text: ch, sub });
  };
  for (let i = 0; i < formula.length; i++) {
    const ch = formula[i];
    const prev = formula[i - 1] ?? "";
    const isDigit = ch >= "0" && ch <= "9";
    const afterAtom = /[A-Za-z)]/.test(prev) || (/[0-9]/.test(prev) && parts[parts.length - 1]?.sub);
    const polymerN = ch === "n" && prev === ")";
    // Only formulas look like this: plain words such as "Mixture of dyes" contain no digits.
    push(ch, (isDigit && afterAtom) || polymerN);
  }
  return parts;
}
