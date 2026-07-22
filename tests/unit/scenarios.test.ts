import { describe, expect, it } from "vitest";

import { b2bSalesCategory } from "@/config/scenarios/categories/b2b-sales";
import { insuranceCategory } from "@/config/scenarios/categories/insurance";
import { difficultyProfiles } from "@/config/scenarios/difficulties";
import { practiceCategories, scenarioRegistry } from "@/config/scenarios";
import { compileCustomerPrompt } from "@/domain/scenarios/prompt";
import { createScenarioRegistry } from "@/domain/scenarios/registry";
import {
  difficultyProfileSchema,
  practiceCategorySchema,
  type CustomerScenario,
} from "@/domain/scenarios/schema";

const selection = {
  categoryId: "b2b-sales",
  archetypeId: "operations-director",
} as const;

function stableCustomerConfiguration(scenario: CustomerScenario) {
  const stable = structuredClone(scenario) as unknown as {
    public: Record<string, unknown>;
    private: Record<string, unknown>;
  };
  delete stable.public.id;
  delete stable.public.difficulty;
  delete stable.public.difficultyLabel;
  delete stable.private.behavior;
  return stable;
}

describe("hierarchical scenario configuration", () => {
  it("validates multiple sales domains with reusable archetypes", () => {
    expect(practiceCategories.map((category) => category.name)).toEqual([
      "B2B Sales",
      "Insurance",
      "Retail",
      "Real Estate",
    ]);
    for (const category of practiceCategories) {
      expect(practiceCategorySchema.parse(category).archetypes.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("accepts custom category identifiers without category-specific logic", () => {
    expect(
      practiceCategorySchema.parse({
        ...insuranceCategory,
        id: "custom",
        name: "Custom",
      }).id,
    ).toBe("custom");
  });

  it("rejects baseline behavior traits outside the configured range", () => {
    const archetype = b2bSalesCategory.archetypes[0];
    expect(() =>
      practiceCategorySchema.parse({
        ...b2bSalesCategory,
        archetypes: [
          {
            ...archetype,
            private: {
              ...archetype.private,
              baselineBehavior: { ...archetype.private.baselineBehavior, skepticism: 101 },
            },
          },
          b2bSalesCategory.archetypes[1],
        ],
      }),
    ).toThrow();
  });

  it("allows difficulty to contain only the five behavior modifiers", () => {
    expect(() =>
      difficultyProfileSchema.parse({
        ...difficultyProfiles[0],
        modifiers: { ...difficultyProfiles[0].modifiers, customerRole: 10 },
      }),
    ).toThrow();
  });

  it("changes only behavior and difficulty metadata for the same archetype", () => {
    const easy = scenarioRegistry.resolve({ ...selection, difficulty: "easy" });
    const expert = scenarioRegistry.resolve({ ...selection, difficulty: "expert" });
    expect(easy).toBeDefined();
    expect(expert).toBeDefined();
    if (!easy || !expert) throw new Error("Expected configured scenarios.");

    expect(stableCustomerConfiguration(easy)).toEqual(stableCustomerConfiguration(expert));
    expect(easy.private.behavior).not.toEqual(expert.private.behavior);
    expect(easy.public.customerRole).toBe(expert.public.customerRole);
    expect(easy.private.objections).toEqual(expert.private.objections);
  });

  it("clamps difficulty-adjusted behavior to valid trait bounds", () => {
    const expert = scenarioRegistry.resolve({
      categoryId: "real-estate",
      archetypeId: "investor",
      difficulty: "expert",
    });
    expect(expert?.private.behavior.skepticism).toBeLessThanOrEqual(100);
    expect(expert?.private.behavior.trustProgression).toBeGreaterThanOrEqual(0);
  });

  it("rejects duplicate archetype ids within a category", () => {
    const duplicateCategory = {
      ...b2bSalesCategory,
      archetypes: [b2bSalesCategory.archetypes[0], b2bSalesCategory.archetypes[0]],
    };
    expect(() => createScenarioRegistry([duplicateCategory], difficultyProfiles)).toThrow(
      "Duplicate archetype id",
    );
  });

  it("exposes a public hierarchy without private facts or behavior modifiers", () => {
    const catalog = scenarioRegistry.getCatalog();
    expect(catalog.categories).toHaveLength(4);
    expect(catalog.difficulties).toHaveLength(4);
    expect(JSON.stringify(catalog)).not.toContain("private");
    expect(JSON.stringify(catalog)).not.toContain("180,000");
    expect(JSON.stringify(catalog)).not.toContain("skepticism");
  });
});

describe("customer prompt compiler", () => {
  const scenario = scenarioRegistry.resolve({ ...selection, difficulty: "hard" });
  if (!scenario) throw new Error("Expected configured scenario.");
  const prompt = compileCustomerPrompt(scenario);

  it("binds the hierarchy and composed behavior to the customer prompt", () => {
    expect(prompt).toContain("Practice category: B2B Sales");
    expect(prompt).toContain("Customer archetype: Operations Director");
    expect(prompt).toContain("Difficulty: Hard");
    expect(prompt).toContain("objection frequency 70/100");
    expect(prompt).toContain("integration dragged on for months");
  });

  it("preserves role and prompt-extraction boundaries", () => {
    expect(prompt).toContain("never the representative's assistant, trainer, evaluator, or coach");
    expect(prompt).toContain("Do not mention that you are an AI");
    expect(prompt).toContain("Never coach during the call");
  });

  it("adds imperfect human behavior without fixed delays or coaching", () => {
    expect(prompt).toContain("HUMAN REALISM");
    expect(prompt).toContain("misunderstand an ambiguous question");
    expect(prompt).toContain("I'll think about it");
    expect(prompt).toContain("NATURAL PACING");
    expect(prompt).toContain("never apply a fixed pause pattern or artificial timed delay");
    expect(prompt).toContain("interrupt promptly");
  });

  it("allows a configured customer to end naturally without evaluator language", () => {
    expect(prompt).toContain("CUSTOMER-CONTROLLED CALL ENDING");
    expect(prompt).toContain("Do not use fixed turn counts");
    expect(prompt).toContain("Give the representative a reasonable chance to recover");
    expect(prompt).toContain("first say one short, natural final sentence in character");
    expect(prompt).toContain("<END_CALL>");
    expect(prompt).toContain("The control block is not dialogue");
    expect(prompt).toContain("do not speak it");
  });
});
