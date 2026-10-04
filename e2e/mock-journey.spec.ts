/**
 * The AI half of the product, end to end, in mock mode: prompt generation,
 * live visibility, monitor runs — and that every simulated result is labelled.
 * Needs Supabase + E2E_FULL=1 + MOCK_AI_RESPONSES=1 (CI runs it as its own step).
 */
import { expect, test, type Page } from "@playwright/test";

test.skip(
  !process.env.E2E_FULL || process.env.MOCK_AI_RESPONSES !== "1",
  "Set E2E_FULL=1 and MOCK_AI_RESPONSES=1 with Supabase running",
);
test.describe.configure({ mode: "serial" });

const email = `qa-mock-${Date.now()}@example.com`;
const password = "e2e-password-123";
let brandUrl = "";

async function logIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test("audit runs a (mock) live visibility check and labels it", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/onboarding$/);

  await page.getByLabel("Brand name").fill("Kiranabooks");
  await page.getByLabel("Website").fill("http://127.0.0.1:4004");
  await page.getByRole("button", { name: "Add brand & run free audit" }).click();
  await expect(page).toHaveURL(/\/audit$/, { timeout: 60_000 });
  brandUrl = page.url().replace(/\/audit$/, "");

  await expect(page.getByRole("status").getByText(/Mock AI mode is on/)).toBeVisible();
  await expect(page.getByText("Mock mode: these answers are simulated")).toBeVisible();
  // Live visibility was measured, so no points are listed as unmeasured.
  await expect(page.getByText(/points weren't measured/)).toHaveCount(0);
  await expect(page.getByTitle(/Simulated answers/).first()).toBeVisible();
});

test("prompts were generated as drafts and can be activated", async ({ page }) => {
  await logIn(page);
  await page.goto(`${brandUrl}/prompts`);
  await expect(page.getByText("0 of 8 active")).toBeVisible();
  await page.getByRole("button", { name: "Activate all" }).click();
  await expect(page.getByText("8 of 8 active")).toBeVisible();
});

test("monitor run stores labelled mock results and shows them everywhere", async ({ page }) => {
  await logIn(page);
  await page.goto(`${brandUrl}/monitor`);
  await expect(page.getByText("8 active prompts × 2 engines = 16 answers per run")).toBeVisible();
  await page.getByRole("button", { name: "Run monitor now" }).click();

  await expect(page).toHaveURL(/\/monitor\/[0-9a-f-]{36}$/, { timeout: 90_000 });
  await expect(page.getByText("This run used mock mode")).toBeVisible();
  await expect(page.getByText(/mock-openai/).first()).toBeVisible();
  await expect(page.getByText(/mock-anthropic/).first()).toBeVisible();

  await page.getByRole("link", { name: "Back to Monitor" }).click();
  await expect(
    page.getByRole("heading", { name: /Latest run/ }).getByTitle(/Simulated answers/),
  ).toBeVisible();
  await expect(page.getByText("Run history")).toBeVisible();

  await page.goto(brandUrl);
  await expect(page.getByText("Mention rate, last run")).toBeVisible();
  await expect(page.getByTitle(/Simulated answers/).first()).toBeVisible();
});
