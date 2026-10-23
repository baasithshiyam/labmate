import { chemicals, company, items, zones, type ZoneId } from "../data";

export type IntentId =
  | "greet"
  | "contact"
  | "location"
  | "supplies"
  | "quote"
  | "hours"
  | "tour"
  | "experiments"
  | "safety"
  | "about"
  | "thanks"
  | "product"
  | "fallback";

export type AgentAction =
  | { type: "ask"; intent: IntentId; label: string }
  | { type: "travel"; target: ZoneId; label: string }
  | { type: "inspect"; kind: "item" | "chemical"; id: string; label: string }
  | { type: "link"; href: string; label: string };

export type AgentCard = "contact" | "location" | "supplies";

export interface AgentReply {
  text: string;
  card?: AgentCard;
  actions: AgentAction[];
}

const zoneLabel = (id: ZoneId) => zones.find((z) => z.id === id)!.label;

export const quoteMailto = () =>
  `mailto:${company.email}?subject=${encodeURIComponent("Quotation request")}&body=${encodeURIComponent(
    "Hello Labmate team,\n\nI would like a quotation for:\n- Item, size and quantity\n\nName:\nOrganisation:\nPhone:\n",
  )}`;

export const enquiryMailto = (subject: string) => `mailto:${company.email}?subject=${encodeURIComponent(subject)}`;

const ask = (intent: IntentId, label: string): AgentAction => ({ type: "ask", intent, label });
const travel = (target: ZoneId, label = zoneLabel(target)): AgentAction => ({ type: "travel", target, label });

const supplyList = () => {
  const s = company.supplies.map((x) => x.toLowerCase());
  return `${s.slice(0, -1).join(", ")} and ${s[s.length - 1]}`;
};

export function reply(intent: IntentId, product?: ProductMatch): AgentReply {
  switch (intent) {
    case "greet":
      return {
        text: `Hello, and welcome to the ${company.name} virtual lab! I'm the ${company.agentTitle}. I can give you our contact details, tell you what we supply, or show you around the lab.`,
        actions: [ask("contact", "Contact details"), ask("location", "Where are you?"), ask("supplies", "What do you supply?"), ask("tour", "Show me around"), ask("experiments", "Try an experiment")],
      };
    case "contact":
      return {
        text: "Here's how to reach the Labmate team. Tap to call or email us, or copy the details.",
        card: "contact",
        actions: [ask("quote", "Request a quotation"), ask("location", "Where are you?"), ask("supplies", "What do you supply?")],
      };
    case "location":
      return company.address
        ? {
            text: `You can find us at ${company.address}.`,
            card: "location",
            actions: [ask("contact", "Contact details"), ask("hours", "Opening hours")],
          }
        : {
            text: "Our visit address isn't listed in the virtual lab yet. Call or email us and the team will share directions with you.",
            card: "contact",
            actions: [ask("quote", "Request a quotation"), ask("supplies", "What do you supply?")],
          };
    case "supplies":
      return {
        text: `${company.name} supplies ${supplyList()} in ${company.country}. Have a look around the lab, or ask me about something specific.`,
        card: "supplies",
        actions: [travel("chemicals"), travel("glassware"), travel("instruments"), travel("safety"), ask("quote", "Request a quotation")],
      };
    case "quote":
      return {
        text: "For prices, availability or a quotation, send us the items, sizes and quantities you need and the team will get back to you.",
        card: "contact",
        actions: [{ type: "link", href: quoteMailto(), label: "Email a quotation request" }, ask("supplies", "What do you supply?")],
      };
    case "hours":
      return company.hours
        ? { text: `We're open ${company.hours}.`, card: "contact", actions: [ask("location", "Where are you?")] }
        : { text: "Please give us a call to confirm our opening hours.", card: "contact", actions: [ask("location", "Where are you?")] };
    case "tour":
      return {
        text: "Where would you like to go? I'll take you straight there.",
        actions: (["chemicals", "glassware", "instruments", "safety", "bench"] as ZoneId[]).map((z) => travel(z)),
      };
    case "experiments":
      return {
        text: "Head to the experiment bench to try safe, simulated reactions: colour changes, fizzing gases, precipitates and even elephant toothpaste. It's a learning simulation, not a real experiment.",
        actions: [travel("bench", "Take me to the bench")],
      };
    case "safety":
      return {
        text: "Safety first! Wear goggles, a lab coat and gloves, know where the eyewash and extinguisher are, and read the safety data sheet before you use any chemical.",
        actions: [travel("safety", "Show me the safety corner")],
      };
    case "about":
      return {
        text: `${company.name} is based in ${company.country} and supplies ${supplyList()}. This virtual lab lets you explore that range and try a few experiments.`,
        card: "supplies",
        actions: [ask("contact", "Contact details"), ask("tour", "Show me around")],
      };
    case "thanks":
      return { text: "You're welcome! Enjoy exploring the lab. I'm here at the sales desk whenever you need me.", actions: [ask("contact", "Contact details"), ask("tour", "Show me around")] };
    case "product": {
      const p = product!;
      return {
        text: `We have ${p.article}${p.name.toLowerCase()} on display in the ${zoneLabel(p.zone).toLowerCase()}. Want a closer look? For stock and pricing, just contact the team.`,
        actions: [
          { type: "inspect", kind: p.kind, id: p.id, label: `Show me the ${p.short}` },
          travel(p.zone, `Go to ${zoneLabel(p.zone).toLowerCase()}`),
          ask("quote", "Ask for a price"),
        ],
      };
    }
    case "fallback":
      return {
        text: "I'm not sure about that one, but the Labmate team can help. You can also ask me for our contact details, what we supply, or where things are in the lab.",
        actions: [ask("contact", "Contact details"), ask("supplies", "What do you supply?"), ask("tour", "Show me around")],
      };
  }
}

