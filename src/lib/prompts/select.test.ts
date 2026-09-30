import assert from "node:assert/strict";
import { test } from "node:test";
import { pickAuditPrompts } from "./select";
import type { PromptLike } from "./types";

const p = (intent: PromptLike["intent"], language: PromptLike["language"], active = false): PromptLike => ({
  text: `${intent}-${language}-${active}`,
  intent,
  language,
  active,
});

test("picks one English prompt per intent plus one Hindi/Hinglish shortlist", () => {
  const set = [
    p("shortlist", "en"),
    p("shortlist", "hinglish"),
    p("comparison", "en"),
    p("comparison", "hi"),
    p("pricing", "en"),
    p("pricing", "hinglish"),
    p("local", "en"),
    p("local", "hi"),
  ];
  const picked = pickAuditPrompts(set).map((x) => x.text);
  assert.deepEqual(picked, [
    "shortlist-en-false",
    "comparison-en-false",
    "pricing-en-false",
    "local-en-false",
    "shortlist-hinglish-false",
  ]);
});

test("prefers active prompts and fills from whatever exists", () => {
  const set = [p("shortlist", "en"), p("shortlist", "en", true), p("pricing", "hi")];
  const picked = pickAuditPrompts(set);
  assert.equal(picked[0].active, true);
  assert.equal(picked.length, 3);
});
