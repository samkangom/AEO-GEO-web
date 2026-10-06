# Deploy ClearCite (Supabase + Vercel)

This takes you from nothing to a working app with real ChatGPT and Claude results, in about 45 minutes. You don't need to install anything; it's all done in the browser.

Parts 1–3 give you a working link. Part 4 makes it real (AI keys). Part 5 is for launching to customers.

## Part 1 — Database (Supabase)

1. Go to **supabase.com** → **Start your project** → sign in with GitHub.
2. **New project**: name `clearcite`, a strong database password (save it), region **Mumbai (ap-south-1)** → **Create new project**. Wait about 2 minutes.
3. Left menu → **SQL Editor** → **New query**. Paste the whole of `clearcite-database-setup.sql` (every file in `supabase/migrations/`, in order) → **Run**. You should see "Success. No rows returned".
   - Already set up before 4 Oct 2026? Run only `supabase/migrations/20261004000000_org_kind_aliases.sql`.
4. **Authentication → Sign In / Providers → Email**: for a test link, turn **Confirm email** off → **Save**. For launch, turn it back on (see Part 5).
5. **Project Settings → API Keys** (or **Data API**). Copy:
   - **Project URL**, e.g. `https://abcdefgh.supabase.co`
   - **anon public** key, under "Legacy API keys", e.g. `eyJ…`. The newer **publishable** key (`sb_publishable_…`) also works.

   Never put the **service_role** key in Vercel. The app doesn't need it.

## Part 2 — App (Vercel)

6. **vercel.com** → **Sign Up** → **Continue with GitHub**.
7. **Add New… → Project** → **aeo-geo-web** → **Import**. If it isn't listed: **Adjust GitHub App Permissions** → allow `samkangom/aeo-geo-web`.
8. Under **Environment Variables**, add:

   | Key | Value | Needed for |
   | --- | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL from step 5 | Everything |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key from step 5 | Everything |
   | `OPENAI_API_KEY` | from Part 4 | ChatGPT answers |
   | `ANTHROPIC_API_KEY` | from Part 4 | Claude answers, prompt writing, sentiment |
   | `NEXT_PUBLIC_SITE_URL` | `https://your-domain` (after Part 5; optional before) | Canonical links, sitemap |

   No AI keys yet and you just want to click around? Add `MOCK_AI_RESPONSES=1` and `ALLOW_MOCK_ON_PRODUCTION=1` instead. Answers are then simulated and labelled "Mock" everywhere. **Remove both before real use.**

9. **Deploy** and wait 2–3 minutes. Copy your address, e.g. `https://aeo-geo-web.vercel.app`.
   - If the build mentions `maxDuration`: **Settings → Functions → Fluid Compute → Enable** → **Deployments → ⋯ → Redeploy**. Audits and monitor runs need up to 300 seconds.

## Part 3 — Connect them

10. Supabase → **Authentication → URL Configuration**:
    - **Site URL**: your Vercel address
    - **Redirect URLs → Add URL**: `<your address>/auth/callback` → **Save**
11. Open `<your address>/api/health`. You want:
    - `"ok": true` and `"supabase": "ok"`;
    - `"providers": { "openai": true, "anthropic": true, … }` once the keys are in;
    - `"mockMode": false` for real use.

## Part 4 — Real AI answers

12. **OpenAI**: platform.openai.com → **Billing**: add a payment method and credit. Then **API keys → Create new secret key** → paste it as `OPENAI_API_KEY` in Vercel.
13. **Anthropic**: console.anthropic.com → **Billing**: add credit. Then **API Keys → Create Key** → paste it as `ANTHROPIC_API_KEY`.
    - Claude answers use the **web search** tool. If the Claude rows in a run say web search isn't enabled, an admin can switch it on in the Console's organisation settings.
14. **Set spending limits** in both consoles: a monthly budget plus an email alert.
    - Each audit makes about 10 web-search answers, plus one prompt-writing call the first time.
    - Each monitor run makes (active prompts × 2) answers, up to 40.
    - To lower Claude's cost, set `ANTHROPIC_MODEL` to a smaller model. The default is `claude-opus-5-5`.
15. Vercel → **Deployments → ⋯ → Redeploy**, so the new keys take effect. Check `/api/health` again.

## Check it works (10 minutes)

1. Open your address → **Check any website now** → enter your site. You get a score out of 60 in a few seconds.
2. **Start free audit** → sign up → add a brand with a real website, its type (business, political party…) and any other names → wait up to a minute.
3. **Audit**: four cards. "Live AI visibility" shows real ChatGPT and Claude results, with each question and its answer.
4. **Prompts**: Claude wrote 8 questions. **Activate all**, and try "Add your own prompt".
5. **Monitor → Run monitor now**: about a minute. Open the run and read the answers. "Sources AI answers cite" fills in.
6. In Vercel → **Logs**, filter by `event` (for example `audit.completed`, `monitor.completed`, `quick_check.completed`) to see each call. Errors appear as `level: "error"`.

## Part 5 — Before launching to customers

- **Your domain.** Vercel → **Settings → Domains → Add**, e.g. `clearcite.in`, and add the DNS records it shows at your registrar. Then:
  - set `NEXT_PUBLIC_SITE_URL=https://clearcite.in` in Vercel and redeploy;
  - in Supabase → URL Configuration, set the Site URL to the domain and add `https://clearcite.in/auth/callback`.
- **Email sign-up.** Turn **Confirm email** back on. Supabase's built-in email only sends a few messages an hour, so set up your own SMTP under **Authentication → Emails → SMTP Settings** (any transactional email provider).
- **Google sign-in** (optional):
  1. Create an OAuth client in Google Cloud Console → **APIs & Services → Credentials**, with the redirect URI `https://<project-ref>.supabase.co/auth/v1/callback`.
  2. In Supabase → **Sign In / Providers → Google**, paste the client ID and secret.
- **Contact email.** `hello@clearcite.in` in `src/config/site.ts` must be a real inbox, because every "Contact us" button uses it.
- **Plans.** Vercel's free Hobby plan is for non-commercial use, and Supabase's free projects pause after a week of inactivity. Move both to their paid plans for a customer-facing launch.
- **Mock mode.** Make sure `MOCK_AI_RESPONSES` and `ALLOW_MOCK_ON_PRODUCTION` are gone. `/api/health` must show `"mockMode": false`.

## Not built yet (by design for this MVP)

- **Online payments:** paid plans are set up by hand. "Contact us" emails you.
- **Scheduled monitoring:** runs are manual. `README.md` → "Scheduled monitoring" describes the cron hook to add.
- **Gemini and Perplexity** show "Not configured".
