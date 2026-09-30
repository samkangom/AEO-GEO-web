/**
 * Run the audit from the command line — no database, no login.
 * Useful for debugging scoring on a specific website. Reads API keys from
 * .env.local; with keys set, the live check makes real (paid) AI calls.
 *
 *   npm run audit -- https://example.in                  # human-readable summary
 *   npm run audit -- https://example.in --name="Example" # brand name for the live check
 *   npm run audit -- https://example.in --site-only      # skip AI calls
 *   npm run audit -- https://example.in --json           # full breakdown as JSON
 *   AUDIT_ALLOW_PRIVATE_HOSTS=1 npm run audit -- http://127.0.0.1:4001   # fixture site
 */
import { loadEnvConfig } from "@next/env";
import { runAudit, type AuditOptions } from "@/lib/audit";
import { CATEGORY_ORDER, CATEGORY_TITLES } from "@/lib/audit/types";
import { normaliseSiteUrl } from "@/lib/url";

const args = process.argv.slice(2);
const json = args.includes("--json");
const siteOnly = args.includes("--site-only");
const nameArg = args.find((a) => a.startsWith("--name="))?.slice("--name=".length);
const input = args.find((a) => !a.startsWith("--"));

if (!input) {
  console.error('Usage: npm run audit -- <url> [--name="Brand"] [--site-only] [--json]');
  process.exit(1);
}
const url = normaliseSiteUrl(input);
if (!url) {
  console.error(`Not a valid website URL: ${input}`);
  process.exit(1);
}

loadEnvConfig(process.cwd());

async function main(url: string) {
  const started = Date.now();
  const host = new URL(url).hostname.replace(/^www\./, "");
  const name = nameArg || host.split(".")[0].replace(/^./, (c) => c.toUpperCase());
  const opts: AuditOptions = siteOnly
    ? { engines: { configuredEngines: () => [], queryEngine: () => Promise.reject(new Error("unused")) } }
    : {};
  try {
    const result = await runAudit({ name, url }, opts);
    if (json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`\n${url} — ${result.overallScore}/100  (${Date.now() - started} ms)\n`);
      for (const key of CATEGORY_ORDER) {
        const c = result.breakdown[key];
        console.log(`${CATEGORY_TITLES[key]}: ${c.score}/${c.max}  [${c.status}]`);
        console.log(`  ${c.summary}`);
        for (const check of c.checks) {
          const mark = check.passed === true ? "✔" : check.passed === false ? "✘" : "·";
          console.log(`  ${mark} ${check.label}${check.note ? `  — ${check.note}` : ""}`);
        }
        if (c.fix) console.log(`  Fix: ${c.fix.replace(/\n/g, "\n       ")}`);
        console.log();
      }
    }
  } catch (e) {
    console.error(`Audit failed: ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }
}

void main(url);
