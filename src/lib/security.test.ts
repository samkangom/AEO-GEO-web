import assert from "node:assert/strict";
import { test } from "node:test";
import { isPrivateAddress, safeFetch } from "./audit/safe-fetch";
import { safeNext } from "./safe-next";

test("isPrivateAddress blocks internal ranges", () => {
  for (const ip of [
    "127.0.0.1",
    "10.1.2.3",
    "172.16.0.1",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "::1",
    "fd00::1",
    "::ffff:10.0.0.1",
  ]) {
    assert.equal(isPrivateAddress(ip), true, ip);
  }
  for (const ip of ["8.8.8.8", "172.32.0.1", "2606:4700::1"]) {
    assert.equal(isPrivateAddress(ip), false, ip);
  }
});

test("safeFetch refuses private hosts unless explicitly allowed", async () => {
  const prev = process.env.AUDIT_ALLOW_PRIVATE_HOSTS;
  delete process.env.AUDIT_ALLOW_PRIVATE_HOSTS;
  try {
    await assert.rejects(safeFetch("http://127.0.0.1:1/"), /Private network/);
    await assert.rejects(safeFetch("http://localhost:1/"), /Local addresses/);
    await assert.rejects(safeFetch("file:///etc/passwd"), /Unsupported protocol/);
  } finally {
    if (prev !== undefined) process.env.AUDIT_ALLOW_PRIVATE_HOSTS = prev;
  }
});

test("safeNext only allows same-site paths", () => {
  assert.equal(safeNext("/dashboard/x"), "/dashboard/x");
  assert.equal(safeNext("//evil.com"), "/dashboard");
  assert.equal(safeNext("/\\evil.com"), "/dashboard");
  assert.equal(safeNext("https://evil.com"), "/dashboard");
  assert.equal(safeNext(null), "/dashboard");
});
