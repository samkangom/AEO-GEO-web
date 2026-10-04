# Get a test link (Supabase + Vercel)

About 15 minutes, no installs, free plans. You'll end up with a URL like
`https://aeo-geo-web.vercel.app` that anyone can open and sign up on.

## Part 1 — Database (Supabase)

1. Go to **supabase.com** → **Start your project** → sign in with GitHub.
2. **New project**: name `clearcite`, choose a strong database password (save it), region **Mumbai (ap-south-1)** → **Create new project**. Wait ~2 minutes until it says the project is ready.
3. Left menu → **SQL Editor** → **New query**. Paste the whole of `clearcite-database-setup.sql` (all files in `supabase/migrations/`, in order) → **Run**. You should see "Success. No rows returned". Set up before 4 Oct 2026? Run only `supabase/migrations/20261004000000_org_kind_aliases.sql` (adds the organisation type and other names).
4. Left menu → **Authentication** → **Sign In / Providers** → **Email** → turn **Confirm email** **off** → **Save**. (Testers can then sign up without checking email.)
5. Left menu → **Project Settings** → **API Keys** (or **Data API**) and copy two values into a notepad:
   - **Project URL** — like `https://abcdefgh.supabase.co`
   - **anon public** key — under "Legacy API keys" (a long `eyJ…` value). The newer **publishable** key (`sb_publishable_…`) also works.

## Part 2 — App (Vercel)

6. Go to **vercel.com** → **Sign Up** → **Continue with GitHub**.
7. **Add New…** → **Project** → find **aeo-geo-web** → **Import**.
   If it isn't listed: **Adjust GitHub App Permissions** → allow access to `samkangom/aeo-geo-web` → back to Vercel.
8. On the **Configure Project** screen leave everything as is, open **Environment Variables**, and add:

   | Key | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL from step 5 |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key from step 5 |
   | `MOCK_AI_RESPONSES` | `1` |
   | `ALLOW_MOCK_ON_PRODUCTION` | `1` |

   The last two give simulated AI answers (labelled "Mock") so you can test without AI keys or cost.
   To see **real** ChatGPT/Claude results instead, leave those two out and add `OPENAI_API_KEY` and `ANTHROPIC_API_KEY`.
9. **Deploy**. Wait 2–3 minutes for "Congratulations!". Click the preview to open your link and copy its address (e.g. `https://aeo-geo-web.vercel.app`).
   If the build fails mentioning `maxDuration`: **Settings → Functions → Fluid Compute → Enable**, then **Deployments → ⋯ → Redeploy**.

## Part 3 — Connect them

10. Back in Supabase → **Authentication** → **URL Configuration**:
    - **Site URL**: your Vercel address
    - **Redirect URLs** → **Add URL**: `<your Vercel address>/auth/callback` → **Save**
11. Check it: open `<your Vercel address>/api/health`. You want `"ok": true`, `"supabase": "ok"` and `"mockMode": true`.

## Try it

1. Open your link → **Start free audit** → sign up with any email and a password (8+ characters).
2. Add a brand with a **real website** (e.g. your own) → wait up to a minute → read the score card.
3. **Prompts** tab → **Activate all**.
4. **Monitor** tab → **Run monitor now** → open the run, expand **Show answer**.
5. **Overview** tab for the summary; add a second brand to see **All brands**.

Everything simulated shows a yellow **Mock** badge and a banner. Website checks (crawler access, structured data, content) are always real.

## Before real launch

Remove `MOCK_AI_RESPONSES` and `ALLOW_MOCK_ON_PRODUCTION`, add the real AI keys, and set the contact email in `src/config/site.ts`.
Google sign-in: Supabase → Authentication → Sign In / Providers → Google (needs a Google Cloud OAuth client).
