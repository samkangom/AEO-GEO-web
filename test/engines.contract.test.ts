/**
 * Adapter contract tests: the real SDK clients talk to a local mock server,
 * so we verify the exact request we send and how we parse the response —
 * without API keys or cost. The mock responses follow the documented API
 * shapes; a real-key smoke test is `npm run audit -- <site>` with keys set.
 */
import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, beforeEach, describe, test } from "node:test";

type Captured = { path: string; headers: http.IncomingHttpHeaders; body: Record<string, unknown> };
let captured: Captured[] = [];
let responder: (req: Captured) => { status?: number; body: unknown } = () => ({ body: {} });
let server: http.Server;

before(async () => {
  server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      const entry = { path: req.url ?? "", headers: req.headers, body: raw ? JSON.parse(raw) : {} };
      captured.push(entry);
      const { status = 200, body } = responder(entry);
      res.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify(body));
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address() as AddressInfo;
  process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${port}`;
  process.env.OPENAI_BASE_URL = `http://127.0.0.1:${port}/v1`;
  process.env.ANTHROPIC_API_KEY = "test-key";
  process.env.OPENAI_API_KEY = "test-key";
});
after(() => new Promise<void>((r) => server.close(() => r())));
beforeEach(() => {
  captured = [];
});

const anthropicMessage = (content: unknown[], stop_reason = "end_turn", model = "claude-opus-5-5") => ({
  id: "msg_1",
  type: "message",
  role: "assistant",
  model,
  content,
  stop_reason,
  stop_sequence: null,
  usage: { input_tokens: 10, output_tokens: 20 },
});

describe("anthropic adapter", () => {
  test("sends web search (India), fallback beta and effort; parses text + citations", async () => {
    const { queryEngine } = await import("@/lib/engines");
    responder = () => ({
      body: anthropicMessage([
        { type: "server_tool_use", id: "srv_1", name: "web_search", input: { query: "billing" } },
        {
          type: "web_search_tool_result",
          tool_use_id: "srv_1",
          content: [
            {
              type: "web_search_result",
              url: "https://kiranabooks.in",
              title: "K",
              encrypted_content: "x",
              page_age: null,
            },
          ],
        },
        { type: "text", text: "Top options:\n1. Vyapar\n" },
        {
          type: "text",
          text: "2. Kiranabooks",
          citations: [
            {
              type: "web_search_result_location",
              url: "https://kiranabooks.in/pricing",
              title: "Pricing",
              cited_text: "…",
              encrypted_index: "x",
            },
          ],
        },
      ]),
    });

    const a = await queryEngine("anthropic", "best billing app for kirana shops");
    assert.equal(a.status, "ok", String(a.error));
    assert.equal(a.text, "Top options:\n1. Vyapar\n2. Kiranabooks");
    assert.deepEqual(a.citations, [{ url: "https://kiranabooks.in/pricing", title: "Pricing" }]);
    assert.equal(a.webSearchUsed, true);
    assert.equal(a.modelVersion, "claude-opus-5-5");

    const req = captured[0];
    assert.match(req.path, /^\/v1\/messages/);
    assert.match(String(req.headers["anthropic-beta"]), /server-side-fallback-2026-07-01/);
    assert.equal(req.body.model, "claude-opus-5-5");
    assert.equal(req.body.fallbacks, "default");
    assert.deepEqual(req.body.output_config, { effort: "low" });
    const tool = (req.body.tools as Record<string, unknown>[])[0];
    assert.equal(tool.type, "web_search_20260209");
    assert.deepEqual(tool.user_location, { type: "approximate", country: "IN", timezone: "Asia/Kolkata" });
    assert.equal("betas" in req.body, false, "betas go in the header, not the body");
  });

  test("resumes a paused turn and records the model that actually answered", async () => {
    const { queryEngine } = await import("@/lib/engines");
    let n = 0;
    responder = () =>
      n++ === 0
        ? { body: anthropicMessage([{ type: "text", text: "Searching… " }], "pause_turn") }
        : { body: anthropicMessage([{ type: "text", text: "Done." }], "end_turn", "claude-opus-4-8") };
    const a = await queryEngine("anthropic", "q");
    assert.equal(captured.length, 2);
    const secondMessages = captured[1].body.messages as { role: string }[];
    assert.deepEqual(
      secondMessages.map((m) => m.role),
      ["user", "assistant"],
    );
    assert.equal(a.text, "Done.");
    assert.equal(a.modelVersion, "claude-opus-4-8");
  });

  test("refusal and API errors become status error, never an answer", async () => {
    const { queryEngine } = await import("@/lib/engines");
    responder = () => ({ body: anthropicMessage([], "refusal") });
    const refused = await queryEngine("anthropic", "q");
    assert.equal(refused.status, "error");
    assert.equal(refused.text, "");

    responder = () => ({
      status: 401,
      body: { type: "error", error: { type: "authentication_error", message: "invalid x-api-key" } },
    });
    const denied = await queryEngine("anthropic", "q");
    assert.equal(denied.status, "error");
    assert.equal(denied.error, "Anthropic API key was rejected");
  });
});

