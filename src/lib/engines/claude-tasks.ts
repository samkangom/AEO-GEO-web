/**
 * Internal Claude calls (not visibility measurements): generating prompt sets.
 * Kept inside lib/engines so provider SDKs are only imported here.
 */
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { log } from "@/lib/log";
import { INTENTS, LANGUAGES, PromptsUnavailableError, type PromptLike } from "@/lib/prompts/types";
import { mentionsBrand } from "@/lib/visibility/analyze";
import { isMockMode } from "@/lib/mock-mode";
import { ORG_KIND_LABELS, type OrgKind } from "@/lib/org-kind";
import { anthropicClient, anthropicModel, FALLBACK_BETA } from "./anthropic";
import { mockPromptSet, mockSentiment } from "./mock";

const PromptSetSchema = z.object({
  industry: z.string().describe("Short category label for the business, e.g. 'GST billing software'"),
  prompts: z.array(
    z.object({
      intent: z.enum(INTENTS),
      language: z.enum(LANGUAGES),
      text: z.string(),
    }),
  ),
});

const BUSINESS_SYSTEM = `You write the questions that real buyers in India type into AI assistants such as ChatGPT and Claude when they are looking for a product, service or supplier. We use these questions to measure whether AI assistants recommend a given business without being told its name.

Given a business, write questions its potential customers would ask, where a good answer would recommend businesses like it:

- shortlist: asking for the best or top options for their need.
- comparison: asking how the leading options or alternatives in the category compare, or which suits a specific situation.
- pricing: asking what options cost or which are affordable, with ₹ amounts or budgets where natural.
- local: tied to a specific Indian city or region where the business operates or sells. Infer it from the website details; if unclear, use a major metro that fits the category.

For each intent write exactly two questions: one in English (language "en"), and one the way Indian buyers actually type in Hindi — Hinglish in Roman script ("hinglish") or Hindi in Devanagari ("hi"), whichever is more natural for this business's buyers. That is eight questions in total.

Never include the business's own name, brand or website in a question: the point is to see whether the assistant brings it up on its own. Write for the business's real buyers (business decision-makers if it sells to businesses), be specific about the category and use case, and phrase each question the way a person types it: one sentence or two, roughly 8–25 words, no quotation marks or numbering.

Also return a short industry label for the business.`;

/** Audience and intent meanings for organisations that aren't selling something. */
const NON_BUSINESS: Record<Exclude<OrgKind, "business">, { who: string; intents: string; extra: string }> = {
  political_party: {
    who: "citizens, voters, students and journalists in India asking about political parties, their policies and how they work",
    intents: `- shortlist: asking which parties have a stated position, plan or record on a specific issue (for example farm credit, jobs, water supply).
- comparison: asking how parties' published positions or manifestos compare on a specific issue.
- pricing: asking about party funding, donations, electoral disclosures, or how membership works and what it costs.
- local: tied to a specific Indian state, city or constituency: party offices, representatives, or local programmes.`,
    extra:
      "Keep every question neutral and informational, the way a person researching would ask. No loaded or partisan framing, nothing that asks the assistant who to vote for, and no claims about any party inside the question.",
  },
  nonprofit: {
    who: "donors, volunteers, beneficiaries and partner organisations in India looking for nonprofits",
    intents: `- shortlist: asking for credible nonprofits or NGOs working on a specific cause.
- comparison: asking how organisations working on the cause compare, or which suits a specific way of helping.
- pricing: asking about donating, tax benefits such as 80G, fees for services, or how funds are used.
- local: tied to a specific Indian city or region where the organisation works.`,
    extra: "Be specific about the cause and the kind of help.",
  },
  government: {
    who: "citizens and businesses in India looking for a government service, scheme or office",
    intents: `- shortlist: asking where or how to get a specific service, certificate or scheme benefit.
- comparison: asking how related schemes or service options compare, or which applies to a situation.
- pricing: asking what a service costs, fees and charges, or who is eligible for free or subsidised access.
- local: tied to a specific Indian state, district or city: offices, camps or local procedures.`,
    extra: "Be specific about the service, scheme or office.",
  },
  other: {
    who: "people in India looking for an organisation like this one, or for what it offers",
    intents: `- shortlist: asking for the best or most credible options for their need.
- comparison: asking how the main options compare, or which suits a specific situation.
- pricing: asking what it costs, or about fees, membership or donations where that fits better.
- local: tied to a specific Indian city or region where the organisation is active.`,
    extra: "Be specific about what the organisation does.",
  },
};

