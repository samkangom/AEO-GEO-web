# ClearCite

AI visibility (AEO/GEO) for Indian brands and organisations (B2B businesses first, but any website works, including political parties, nonprofits and government bodies): find out whether ChatGPT, Claude, Gemini and Perplexity mention and recommend your brand, and fix it when they don't.

> The product name lives in one place, `src/config/site.ts`, together with the colour palette that Tailwind reads and the contact email used by every "Contact us" button (currently a placeholder, `hello@clearcite.in`). Plans and INR prices live in `src/config/pricing.ts`.

## Status

| Sprint | Scope | State |
| --- | --- | --- |
| 1 | Next.js + Supabase scaffold, auth (email/password + Google), DB migration + RLS | ✅ |
| 2 | Brand CRUD (add, list, switch, edit, delete) | ✅ |
| 3 | Audit engine (robots.txt, structured data, content signals) → score card UI | ✅ |
| 4 | AI provider adapter (OpenAI + Anthropic) + Claude prompt engine → live-visibility check | ✅ |
| 5 | Manual monitor run + engine_results + history | ✅ |
| 6 | Dashboard polish, charts, Prompts / Monitor / Ads tabs | ✅ |
| 7 | Static INR pricing page + landing page | ✅ |
| 8 | Seed/demo data + `MOCK_AI_RESPONSES` mode | ✅ |

Without AI keys, the audit's **Live AI visibility** category (40 pts) is reported as *not configured*. It scores 0 and the UI says so. It is never estimated.

## Get a shareable test link

Follow **[docs/DEPLOY.md](docs/DEPLOY.md)**: Supabase + Vercel, from a test link to real AI answers and launch, no installs.

## Try it without AI keys (demo)

```bash
npm run db:start                     # local Supabase; copy its URL, anon key and service_role key into .env.local
npm run seed:demo                    # demo@clearcite.local / clearcite-demo-123: 2 brands, audits, 6 weeks of runs,
                                     # plus 4 real sites (bjp.org, inc.in, lamzing.com, awpara.com) with live site audits
npm run fixtures &                   # local fixture websites the demo brands point at
MOCK_AI_RESPONSES=1 AUDIT_ALLOW_PRIVATE_HOSTS=1 npm run dev
```

**Mock mode** (`MOCK_AI_RESPONSES=1`) replaces every AI call (live visibility, prompt generation, monitor, sentiment) with a deterministic simulated answer:
- Simulated answers start with "[Mock response …]", list only "Example Vendor" placeholders, report model `mock-openai` / `mock-anthropic`, and never claim a web search.
- Mock runs are flagged in the database (`monitor_runs.mock`).
- Everything simulated shows a **Mock** badge, and the dashboard shows a banner while mock mode is on.
- Mock mode is ignored on the production site; it works locally and on Vercel preview deployments. A test deployment that Vercel treats as production can opt in deliberately by also setting `ALLOW_MOCK_ON_PRODUCTION=1`. Remove it before launch.
- With mock mode off and no keys, the app shows "not configured" as before. It never estimates.

## For engineers & QA

- **[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)**: local setup with Docker Supabase, scripts, the test suites, debugging, architecture, and codebase rules.
- **[docs/QA.md](docs/QA.md)**: the manual test plan with IDs, fixture sites with known expected scores, and how to report bugs.

Quick start:

```bash
npm ci
npm run db:start                 # local Supabase (Docker), applies migrations
cp .env.example .env.local       # paste the URL + anon key printed above
npm run dev                      # http://localhost:3000
npm run check                    # lint, types, format, unit + integration tests
```

Test layers:

- **Unit:** scoring rules.
- **Integration:** real audits against local fixture websites, no internet needed.
- **Database:** RLS tests (`npm run test:db`).
- **End-to-end:** Playwright (`npm run test:e2e`, full journey with `E2E_FULL=1`).

CI runs all of them on every PR.

## Deploying to Vercel

1. Import the repo and add the env vars from `.env.example`.
2. Run the migration against your Supabase project (`npx supabase link && npx supabase db push`).
3. In Supabase → Authentication → URL Configuration, set the Site URL and add `https://<your-domain>/auth/callback` to the redirect URLs.
4. For Google sign-in, enable the provider in Supabase with a Google Cloud OAuth client. Its redirect URI is `https://<project-ref>.supabase.co/auth/v1/callback`.
5. Check `https://<your-domain>/api/health`.

