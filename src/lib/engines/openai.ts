import OpenAI from "openai";
import { log } from "@/lib/log";
import { failed, notConfigured, type Citation, type EngineAdapter, type EngineAnswer } from "./types";

/** Default OpenAI model. Override with OPENAI_MODEL. */
export const DEFAULT_OPENAI_MODEL = "gpt-5.5";

export function openaiModel() {
  return process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL;
}

let client: OpenAI | null = null;
function openaiClient() {
  client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

export const openaiAdapter: EngineAdapter = {
  id: "openai",
  label: "ChatGPT",
  isConfigured: () => !!process.env.OPENAI_API_KEY,

  async query(prompt, opts = {}): Promise<EngineAnswer> {
    if (!process.env.OPENAI_API_KEY) return notConfigured("openai", "OPENAI_API_KEY");
    const started = Date.now();
    const model = openaiModel();

    try {
      const response = await openaiClient().responses.create(
        {
          model,
          input: prompt,
          reasoning: { effort: "low" },
          tools: [
            {
              type: "web_search",
              user_location: { type: "approximate", country: "IN", timezone: "Asia/Kolkata" },
            },
          ],
        },
        { timeout: opts.timeoutMs ?? 120_000, maxRetries: 1 },
      );

      const citations = new Map<string, Citation>();
      let webSearchUsed = false;
      for (const item of response.output) {
        if (item.type === "web_search_call") webSearchUsed = true;
        if (item.type === "message") {
          for (const part of item.content) {
            if (part.type !== "output_text") continue;
            for (const a of part.annotations) {
              if (a.type === "url_citation" && !citations.has(a.url)) {
                citations.set(a.url, { url: a.url, title: a.title });
              }
            }
          }
        }
      }

      if (response.status !== "completed" && !response.output_text) {
        return failed("openai", started, new Error(`OpenAI response ${response.status}`), response.model);
      }

      return {
        engine: "openai",
        status: "ok",
        text: response.output_text.trim(),
        citations: [...citations.values()],
        modelVersion: response.model,
        webSearchUsed,
        latencyMs: Date.now() - started,
      };
    } catch (e) {
      log.error("engine.openai.failed", e, { model });
      return failed("openai", started, describeError(e), model);
    }
  },
};

function describeError(e: unknown): Error {
  if (e instanceof OpenAI.AuthenticationError) return new Error("OpenAI API key was rejected");
  if (e instanceof OpenAI.RateLimitError) return new Error("OpenAI rate limit reached — try again shortly");
  if (e instanceof OpenAI.APIError) return new Error(`OpenAI API error ${e.status ?? ""}: ${e.message}`);
  return e instanceof Error ? e : new Error(String(e));
}
