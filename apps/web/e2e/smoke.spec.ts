import { test, expect } from "@playwright/test";

test("home page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Greenback Cash" })).toBeVisible();
});

// TODO: replace with the real critical-path journeys once built:
//   - auth (sign up / sign in)
//   - receipt upload -> points credited (async webhook round trip)
//   - wallet pass issuance
