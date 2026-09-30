import { expect, test } from "@playwright/test";
import { siteConfig } from "../src/config/site";

test("home page shows the brand and a signup CTA", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: siteConfig.name }).first()).toBeVisible();
  await page.getByRole("link", { name: "Start free audit" }).click();
  await expect(page).toHaveURL(/\/signup$/);
});

test("signup and login forms render", async ({ page }) => {
  await page.goto("/signup");
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
  await expect(page.getByLabel("Work email")).toBeVisible();
  await expect(page.getByRole("button", { name: "Create account" })).toBeVisible();

  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();
});

for (const path of ["/dashboard", "/onboarding", "/dashboard/brands/new"]) {
  test(`${path} redirects signed-out users to login`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(path)}`));
  });
}

test("health endpoint reports configuration without secrets", async ({ request }) => {
  const res = await request.get("/api/health");
  const body = await res.json();
  expect(body).toHaveProperty("providers.openai");
  expect(JSON.stringify(body)).not.toMatch(/sk-|placeholder/);
});
