import assert from "node:assert/strict";
import { test } from "node:test";
import { fetchAllPages } from "./paged";

test("fetchAllPages reads past the per-request row cap", async () => {
  const all = Array.from({ length: 2345 }, (_, i) => i);
  const calls: [number, number][] = [];
  const rows = await fetchAllPages(async (from, to) => {
    calls.push([from, to]);
    return { data: all.slice(from, to + 1), error: null };
  });
  assert.equal(rows.length, 2345);
  assert.deepEqual(calls, [
    [0, 999],
    [1000, 1999],
    [2000, 2999],
  ]);
  // Exactly one full page: one extra (empty) request, no rows lost or repeated.
  const exact = await fetchAllPages(async (from, to) => ({
    data: all.slice(0, 1000).slice(from, to + 1),
    error: null,
  }));
  assert.equal(exact.length, 1000);
  await assert.rejects(
    fetchAllPages(async () => ({ data: null, error: new Error("boom") })),
    /boom/,
  );
});
