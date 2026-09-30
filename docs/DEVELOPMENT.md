# Development guide

Everything an engineer needs to run, test, debug and change ClearCite.

## 1. Run it locally

**Prerequisites:** Node 22 (`nvm use` reads `.nvmrc`), Docker (for local Supabase), and optionally `psql`.

```bash
npm ci
npm run db:start          # local Supabase in Docker; applies supabase/migrations/*
cp .env.example .env.local
# Paste the "API URL" and "anon key" printed by db:start into .env.local:
#   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
npm run dev               # http://localhost:3000
```

Local services:

| What | URL |
| --- | --- |
| App | http://localhost:3000 |
| Supabase Studio (browse tables, users) | http://127.0.0.1:54323 |
| Mailpit (every email local Auth sends) | http://127.0.0.1:54324 |
| Health check | http://localhost:3000/api/health |

Email confirmation is off locally, so signing up logs you straight in. To wipe the database and re-apply migrations, run `npm run db:reset`.

To work against a cloud Supabase project instead, put that project's URL and anon key in `.env.local`, then run the migration with `npx supabase link && npx supabase db push`.

## 2. Scripts

| Command | What it does |
| --- | --- |
| `npm run check` | **Run before every push.** Lint, typecheck, format check, unit + integration tests. |
| `npm test` | Unit tests (`src/**/*.test.ts`), audit integration tests against fixture sites, and AI-adapter contract tests (the real SDKs talking to a local mock server). No network, keys or DB. |
| `npm run test:db` | RLS tests (`supabase/tests/rls.sql`) against local Supabase, or `$DATABASE_URL`. |
| `npm run test:e2e` | Playwright. Public-page tests always run. Set `E2E_FULL=1` (with local Supabase running) for the full sign-up → brand → audit journey. |
| `npm run audit -- <url> [--name="Brand"] [--site-only] [--json]` | Run the audit from the terminal. No DB or login needed. Uses keys from `.env.local`: with keys set, it makes real (paid) AI calls; `--site-only` skips them. |
| `npm run fixtures` | Serve the fixture websites on ports 4001+ for manual QA. |
| `npm run format` | Prettier. |
| `npm run db:types` | Regenerate `src/lib/supabase/types.ts` from the local DB after a migration. |

First time running e2e on your machine: `npx playwright install chromium`.

CI (`.github/workflows/ci.yml`) runs `checks` (everything in `npm run check` plus `build`) and `e2e` (local Supabase, RLS tests, full Playwright journey) on every PR.

## 3. Debugging

**An audit score looks wrong for a website**

1. Run `npm run audit -- https://thesite.in` to see every check and note, or add `--json` for the raw `detail`.
2. In the app, each category card has **Technical details** with the same data. It's stored in `audits.breakdown`.
3. To reproduce offline, save the site's `robots.txt` and homepage HTML into `test/fixtures/sites/<name>/`. Add a case to `test/audit.integration.test.ts`, fix, then run `npm test`.

**Live AI visibility looks wrong**

1. Open **Technical details** on the Live AI visibility card. `results[]` holds every prompt × engine pair: the full answer text, citations, the list position we detected, the model that answered, latency, and any error.
2. Mention detection is `src/lib/visibility/analyze.ts`, a pure function. Reproduce a disputed answer as a case in `analyze.test.ts`.
3. Engine call failures log `engine.openai.failed` / `engine.anthropic.failed`. Prompt problems log `prompts.generated`, `prompts.dropped_branded` or `audit.prompts_failed`.

**A monitor run looks wrong**

1. Open the run from Monitor → Run history. Every prompt × engine answer is listed with mentioned / position / cited / sentiment / model. "Show answer" reveals the full stored text and citations.
2. The SQL source of truth is `engine_results` for that `run_id`. `error` is set exactly when `mentioned` is null, and a database constraint enforces this.
3. Logs: `monitor.completed` (with counts and duration), `monitor.failed`, `monitor.result_save_failed`, `monitor.sentiment_failed`.

**Audit a local fixture site through the app UI:** add `AUDIT_ALLOW_PRIVATE_HOSTS=1` to `.env.local`, run `npm run fixtures`, then add a brand with URL `http://127.0.0.1:4004`. The flag is ignored in production builds. Without it, local and private addresses are refused on purpose, as SSRF protection.