const KEYWORDS: [IntentId, string[]][] = [
  ["quote", ["price", "prices", "cost", "quote", "quotation", "order", "buy", "purchase", "how much", "rate", "delivery", "deliver", "available", "availability", "invoice"]],
  ["contact", ["contact", "phone", "call", "number", "email", "e-mail", "mail", "reach", "whatsapp", "mobile", "speak to", "talk to someone", "hotline"]],
  ["location", ["where are you", "location", "address", "located", "visit", "direction", "directions", "map", "office", "showroom", "come to", "find you"]],
  ["hours", ["hours", "opening", "open", "close", "closing", "weekend", "today", "time"]],
  ["supplies", ["supply", "supplies", "sell", "products", "product range", "offer", "catalogue", "catalog", "stock", "range", "brands", "brand", "what do you have"]],
  ["experiments", ["experiment", "experiments", "reaction", "react", "mix", "simulate", "simulation", "bench", "try something"]],
  ["safety", ["safety", "safe", "ppe", "hazard", "danger", "dangerous", "spill", "accident"]],
  ["tour", ["tour", "show me around", "around", "explore", "guide me", "navigate", "where is", "take me"]],
  ["about", ["about", "who are you", "company", "labmate", "who is"]],
  ["thanks", ["thanks", "thank you", "thank", "cheers", "great", "awesome", "nice"]],
  ["greet", ["hi", "hello", "hey", "good morning", "good afternoon", "good evening", "ayubowan", "vanakkam"]],
];

interface ProductMatch {
  kind: "item" | "chemical";
  id: string;
  name: string;
  short: string;
  zone: ZoneId;
  article: string;
}

const SYNONYMS: Record<string, string> = {
  "caustic soda": "naoh",
  "baking soda": "nahco3",
  bicarbonate: "nahco3",
  salt: "nacl",
  saline: "nacl",
  peroxide: "h2o2",
  alcohol: "ethanol",
  spirit: "ethanol",
  "muriatic acid": "hcl",
  "battery acid": "h2so4",
  permanganate: "kmno4",
  ammonia: "nh3",
  sugar: "glucose",
  chalk: "caco3",
  limestone: "caco3",
  indicator: "universal",
  "ph paper": "universal",
  "ph meter": "phMeter",
  scale: "balance",
  weighing: "balance",
  spin: "centrifuge",
  glasses: "goggles",
  "eye protection": "goggles",
  glove: "gloves",
  coat: "labCoat",
  fire: "extinguisher",
  pipette: "micropipette",
  pipettes: "micropipette",
  "test tube": "testTubes",
  "test tubes": "testTubes",
  petri: "petriDish",
  "culture dish": "petriDish",
  burette: "buretteStand",
  titration: "buretteStand",
  "hot plate": "hotplate",
  stirrer: "hotplate",
  burner: "bunsen",
  hood: "fumeHood",
  "first aid": "firstAid",
  "eye wash": "eyewash",
  cylinder: "gradCylinder",
};

const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9()\s-]/g, " ").replace(/\s+/g, " ").trim();

function findProduct(text: string): ProductMatch | null {
  const q = ` ${normalise(text)} `;
  const candidates = [
    ...items.map((i) => ({ kind: "item" as const, id: i.id, name: i.name, zone: i.zone, words: [i.name, i.id] })),
    ...chemicals.map((c) => ({
      kind: "chemical" as const,
      id: c.id,
      name: c.name,
      zone: (c.id === "h2so4" || c.id === "hno3" || c.id === "nh3" ? "safety" : "chemicals") as ZoneId,
      words: [c.name.replace(/ \(.*\)/, ""), c.formula, c.id],
    })),
  ];
  let best: { score: number; c: (typeof candidates)[number] } | null = null;
  for (const c of candidates) {
    let score = 0;
    for (const word of c.words) {
      const w = normalise(word);
      if (w.length < 2) continue;
      if (q.includes(` ${w} `)) score = Math.max(score, w.length + 10);
      else {
        // Partial match on the significant words of a name ("microscope", "flask").
        for (const part of w.split(" ")) if (part.length > 4 && q.includes(part)) score = Math.max(score, part.length);
      }
    }
    for (const [syn, id] of Object.entries(SYNONYMS)) if (id === c.id && q.includes(` ${syn}`)) score = Math.max(score, syn.length + 8);
    if (score > 0 && (!best || score > best.score)) best = { score, c };
  }
  if (!best || best.score < 5) return null;
  const { c } = best;
  const plural = /s$|equipment/i.test(c.name.split(" (")[0]);
  const vowel = /^[aeiou]/i.test(c.name);
  return {
    kind: c.kind,
    id: c.id,
    name: c.name,
    short: c.name.split(" (")[0].toLowerCase(),
    zone: c.zone,
    article: c.kind === "chemical" || plural ? "" : vowel ? "an " : "a ",
  };
}

/** Works out what the visitor is asking for. Keyword matching keeps the agent fast, offline and predictable. */
export function understand(text: string): AgentReply {
  const q = ` ${normalise(text)} `;
  const scores = new Map<IntentId, number>();
  for (const [intent, words] of KEYWORDS) {
    for (const word of words) {
      if (q.includes(` ${word} `) || (word.includes(" ") && q.includes(word))) scores.set(intent, (scores.get(intent) ?? 0) + word.length);
    }
  }
  const product = findProduct(text);
  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  const top = ranked[0]?.[0];
  if (product && (!top || top === "tour" || top === "supplies" || top === "about" || top === "safety" || top === "greet")) {
    return reply("product", product);
  }
  if (top) return reply(top);
  return reply("fallback");
}
