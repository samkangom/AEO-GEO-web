/**
 * Serves every fixture site on a fixed local port for manual QA and e2e tests.
 *
 *   npm run fixtures
 *
 * Then, with AUDIT_ALLOW_PRIVATE_HOSTS=1 in .env.local (dev only), add a brand
 * in the app using one of the printed URLs.
 */
import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { FIXTURE_SITES_DIR, serveSite } from "../test/fixture-server";

const BASE_PORT = Number(process.env.FIXTURES_PORT ?? 4001);

const sites = readdirSync(FIXTURE_SITES_DIR)
  .filter((name) => statSync(path.join(FIXTURE_SITES_DIR, name)).isDirectory())
  .sort();

async function main() {
  console.log("Fixture sites:");
  for (const [i, name] of sites.entries()) {
    const { url } = await serveSite(name, BASE_PORT + i);
    console.log(`  ${name.padEnd(16)} ${url}`);
  }
  console.log("\nCtrl+C to stop.");
}

void main();
