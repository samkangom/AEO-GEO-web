import {
  configuredEngines as defaultConfiguredEngines,
  engineLabel,
  queryEngine as defaultQueryEngine,
  VISIBILITY_ENGINES,
  type EngineAnswer,
  type EngineId,
} from "@/lib/engines";
import { log } from "@/lib/log";
import { isMockModel } from "@/lib/mock-mode";
import { pickAuditPrompts } from "@/lib/prompts/select";
import { PromptsUnavailableError, type PromptLike } from "@/lib/prompts/types";
import { analyzeAnswer, type BrandRef } from "@/lib/visibility/analyze";
import { CATEGORY_MAX, type CategoryResult, type CheckItem } from "./types";

export type LiveVisibilityDeps = {
  configuredEngines: () => EngineId[];
  queryEngine: (engine: EngineId, prompt: string) => Promise<EngineAnswer>;
};

function defaultDeps(brand: BrandRef): LiveVisibilityDeps {
  return {
    configuredEngines: () => defaultConfiguredEngines(),
    queryEngine: (engine, prompt) =>
      defaultQueryEngine(engine, prompt, {
        timeoutMs: 90_000,
        context: { brandName: brand.name, brandUrl: brand.url },
      }),
  };
}

const MAX_STORED_ANSWER = 6000;

function unmeasured(status: "not_configured" | "error", summary: string, fix: string | null, detail = {}) {
  return {
    score: 0,
    max: CATEGORY_MAX.live_visibility,
    status,
    summary,
    checks: [],
    fix,
    detail,
  } satisfies CategoryResult;
}

/**
 * Live AI visibility (40 pts): asks each configured engine (web search on)
 * the audit prompts and scores the share of (prompt × engine) answers that
 * mention the brand. Failed calls are excluded from the denominator and
 * reported; nothing is estimated.
 */
