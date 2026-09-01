import { test, expect } from "@playwright/test";

test("a new visitor is sent to the age gate", async ({ page }) => {
  // The root route holds no branching - it asks lib/onboarding/rules.ts where
  // this visitor belongs. With no cookie and no session, that is step one.
  await page.goto("/");

  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(page.getByRole("heading", { name: "Confirm your age" })).toBeVisible();
});

test("someone under 21 is refused and stays on the age gate", async ({ page }) => {
  await page.goto("/onboarding");

  await page.getByLabel("Date of birth").fill("2015-01-01");
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("alert")).toContainText("21 or older");
  await expect(page).toHaveURL(/\/onboarding$/);
});

test("a step cannot be skipped by typing its URL", async ({ page }) => {
  // requireStep() redirects anyone who has not cleared the earlier gates.
  await page.goto("/onboarding/profile");

  await expect(page).toHaveURL(/\/onboarding$/);
});

// TODO: the remaining critical journeys, once built:
//   - full onboarding through OTP (needs a test phone number in Supabase Auth)
//   - receipt upload -> points credited (async webhook round trip)
//   - wallet pass issuance
