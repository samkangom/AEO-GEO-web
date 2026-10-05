import { expect, test } from "@playwright/test";
import { siteConfig } from "../src/config/site";

test("home page shows the brand and a signup CTA", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: siteConfig.name }).first()).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.getByRole("banner").getByRole("link", { name: "Start free audit" }).click();
  await expect(page).toHaveURL(/\/signup$/);
});

test("pricing page lists the four INR plans with signup / contact CTAs and no payment form", async ({
  page,
}) => {
  await page.goto("/pricing");
  for (const [name, price] of [
    ["Free Audit", "₹0"],
    ["Starter", "₹1,999"],
    ["Growth", "₹7,999"],
    ["Agency", "₹29,999"],
  ]) {
    const card = page.locator("div", { has: page.getByRole("heading", { name, exact: true }) }).last();
    await expect(card.getByText(price, { exact: true })).toBeVisible();
  }
  const main = page.getByRole("main");
  await expect(main.getByRole("link", { name: "Start free audit" })).toHaveAttribute("href", "/signup");
  for (const link of await main.getByRole("link", { name: /^Contact (us|sales)$/ }).all()) {
    await expect(link).toHaveAttribute("href", /^mailto:/);
  }
  await expect(page.locator("input, form")).toHaveCount(0);
});

test("landing page carries structured data; robots.txt keeps the app private", async ({ page, request }) => {
  await page.goto("/");
  const types = await page
    .locator('script[type="application/ld+json"]')
    .evaluateAll((els) => els.map((e) => e.textContent ?? "").join(" "));
  for (const t of ["Organization", "SoftwareApplication", "FAQPage", "INR"]) expect(types).toContain(t);

  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /dashboard");
  expect(robots).not.toMatch(/Disallow: \/\s*$/m);
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

test("landing page: no-sign-up site check scores a site out of 60", async ({ page }) => {
  await page.goto("/#check");
  await page.getByLabel("Website to check").fill("http://127.0.0.1:4002");
  await page.getByRole("button", { name: "Check now" }).click();
  const result = page.getByRole("heading", { name: "127.0.0.1:4002" });
  await expect(result).toBeVisible({ timeout: 45_000 });
  // The "minimal" fixture: 25 crawler + 10 structured + 7 content.
  await expect(page.getByText("42 of 60 site points")).toBeVisible();
  await expect(page.getByRole("link", { name: /Get the full score/ })).toHaveAttribute("href", "/signup");
});

test("pricing page carries plan offers and FAQ as structured data", async ({ page }) => {
  await page.goto("/pricing");
  const ld = await page
    .locator('script[type="application/ld+json"]')
    .evaluateAll((els) => els.map((e) => e.textContent ?? "").join(" "));
  for (const t of ["SoftwareApplication", "Offer", "FAQPage", "1999", "INR"]) expect(ld).toContain(t);
});

test("public pages have no serious accessibility violations", async ({ page }) => {
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  for (const path of ["/", "/pricing", "/signup", "/login"]) {
    await page.goto(path);
    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    const serious = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(
      serious.map(
        (v) =>
          `${path}: ${v.id} — ${v.nodes
            .map((n) => n.target.join(" "))
            .slice(0, 3)
            .join(", ")}`,
      ),
    ).toEqual([]);
  }
});