export function promptSystem(kind: OrgKind = "business") {
  if (kind === "business") return BUSINESS_SYSTEM;
  const k = NON_BUSINESS[kind];
  return `You write the questions that ${k.who} type into AI assistants such as ChatGPT and Claude. We use these questions to measure whether AI assistants mention a given organisation without being told its name.

Given an organisation, write questions where a good, factual answer would mention organisations like it:

${k.intents}

For each intent write exactly two questions: one in English (language "en"), and one the way people in India actually type in Hindi — Hinglish in Roman script ("hinglish") or Hindi in Devanagari ("hi"), whichever is more natural for this audience. That is eight questions in total.

Never include the organisation's own name, abbreviation or website in a question: the point is to see whether the assistant brings it up on its own. ${k.extra} Phrase each question the way a person types it: one sentence or two, roughly 8–25 words, no quotation marks or numbering.

Also return a short category label for the organisation (for example "national political party" or "education nonprofit").`;
}

export type BrandContext = {
  name: string;
  url: string;
  industry?: string | null;
  kind?: OrgKind;
  aliases?: string[];
  siteTitle?: string | null;
  siteDescription?: string | null;
};

export type GeneratedPromptSet = { industry: string; prompts: PromptLike[] };

/** Whether prompts can be generated right now (Claude configured, or mock mode). */
export function promptGenerationAvailable() {
  return isMockMode() || !!process.env.ANTHROPIC_API_KEY;
}

export async function generatePromptSet(brand: BrandContext): Promise<GeneratedPromptSet> {
  if (isMockMode()) return mockPromptSet(brand);
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new PromptsUnavailableError("Prompt generation uses Claude — ANTHROPIC_API_KEY is not set.");
  }

  const details = [
    `${(brand.kind ?? "business") === "business" ? "Business" : "Organisation"} name: ${brand.name}`,
    brand.aliases?.length && `Also known as: ${brand.aliases.join(", ")}`,
    brand.kind && brand.kind !== "business" && `Type: ${ORG_KIND_LABELS[brand.kind]}`,
    `Website: ${brand.url}`,
    brand.industry && `Industry (from the owner): ${brand.industry}`,
    brand.siteTitle && `Homepage title: ${brand.siteTitle}`,
    brand.siteDescription && `Homepage description: ${brand.siteDescription}`,
  ]
    .filter(Boolean)
    .join("\n");

  const response = await anthropicClient().beta.messages.parse(
    {
      model: anthropicModel(),
      max_tokens: 16000,
      betas: [FALLBACK_BETA],
      fallbacks: "default",
      output_config: { effort: "low", format: betaZodOutputFormat(PromptSetSchema) },
      system: promptSystem(brand.kind),
      messages: [{ role: "user", content: details }],
    },
    { timeout: 90_000, maxRetries: 1 },
  );

  if (response.stop_reason === "refusal" || !response.parsed_output) {
    throw new Error(`Prompt generation returned no result (stop reason: ${response.stop_reason})`);
  }

  const { industry, prompts } = response.parsed_output;
  const seen = new Set<string>();
  const clean = prompts
    .map((p) => ({ ...p, text: p.text.trim().replace(/^["“]|["”]$/g, "") }))
    .filter((p) => {
      const key = p.text.toLowerCase();
      if (!p.text || seen.has(key)) return false;
      seen.add(key);
      // A prompt naming the brand would make every "mention" meaningless.
      if (mentionsBrand(p.text, brand)) {
        log.warn("prompts.dropped_branded", { text: p.text });
        return false;
      }
      return true;
    });

  log.info("prompts.generated", { brand: brand.url, count: clean.length, model: response.model });
  return { industry: industry.trim(), prompts: clean };
}

export type Sentiment = "positive" | "neutral" | "negative";

/** Small, fast model for the per-answer sentiment tag. */
export const CLASSIFIER_MODEL = "claude-haiku-4-5";

const SentimentSchema = z.object({ sentiment: z.enum(["positive", "neutral", "negative"]) });

/**
 * How an AI answer portrays the brand: positive (recommended / praised),
 * neutral (listed or described without judgement), negative (criticised or
 * advised against). Returns null when Claude isn't configured.
 */
export async function classifySentiment(brandName: string, answer: string): Promise<Sentiment | null> {
  if (isMockMode()) return mockSentiment(brandName, answer);
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const response = await anthropicClient().messages.parse(
    {
      model: CLASSIFIER_MODEL,
      max_tokens: 1024,
      output_config: { format: zodOutputFormat(SentimentSchema) },
      system:
        "You classify how an AI assistant's answer portrays one named business. positive: the answer recommends or praises it. neutral: it is listed or described without a clear judgement. negative: it is criticised, flagged for problems, or advised against. Judge only the named business, not the others in the answer.",
      messages: [{ role: "user", content: `Business: ${brandName}\n\nAnswer:\n${answer.slice(0, 12000)}` }],
    },
    { timeout: 30_000, maxRetries: 1 },
  );
  return response.parsed_output?.sentiment ?? null;
}
