import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { runAudit } from "@/lib/audit";
import { configuredEngines, queryEngine } from "@/lib/engines";
import { classifySentiment, generatePromptSet, promptGenerationAvailable } from "@/lib/engines/claude-tasks";
import { isMockMode } from "@/lib/mock-mode";
import { mentionsBrand } from "@/lib/visibility/analyze";
import { serveSite } from "../../../test/fixture-server";
import { MOCK_ANSWER_PREFIX } from "./mock";

const saved = { ...process.env };
const env = process.env as Record<string, string | undefined>;
beforeEach(() => {
  delete env.OPENAI_API_KEY;
  delete env.ANTHROPIC_API_KEY;
  delete env.VERCEL_ENV;
  delete env.NODE_ENV;
  delete env.ALLOW_MOCK_ON_PRODUCTION;
  env.MOCK_AI_RESPONSES = "1";
});
afterEach(() => {
  for (const k of Object.keys(env)) if (!(k in saved)) delete env[k];
  Object.assign(env, saved);
});

const brand = { brandName: "Kiranabooks", brandUrl: "https://kiranabooks.in" };

test("mock mode is never active on the production site", () => {
  assert.equal(isMockMode(), true, "local/dev");
  env.VERCEL_ENV = "preview";
  env.NODE_ENV = "production";
  assert.equal(isMockMode(), true, "Vercel preview deployments may use it");
  env.VERCEL_ENV = "production";
  assert.equal(isMockMode(), false, "Vercel production never");
  delete env.VERCEL_ENV;
  assert.equal(isMockMode(), false, "any other production build never");
  env.VERCEL_ENV = "production";
  env.ALLOW_MOCK_ON_PRODUCTION = "1";
  assert.equal(isMockMode(), true, "a demo deployment can opt in explicitly with a second flag");
  env.MOCK_AI_RESPONSES = "";
  assert.equal(isMockMode(), false, "the second flag alone does nothing");
  delete env.ALLOW_MOCK_ON_PRODUCTION;
  delete env.VERCEL_ENV;
  env.NODE_ENV = "development";
  env.MOCK_AI_RESPONSES = "0";
  assert.equal(isMockMode(), false, "off unless the flag is set");
});

test("mock engines: available without keys, clearly labelled, deterministic", async () => {
  assert.deepEqual(configuredEngines(), ["openai", "anthropic"]);
  assert.deepEqual(configuredEngines(["gemini", "perplexity"]), [], "stub engines stay not configured");

  const a = await queryEngine("openai", "best billing app", { context: brand });
  const b = await queryEngine("openai", "best billing app", { context: brand });
  assert.equal(a.status, "ok");
  assert.ok(a.text.startsWith(MOCK_ANSWER_PREFIX), "every mock answer says it's simulated");
  assert.equal(a.modelVersion, "mock-openai");
  assert.equal(a.webSearchUsed, false, "mock answers never claim a web search");
  assert.equal(a.text, b.text, "same input → same answer");
  assert.match(a.text, /Example Vendor/, "only placeholder vendor names, never real companies");
});

test("mock answers mention the brand only some of the time", async () => {
  let mentioned = 0;
  for (let i = 0; i < 30; i++) {
    const a = await queryEngine("anthropic", `prompt ${i}`, { context: brand });
    if (mentionsBrand(a.text, { name: brand.brandName, url: brand.brandUrl })) mentioned++;
  }
  assert.ok(mentioned > 5 && mentioned < 25, `got ${mentioned}/30`);
});

test("mock prompt generation and sentiment need no key", async () => {
  assert.equal(promptGenerationAvailable(), true);
  const set = await generatePromptSet({
    name: "Kiranabooks",
    url: "https://kiranabooks.in",
    industry: "billing software",
  });
  assert.equal(set.prompts.length, 8);
  assert.equal(set.industry, "", "mock never writes an industry onto the brand");
  assert.ok(set.prompts.every((p) => !/kiranabooks/i.test(p.text)));
  assert.ok(["positive", "neutral", "negative"].includes((await classifySentiment("Kiranabooks", "x"))!));
});

test("audit in mock mode: live visibility is measured but flagged as mock", async () => {
  env.AUDIT_ALLOW_PRIVATE_HOSTS = "1";
  const site = await serveSite("well-optimised");
  try {
    const { breakdown } = await runAudit({ name: "Kiranabooks", url: site.url });
    const live = breakdown.live_visibility;
    assert.equal(live.status, "ok");
    assert.equal(live.detail.mock, true);
    assert.match(live.checks[0].label, /Mock mode/);
    const results = live.detail.results as { model: string }[];
    assert.ok(results.every((r) => r.model.startsWith("mock-")));
  } finally {
    await site.close();
  }
});
