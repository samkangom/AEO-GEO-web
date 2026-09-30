import assert from "node:assert/strict";
import { test } from "node:test";
import { analyzeAnswer, brandTerms, listPosition, mentionsBrand } from "./analyze";

const brand = { name: "Kiranabooks Pvt Ltd", url: "https://www.kiranabooks.in" };

test("brandTerms strips legal suffixes and adds the domain", () => {
  assert.deepEqual(brandTerms(brand), ["Kiranabooks Pvt Ltd", "Kiranabooks", "kiranabooks.in"]);
});

test("mentionsBrand: case-insensitive, word-bounded, spacing-tolerant", () => {
  assert.equal(mentionsBrand("Try KIRANABOOKS for GST billing.", brand), true);
  assert.equal(mentionsBrand("See kiranabooks.in for plans", brand), true);
  assert.equal(mentionsBrand("Kirana Books is popular in Pune", brand), true);
  assert.equal(mentionsBrand("kiranabooksy is a different app", brand), false);
  assert.equal(mentionsBrand("Vyapar and Tally are common choices", brand), false);
  // Hindi answer quoting the brand in Latin script.
  assert.equal(mentionsBrand("छोटी दुकानों के लिए Kiranabooks अच्छा है", brand), true);
});

test("short generic names don't match inside other words", () => {
  const acme = { name: "Zed", url: "https://zed.in" };
  assert.equal(mentionsBrand("Amazed customers", acme), false);
  assert.equal(mentionsBrand("Zed is fast", acme), true);
});

test("listPosition ranks top-level items and folds sub-bullets", () => {
  const answer = [
    "Here are the best options:",
    "1. **Vyapar** – popular with retailers",
    "   - Also mentions Kiranabooks as an alternative",
    "2. **Tally Prime** – for accountants",
    "3. **Kiranabooks** – built for kirana stores",
  ].join("\n");
  // Item 1's sub-bullet mentions the brand, so it counts toward item 1.
  assert.equal(listPosition(answer, brand), 1);

  const answer2 = "### 1. Vyapar\nGood.\n### 2. Kiranabooks\nAlso good.";
  assert.equal(listPosition(answer2, brand), 2);

  assert.equal(listPosition("Kiranabooks is a good choice.", brand), null);
});

test("analyzeAnswer: cited only when a citation is on the brand's domain", () => {
  const r = analyzeAnswer(
    {
      text: "- Vyapar\n- Kiranabooks",
      citations: [{ url: "https://blog.kiranabooks.in/gst" }, { url: "https://g2.com/x" }],
    },
    brand,
  );
  assert.deepEqual(r, { mentioned: true, cited: true, position: 2 });

  const none = analyzeAnswer(
    { text: "Vyapar is best.", citations: [{ url: "https://notkiranabooks.in" }] },
    brand,
  );
  assert.deepEqual(none, { mentioned: false, cited: false, position: null });
});