Audit routes set `maxDuration = 60`. Audits usually take 1 to 5 seconds.

## How the audit scores (0–100)

| Category | Pts | What we check |
| --- | --- | --- |
| AI crawler access | 25 | robots.txt rules for the **answer/search** bots OAI-SearchBot, Claude-SearchBot and PerplexityBot (≈8⅓ pts each). Training bots (GPTBot, ClaudeBot) are reported but never cost points. A missing robots.txt (4xx) counts as allowed. A 5xx or unreachable robots.txt counts as blocked, following RFC 9309. |
| Structured data | 20 | JSON-LD on the homepage, including `@graph` and nested nodes: Organization or subtypes (10), Product/Service/SoftwareApplication (5), FAQPage on the homepage or FAQ page (5). |
| Content signals | 15 | About page (4), FAQ content (4), public pricing, either a pricing page or ₹/Rs/INR prices on the homepage (4), and a meta description of at least 50 characters (3). Pages are confirmed from the raw HTML, so a JavaScript-only shell doesn't count. Most AI crawlers don't run JavaScript. |
| Live AI visibility | 40 | 5 of the brand's prompts (4 English, one per intent, plus 1 Hindi/Hinglish), each asked to every configured engine (ChatGPT, Claude) with web search, localised to India. Score = 40 × the share of answers that mention the brand. Failed calls are excluded and reported. Each answer, the model that produced it, its citations and its list position are stored in `detail.results`. |

**Any website, not only B2B.** Each brand has a type: business (the default), political party, nonprofit, government body, or other. For anything other than a business:
- Public pricing doesn't apply, so that check is shown as "not applicable" and costs no points.
- For parties and government bodies, Product/Service schema doesn't apply either. It also costs no points.
- Claude writes the tracked questions for that audience: voters and journalists, donors, or citizens. For political parties the questions stay neutral and informational, and never ask an assistant who to vote for.
- The "pricing" intent is labelled "Funding & membership" for a party, "Donations & fees" for a nonprofit, and "Fees & charges" for a government body.

A brand can also list **other names** (for example "BJP" for "Bharatiya Janata Party"), and AI answers that use any of them count as mentions. Short all-caps names match case exactly, so "INC" isn't found in "Acme Inc.".

Every weak category shows one plain-language recommended fix. When the homepage can't be loaded at all, the audit shows "No score" and skips the live AI check, so no paid calls are made for a result that can't be scored.

**Free check without sign-up.** The landing page runs the three site checks (60 points) for any URL in a few seconds, with no AI calls. It's rate-limited to 5 checks per visitor and 200 overall per 10 minutes (in memory, per server instance), and results are kept for 15 minutes per site. The full 100-point audit, including live AI visibility, needs an account.

Two content findings are tuned to avoid false credit:
- ₹ figures count as public pricing only when they look like a price: a non-zero amount, no "Cr" or "lakh", and pricing words close by.
- When 40% or more of the homepage's words start invisible (inline `opacity:0`, typical of scroll animations), the content card flags it. This isn't scored. Raw findings are stored in `audits.breakdown[category].detail`.

Site fetching (`src/lib/audit/safe-fetch.ts`) enforces timeouts and a size cap. Every connection is made through an agent that checks the resolved IP address at connect time, so DNS rebinding can't reach internal hosts. When an outbound proxy is configured (some CI and sandbox networks), the proxy resolves names instead. It follows redirects manually and refuses private or internal addresses at every hop, so the brand URL can't be used to probe internal networks.

## Monitoring

"Run monitor now" on the Monitor tab asks every active prompt (up to 20) to every configured engine, 20 calls at a time. Each answer is saved to `engine_results` as soon as it arrives, with:
- whether the brand is mentioned, its list position, whether the answer cites the brand's site, and the sentiment;
- the full answer text, citations and model;
- or, if the call failed, the error.

The Monitor tab also lists the **sources AI answers cite** in the latest run: domains ranked by how many answers cited them, with your own site marked. These are the sites to get listed or reviewed on.

