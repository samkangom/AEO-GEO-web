export const INTENTS = ["shortlist", "comparison", "pricing", "local"] as const;
export const LANGUAGES = ["en", "hi", "hinglish"] as const;

export type Intent = (typeof INTENTS)[number];
export type Language = (typeof LANGUAGES)[number];

export type PromptLike = { id?: string; text: string; intent: Intent; language: Language; active?: boolean };

export const INTENT_LABELS: Record<Intent, string> = {
  shortlist: "Shortlist",
  comparison: "Comparison",
  pricing: "Pricing",
  local: "Local",
};

export const LANGUAGE_LABELS: Record<Language, string> = {
  en: "English",
  hi: "Hindi",
  hinglish: "Hinglish",
};

/** Thrown when prompts can't be generated because Claude isn't configured. */
export class PromptsUnavailableError extends Error {}
