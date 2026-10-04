/**
 * Seeds a reviewable demo account — no AI keys or API cost needed.
 *
 *   npm run db:start            # local Supabase
 *   npm run seed:demo           # creates demo@clearcite.local / clearcite-demo-123
 *
 * Everything is produced by the app's real pipeline (site audit, prompt
 * engine, monitor) running in MOCK_AI_RESPONSES mode against the local
 * fixture websites, so all AI results are stored and shown as "Mock".
 * Re-running replaces the demo account. Refuses non-local Supabase unless
 * --allow-remote is passed.
 *
 * The account also gets four real public websites (two political parties, two
 * companies) with a real site audit run at seed time — crawler access,
 * structured data and content, fetched live. Their AI-answer check is left
 * "not configured" (no mock answers about real organisations); run it from
 * the app with API keys set. Skip them with --no-real-sites (e.g. offline).
 *
 * Needs SUPABASE_SERVICE_ROLE_KEY (printed by `npm run db:start`) in .env.local.
 */
import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { serveSite } from "../test/fixture-server";

loadEnvConfig(process.cwd());
process.env.MOCK_AI_RESPONSES = "1";
process.env.AUDIT_ALLOW_PRIVATE_HOSTS = "1";

const args = process.argv.slice(2);
const arg = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const EMAIL = arg("email") ?? "demo@clearcite.local";
const PASSWORD = arg("password") ?? "clearcite-demo-123";
const WEEKS = 6;

const DEMO_BRANDS = [
  { name: "Kiranabooks", site: "well-optimised", port: 4004, industry: "GST billing software" },
  { name: "Sharma Pumps", site: "minimal", port: 4002, industry: "industrial water pumps" },
];

/** Real websites: site checks are fetched live; no simulated AI answers are stored for them. */
const REAL_SITES = [
  {
    name: "Bharatiya Janata Party",
    url: "https://www.bjp.org",
    kind: "political_party",
    aliases: ["BJP"],
    industry: "national political party",
  },
  {
    name: "Indian National Congress",
    url: "https://inc.in",
    kind: "political_party",
    aliases: ["INC", "Congress party"],
    industry: "national political party",
  },
  {
    name: "Lamzing Technologies",
    url: "https://www.lamzing.com",
    kind: "business",
    aliases: ["Lamzing"],
    industry: "custom software and digital solutions",
  },
  {
    name: "Awpara",
    url: "https://www.awpara.com",
    kind: "business",
    aliases: [],
    industry: "AR, VR, XR and AI solutions",
  },
] as const;

