import { describe, expect, it } from "vitest";

import { practiceCategories, scenarioRegistry } from "@/config/scenarios";
import { resolveCustomerVoice } from "@/infrastructure/gemini/customer-voice";

describe("customer archetype voice resolution", () => {
  it("resolves every configured archetype to one stable voice", () => {
    for (const category of practiceCategories) {
      for (const archetype of category.archetypes) {
        const voice = resolveCustomerVoice(archetype.public.id);
        expect(voice).toBeTruthy();
        expect(resolveCustomerVoice(archetype.public.id)).toBe(voice);
      }
    }
  });

  it("does not change voice across scenario, difficulty, or follow-up selection", () => {
    const archetypeId = "new-parent";
    const expectedVoice = resolveCustomerVoice(archetypeId);

    for (const scenarioId of [
      "initial-needs-conversation",
      "comparing-options",
      "decision-follow-up",
    ]) {
      for (const difficulty of ["easy", "medium", "hard", "expert"] as const) {
        const scenario = scenarioRegistry.resolve({
          categoryId: "insurance",
          archetypeId,
          scenarioId,
          difficulty,
        });
        expect(scenario).toBeDefined();
        expect(resolveCustomerVoice(scenario?.public.archetypeId ?? "")).toBe(
          expectedVoice,
        );
      }
    }
  });
});
