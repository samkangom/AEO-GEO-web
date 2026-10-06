# QA test plan

Manual checks for each release, grouped by feature. The ID goes in bug reports and PR descriptions. Items marked **(auto)** are also covered by automated tests, so re-check them manually only for a release candidate.

**Setup:** run locally (`docs/DEVELOPMENT.md` §1) with `AUDIT_ALLOW_PRIVATE_HOSTS=1` in `.env.local`, and `npm run fixtures` running in another terminal. Or use a preview deployment. First confirm `/api/health` shows `"supabase": "ok"`.

## Fixture sites (known expected results)

| Site | URL | Expected score | Why |
| --- | --- | --- | --- |
| well-optimised | http://127.0.0.1:4004 | **60** (25 / 20 / 15, live visibility not configured) | All checks pass. GPTBot is blocked, which must not cost points. |
| minimal | http://127.0.0.1:4002 | **42** (25 / 10 / 7) | No robots.txt (counts as allowed), LocalBusiness schema only, prices on the homepage. |
| blocked-bots | http://127.0.0.1:4001 | **0** | `Disallow: /` for all bots, JavaScript-only page. |
| server-errors | http://127.0.0.1:4003 | **No score** (stored as 0). Cards say "Couldn't check" / "Not measured". | robots.txt returns 503, homepage returns 403. |

These scores assume **no AI keys**, which makes Live AI visibility "Not configured" with "—" and no score. With keys set, the live check really asks ChatGPT and Claude about each fixture brand. The brands are fictional, so expect ~0 live points and roughly a minute per audit.

## Marketing pages