function fail(msg: string): never {
  console.error(`✘ ${msg}`);
  process.exit(1);
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) fail("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.");
  const host = new URL(url).hostname;
  if (!["localhost", "127.0.0.1"].includes(host) && !args.includes("--allow-remote")) {
    fail(`Refusing to seed ${host}: demo data is for local Supabase. Pass --allow-remote to override.`);
  }

  // Imported after the env is set: these modules read MOCK_AI_RESPONSES at call time.
  const { runAudit } = await import("@/lib/audit");
  const { generateAndSavePrompts } = await import("@/lib/prompts/store");
  const { runMonitorForBrand, defaultMonitorDeps } = await import("@/lib/monitor/store");

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  // Replace any previous demo account (cascades to its brands and data).
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) fail(`Listing users failed: ${error.message}`);
    const existing = data.users.find((u) => u.email === EMAIL);
    if (existing) {
      await supabase.auth.admin.deleteUser(existing.id);
      console.log(`· Removed previous ${EMAIL}`);
      break;
    }
    if (data.users.length < 200) break;
  }

  const { data: created, error: userError } = await supabase.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { company_name: "Demo Agency" },
  });
  if (userError || !created.user) fail(`Creating demo user failed: ${userError?.message}`);
  const userId = created.user.id;
  console.log(`✔ User ${EMAIL}`);

  // Fixture sites on the same ports as `npm run fixtures`, so re-audits from the UI work too.
  const servers: { close: () => Promise<void> }[] = [];
  for (const b of DEMO_BRANDS) {
    try {
      servers.push(await serveSite(b.site, b.port));
    } catch {
      console.log(`· Port ${b.port} in use — assuming \`npm run fixtures\` is running`);
    }
  }

  try {
    for (const def of DEMO_BRANDS) {
      const siteUrl = `http://127.0.0.1:${def.port}`;
      const { data: brand, error } = await supabase
        .from("brands")
        .insert({ user_id: userId, name: def.name, url: siteUrl, industry: def.industry })
        .select("id, name, url, industry")
        .single();
      if (error || !brand) fail(`Creating brand failed: ${error?.message}`);

      // Prompts (mock templates), English ones activated for monitoring.
      const prompts = await generateAndSavePrompts(supabase, brand, { title: null, description: null });
      await supabase.from("prompts").update({ active: true }).eq("brand_id", brand.id).eq("language", "en");

      // Two audits: one six weeks ago, one today.
      for (const daysAgo of [WEEKS * 7, 0]) {
        const result = await runAudit(brand, { preparePrompts: async () => prompts });
        await supabase.from("audits").insert({
          brand_id: brand.id,
          overall_score: result.overallScore,
          breakdown: result.breakdown,
          created_at: new Date(Date.now() - daysAgo * 86_400_000).toISOString(),
        });
      }

      // Weekly monitor runs, backdated.
      for (let w = WEEKS - 1; w >= 0; w--) {
        const date = new Date(Date.now() - w * 7 * 86_400_000);
        const res = await runMonitorForBrand(
          supabase,
          brand,
          defaultMonitorDeps(brand, date.toISOString().slice(0, 10)),
        );
        if ("error" in res) fail(`Monitor run failed: ${res.error}`);
        await supabase
          .from("monitor_runs")
          .update({
            started_at: date.toISOString(),
            finished_at: new Date(date.getTime() + 70_000).toISOString(),
          })
          .eq("id", res.runId);
        await supabase
          .from("engine_results")
          .update({ sampled_at: new Date(date.getTime() + 30_000).toISOString() })
          .eq("run_id", res.runId);
      }
      console.log(`✔ ${def.name}: prompts, 2 audits, ${WEEKS} monitor runs (mock)`);
    }
  } finally {
    await Promise.all(servers.map((s) => s.close()));
  }

  if (!args.includes("--no-real-sites")) {
    // Real sites must be fetched from the internet, never through the private-host allowance.
    delete process.env.AUDIT_ALLOW_PRIVATE_HOSTS;
    const noEngines = {
      configuredEngines: () => [],
      queryEngine: () => Promise.reject(new Error("unused")),
    };
    for (const def of REAL_SITES) {
      const { data: brand, error } = await supabase
        .from("brands")
        .insert({ user_id: userId, ...def, aliases: [...def.aliases] })
        .select("id, name, url, industry, kind, aliases")
        .single();
      if (error || !brand) fail(`Creating brand failed: ${error?.message}`);
      try {
        const result = await runAudit(brand, { engines: noEngines, preparePrompts: async () => [] });
        await supabase.from("audits").insert({
          brand_id: brand.id,
          overall_score: result.overallScore,
          breakdown: result.breakdown,
        });
        console.log(`✔ ${def.name}: real site audit ${result.overallScore}/100 (AI answers not run)`);
      } catch (e) {
        console.log(`· ${def.name}: added without an audit (${e instanceof Error ? e.message : e})`);
      }
    }
  }

  console.log(`\nDemo ready. Log in at http://localhost:3000/login as ${EMAIL} / ${PASSWORD}`);
  console.log("All AI results are simulated and labelled “Mock” in the app.");
  console.log(
    "To re-run audits from the UI, keep `npm run fixtures` running and set AUDIT_ALLOW_PRIVATE_HOSTS=1.",
  );
}

void main();
