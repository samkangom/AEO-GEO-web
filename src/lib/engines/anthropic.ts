import Anthropic from "@anthropic-ai/sdk";
import { log } from "@/lib/log";
import { failed, notConfigured, type Citation, type EngineAdapter, type EngineAnswer } from "./types";

/** Default Claude model. Override with ANTHROPIC_MODEL. */
export const DEFAULT_ANTHROPIC_MODEL = "claude-opus-5-5";

export function anthropicModel() {
  return process.env.ANTHROPIC_MODEL || DEFAULT_ANTHROPIC_MODEL;
}

let client: Anthropic | null = null;
export function anthropicClient() {
  client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

/**
 * Server-side refusal fallback: if the model declines, Anthropic re-runs the
 * request on its recommended fallback model inside the same call. The model
 * that actually answered is recorded from `response.model`.
 */
export const FALLBACK_BETA = "server-side-fallback-2026-07-01";

const MAX_CONTINUATIONS = 3;

export const anthropicAdapter: EngineAdapter = {
  id: "anthropic",
  label: "Claude",
  isConfigured: () => !!process.env.ANTHROPIC_API_KEY,

  async query(prompt, opts = {}): Promise<EngineAnswer> {
    if (!process.env.ANTHROPIC_API_KEY) return notConfigured("anthropic", "ANTHROPIC_API_KEY");
    const started = Date.now();
    const model = anthropicModel();

    try {
      const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: prompt }];
      let response: Anthropic.Beta.BetaMessage | null = null;

      // Web search can pause a long turn; resume it by sending the partial turn back.
      for (let i = 0; i <= MAX_CONTINUATIONS; i++) {
        response = await anthropicClient().beta.messages.create(
          {
            model,
            max_tokens: 16000,
            betas: [FALLBACK_BETA],
            fallbacks: "default",
            // Buyer-style questions are chat-like; low effort keeps audits fast.
            output_config: { effort: "low" },
            tools: [
              {
                type: "web_search_20260209",
                name: "web_search",
                max_uses: 5,
                user_location: { type: "approximate", country: "IN", timezone: "Asia/Kolkata" },
              },
            ],
            messages,
          },
          { timeout: opts.timeoutMs ?? 120_000, maxRetries: 1 },
        );
        if (response.stop_reason !== "pause_turn") break;
        messages.push({ role: "assistant", content: response.content });
      }
      if (!response) throw new Error("No response");

      if (response.stop_reason === "refusal") {
        return failed(
          "anthropic",
          started,
          new Error("Claude declined to answer this prompt"),
          response.model,
        );
      }

      let text = "";
      const citations = new Map<string, Citation>();
      let webSearchUsed = false;
      for (const block of response.content) {
        if (block.type === "text") {
          text += block.text;
          for (const c of block.citations ?? []) {
            if (c.type === "web_search_result_location" && !citations.has(c.url)) {
              citations.set(c.url, { url: c.url, title: c.title ?? undefined });
            }
          }
        } else if (block.type === "server_tool_use" && block.name === "web_search") {
          webSearchUsed = true;
        }
      }

      return {
        engine: "anthropic",
        status: "ok",
        text: text.trim(),
        citations: [...citations.values()],
        modelVersion: response.model,
        webSearchUsed,
        latencyMs: Date.now() - started,
      };
    } catch (e) {
      log.error("engine.anthropic.failed", e, { model });
      return failed("anthropic", started, describeError(e), model);
    }
  },
};

function describeError(e: unknown): Error {
  if (e instanceof Anthropic.AuthenticationError) return new Error("Anthropic API key was rejected");
  if (e instanceof Anthropic.RateLimitError)
    return new Error("Anthropic rate limit reached — try again shortly");
  if (e instanceof Anthropic.APIError)
    return new Error(`Anthropic API error ${e.status ?? ""}: ${e.message}`);
  return e instanceof Error ? e : new Error(String(e));
}
