import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { checkCronAuth } from "./cron-auth";

const saved = process.env.CRON_SECRET;
afterEach(() => {
  if (saved === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = saved;
});

test("cron auth: refuses everything without a secret, accepts only the exact bearer", () => {
  delete process.env.CRON_SECRET;
  assert.equal(checkCronAuth("Bearer anything"), "not_configured");
  assert.equal(checkCronAuth(null), "not_configured");

  process.env.CRON_SECRET = "s3cret-value";
  assert.equal(checkCronAuth("Bearer s3cret-value"), "ok");
  assert.equal(checkCronAuth("Bearer s3cret-valuX"), "unauthorized");
  assert.equal(checkCronAuth("s3cret-value"), "unauthorized");
  assert.equal(checkCronAuth(null), "unauthorized");
});
