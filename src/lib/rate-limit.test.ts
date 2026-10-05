import assert from "node:assert/strict";
import { test } from "node:test";
import { rateLimit, resetRateLimits } from "./rate-limit";

test("rateLimit allows up to the limit per window, then resets", () => {
  resetRateLimits();
  const t = 1_000_000;
  for (let i = 0; i < 3; i++) assert.equal(rateLimit("ip:1", 3, 60_000, t).ok, true);
  const blocked = rateLimit("ip:1", 3, 60_000, t + 1_000);
  assert.equal(blocked.ok, false);
  assert.equal(blocked.retryAfterMs, 59_000);
  assert.equal(rateLimit("ip:2", 3, 60_000, t).ok, true);
  assert.equal(rateLimit("ip:1", 3, 60_000, t + 60_000).ok, true);
});
