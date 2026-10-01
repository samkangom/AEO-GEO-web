/**
 * Full user journey against a real Supabase (local: `npx supabase start`).
 * Enable with E2E_FULL=1. Audits run against the local fixture sites, so no
 * internet or AI keys are needed.
 */
import { expect, test, type Page } from "@playwright/test";

test.skip(!process.env.E2E_FULL, "Set E2E_FULL=1 with Supabase running to run the full journey");
test.skip(process.env.MOCK_AI_RESPONSES === "1", "Mock mode has its own journey (mock-journey.spec.ts)");
test.describe.configure({ mode: "serial" });

const WELL_OPTIMISED = "http://127.0.0.1:4004";
const MINIMAL = "http://127.0.0.1:4002";
const password = "e2e-password-123";
const run = Date.now();
const userA = `qa-a-${run}@example.com`;
const userB = `qa-b-${run}@example.com`;
// With real AI keys the live check runs, so exact scores aren't asserted.
const AI_KEYS = !!(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY);
let firstBrandUrl = "";
let secondBrandUrl = "";

async function signUp(page: Page, email: string) {
  await page.goto("/signup");
  await page.getByLabel("Company name").fill("QA Co");
  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  // Local Supabase has email confirmation off, so we land on onboarding.
  await expect(page).toHaveURL(/\/onboarding$/);
}

async function addBrand(page: Page, name: string, url: string): Promise<string> {
  await page.getByLabel("Brand name").fill(name);
  await page.getByLabel("Website").fill(url);
  await page.getByRole("button", { name: "Add brand & run free audit" }).click();
  // A new brand lands on its audit results.
  await expect(page).toHaveURL(/\/dashboard\/[0-9a-f-]{36}\/audit$/, { timeout: 45_000 });
  return page.url().replace(/\/audit$/, "");
}

test("sign up, add a brand, and get an audit score", async ({ page }) => {
  await signUp(page, userA);
  firstBrandUrl = await addBrand(page, "Kiranabooks", WELL_OPTIMISED);

  await expect(page.getByRole("heading", { name: "Kiranabooks" })).toBeVisible();
  if (!AI_KEYS) {
    // Without AI keys the live check is reported as not configured, never estimated.
    await expect(page.getByRole("img", { name: "Score 60 out of 100" })).toBeVisible();
    await expect(page.getByText("40 of 100 points weren't measured")).toBeVisible();
    await expect(page.getByText(/^Not configured$/)).toBeVisible();
  }
});

test("overview shows the setup checklist and the Ads placeholder", async ({ page }) => {
  await logIn(page, userA);
  // A single-brand account goes straight to that brand's overview.
  await expect(page).toHaveURL(firstBrandUrl);
  await expect(page.getByText("Get set up")).toBeVisible();
  await expect(page.getByRole("link", { name: /Run your free AI-readiness audit/ })).toBeVisible();
  await expect(page.getByText("AI-readiness score")).toBeVisible();
  await page.getByRole("link", { name: /^Ads/ }).click();
  await expect(page.getByText("Coming soon")).toBeVisible();
});

test("prompts tab explains when Claude isn't configured", async ({ page }) => {
  test.skip(!!process.env.ANTHROPIC_API_KEY, "Only meaningful without an Anthropic key");
  await logIn(page, userA);
  await page.goto(`${firstBrandUrl}/prompts`);
  await expect(page.getByText("Prompt generation is not configured")).toBeVisible();
  await expect(page.getByRole("button", { name: "Generate prompts" })).toBeDisabled();
});

test("monitor tab explains what's needed before a run", async ({ page }) => {
  test.skip(AI_KEYS, "Only meaningful without AI keys");
  await logIn(page, userA);
  await page.goto(`${firstBrandUrl}/monitor`);
  await expect(page.getByText("No AI engines are configured")).toBeVisible();
  await expect(page.getByRole("button", { name: "Run monitor now" })).toBeDisabled();
  await expect(page.getByText("No monitor results yet")).toBeVisible();
});

test("re-run audit adds history", async ({ page }) => {
  await logIn(page, userA);
  await page.goto(`${firstBrandUrl}/audit`);
  await page.getByRole("button", { name: "Run audit again" }).click();
  await expect(page.getByText("Audit history")).toBeVisible({ timeout: 45_000 });
});

test("multiple brands and the switcher", async ({ page }) => {
  await logIn(page, userA);
  await page.goto("/dashboard/brands/new");
  secondBrandUrl = await addBrand(page, "Sharma Pumps", MINIMAL);
  if (!AI_KEYS) await expect(page.getByRole("img", { name: "Score 42 out of 100" })).toBeVisible();

  await page.getByRole("button", { name: "Sharma Pumps" }).click();
  await page.getByRole("menuitem", { name: "Kiranabooks" }).click();
  await expect(page).toHaveURL(firstBrandUrl);

  // With two brands, /dashboard is the agency overview.
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "All brands" })).toBeVisible();
  await page.getByRole("link", { name: /Sharma Pumps/ }).click();
  await expect(page).toHaveURL(secondBrandUrl);
});

test("edit and delete a brand", async ({ page }) => {
  await logIn(page, userA);
  await page.goto(`${firstBrandUrl}/settings`);
  await page.getByLabel(/Industry/).fill("Retail billing software");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();

  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete brand" }).click();
  await expect(page).toHaveURL(/\/dashboard\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: "Sharma Pumps" })).toBeVisible();
});

test("another user cannot open someone else's brand", async ({ page }) => {
  await signUp(page, userB);
  await page.goto(secondBrandUrl); // owned by user A
  await expect(page.getByText("Page not found")).toBeVisible();
  await expect(page.getByText("Sharma Pumps")).toHaveCount(0);
});

async function logIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}
