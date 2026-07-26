import { expect, test } from "@playwright/test";

test("a representative can choose category, profile, scenario, and difficulty", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Practice the moments that decide the deal." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Insurance" }).click();
  await page.getByRole("button", { name: /New Parent/ }).click();
  await page.getByRole("button", { name: /Existing customer comparing providers/ }).click();
  await page.getByRole("button", { name: "Hard" }).click();
  await page.getByRole("button", { name: "Open briefing" }).click();
  await expect(page.getByText("Your briefing")).toBeVisible();
  await expect(
    page.getByText("Insurance · New Parent · Existing customer comparing providers · Hard"),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Start voice roleplay" })).toBeVisible();
  await expect(page.getByText("The prospect's private motivations")).toBeVisible();
});

test("follow-up context appears only for the follow-up scenario", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Follow-up conversation/ }).click();
  await expect(
    page.getByRole("heading", { name: "Previous Conversation Context" }),
  ).toBeVisible();
  await expect(
    page.getByPlaceholder(
      "Briefly describe what happened during the previous conversation.",
    ),
  ).toBeVisible();
  await page
    .getByLabel("When did the previous conversation happen?")
    .selectOption("custom");
  await expect(page.getByLabel("Previous conversation date")).toBeVisible();

  await page.getByRole("button", { name: /First-time buyer/ }).click();
  await expect(
    page.getByRole("heading", { name: "Previous Conversation Context" }),
  ).toBeHidden();
});