describe("openai adapter", () => {
  test("sends Responses API web search (India); parses output text + url citations", async () => {
    const { queryEngine } = await import("@/lib/engines");
    responder = () => ({
      body: {
        id: "resp_1",
        object: "response",
        created_at: 0,
        status: "completed",
        model: "gpt-5.5-2026-04-23",
        output: [
          {
            type: "web_search_call",
            id: "ws_1",
            status: "completed",
            action: { type: "search", query: "x" },
          },
          {
            type: "message",
            id: "msg_1",
            role: "assistant",
            status: "completed",
            content: [
              {
                type: "output_text",
                text: "1. Kiranabooks — popular in Pune.",
                annotations: [
                  {
                    type: "url_citation",
                    url: "https://kiranabooks.in/",
                    title: "Kiranabooks",
                    start_index: 0,
                    end_index: 10,
                  },
                ],
              },
            ],
          },
        ],
      },
    });

    const a = await queryEngine("openai", "billing software in Pune");
    assert.equal(a.status, "ok", String(a.error));
    assert.equal(a.text, "1. Kiranabooks — popular in Pune.");
    assert.deepEqual(a.citations, [{ url: "https://kiranabooks.in/", title: "Kiranabooks" }]);
    assert.equal(a.webSearchUsed, true);
    assert.equal(a.modelVersion, "gpt-5.5-2026-04-23");

    const req = captured[0];
    assert.equal(req.path, "/v1/responses");
    assert.equal(req.body.model, "gpt-5.5");
    assert.equal(req.body.input, "billing software in Pune");
    assert.deepEqual(req.body.tools, [
      { type: "web_search", user_location: { type: "approximate", country: "IN", timezone: "Asia/Kolkata" } },
    ]);
  });
});

describe("stub engines", () => {
  test("Gemini and Perplexity report not configured, never a result", async () => {
    const { queryEngine } = await import("@/lib/engines");
    process.env.GEMINI_API_KEY = "set";
    for (const e of ["gemini", "perplexity"] as const) {
      const a = await queryEngine(e, "q");
      assert.equal(a.status, "not_configured");
      assert.equal(a.text, "");
    }
    delete process.env.GEMINI_API_KEY;
    assert.equal(captured.length, 0);
  });
});

describe("prompt generation (Claude structured output)", () => {
  test("requests a JSON schema, drops prompts that name the brand, dedupes", async () => {
    const { generatePromptSet } = await import("@/lib/engines/claude-tasks");
    const payload = {
      industry: "GST billing software",
      prompts: [
        { intent: "shortlist", language: "en", text: "best billing software for kirana shops in India" },
        {
          intent: "shortlist",
          language: "hinglish",
          text: "kirana dukaan ke liye best billing app kaunsa hai",
        },
        { intent: "comparison", language: "en", text: "Is Kiranabooks better than Vyapar?" },
        { intent: "pricing", language: "en", text: "“best billing software for kirana shops in India”" },
        { intent: "local", language: "hi", text: "पुणे में दुकानों के लिए अच्छा बिलिंग सॉफ्टवेयर कौन सा है" },
      ],
    };
    responder = () => ({ body: anthropicMessage([{ type: "text", text: JSON.stringify(payload) }]) });

    const set = await generatePromptSet({
      name: "Kiranabooks",
      url: "https://kiranabooks.in",
      siteDescription: "GST billing for kirana stores",
    });
    assert.equal(set.industry, "GST billing software");
    assert.deepEqual(
      set.prompts.map((p) => p.language),
      ["en", "hinglish", "hi"],
      "branded prompt and duplicate (after quote-stripping) are dropped",
    );

    const req = captured[0];
    const format = (req.body.output_config as { format: { type: string; schema: unknown } }).format;
    assert.equal(format.type, "json_schema");
    assert.equal((req.body.output_config as { effort: string }).effort, "low");
    assert.match(String(req.body.system), /Never include the business's own name/);
    const userMsg = (req.body.messages as { content: string }[])[0].content;
    assert.match(userMsg, /Homepage description: GST billing for kirana stores/);
  });

  test("without ANTHROPIC_API_KEY: PromptsUnavailableError, no request", async () => {
    const { generatePromptSet } = await import("@/lib/engines/claude-tasks");
    const { PromptsUnavailableError } = await import("@/lib/prompts/types");
    const key = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    try {
      await assert.rejects(generatePromptSet({ name: "X", url: "https://x.in" }), PromptsUnavailableError);
      assert.equal(captured.length, 0);
    } finally {
      process.env.ANTHROPIC_API_KEY = key;
    }
  });
});
