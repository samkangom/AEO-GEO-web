# Deploy ClearCite for internal testing (Supabase + Vercel)

This takes you from nothing to a fully working app your team can test, in about an hour, all in the browser.

**What testers get:** every feature, with no billing, paywall or plan limits:
- the audit;
- prompts;
- the monitor on ChatGPT, Claude, Gemini and Perplexity;
- scheduled weekly monitoring;
- multiple brands.

The pricing page is for show only. Nobody is asked to pay.

**What costs money:** only AI answers, charged by each AI provider for its own API. Vercel and Supabase are free on their free plans. Pick what fits your test:

| Option | Cost | What you get |
| --- | --- | --- |
| Mock mode | Free | Simulated answers labelled "Mock" everywhere. Good for clicking through every screen. |
| Gemini only | Free tier (Google's daily quota) | Real Gemini answers. You add the test questions yourself, because Claude writes them. |
| All four engines | Pay-as-you-go credit with OpenAI, Anthropic and Perplexity; Gemini free tier | The full product. A small budget (for example $10–20 per provider) covers a testing round. |

Parts 1–3 give you a working link. Part 4 adds real AI answers. Part 5 turns on the weekly schedule.

## Part 1 — Database (Supabase, free plan)

1. Go to **supabase.com** → **Start your project** → sign in with GitHub.
2. **New project**:
   - name `clearcite`;
   - a strong database password (save it);
   - region **Mumbai (ap-south-1)**.

   Then **Create new project**, and wait about 2 minutes.
3. Left menu → **SQL Editor** → **New query**. Paste the whole of `clearcite-database-setup.sql` (every file in `supabase/migrations/`, in order) → **Run**. You should see "Success. No rows returned".
   - Already set up before 4 Oct 2026? Run `20261004000000_org_kind_aliases.sql`, then `20261006000000_scheduled_monitoring.sql`.
   - Set up between 4 and 6 Oct 2026? Run only `supabase/migrations/20261006000000_scheduled_monitoring.sql`.
4. **Authentication → Sign In / Providers → Email**: turn **Confirm email** off → **Save**. Testers can then sign up without waiting for an email.
5. **Project Settings → API Keys**. Copy:
   - **Project URL**, e.g. `https://abcdefgh.supabase.co`;
   - **anon public** key, under "Legacy API keys", e.g. `eyJ…`. The newer **publishable** key (`sb_publishable_…`) also works;
   - **service_role** key, under "Legacy API keys", or the newer **secret** key (`sb_secret_…`).

   The service_role key bypasses all security rules, so keep it secret:
   - put it only in `SUPABASE_SERVICE_ROLE_KEY` in Vercel (Part 2), and mark it **Sensitive**;
   - never put it in a variable starting with `NEXT_PUBLIC_`;
   - never share it.

   Only the weekly schedule uses it.

## Part 2 — App (Vercel, free Hobby plan)

6. **vercel.com** → **Sign Up** → **Continue with GitHub**.
7. **Add New… → Project** → **aeo-geo-web** → **Import**. If it isn't listed: **Adjust GitHub App Permissions** → allow `samkangom/aeo-geo-web`.
8. Under **Environment Variables**, add:

   | Key | Value | Needed for |
   | --- | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL from step 5 | Everything |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key from step 5 | Everything |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role key from step 5 (tick **Sensitive**) | Weekly schedule |
   | `CRON_SECRET` | any long random text, at least 32 characters (a password manager can generate one) | Weekly schedule |
   | `OPENAI_API_KEY` | from Part 4 | ChatGPT answers |
   | `ANTHROPIC_API_KEY` | from Part 4 | Claude answers, writing test questions, sentiment |
   | `GEMINI_API_KEY` | from Part 4 | Gemini answers |
   | `PERPLEXITY_API_KEY` | from Part 4 | Perplexity answers |

   - Add only the AI keys you have. Each engine joins when its key is set; the others show "Not configured", never a made-up result. You can add keys later.
   - No AI keys at all and you just want to click around? Add `MOCK_AI_RESPONSES=1` and `ALLOW_MOCK_ON_PRODUCTION=1`. Answers are then simulated and labelled "Mock" everywhere. Remove both once you add real keys.
9. **Deploy** and wait 2–3 minutes. Copy your address, e.g. `https://aeo-geo-web.vercel.app`.
   - If the build mentions `maxDuration`:
     1. **Settings → Functions → Fluid Compute → Enable**.
     2. **Deployments → ⋯ → Redeploy**.

     Audits and monitor runs need up to 300 seconds.

## Part 3 — Connect them

10. Supabase → **Authentication → URL Configuration**:
    1. **Site URL**: your Vercel address.
    2. **Redirect URLs → Add URL**: `<your address>/auth/callback` → **Save**.
11. Open `<your address>/api/health`. You want:
    - `"ok": true` and `"supabase": "ok"`;
    - `"providers"`: `true` for each AI key you added;
    - `"scheduledMonitoring": true` (both schedule variables set);
    - `"mockMode": false` when using real keys.

## Part 4 — Real AI answers

Add the keys in Vercel (**Settings → Environment Variables**), then **Deployments → ⋯ → Redeploy** so they take effect.

12. **Gemini** (free tier). Go to **aistudio.google.com** → **Get API key** → **Create API key**, then paste it as `GEMINI_API_KEY`. No card is needed.
    - The free tier has a daily limit. When it runs out, Gemini rows say "couldn't check (… free-tier quota reached)" and aren't counted.
    - Google may use free-tier requests to improve its products. Turn on billing in Google AI Studio if that matters for your test.
13. **OpenAI**:
    1. **platform.openai.com → Billing**: add a payment method and credit.
    2. **API keys → Create new secret key**, then paste it as `OPENAI_API_KEY`.
14. **Anthropic**:
    1. **console.anthropic.com → Billing**: add credit.
    2. **API Keys → Create Key**, then paste it as `ANTHROPIC_API_KEY`.
    - Claude also writes each brand's 8 test questions. Without this key, testers add their own questions on the **Prompts** tab, then run the audit again.
    - Claude answers use the web search tool. If the Claude rows say web search isn't enabled, an admin can switch it on in the Console's organisation settings.
15. **Perplexity**:
    1. **perplexity.ai → Settings → API**: add credit.
    2. **Generate API key**, then paste it as `PERPLEXITY_API_KEY`.
16. **Set spending limits** in each paid console: a monthly budget plus an email alert.
    - Each audit makes 5 web-search answers per engine (20 with all four), plus one question-writing call the first time.
    - Each monitor run makes (active prompts × engines) answers, at most 20 prompts.
    - To lower Claude's cost, set `ANTHROPIC_MODEL` to a smaller model. The default is `claude-opus-5-5`.

## Part 5 — Scheduled weekly monitoring

17. With `SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET` set and redeployed, Vercel runs a daily check at about 9:00 IST. You can see it under **Settings → Cron Jobs**. That check starts a monitor run for every brand that meets all of these:
    - its schedule is **On** (Monitor tab; on by default);
    - it has 1–20 active prompts;
    - it hasn't had a run in the past 7 days.

    Up to 10 brands start each day.
18. To try it now, run this in a terminal (Mac/Linux, or Windows PowerShell with `curl.exe`), using your secret and address:
    ```
    curl -H "Authorization: Bearer <CRON_SECRET>" https://<your address>/api/cron/monitor
    ```
    The brand appears under `"started"`. About a minute later, a run labelled **Scheduled** shows in the Monitor tab's run history.

## Check it works (15 minutes)

1. Open your address → **Check any website now** → enter your site. You get a score out of 60 in a few seconds.
2. **Start free audit** → sign up → add a brand with:
   - a real website;
   - its type (business, political party…);
   - any other names.

   Then wait up to two minutes.
3. **Audit**: four cards. "Live AI visibility" shows the real answers from each engine you added, with each question and its answer.
4. **Prompts**: Claude wrote 8 questions. **Activate all**, and try "Add your own prompt".
5. **Monitor**:
   1. Click **Run monitor now** and wait a minute or two.
   2. Open the run and read the answers. "Sources AI answers cite" fills in.
   3. The "Scheduled weekly monitoring" panel says **On** and when the next run is due.
6. In Vercel → **Logs**, filter by `event` to see each call. For example:
   - `audit.completed`, `monitor.completed` and `quick_check.completed`;
   - `cron.monitor.dispatched` for the daily check.

   Errors appear as `level: "error"`.

## Inviting testers

- Share your address. Anyone with the link can sign up.
- To keep testing private once your testers have accounts, turn off **Allow new users to sign up** (Supabase → **Authentication → Sign In / Providers**).
- To add a person after that, use **Authentication → Users → Invite user**. Invites need email, which works on Supabase's built-in sender for a handful of messages an hour.

## Free-plan limits to know

- **Supabase** pauses a free project after a week with no activity. Open the app, or click **Restore** in Supabase, to wake it.
- **Vercel Hobby** is for non-commercial use, which covers internal testing. Its cron runs once a day and may start up to an hour late.

## Before launching to customers (later)

- **Domain.** Add your own domain:
  1. Vercel → **Settings → Domains → Add**, then add the DNS records it shows at your registrar.
  2. Set `NEXT_PUBLIC_SITE_URL` to the domain and redeploy.
  3. In Supabase → URL Configuration, update the Site URL and add `<domain>/auth/callback`.
- **Email sign-up.** Turn **Confirm email** back on, and set up SMTP under **Authentication → Emails → SMTP Settings**.
- **Google sign-in** (optional):
  1. Create an OAuth client in Google Cloud Console, with the redirect URI `https://<project-ref>.supabase.co/auth/v1/callback`.
  2. Paste its client ID and secret into Supabase → **Sign In / Providers → Google**.
- **Contact email.** `hello@clearcite.in` in `src/config/site.ts` must be a real inbox.
- **Plans.** Move Vercel and Supabase to paid plans for a customer-facing launch.
- **Mock mode.** Make sure `MOCK_AI_RESPONSES` and `ALLOW_MOCK_ON_PRODUCTION` are gone.
- **Billing and paywall.** Not built, by choice for internal testing. Plan limits aren't enforced and there's no online payment.

## Not built yet

- **Online payments and plan limits.** Left out on purpose for internal testing.
- **ChatGPT Ads.** The Ads tab says "Coming soon". It needs access to an ads platform's API, and nothing in it is simulated.