export async function checkLiveVisibility(
  brand: BrandRef,
  preparePrompts: () => Promise<PromptLike[]>,
  deps: LiveVisibilityDeps = defaultDeps(brand),
): Promise<CategoryResult> {
  const engines = deps.configuredEngines();
  if (engines.length === 0) {
    return unmeasured(
      "not_configured",
      "Live AI answer checks are not configured (no OpenAI or Anthropic API key), so this part wasn't measured.",
      "Add OPENAI_API_KEY and/or ANTHROPIC_API_KEY to your environment to measure whether AI answers mention your brand.",
    );
  }

  let prompts: PromptLike[];
  try {
    prompts = pickAuditPrompts(await preparePrompts());
  } catch (e) {
    if (e instanceof PromptsUnavailableError) {
      return unmeasured(
        "not_configured",
        "We need Claude to write test questions for your brand, and it isn't configured — so this part wasn't measured.",
        "Add ANTHROPIC_API_KEY to your environment (used to generate test prompts), or add your own prompts on the Prompts tab.",
      );
    }
    log.error("audit.prompts_failed", e, { brand: brand.url });
    return unmeasured(
      "error",
      "We couldn't prepare test questions for your brand, so this part wasn't measured. Please run the audit again.",
      null,
      { error: e instanceof Error ? e.message : String(e) },
    );
  }
  if (prompts.length === 0) {
    return unmeasured(
      "error",
      "There were no test questions to ask, so this part wasn't measured.",
      "Generate prompts on the Prompts tab, then run the audit again.",
    );
  }

  const pairs = prompts.flatMap((prompt) => engines.map((engine) => ({ prompt, engine })));
  const answers = await Promise.all(pairs.map(({ prompt, engine }) => deps.queryEngine(engine, prompt.text)));

  const results = pairs.map(({ prompt, engine }, i) => {
    const answer = answers[i];
    const analysis = answer.status === "ok" ? analyzeAnswer(answer, brand) : null;
    return { prompt, engine, answer, analysis };
  });

  const mock = answers.some((a) => isMockModel(a.modelVersion));
  const measured = results.filter((r) => r.analysis);
  const mentioned = measured.filter((r) => r.analysis!.mentioned);

  if (measured.length === 0) {
    return unmeasured(
      "error",
      "None of the AI engines answered, so this part wasn't measured. Please run the audit again.",
      null,
      { errors: results.map((r) => ({ engine: r.engine, error: r.answer.error })) },
    );
  }

  const score = Math.round((CATEGORY_MAX.live_visibility * mentioned.length) / measured.length);
  const perEngine = engines.map((engine) => {
    const rows = measured.filter((r) => r.engine === engine);
    return { engine, measured: rows.length, mentioned: rows.filter((r) => r.analysis!.mentioned).length };
  });

  const checks: CheckItem[] = prompts.map((prompt) => {
    const rows = results.filter((r) => r.prompt === prompt);
    const parts = rows.map((r) => {
      const label = engineLabel(r.engine);
      if (!r.analysis) return `${label}: couldn't check (${r.answer.error ?? "error"})`;
      if (!r.analysis.mentioned) return `${label}: not mentioned`;
      const bits = ["mentioned"];
      if (r.analysis.position) bits.push(`#${r.analysis.position} in its list`);
      if (r.analysis.cited) bits.push("links to your site");
      return `${label}: ${bits.join(", ")}`;
    });
    const anyMeasured = rows.some((r) => r.analysis);
    return {
      label: `“${prompt.text}”`,
      passed: anyMeasured ? rows.some((r) => r.analysis?.mentioned) : null,
      note: parts.join(" · "),
    };
  });

  if (mock) {
    checks.unshift({
      label: "Mock mode: these answers are simulated, not real AI results",
      passed: null,
      note: "MOCK_AI_RESPONSES is on. Turn it off and add API keys to measure real visibility.",
    });
  }

  const missing = VISIBILITY_ENGINES.filter((e) => !engines.includes(e));
  if (missing.length) {
    checks.push({
      label: `Only ${engines.map(engineLabel).join(" and ")} checked`,
      passed: null,
      note: `${missing.map(engineLabel).join(" and ")} ${missing.length === 1 ? "isn't" : "aren't"} configured, so ${missing.length === 1 ? "it wasn't" : "they weren't"} included.`,
    });
  }

  const engineSummary = perEngine
    .filter((e) => e.measured > 0)
    .map((e) => `${engineLabel(e.engine)} ${e.mentioned}/${e.measured}`)
    .join(", ");
  const summary =
    mentioned.length === 0
      ? `AI answers mention ${brand.name}: no — 0 of ${measured.length} answers (${engineSummary}).`
      : mentioned.length === measured.length
        ? `AI answers mention ${brand.name}: yes — in all ${measured.length} answers (${engineSummary}).`
        : `AI answers mention ${brand.name}: sometimes — ${mentioned.length} of ${measured.length} answers (${engineSummary}).`;

  const fix =
    mentioned.length === measured.length
      ? null
      : "AI answers lean on third-party lists and reviews. Get your brand onto the pages they cite — industry “best of” lists, G2/Capterra/IndiaMART/Justdial profiles, and news or partner mentions — and publish your own comparison and “best X in <city>” pages. Then fix any gaps in the other categories below.";

  return {
    score,
    max: CATEGORY_MAX.live_visibility,
    status: "ok",
    summary,
    checks,
    fix,
    detail: {
      mock,
      engines,
      per_engine: perEngine,
      answers_measured: measured.length,
      answers_mentioning: mentioned.length,
      results: results.map(({ prompt, engine, answer, analysis }) => ({
        prompt: prompt.text,
        prompt_id: prompt.id ?? null,
        intent: prompt.intent,
        language: prompt.language,
        engine,
        status: answer.status,
        error: answer.error ?? null,
        mentioned: analysis?.mentioned ?? null,
        cited: analysis?.cited ?? null,
        position: analysis?.position ?? null,
        model: answer.modelVersion,
        web_search_used: answer.webSearchUsed,
        latency_ms: answer.latencyMs,
        citations: answer.citations.slice(0, 10).map((c) => c.url),
        answer: answer.text.slice(0, MAX_STORED_ANSWER),
      })),
    },
  };
}
