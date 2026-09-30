/**
 * Run the site audit from the command line — no database, no login.
 * Useful for debugging scoring on a specific website.
 *
 *   npm run audit -- https://example.in            # human-readable summary
 *   npm run audit -- https://example.in --json     # full breakdown as JSON
 *   AUDIT_ALLOW_PRIVATE_HOSTS=1 npm run audit -- http://127.0.0.1:4001   # fixture site
 */
import { runSiteAudit } from "@/lib/audit";
import { CATEGORY_ORDER, CATEGORY_TITLES } from "@/lib/audit/types";
import { normaliseSiteUrl } from "@/lib/url";

const args = process.argv.slice(2);
const json = args.includes("--json");
const input = args.find((a) => !a.startsWith("--"));

if (!input) {
  console.error("Usage: npm run audit -- <url> [--json]");
  process.exit(1);
}
const url = normaliseSiteUrl(input);
if (!url) {
  console.error(`Not a valid website URL: ${input}`);
  process.exit(1);
}

async function main(url: string) {
  const started = Date.now();
  try {
    const result = await runSiteAudit(url);
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
