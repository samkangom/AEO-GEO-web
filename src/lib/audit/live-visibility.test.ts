import assert from "node:assert/strict";
import { test } from "node:test";
import type { EngineAnswer, EngineId } from "@/lib/engines/types";
import { PromptsUnavailableError, type PromptLike } from "@/lib/prompts/types";
import { checkLiveVisibility, type LiveVisibilityDeps } from "./live-visibility";

const brand = { name: "Kiranabooks", url: "https://kiranabooks.in" };

const PROMPTS: PromptLike[] = [
  { text: "best billing software for kirana shops", intent: "shortlist", language: "en" },
  { text: "Vyapar vs other GST billing apps for retail", intent: "comparison", language: "en" },
  { text: "GST billing software under ₹500 a month", intent: "pricing", language: "en" },
  { text: "billing software for shops in Pune", intent: "local", language: "en" },
  { text: "kirana dukaan ke liye best billing app kaunsa hai", intent: "shortlist", language: "hinglish" },
];

function answer(engine: EngineId, text: string, extra: Partial<EngineAnswer> = {}): EngineAnswer {
  return {
    engine,
    status: "ok",
    text,
    citations: [],
    modelVersion: `${engine}-model`,
    webSearchUsed: true,
    latencyMs: 5,
    ...extra,
  };
}

function fakeEngines(
  engines: EngineId[],
  respond: (engine: EngineId, prompt: string) => EngineAnswer,
): LiveVisibilityDeps & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    configuredEngines: () => engines,
    queryEngine: async (engine, prompt) => {
      calls.push(`${engine}:${prompt}`);
      return respond(engine, prompt);
    },
  };
}

test("no engines configured: not_configured, and no prompts are generated", async () => {
  let prepared = false;
  const r = await checkLiveVisibility(
    brand,
    async () => {
      prepared = true;
      return PROMPTS;
    },
    fakeEngines([], () => {
      throw new Error("should not be called");
    }),
  );
  assert.equal(r.status, "not_configured");
  assert.equal(r.score, 0);
  assert.equal(prepared, false, "must not spend money generating prompts");
});

test("prompt generation unavailable: not_configured with a fix", async () => {
  const r = await checkLiveVisibility(
    brand,
    async () => {
      throw new PromptsUnavailableError("no key");
    },
    fakeEngines(["openai"], () => answer("openai", "")),
  );
  assert.equal(r.status, "not_configured");
  assert.match(r.fix ?? "", /ANTHROPIC_API_KEY/);
});

test("scores the share of answers mentioning the brand; failed calls are excluded", async () => {
  const deps = fakeEngines(["openai", "anthropic"], (engine, prompt) => {
    if (engine === "anthropic" && prompt.includes("Pune")) {
      return { ...answer(engine, ""), status: "error", error: "rate limited" };
    }
    const mentions =
      engine === "openai" ? !prompt.includes("₹500") && !prompt.includes("Pune") : prompt.startsWith("best");
    return answer(
      engine,
      mentions ? "Top picks:\n1. Vyapar\n2. Kiranabooks\n3. Tally" : "Try Vyapar or Tally.",
      mentions && engine === "openai" ? { citations: [{ url: "https://kiranabooks.in/pricing" }] } : {},
    );
  });

  const r = await checkLiveVisibility(brand, async () => PROMPTS, deps);
  assert.equal(deps.calls.length, 10, "5 prompts × 2 engines");
  assert.equal(r.status, "ok");
  // openai mentions in 3 of 5, anthropic in 1 of 4 measured (1 failed) → 4 of 9.
  assert.equal(r.detail.answers_measured, 9);
  assert.equal(r.detail.answers_mentioning, 4);
  assert.equal(r.score, Math.round((40 * 4) / 9));
  assert.match(r.summary, /sometimes — 4 of 9 answers \(ChatGPT 3\/5, Claude 1\/4\)/);

  // 5 prompts, plus a note that Gemini and Perplexity weren't configured.
  assert.equal(r.checks.length, 6);
  assert.match(r.checks[5].label, /Only ChatGPT and Claude checked/);
  assert.match(r.checks[5].note ?? "", /Gemini and Perplexity aren't configured/);
  const first = r.checks[0];
  assert.equal(first.passed, true);
  assert.match(first.note ?? "", /ChatGPT: mentioned, #2 in its list, links to your site/);
  assert.match(r.checks[3].note ?? "", /Claude: couldn't check \(rate limited\)/);

  const results = r.detail.results as { answer: string; model: string }[];
  assert.equal(results.length, 10);
  assert.equal(results[0].model, "openai-model", "every result records the model that answered");
  assert.ok(r.fix);
});

test("single engine configured: says which engine was left out", async () => {
  const r = await checkLiveVisibility(
    brand,
    async () => PROMPTS,
    fakeEngines(["openai"], (e) => answer(e, "Kiranabooks is great")),
  );
  assert.equal(r.score, 40);
  assert.equal(r.fix, null);
  assert.match(r.checks.at(-1)?.label ?? "", /Only ChatGPT checked/);
});

test("every engine call failing: error, not zero visibility", async () => {
  const r = await checkLiveVisibility(
    brand,
    async () => PROMPTS,
    fakeEngines(["openai", "anthropic"], (e) => ({ ...answer(e, ""), status: "error", error: "down" })),
  );
  assert.equal(r.status, "error");
  assert.equal(r.score, 0);
});
