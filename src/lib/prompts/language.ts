import type { Language } from "./types";

// Common Hindi words as typed in Roman script. Two or more → Hinglish.
const HINGLISH_WORDS =
  /\b(?:hai|hain|kaunsa|kaun|kya|kis|ke|ki|ka|liye|accha|achha|achhe|sabse|chhota|chhoti|chhote|dukaan|batao|karo|wala|wali|chahiye|mein|aur|sasta|kaise|kahan)\b/gi;

/**
 * The language of a prompt the user typed: Hindi if it has Devanagari, Hinglish
 * if it reads like Hindi in Roman script, otherwise English. Used for prompts
 * added or edited by hand; Claude labels the ones it writes.
 */
export function detectLanguage(text: string): Language {
  if (/[ऀ-ॿ]/.test(text)) return "hi";
  const hits = new Set((text.match(HINGLISH_WORDS) ?? []).map((w) => w.toLowerCase()));
  return hits.size >= 2 ? "hinglish" : "en";
}
