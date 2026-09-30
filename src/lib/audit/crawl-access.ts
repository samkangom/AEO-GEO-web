import robotsParser from "robots-parser";
import { CATEGORY_MAX, type CategoryResult } from "./types";

type BotPurpose = "answer" | "training";

export const AI_BOTS: { token: string; product: string; purpose: BotPurpose }[] = [
  // Answer/search bots: these gate whether AI answers can cite you. Scored.
  { token: "OAI-SearchBot", product: "ChatGPT search", purpose: "answer" },
  { token: "Claude-SearchBot", product: "Claude search", purpose: "answer" },
  { token: "PerplexityBot", product: "Perplexity", purpose: "answer" },
  // Training bots: blocking these is a legitimate business choice. Not scored.
  { token: "GPTBot", product: "OpenAI model training", purpose: "training" },
  { token: "ClaudeBot", product: "Anthropic model training", purpose: "training" },
];

/**
 * robots.txt fetch outcome:
 *  - "found": 2xx with a body
 *  - "missing": 4xx — per RFC 9309 crawlers treat the site as fully allowed
 *  - "unreachable": 5xx / network error — crawlers treat the site as fully disallowed
 */
export type RobotsFetch =
  | { kind: "found"; body: string }
  | { kind: "missing"; status: number }
  | { kind: "unreachable"; reason: string };

export function scoreCrawlAccess(siteUrl: string, robots: RobotsFetch): CategoryResult {
  const max = CATEGORY_MAX.crawl_access;
  const origin = new URL(siteUrl).origin;
  const robotsUrl = `${origin}/robots.txt`;

  if (robots.kind === "unreachable") {
    return {
      score: 0,
      max,
      status: "error",
      summary: "We couldn't read your robots.txt file, so AI crawlers may treat your site as off-limits.",
      checks: [
        {
          label: "AI search bots can read your robots.txt",
          passed: false,
          note: robots.reason,
        },
      ],
      fix: `Make sure ${robotsUrl} loads without a server error. When it fails, well-behaved AI crawlers assume they're not allowed in.`,
      detail: { robots_url: robotsUrl, robots_status: "unreachable", reason: robots.reason },
    };
  }

  const parser = robots.kind === "found" ? robotsParser(robotsUrl, robots.body) : null;
  const homepage = `${origin}/`;
  const access = AI_BOTS.map((bot) => ({
    ...bot,
    // `isAllowed` is undefined only for foreign URLs, which can't happen here.
    allowed: parser ? parser.isAllowed(homepage, bot.token) !== false : true,
  }));

  const answerBots = access.filter((b) => b.purpose === "answer");
  const blockedAnswer = answerBots.filter((b) => !b.allowed);
  const score = Math.round((max * (answerBots.length - blockedAnswer.length)) / answerBots.length);

  const trainingBots = access.filter((b) => b.purpose === "training");
  const checks = [
    ...answerBots.map((b) => ({
      label: `${b.product} can reach your site`,
      passed: b.allowed,
      note: b.allowed ? undefined : `Your robots.txt blocks ${b.token}.`,
    })),
    {
      label: `Model-training crawlers: ${trainingBots.map((b) => `${b.token} ${b.allowed ? "allowed" : "blocked"}`).join(", ")}`,
      passed: null,
      note: "Blocking training crawlers is your choice — it doesn't affect whether AI answers can cite you, or your score.",
    },
  ];

  const summary =
    blockedAnswer.length === 0
      ? "AI search bots can reach your site: yes."
      : blockedAnswer.length === answerBots.length
        ? "AI search bots can reach your site: no — all of them are blocked."
        : `AI search bots can reach your site: partly — ${blockedAnswer.map((b) => b.product).join(", ")} ${blockedAnswer.length === 1 ? "is" : "are"} blocked.`;

  const fix =
    blockedAnswer.length === 0
      ? null
      : `Ask your web developer to allow AI search bots in ${robotsUrl}. Add:\n\n${blockedAnswer
          .map((b) => `User-agent: ${b.token}\nAllow: /`)
          .join("\n\n")}`;

  return {
    score,
    max,
    status: "ok",
    summary,
    checks,
    fix,
    detail: {
      robots_url: robotsUrl,
      robots_status: robots.kind === "found" ? "found" : `missing (HTTP ${robots.status})`,
      bots: access.map(({ token, purpose, allowed }) => ({ token, purpose, allowed })),
    },
  };
}
