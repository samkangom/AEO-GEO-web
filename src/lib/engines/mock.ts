/**
 * Deterministic simulated AI output for MOCK_AI_RESPONSES mode. Everything
 * here is visibly fake: answers start with a "[Mock response]" line, list
 * "Example Vendor" placeholders (never real company names), report model
 * "mock-<engine>" and web search as not used.
 */
import { MOCK_MODEL_PREFIX } from "@/lib/mock-mode";
import type { PromptLike } from "@/lib/prompts/types";
import type { EngineAnswer, EngineId, QueryContext } from "./types";

export const MOCK_ANSWER_PREFIX = "[Mock response — simulated, not from a real AI engine]";

/** FNV-1a: stable 32-bit hash so the same input always gives the same mock. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 PRNG seeded from the hash. */
function rng(seed: string) {
  let a = hash(seed);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const VENDORS = ["Example Vendor A", "Example Vendor B", "Example Vendor C", "Example Vendor D"];

export async function mockQuery(engine: EngineId, prompt: string, ctx?: QueryContext): Promise<EngineAnswer> {
  const r = rng(`${engine}|${prompt}|${ctx?.brandName ?? ""}|${ctx?.salt ?? ""}`);
  // Short, varied delay so loading states are visible in demos.
  await new Promise((res) => setTimeout(res, 150 + Math.floor(r() * 350)));

  const names = [...VENDORS];
  const mentioned = !!ctx?.brandName && r() < 0.5;
  if (mentioned) names.splice(Math.floor(r() * 4), 0, ctx!.brandName);
  const cited = mentioned && !!ctx?.brandUrl && r() < 0.5;

  const text = [
    MOCK_ANSWER_PREFIX,
    "",
    `Options people often consider for “${prompt}”:`,
    "",
    ...names.map((n, i) => `${i + 1}. ${n} — placeholder description for demo purposes.`),
  ].join("\n");

  return {
    engine,
    status: "ok",
    text,
    citations: cited ? [{ url: ctx!.brandUrl!, title: ctx!.brandName }] : [],
    modelVersion: `${MOCK_MODEL_PREFIX}${engine}`,
    webSearchUsed: false,
    latencyMs: 0,
  };
}

export function mockSentiment(brandName: string, answer: string): "positive" | "neutral" | "negative" {
  const x = rng(`sentiment|${brandName}|${answer}`)();
  return x < 0.5 ? "positive" : x < 0.9 ? "neutral" : "negative";
}

/** Template prompt set (no AI call). Industry is left blank so it's never saved to the brand. */
export function mockPromptSet(brand: { industry?: string | null }): {
  industry: string;
  prompts: PromptLike[];
} {
  const cat = brand.industry?.trim() || "business software";
  return {
    industry: "",
    prompts: [
      { intent: "shortlist", language: "en", text: `best ${cat} for small businesses in India` },
      { intent: "shortlist", language: "hinglish", text: `India mein sabse achha ${cat} kaunsa hai` },
      {
        intent: "comparison",
        language: "en",
        text: `how do the top ${cat} options compare for a growing company`,
      },
      { intent: "comparison", language: "hinglish", text: `${cat} ke top options ka comparison batao` },
      { intent: "pricing", language: "en", text: `${cat} pricing in India under ₹10,000 a month` },
      { intent: "pricing", language: "hinglish", text: `sasta aur achha ${cat} kaunsa hai` },
      { intent: "local", language: "en", text: `${cat} providers in Bengaluru` },
      { intent: "local", language: "hi", text: `पुणे में अच्छे ${cat} कौन से हैं` },
    ],
  };
}
