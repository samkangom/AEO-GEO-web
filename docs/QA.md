# QA test plan

Manual checks for each release, grouped by feature. The ID goes in bug reports and PR descriptions. Items marked **(auto)** are also covered by automated tests, so re-check them manually only for a release candidate.

**Setup:** run locally (`docs/DEVELOPMENT.md` §1) with `AUDIT_ALLOW_PRIVATE_HOSTS=1` in `.env.local`, and `npm run fixtures` running in another terminal. Or use a preview deployment. First confirm `/api/health` shows `"supabase": "ok"`.

## Fixture sites (known expected results)

| Site | URL | Expected score | Why |
| --- | --- | --- | --- |
| well-optimised | http://127.0.0.1:4004 | **60** (25 / 20 / 15, live visibility not configured) | All checks pass. GPTBot is blocked, which must not cost points. |
| minimal | http://127.0.0.1:4002 | **42** (25 / 10 / 7) | No robots.txt (counts as allowed), LocalBusiness schema only, prices on the homepage. |
| blocked-bots | http://127.0.0.1:4001 | **0** | `Disallow: /` for all bots, JavaScript-only page. |
| server-errors | http://127.0.0.1:4003 | **0**, and cards say "Couldn't check" | robots.txt returns 503, homepage returns 403. |

These scores assume **no AI keys**, which makes Live AI visibility "Not configured" with "—" and no score. With keys set, the live check really asks ChatGPT and Claude about each fixture brand. The brands are fictional, so expect ~0 live points and roughly a minute per audit.

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
| BRAND-1 (auto) | On onboarding, enter a name + fixture URL and submit. | The button shows "Checking your site…", then the audit page with a score, in under ~30 s. |
| BRAND-2 | Enter URLs like `acme`, `localhost:3000`, `ftp://x.in`, or leave it blank. | Validation message. No brand is created. |
| BRAND-3 | Enter `example.in` (no https). | Saved as `https://example.in`. |
| BRAND-4 | Enter a domain that doesn't exist, e.g. `nosuchsite-qa-123.in`. | The brand is created and the audit page says "We couldn't find a website at…". |
| BRAND-5 (auto) | Add a second brand via the switcher → "Add brand". | Both appear in the switcher, and switching changes the page. |
| BRAND-6 (auto) | Settings: change the name and industry, then save. | "Saved." The header and switcher update. |
| BRAND-7 (auto) | Settings: delete a brand, cancel the confirm, then delete and confirm. | Cancel does nothing. Confirm removes the brand and goes to the remaining brand, or to onboarding if none are left. |
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

## Live AI visibility (needs OPENAI_API_KEY and/or ANTHROPIC_API_KEY)

| ID | Steps | Expected |
| --- | --- | --- |
| LIVE-1 | Add a real, well-known Indian B2B brand (e.g. a popular SaaS) with both keys set. | The audit finishes in about a minute. The card lists 5 quoted prompts, and each shows ChatGPT and Claude as mentioned / not mentioned, with list position and "links to your site" where true. |
| LIVE-2 | Open Technical details and read 2 answers. | Each "mentioned" matches the answer text. The model name is recorded and `web_search_used` is true. |
| LIVE-3 | Set only OPENAI_API_KEY. | Only ChatGPT is checked, and an info line says Claude isn't configured. The Prompts tab says generation isn't configured, and live visibility says a Claude key is needed unless the brand already has prompts. |
| LIVE-4 | Remove both keys. | "Not configured" with "—", and 40 points listed as not measured. No AI calls are made (confirm there are no `engine.*` log lines). |
| LIVE-5 | Set an invalid OPENAI_API_KEY. | ChatGPT rows say "couldn't check (OpenAI API key was rejected)". The score uses the Claude answers only. |

## Prompts

| ID | Steps | Expected |
| --- | --- | --- |
| PR-1 | After the first audit (with an Anthropic key), open the Prompts tab. | 8 draft prompts grouped by intent: English plus Hindi or Hinglish for each. None contains the brand name. The brand's Industry field has been filled in. |
| PR-2 | Edit a prompt and save. Then try saving text containing the brand name, then text under 8 characters. | The first saves. The others show a clear error. |
| PR-3 | Activate one prompt, then "Regenerate drafts". | The active prompt stays. The drafts are replaced with new ones. |
| PR-4 | "Activate all" / "Deactivate all". | Counts and badges update. |
| PR-5 (auto) | No Anthropic key. | "Prompt generation is not configured" and the button is disabled. |
| PR-6 | Activate prompts, then re-run the audit. | The live check prefers active prompts. The prompt text on the audit card matches. |

## Monitor (needs AI keys and active prompts)

| ID | Steps | Expected |
| --- | --- | --- |
| MON-1 (auto) | No AI keys: open the Monitor tab. | Explains that no engines are configured. "Run monitor now" is disabled. Shows "No monitor results yet". |
| MON-2 | With keys and 0 active prompts. | Says to activate a prompt on the Prompts tab first. The button is disabled. |
| MON-3 | Activate 4 prompts and click "Run monitor now". | The button shows progress. Within about 1–2 minutes it opens the run's detail page with 8 answers, each showing mentioned or not, position, "links to your site" where true, sentiment on mentions, and the model name. |
| MON-4 | Back on the Monitor tab. | Stat tiles show the latest run. The chart shows a point per engine. Run history shows the run with per-engine percentages that match the detail page. |
| MON-5 | Run it twice more. | The chart draws lines, and hover shows each engine's value "of N". |
| MON-6 | Double-click "Run monitor now", or run it in two tabs. | The second attempt says a run is already in progress. |
| MON-7 | Break one key (invalid OPENAI_API_KEY) and run. | That engine's rows say "Couldn't check: …". The rates use only answers received, and history shows "(+N failed)". |
| MON-8 | Activate more than 20 prompts. | Clear message about the 20-prompt limit. The button is disabled. |
| MON-9 | Phone width (390 px). | Tiles are 2 per row, the chart fits, and the history table scrolls inside its card. |

## Security

| ID | Steps | Expected |
| --- | --- | --- |
| SEC-1 (auto) | As user B, open user A's brand URL (`/dashboard/<A's brand id>`). | "Page not found". Nothing of A's is visible. |
| SEC-2 (auto) | `npm run test:db` | "RLS tests passed". |
| SEC-3 | Without `AUDIT_ALLOW_PRIVATE_HOSTS`, add a brand with `http://127.0.0.1:4004` or `http://169.254.169.254`. | "Private network addresses can't be audited". |
| SEC-4 | Log in via `/login?next=//evil.com`. | Lands on `/dashboard`, never on an external site. |
| SEC-5 | `/api/health` | Only true/false for each key. No key values are shown. |

## Reporting a bug

Use the GitHub "Bug report" template. Always include:

- the ID from this plan, if there is one
- the commit (from `/api/health`)
- the brand ID (from the URL)
- the `Ref:` code, if you saw the error page

For score disputes, attach `npm run audit -- <site> --json`.
