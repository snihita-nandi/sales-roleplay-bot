import { expect, test } from "@playwright/test";

test("a representative can choose category, archetype, and difficulty", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Practice the moments that decide the deal." })).toBeVisible();
  await page.getByRole("button", { name: "Insurance" }).click();
  await page.getByRole("button", { name: "Hard" }).click();
  await expect(page.getByText("New Parent", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Open briefing" }).first().click();
  await expect(page.getByText("Your briefing")).toBeVisible();
  await expect(page.getByText("Insurance · New Parent · Hard")).toBeVisible();
  await expect(page.getByRole("button", { name: "Start voice roleplay" })).toBeVisible();
  await expect(page.getByText("The prospect's private motivations")).toBeVisible();
});
