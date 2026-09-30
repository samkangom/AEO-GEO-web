# ClearCite

AI visibility (AEO/GEO) for Indian B2B brands: find out whether ChatGPT, Claude, Gemini and Perplexity mention and recommend your brand, and fix it when they don't.

> The product name lives in one place, `src/config/site.ts`, together with the colour palette that Tailwind reads.

## Status

| Sprint | Scope | State |
| --- | --- | --- |
| 1 | Next.js + Supabase scaffold, auth (email/password + Google), DB migration + RLS | ✅ |
| 2 | Brand CRUD (add, list, switch, edit, delete) | ✅ |
| 3 | Audit engine (robots.txt, structured data, content signals) → score card UI | ✅ |
| 4 | AI provider adapter (OpenAI + Anthropic) + Claude prompt engine → live-visibility check | ⏳ next |
| 5 | Manual monitor run + engine_results + history | — |
| 6 | Dashboard polish, charts, Prompts / Monitor / Ads tabs | — |
| 7 | Static INR pricing page + landing page | — |
| 8 | Seed/demo data + `MOCK_AI_RESPONSES` mode | — |

Until Sprint 4 lands, the audit's **Live AI visibility** category (40 pts) is reported as *not configured* or *not measured*. It scores 0 and the UI says so. It is never estimated.

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
| Live AI visibility | 40 | *Sprint 4:* 5 generated prompts × OpenAI + Anthropic with web search. Score = % of pairs that mention the brand. |

Every weak category shows one plain-language recommended fix. Raw findings are stored in `audits.breakdown[category].detail`.

Site fetching (`src/lib/audit/safe-fetch.ts`) enforces timeouts and a size cap. It follows redirects manually and refuses private or internal addresses at every hop, so the brand URL can't be used to probe internal networks.

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
src/app/dashboard/          brand switcher, per-brand Audit + Settings tabs, server actions
src/app/api/health/         deployment health check
src/lib/log.ts              structured JSON logging
supabase/migrations/        SQL schema + RLS
supabase/tests/rls.sql      RLS tests
test/                       audit integration tests + fixture websites
e2e/                        Playwright tests
scripts/                    audit CLI, fixture-site server
docs/                       developer guide, QA test plan
```
