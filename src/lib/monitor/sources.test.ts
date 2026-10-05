import assert from "node:assert/strict";
import { test } from "node:test";
import { citedSources } from "./sources";

test("citedSources ranks domains by answers citing them, once per answer", () => {
  const rows = [
    {
      mentioned: true,
      citations: ["https://www.g2.com/a", "https://g2.com/b", "https://kiranabooks.in/pricing"],
    },
    { mentioned: false, citations: ["https://g2.com/c", "https://www.reddit.com/r/x"] },
    { mentioned: false, citations: ["https://g2.com/d"] },
    // Failed call: ignored even if it somehow carries citations.
    { mentioned: null, citations: ["https://g2.com/e"] },
    { mentioned: true, citations: ["not a url"] },
  ];
  const s = citedSources(rows, "https://www.kiranabooks.in");
  assert.deepEqual(s[0], { domain: "g2.com", answers: 3, withBrand: 1, own: false });
  assert.deepEqual(
    s.map((x) => x.domain),
    ["g2.com", "kiranabooks.in", "reddit.com"],
  );
  assert.equal(s.find((x) => x.domain === "kiranabooks.in")?.own, true);
  assert.deepEqual(citedSources([], "https://x.in"), []);
});