**Server errors:** server logs are one JSON object per line, e.g. `{"level":"error","event":"audit.failed","brandId":"…","error":{…}}`. Filter by `event` or `brandId` locally or in Vercel → Logs. Current events: `audit.completed`, `audit.site_unreachable`, `audit.failed`, `audit.save_failed`, `brand.create_failed`, `brand.update_failed`, `brand.delete_failed`.

**User sees "Something went wrong":** the error page shows a `Ref:` code. That's Next's error digest, which also appears in the server log next to the stack trace.

**Is a deployment configured?** `GET /api/health` reports whether Supabase answers, which AI provider keys are set (true/false only), and the commit SHA.

**Data questions:** use Supabase Studio. Remember RLS: queries in Studio run as `postgres` and bypass it. The app always queries as the signed-in user.

## 4. Architecture

```
Browser ──> Next.js (Vercel)
             ├─ middleware.ts             refreshes Supabase session, guards /dashboard, /onboarding
             ├─ app/(auth), app/auth      login/signup pages, OAuth + email callback, sign-out
             ├─ app/dashboard/actions.ts  server actions: brand CRUD, run audit
             ├─ app/dashboard/prompt-actions.ts  generate / edit / activate prompts
             ├─ app/dashboard/monitor-actions.ts "Run monitor now"
             │     ├─ lib/monitor/        execute (pure orchestration) · stats (pure) · store (DB)
             │     ├─ lib/audit/          site checks (fetch → pure scoring) + live visibility
             │     ├─ lib/prompts/        prompt selection + DB persistence
             │     ├─ lib/visibility/     mention / citation / position detection (pure)
             │     └─ lib/engines/        THE ONLY place provider SDKs are used:
             │                            queryEngine(engine, prompt) + Claude prompt generation
             │                            ──> OpenAI / Anthropic APIs
             └─ lib/supabase/server.ts    Supabase client acting AS THE USER (anon key + cookie)
                                          ──> Postgres with RLS
```

- **`src/lib/audit/`**
  - `index.ts` orchestrates the fetches.
  - `crawl-access.ts`, `structured-data.ts` and `content-signals.ts` are **pure** scoring functions (HTML/text in, score out), which makes them unit-testable.
  - `safe-fetch.ts` is the only way the audit touches the network (timeouts, size caps, SSRF guard).
  - `types.ts` defines the `breakdown` JSON shape.
- **`src/config/site.ts`** holds the product name, tagline and colours. Never hardcode the name.
- **`supabase/migrations/`** is the schema. `supabase/tests/rls.sql` holds the RLS tests.

## 5. Rules of the codebase

1. **RLS is the security boundary.** User-facing code uses the user-scoped client (`lib/supabase/server.ts`). Don't use the service-role key in request paths.
2. **No fabricated data.** Every AI-visibility number must come from a real API call. When something can't be measured, set the category `status` to `not_configured` / `not_run` / `error` with score 0, and let the UI say so.
3. **AI providers only through the adapter.** Call `queryEngine()` from `src/lib/engines`. Route handlers never import a provider SDK directly. To add an engine, implement `EngineAdapter` (see `openai.ts`), register it in `ENGINES`, add it to `VISIBILITY_ENGINES`, and add a contract test in `test/engines.contract.test.ts`.
4. **Schema changes:**
   - Add a new migration file (`npx supabase migration new <name>`). Never edit one that's been applied.
   - Run `npm run db:types`.
   - Add RLS assertions to `supabase/tests/rls.sql` for any new table.
5. **Bug fixes start with a failing test:** unit, fixture-site integration, RLS SQL, or e2e, whichever is closest to the bug.
6. **Log with `log.*` from `src/lib/log.ts`.** Include IDs (`brandId`), never secrets or API keys.
7. **Scheduled monitoring is not built yet.** When it is, it hooks in as a Vercel Cron route calling the same monitor function that "Run monitor now" uses.

## 6. Environment variables

See `.env.example`. Test-only extras:

| Variable | Purpose |
| --- | --- |
| `OPENAI_MODEL` / `ANTHROPIC_MODEL` | Override the default models (`gpt-5.5` / `claude-opus-5-5`). |
| `AUDIT_ALLOW_PRIVATE_HOSTS=1` | Let the audit fetch local fixture sites. Ignored when `NODE_ENV=production`. |
| `E2E_FULL=1` | Run the full Playwright journey (needs Supabase). |
| `E2E_PORT` | Port for the e2e dev server (default 3210). |
| `DATABASE_URL` | Postgres URL for `npm run test:db` (default: local Supabase). |
