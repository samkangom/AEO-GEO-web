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

## Local setup

1. **Install:** `npm install` (Node 20+).
2. **Create a Supabase project** at supabase.com.
3. **Run the migration.** Either paste `supabase/migrations/20260930000000_init.sql` into the SQL editor, or use `npx supabase link && npx supabase db push`.
4. **Configure auth** under Authentication → URL Configuration:
   - Site URL: `http://localhost:3000` (your Vercel URL in production)
   - Redirect URLs: `http://localhost:3000/auth/callback` and `https://<your-domain>/auth/callback`
   - For Google, enable the provider under Authentication → Providers → Google with an OAuth client from Google Cloud. The authorised redirect URI is `https://<project-ref>.supabase.co/auth/v1/callback`.
5. **Set environment variables:** `cp .env.example .env.local`, then fill in the Supabase URL and anon key. The service-role key and AI keys aren't used yet.
6. **Start the app:** `npm run dev`, then open http://localhost:3000.

## Scripts

- `npm run dev` / `build` / `start`
- `npm run lint`, `npm run typecheck`
- `npm test`: unit tests for the audit scoring logic (robots.txt rules, JSON-LD parsing, content detection, URL normalisation)

## Deploying to Vercel

Import the repo, then add the same env vars. Audit routes set `maxDuration = 60`, and audits usually take 1 to 5 seconds. Remember to add the production `/auth/callback` URL in Supabase.

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
supabase/migrations/        SQL schema + RLS
```
