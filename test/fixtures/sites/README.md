# Fixture sites

Tiny static websites used by the audit integration tests (`test/audit.integration.test.ts`)
and for manual QA (`npm run fixtures`). Each folder is served as its own origin.

- `/` serves `index.html`, `/about` serves `about/index.html`, etc.
- A missing file returns 404.
- `_responses.json` (optional) overrides a path's status, e.g. `{"/robots.txt": {"status": 503}}`.

To reproduce a bug from a real site, save its `robots.txt` and homepage HTML into a new
folder here and add an expectation to the integration test.