| ID | Steps | Expected |
| --- | --- | --- |
| MKT-1 (auto) | Open `/`. | Hero, How it works, What we check (40/25/20/15 pts, which is the real scoring model), Built for India, plans, FAQ, final CTA. Every "Start free audit" goes to /signup. |
| MKT-2 (auto) | Open `/pricing`. | Four plans: Free Audit ₹0, Starter ₹1,999, Growth ₹7,999, Agency ₹29,999, with "+ 18% GST" on paid plans. Features not built yet show "Coming soon". |
| MKT-3 (auto) | Click "Contact us" / "Contact sales". | Opens an email to the contact address with the plan name in the subject and a short form in the body. There is no payment form anywhere. |
| MKT-4 | Header at phone width (390 px). | Logo, Pricing, Log in and "Free audit" all fit. No horizontal scroll. |
| MKT-5 | The FAQ items on both pages. | Each opens and closes, by keyboard too (Tab to it, then Enter). |
| MKT-6 (auto) | `/robots.txt` and `/sitemap.xml`. | Marketing pages are allowed. `/dashboard`, `/onboarding`, `/api` and `/auth` are disallowed. The sitemap lists `/`, `/pricing`, `/signup` and `/login`, using NEXT_PUBLIC_SITE_URL when set. |
| MKT-7 | Dogfood: `AUDIT_ALLOW_PRIVATE_HOSTS=1 npm run audit -- http://127.0.0.1:3000 --site-only`. | Crawler access 25/25, structured data 20/20, content signals 11/15 (there's no About page). |
| MKT-8 | Logged in, open `/`, then click "Log in". | Redirected to the dashboard. |
| MKT-9 (auto) | On `/`, under "Check any website now", enter a site and click "Check now". | Scores out of 60 in a few seconds, with one fix per weak area and a "Get the full score" link to sign-up. No AI calls are made. A site that blocks us shows "No score". |
| MKT-10 | Run the check 6 times in 10 minutes from one network, with 6 different sites. | The 6th says to try again in a few minutes. Re-checking the same site within 15 minutes returns the saved result instantly. |
| MKT-11 (auto) | View source of `/pricing`. | JSON-LD with SoftwareApplication offers (INR, monthly, excluding GST) and FAQPage. |

## Auth

| ID | Steps | Expected |
| --- | --- | --- |
| AUTH-1 (auto) | Sign up with email + password (8+ characters). | Lands on "Add your first brand". A new row appears in `profiles`, with company name if one was entered. |
| AUTH-2 | Sign up with an email that's already registered. | A clear error. No crash. |
| AUTH-3 | Log out, then log in with a wrong password. | "Invalid login credentials". |
| AUTH-4 | Continue with Google (needs Google configured in Supabase). | Returns to the app signed in: onboarding for a new user, dashboard for an existing one. |
| AUTH-5 (auto) | While signed out, open `/dashboard`, `/onboarding` or a brand URL. | Redirected to `/login?next=…`. After login, lands on the requested page. |
| AUTH-6 | While signed in, open `/login`. | Redirected to the dashboard. |
| AUTH-7 | Production only, with email confirmation on: sign up. | "Check your email" message. The link in the email signs you in and opens onboarding. |

## Brands

| ID | Steps | Expected |
| --- | --- | --- |
| BRAND-1 (auto) | On onboarding, enter a name + fixture URL and submit. | The button shows "Checking your site…", then the brand's Audit tab with a score: in under ~30 s without AI keys, up to about a minute with them. |
| BRAND-2 | Enter URLs like `acme`, `localhost:3000`, `ftp://x.in`, or leave it blank. | Validation message. No brand is created. |
| BRAND-3 | Enter `example.in` (no https). | Saved as `https://example.in`. |
| BRAND-4 | Enter a domain that doesn't exist, e.g. `nosuchsite-qa-123.in`. | The brand is created and the audit page says "We couldn't find a website at…". |
| BRAND-5 (auto) | Add a second brand via the switcher → "Add brand". | Both appear in the switcher, and switching changes the page. |
| BRAND-6 (auto) | Settings: change the name and industry, then save. | "Saved." The header and switcher update. |
| BRAND-7 (auto) | Settings: delete a brand, cancel the confirm, then delete and confirm. | Cancel does nothing. Confirm removes the brand and goes to the remaining brand (or All brands if 2+ remain, or onboarding if none). |
| BRAND-8 | Open onboarding when you already have brands. | Redirected to the dashboard. |

## Audit

| ID | Steps | Expected |
| --- | --- | --- |
| AUD-1 (auto) | Audit each fixture site. | Scores match the table above. |
| AUD-2 | Read each card on `blocked-bots` as a non-technical user. | Every card has a plain yes/no/partly headline and one "Recommended fix". Crawler access shows the exact robots.txt lines to add. |
| AUD-3 | `well-optimised` | No "Recommended fix" on the three scored cards. The training-crawler line is informational (ⓘ), not a ✘. |
| AUD-4 | Top summary on any audit. | Says "40 of 100 points weren't measured…". The ring colour and headline match the measured score. |
| AUD-5 (auto) | Click "Run audit again". | The spinner shows, then the page refreshes. "Audit history" lists both runs, times in IST. |
| AUD-6 | Expand "Technical details" on each card. | Raw JSON is shown. Nothing secret is included. |
| AUD-7 | Real-site smoke: audit 3 real Indian B2B sites, e.g. razorpay.com, zoho.com/crm, a small local business. | Completes in under ~15 s. The results look plausible when compared to the site's actual robots.txt and page source. |
| AUD-8 | Mobile width (375 px). | Cards stack and nothing overflows horizontally. Long URLs wrap. |
| AUD-9 | Add `inc.in` as **Political party** with other names `INC, Congress party`. | "Public pricing" and "Product or Service schema" show ⓘ "Not applicable for a political party, so no points are lost". Summary says "(x of 3)". Fixes don't mention prices or buyers. On 4 Oct 2026, site checks scored 37 of the 60 measurable points. |
| AUD-10 | Add `www.bjp.org` as **Political party**. | From a cloud server the site answered HTTP 503 to every request on 4 Oct 2026. The audit header says "We couldn't load this website, so there's no score". Overview and All brands show "No score", not 0. From an office network the site may load and be scored normally. |
| AUD-13 | Audit history with one unreachable audit between two scored ones. | That row says "No score". The change column compares the scored audits either side of it. |
| AUD-14 (auto) | A homepage that shows ₹ figures that aren't prices (for example "Ad-GMV ₹ 0.0 Cr", "₹40 crore ad spend"). | Doesn't count as public pricing. "Plans from ₹499/month" or "pumps from Rs. 8,500" still count. |
| AUD-15 (auto) | A homepage whose text starts at `opacity:0` (scroll animations). With 40% or more of the words hidden, Content signals shows ✘ "Your homepage text is visible without waiting for animations … Not scored". | The score is unchanged. trailytics.ai showed about 75% hidden on 5 Oct 2026. |
| AUD-16 | Audit a brand twice or more. | The header says "Since your first audit on <date>: A → B (+N)". It isn't shown when either audit couldn't load the site. |
| AUD-17 (auto) | Audit a site whose homepage can't be loaded (the `server-errors` fixture, or bjp.org from a cloud server). | Live AI visibility shows "Not measured": the audit stopped before the live check, so no AI calls are made. |
| AUD-18 | Add a brand with Industry filled in, and type "Political party". | The brand header shows "site · Political party". For a business with an industry, it shows the industry. All brands shows "site · type" on each card. |
| AUD-11 | Change a brand's type to Political party in Settings, then regenerate prompts (needs Claude). | Questions are neutral and informational (positions, manifestos, funding, local offices). None asks who to vote for, and none contains the party's name or other names. The pricing group is labelled "Funding & membership". |
| AUD-12 (auto) | Other names. | An answer with "BJP" counts for a brand with other name `BJP`. "Acme Inc." doesn't count for other name `INC`. |

## Live AI visibility (needs at least one AI engine key)

| ID | Steps | Expected |
| --- | --- | --- |
| LIVE-1 | Add a real, well-known Indian B2B brand (e.g. a popular SaaS) with both keys set. | The audit finishes in about a minute. The card lists 5 quoted prompts, and each shows ChatGPT and Claude as mentioned / not mentioned, with list position and "links to your site" where true. |
| LIVE-2 | Open Technical details and read 2 answers. | Each "mentioned" matches the answer text. The model name is recorded and `web_search_used` is true. |
| LIVE-3 | Set only OPENAI_API_KEY. | Only ChatGPT is checked, and an info line says Claude isn't configured. The Prompts tab says generation isn't configured, and live visibility says a Claude key is needed unless the brand already has prompts. |
| LIVE-4 | Remove both keys. | "Not configured" with "—", and 40 points listed as not measured. No AI calls are made (confirm there are no `engine.*` log lines). |
| LIVE-5 | Set an invalid OPENAI_API_KEY. | ChatGPT rows say "couldn't check (OpenAI API key was rejected)". The score uses the other engines' answers only. |
| LIVE-6 | Set GEMINI_API_KEY and PERPLEXITY_API_KEY too, then run an audit. | Each prompt lists ChatGPT, Claude, Gemini and Perplexity. Gemini and Perplexity answers record their model, and their cited sites appear in the answer details. With only some keys set, an info line names the engines that weren't checked. |
| LIVE-7 | Gemini free tier: run several audits in a row. | If Google's free quota runs out, Gemini rows say "couldn't check (Gemini rate limit or free-tier quota reached…)" and aren't counted. Nothing is estimated. |

## Prompts

| ID | Steps | Expected |
| --- | --- | --- |
| PR-1 | After the first audit (with an Anthropic key), open the Prompts tab. | 8 draft prompts grouped by intent: English plus Hindi or Hinglish for each. None contains the brand name. The brand's Industry field has been filled in. |
| PR-2 | Edit a prompt and save. Then try saving text containing the brand name, then text under 8 characters. | The first saves. The others show a clear error. |
| PR-3 | Activate one prompt, then "Regenerate drafts". | The active prompt stays. The drafts are replaced with new ones. |
| PR-4 | "Activate all" / "Deactivate all". | Counts and badges update. |
| PR-5 (auto) | No Anthropic key. | "Prompt generation is not configured" and the button is disabled. |
| PR-6 | Activate prompts, then re-run the audit. | The live check prefers active prompts. The prompt text on the audit card matches. |
| PR-7 (auto, mock journey) | On Prompts, type your own question in "Add your own prompt", choose an intent and click "Add prompt". | It's saved as Active in that intent's group, and "N of M active" goes up. Hindi script is labelled Hindi, Roman-script Hindi (two or more Hindi words) Hinglish, everything else English. A question with the brand name or one of its other names is refused, and so is a duplicate. Editing a prompt re-detects its language. |

## Dashboard & navigation

| ID | Steps | Expected |
| --- | --- | --- |
| DASH-1 (auto) | Account with one brand: log in. | Lands on that brand's Overview. |
| DASH-2 (auto) | New brand, no monitor runs yet. | "Get set up" shows 3 steps, with completed ones ticked and struck through. The cards show clear empty states and no zeros. |
| DASH-3 | Brand with 2+ monitor runs. | Overview shows the score ring, the latest mention rate with "Up/Down N pts since <date>", per-engine rates, the last-run summary and the trend chart. Every "View …" link opens the right page. |
| DASH-4 (auto) | Add a second brand, then open /dashboard. | "All brands" shows a card per brand with score, mention rate or "Not monitored yet". The switcher has an "All brands" item. |
| DASH-5 (auto) | Ads tab. | "Coming soon" page. Nothing is purchasable. "Ask about early access" opens an email. |
| DASH-6 | Phone width: Overview and the navigation. | The sidebar sits above the page, its section links scroll sideways, cards stack, and chart date labels don't overlap. |
| DASH-7 | Open a run detail page. | The Monitor tab stays highlighted. |
| DASH-8 | Slow network (DevTools → Slow 3G), then switch sections in the sidebar. | A loading skeleton shows instead of a blank page. |

## Monitor (needs AI keys and active prompts)

| ID | Steps | Expected |
| --- | --- | --- |
| MON-1 (auto) | No AI keys: open the Monitor tab. | Explains that no engines are configured. "Run monitor now" is disabled. Shows "No monitor results yet". |
| MON-2 | With keys and 0 active prompts. | Says to activate a prompt on the Prompts tab first. The button is disabled. |
| MON-3 | Activate 4 prompts and click "Run monitor now". | The button shows progress. Within about 1–2 minutes it opens the run's detail page with 8 answers, each showing mentioned or not, position, "links to your site" where true, sentiment on mentions, and the model name. |
| MON-4 | Back on the Monitor tab. | Stat tiles show the latest run. The chart shows a point per engine. Run history shows the run with per-engine percentages that match the detail page. |
| MON-5 | Run it twice more. | The chart draws lines, and hover shows each engine's value "of N". |
| MON-6 | Double-click "Run monitor now", or run it in two tabs. | The second attempt says a run is already in progress. |
| MON-7 | Break one key (invalid OPENAI_API_KEY) and run. | That engine's rows say "Call failed … not counted". The rates use only answers received, and the history's "Failed calls" column counts them. |
| MON-8 | Activate more than 20 prompts. | Clear message about the 20-prompt limit. The button is disabled. |
| MON-9 | Phone width (390 px). | Tiles are 2 per row, the chart fits, and the history table scrolls inside its card. |
| MON-10 | After a run, read "Sources AI answers cite". | Domains are ranked by how many answers cited them (each answer counted once per domain). Your own site is marked "Your site". Other rows say how many of those answers mentioned you. Failed calls are left out. |
| MON-11 | Monitor tab on a deployment without `CRON_SECRET` or `SUPABASE_SERVICE_ROLE_KEY`. | "Scheduled weekly monitoring" shows "Not set up" and explains why. |
| MON-12 | With both set: the panel shows "On" and when the next run is due. Click "Turn off", then "Turn on". | The badge switches to "Off" and back. The setting persists after a reload. |
| MON-13 | `curl -H "Authorization: Bearer $CRON_SECRET" <site>/api/cron/monitor` for a brand with active prompts and no run this week. | The response lists the brand under `started`. About a minute later, a run labelled "Scheduled" appears in the run history. Calling it again immediately starts nothing (`started: []`). |
| MON-14 (auto) | `curl <site>/api/cron/monitor` with no or a wrong `Authorization` header. | 401 `unauthorized` (503 `not_configured` when CRON_SECRET isn't set). No run is started. |

## Mock mode & demo data

| ID | Steps | Expected |
| --- | --- | --- |
| MOCK-1 | `npm run seed:demo`, then log in as demo@clearcite.local. | "All brands" shows 2 brands, each with a Mock badge. Each brand has an audit history (2), 8 prompts (4 active) and 6 weekly runs in the chart. |
| MOCK-2 (auto) | With `MOCK_AI_RESPONSES=1`, add a brand. | An amber "Mock AI mode is on" banner on every dashboard page. The audit's Live AI visibility card and score are badged Mock, and the first line says the answers are simulated. |
| MOCK-3 (auto) | Mock mode: activate prompts and run the monitor. | The run page says "This run used mock mode". Each answer shows Mock and the `mock-openai` / `mock-anthropic` model, and starts with "[Mock response …]". Only "Example Vendor" placeholder names appear. |
| MOCK-4 | Turn mock mode off and refresh. | No banner. Old mock runs and audits keep their Mock badges. New runs need real keys or show "not configured". |
| MOCK-5 | Production build: `MOCK_AI_RESPONSES=1 npm run build && npm start` (not on Vercel). | Mock mode is ignored: no banner, and `/api/health` shows `"mockMode": false`. Adding `ALLOW_MOCK_ON_PRODUCTION=1` turns it on deliberately (for test links only). |
| MOCK-6 | `npm run seed:demo` against a cloud Supabase URL. | Refuses unless `--allow-remote` is passed. |

## Security

| ID | Steps | Expected |
| --- | --- | --- |
| SEC-1 (auto) | As user B, open user A's brand URL (`/dashboard/<A's brand id>`). | "Page not found". Nothing of A's is visible. |
| SEC-2 (auto) | `npm run test:db` | "RLS tests passed". |
| SEC-3 | Without `AUDIT_ALLOW_PRIVATE_HOSTS`, add a brand with `http://127.0.0.1:4004` or `http://169.254.169.254`. | "Private network addresses can't be audited". |
| SEC-4 | Log in via `/login?next=//evil.com`. | Lands on `/dashboard`, never on an external site. |
| SEC-5 | `/api/health` | Only true/false for each key. No key values are shown. |
| SEC-6 (auto) | In the landing check, enter `http://169.254.169.254/latest/meta-data`, a private IP, or a public name that resolves to one (e.g. `127.0.0.1.nip.io`). | Refused: "Private network addresses can't be audited". Each connection's IP is checked at connect time, so DNS rebinding can't reach internal hosts. |
| SEC-7 | `curl -I https://<your-domain>/`. | X-Frame-Options DENY, CSP `frame-ancestors 'none'`, X-Content-Type-Options nosniff, Referrer-Policy and Permissions-Policy are present. |
| SEC-8 | `npm audit --omit=dev`. | 0 vulnerabilities in production dependencies. Dev-only findings (Tailwind/ESLint via `braces`) have no fix yet and don't ship. |
| A11Y-1 (auto) | Public pages through axe (WCAG 2.1 AA). | No serious or critical violations. Primary buttons use accent-dark (white text 6.5:1); muted text is navy-300 (5.4:1 on white). |

## Reporting a bug

Use the GitHub "Bug report" template. Always include:

- the ID from this plan, if there is one
- the commit (from `/api/health`)
- the brand ID (from the URL)
- the `Ref:` code, if you saw the error page

For score disputes, attach `npm run audit -- <site> --json`.
