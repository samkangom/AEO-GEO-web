import { INTENTS, type PromptLike } from "./types";

/**
 * Picks the prompts the audit's live check uses: one English prompt per
 * intent plus one Hindi/Hinglish prompt (5 total), preferring prompts the user
 * has activated. Falls back to whatever exists when the set is incomplete.
 */
export function pickAuditPrompts<P extends PromptLike>(prompts: P[], count = 5): P[] {
  const ranked = [...prompts].sort((a, b) => Number(b.active ?? false) - Number(a.active ?? false));
  const picked: P[] = [];
  const take = (p: P | undefined) => {
    if (p && !picked.includes(p) && picked.length < count) picked.push(p);
  };

  for (const intent of INTENTS) take(ranked.find((p) => p.language === "en" && p.intent === intent));
  take(ranked.find((p) => p.language !== "en" && p.intent === "shortlist"));
  take(ranked.find((p) => p.language !== "en"));
  for (const p of ranked) take(p);
  return picked;
}