Mention rate is mentioned ÷ answers received. Failed calls are shown separately and never counted as "not mentioned". A run left `running` for more than 15 minutes (for example, a function timeout) shows as *Interrupted*.

**Scheduled weekly monitoring.** `vercel.json` sets a daily Vercel Cron (03:30 UTC, 9:00 IST) on `/api/cron/monitor`.
- That route finds the brands that are due. A brand is due when its schedule is on (`brands.auto_monitor`, default on, switched on the Monitor tab), it has 1–20 active prompts, and it has had no run in the past 7 days. A manual run counts; a failed run doesn't, so it's retried the next day.
- It then starts each brand (up to 10 a day) as its own request to `/api/cron/monitor/brand`. That request runs the same `runMonitorForBrand()` as "Run monitor now", in the background, with `trigger = 'scheduled'`. Scheduled runs are labelled "Scheduled" in the run history.
- Both routes refuse any request without `Authorization: Bearer $CRON_SECRET`, which Vercel Cron sends automatically. They need `SUPABASE_SERVICE_ROLE_KEY` (server-only) because no user is signed in. The rules are in `src/lib/monitor/schedule.ts`, with unit tests.
- To run it by hand: `curl -H "Authorization: Bearer $CRON_SECRET" https://<your-domain>/api/cron/monitor`.

## Data model & security

The schema is in `supabase/migrations/`. Only `brands` carries `user_id`. Every other table is scoped through its brand via the `owns_brand()` / `owns_run()` helpers. An `engine_results` row must also reference a prompt from the same brand as its run. A trigger creates a `profiles` row for each new auth user.

## Project layout

```
src/config/site.ts          brand name, tagline, palette (single source)
src/lib/audit/              audit engine; pure scoring functions plus fetch orchestration
src/lib/supabase/           server/browser clients, session middleware, DB types
src/app/(auth)/             login, signup
src/app/auth/               OAuth/email callback, sign-out
src/app/onboarding/         "Add your first brand"
src/app/dashboard/          all-brands overview; per-brand sections (left sidebar): Overview, Audit, Prompts,
                            Monitor (+ run detail), Ads (coming soon), Settings; server actions
src/components/*/…-view.tsx page views, kept separate from data loading so they can be previewed
src/app/api/health/         deployment health check
src/lib/log.ts              structured JSON logging
supabase/migrations/        SQL schema + RLS
supabase/tests/rls.sql      RLS tests
test/                       audit integration tests + fixture websites
e2e/                        Playwright tests
scripts/                    audit CLI, fixture-site server
docs/                       developer guide, QA test plan
```

## AI engines & models

All AI calls go through `src/lib/engines/`. Nothing else imports a provider SDK.

| Use | Provider / model | Notes |
| --- | --- | --- |
| Live visibility: ChatGPT | OpenAI Responses API, `gpt-5.5` (override: `OPENAI_MODEL`) | `web_search` tool, user location India, low reasoning effort |
| Live visibility: Claude | Anthropic Messages API, `claude-opus-5-5` (override: `ANTHROPIC_MODEL`) | `web_search_20260209` tool, user location India, effort `low`. Server-side refusal fallback (`fallbacks: "default"`) is on, and the model that actually answered is recorded. |
| Prompt generation | Claude, same model | Structured JSON output. Prompts that contain the brand name are dropped. |
| Sentiment tag (monitor) | Claude Haiku 4.5 (`claude-haiku-4-5`) | Small, fast classification call, made only for answers that mention the brand |
| Live visibility: Gemini | Gemini API `generateContent`, `gemini-flash-latest` (override: `GEMINI_MODEL`) | Google Search grounding. The API has no user-location setting. Grounding links are short-lived Google redirects, so each is recorded as its source domain (`https://<domain>/`). |
| Live visibility: Perplexity | Perplexity Chat Completions, `sonar` (override: `PERPLEXITY_MODEL`) | Always searches the web; user location India. Citations come from `search_results` and `citations`. |

Each engine joins when its key is set; engines without a key show "Not configured". Rough cost per audit with all four keys: one prompt-generation call on a brand's first audit, then 20 web-search answers (5 prompts × 4 engines). Pricing: Claude Opus 5.5 is $4/$20 per million input/output tokens plus web-search fees; OpenAI pricing is per their price list.
