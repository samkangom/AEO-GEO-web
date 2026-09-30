/**
 * Full user journey against a real Supabase (local: `npx supabase start`).
 * Enable with E2E_FULL=1. Audits run against the local fixture sites, so no
 * internet or AI keys are needed.
 */
import { expect, test, type Page } from "@playwright/test";

test.skip(!process.env.E2E_FULL, "Set E2E_FULL=1 with Supabase running to run the full journey");
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

async function addBrand(page: Page, name: string, url: string) {
  await page.getByLabel("Brand name").fill(name);
  await page.getByLabel("Website").fill(url);
  await page.getByRole("button", { name: "Add brand & run free audit" }).click();
  await expect(page).toHaveURL(/\/dashboard\/[0-9a-f-]{36}$/, { timeout: 45_000 });
}

test("sign up, add a brand, and get an audit score", async ({ page }) => {
  await signUp(page, userA);
  await addBrand(page, "Kiranabooks", WELL_OPTIMISED);
  firstBrandUrl = page.url();

  await expect(page.getByRole("heading", { name: "Kiranabooks" })).toBeVisible();
  if (!AI_KEYS) {
    // Without AI keys the live check is reported as not configured, never estimated.
    await expect(page.getByRole("img", { name: "Score 60 out of 100" })).toBeVisible();
    await expect(page.getByText("40 of 100 points weren't measured")).toBeVisible();
    await expect(page.getByText(/^Not configured$/)).toBeVisible();
  }
});

test("prompts tab explains when Claude isn't configured", async ({ page }) => {
  test.skip(!!process.env.ANTHROPIC_API_KEY, "Only meaningful without an Anthropic key");
  await logIn(page, userA);
  await page.goto(`${firstBrandUrl}/prompts`);
  await expect(page.getByText("Prompt generation is not configured")).toBeVisible();
  await expect(page.getByRole("button", { name: "Generate prompts" })).toBeDisabled();
});

test("re-run audit adds history", async ({ page }) => {
  await logIn(page, userA);
  await page.goto(firstBrandUrl);
  await page.getByRole("button", { name: "Run audit again" }).click();
  await expect(page.getByText("Audit history")).toBeVisible({ timeout: 45_000 });
});

test("multiple brands and the switcher", async ({ page }) => {
  await logIn(page, userA);
  await page.goto("/dashboard/brands/new");
  await addBrand(page, "Sharma Pumps", MINIMAL);
  if (!AI_KEYS) await expect(page.getByRole("img", { name: "Score 42 out of 100" })).toBeVisible();
  secondBrandUrl = page.url();

  await page.getByRole("button", { name: "Sharma Pumps" }).click();
  await page.getByRole("menuitem", { name: "Kiranabooks" }).click();
  await expect(page).toHaveURL(firstBrandUrl);
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
