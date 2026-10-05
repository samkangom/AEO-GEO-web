import assert from "node:assert/strict";
import { test } from "node:test";
import { detectLanguage } from "./language";

test("detectLanguage: Hindi, Hinglish and English", () => {
  assert.equal(detectLanguage("पुणे में दुकानों के लिए अच्छा बिलिंग सॉफ्टवेयर कौन सा है"), "hi");
  assert.equal(detectLanguage("kirana dukaan ke liye best billing app kaunsa hai"), "hinglish");
  assert.equal(detectLanguage("₹500 mahine ke andar achha billing software batao"), "hinglish");
  assert.equal(detectLanguage("Which billing software do CA firms in Pune recommend?"), "en");
  // One stray Hindi-looking word isn't enough.
  assert.equal(detectLanguage("Best kirana billing app in India"), "en");
});
