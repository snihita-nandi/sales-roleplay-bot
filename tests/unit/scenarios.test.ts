import { describe, expect, it } from "vitest";

import { b2bSalesCategory } from "@/config/scenarios/categories/b2b-sales";
import { insuranceCategory } from "@/config/scenarios/categories/insurance";
import { difficultyProfiles } from "@/config/scenarios/difficulties";
import { practiceCategories, scenarioRegistry } from "@/config/scenarios";
import {
  buildCustomerBehaviorContract,
  compileCustomerPrompt,
} from "@/domain/scenarios/prompt";
import {
  attachFollowUpContext,
  createScenarioRegistry,
} from "@/domain/scenarios/registry";
import {
  difficultyProfileSchema,
  practiceCategorySchema,
  type CustomerScenario,
} from "@/domain/scenarios/schema";

const selection = {
  categoryId: "b2b-saas",
  archetypeId: "operations-manager",
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
  delete stable.private.difficultyContract;
  return stable;
}

describe("hierarchical scenario configuration", () => {
  it("validates multiple sales domains with reusable archetypes", () => {
    expect(practiceCategories.map((category) => category.name)).toEqual([
      "B2B SaaS",
      "Insurance",
      "Banking & Financial Services",
      "Real Estate",
      "Telecommunications",
      "Retail",
      "Recruitment & HR",
      "Digital Marketing Agency",
      "Manufacturing",
      "Logistics & Supply Chain",
      "Hospitality & Travel",
    ]);
    expect(practiceCategories.map((category) => category.archetypes.length)).toEqual([
      8, 10, 9, 8, 7, 7, 6, 7, 6, 6, 8,
    ]);
  });

  it("uses the requested real-world customer profiles for every industry", () => {
    const profileNames = Object.fromEntries(
      practiceCategories.map((category) => [
        category.id,
        category.archetypes.map((archetype) => archetype.public.name),
      ]),
    );
    expect(profileNames["insurance"]).toContain("Claim Dissatisfied Customer");
    expect(profileNames["banking-financial-services"]).toContain("Freelancer");
    expect(profileNames["telecommunications"]).toContain(
      "Customer Planning to Switch Providers",
    );
    expect(profileNames["recruitment-hr"]).not.toContain("Candidate");
    expect(profileNames["manufacturing"]).not.toContain("Quality Manager");
  });

  it("gives every prospect a contact reason, authority, domain knowledge, and difficulty portrayal", () => {
    for (const category of practiceCategories) {
      for (const archetype of category.archetypes) {
        expect(archetype.private.identity.currentSituation.length).toBeGreaterThan(20);
        expect(archetype.private.identity.decisionRole.length).toBeGreaterThan(20);
        expect(archetype.private.industryKnowledge.length).toBeGreaterThan(0);
        expect(archetype.scenarios).toHaveLength(3);
        expect(archetype.public.scenarios).toHaveLength(3);
        expect(Object.keys(archetype.private.difficultyCompatibility)).toEqual([
          "easy",
          "medium",
          "hard",
          "expert",
        ]);
      }
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

  it("normalizes legacy scenario data with complete private behavior contracts", () => {
    const incomplete = structuredClone(practiceCategories[0]) as unknown as {
      archetypes: Array<{
        scenarios: Array<{ private: Record<string, unknown> }>;
      }>;
    };
    delete incomplete.archetypes[0].scenarios[0].private.hardConstraints;
    delete incomplete.archetypes[0].scenarios[0].private.emotionalBaseline;

    const parsed = practiceCategorySchema.parse(incomplete);
    const scenarioPrivate = parsed.archetypes[0].scenarios[0].private;
    expect(scenarioPrivate.hardConstraints.immutableFacts).toHaveLength(2);
    expect(scenarioPrivate.hardConstraints.mustNeverBeTrue).toHaveLength(2);
    expect(scenarioPrivate.emotionalBaseline.primary).toBe("contextual");
    expect(scenarioPrivate.emotionalBaseline.secondary).toEqual(["realistic"]);
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

  it("keeps the selected sales situation stable across all difficulties", () => {
    const medium = scenarioRegistry.resolve({
      ...selection,
      scenarioId: "comparing-options",
      difficulty: "medium",
    });
    const expert = scenarioRegistry.resolve({
      ...selection,
      scenarioId: "comparing-options",
      difficulty: "expert",
    });
    expect(medium?.private.selectedScenario).toEqual(expert?.private.selectedScenario);
    expect(medium?.public.profileScenarioId).toBe("comparing-options");
    expect(expert?.public.profileScenarioId).toBe("comparing-options");
    expect(medium?.private.behavior).not.toEqual(expert?.private.behavior);
  });

  it("builds a complete structured contract for every profile, scenario, and difficulty", () => {
    let combinations = 0;
    for (const category of practiceCategories) {
      for (const archetype of category.archetypes) {
        for (const profileScenario of archetype.scenarios) {
          for (const difficulty of difficultyProfiles) {
            const scenario = scenarioRegistry.resolve({
              categoryId: category.id,
              archetypeId: archetype.public.id,
              scenarioId: profileScenario.public.id,
              difficulty: difficulty.id,
            });
            expect(scenario).toBeDefined();
            if (!scenario) throw new Error("Expected composed scenario.");
            const contract = buildCustomerBehaviorContract(scenario);
            expect(contract.priorityOrder).toEqual([
              "scenario",
              "customerProfile",
              "difficultyBehavior",
              "generalPersonality",
              "conversationStyle",
            ]);
            expect(contract.scenario.immutableFacts.length).toBeGreaterThanOrEqual(2);
            expect(contract.scenario.mustNeverBeTrue.length).toBeGreaterThanOrEqual(2);
            expect(contract.scenario.openingBehavior.length).toBeGreaterThan(20);
            expect(contract.difficultyBehavior.mustAlwaysBeTrue.length).toBeGreaterThanOrEqual(2);
            expect(scenario.private.selectedScenario).toEqual(profileScenario.private);
            combinations += 1;
          }
        }
      }
    }
    expect(combinations).toBe(984);
  });

  it("enforces an expert existing-provider comparison for a new parent", () => {
    const scenario = scenarioRegistry.resolve({
      categoryId: "insurance",
      archetypeId: "new-parent",
      scenarioId: "comparing-options",
      difficulty: "expert",
    });
    expect(scenario).toBeDefined();
    if (!scenario) throw new Error("Expected comparison scenario.");
    const contract = buildCustomerBehaviorContract(scenario);
    expect(contract.scenario.immutableFacts).toContain(
      "The customer already has a provider for insurance protection.",
    );
    expect(contract.scenario.requiredBehaviors).toContain(
      "Mention the current provider in the first response.",
    );
    expect(contract.scenario.mustNeverBeTrue).toContain(
      "Never behave like a first-time buyer.",
    );
    expect(contract.difficultyBehavior.openingBehavior).toContain("first sentence");
    expect(contract.difficultyBehavior.mustNeverBeTrue).toContain(
      "Do not become friendly quickly.",
    );
  });

  it("enforces an easy first-time-buyer conversation for a new parent", () => {
    const scenario = scenarioRegistry.resolve({
      categoryId: "insurance",
      archetypeId: "new-parent",
      scenarioId: "initial-needs-conversation",
      difficulty: "easy",
    });
    expect(scenario).toBeDefined();
    if (!scenario) throw new Error("Expected first-time scenario.");
    const contract = buildCustomerBehaviorContract(scenario);
    expect(contract.scenario.immutableFacts).toContain(
      "The customer has never purchased insurance protection before.",
    );
    expect(contract.scenario.mustNeverBeTrue).toContain(
      "Never claim to already have another provider for this need.",
    );
    expect(contract.scenario.requiredBehaviors[0]).toContain("beginner question");
    expect(contract.difficultyBehavior.openingBehavior).toContain("politely");
    expect(contract.difficultyBehavior.mustAlwaysBeTrue).toContain(
      "Be patient and cooperative.",
    );
  });

  it("clamps difficulty-adjusted behavior to valid trait bounds", () => {
    const expert = scenarioRegistry.resolve({
      categoryId: "real-estate",
      archetypeId: "property-investor",
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
    expect(catalog.categories).toHaveLength(11);
    expect(catalog.difficulties).toHaveLength(4);
    expect(JSON.stringify(catalog)).not.toContain('"private"');
    expect(JSON.stringify(catalog)).not.toContain("180,000");
    expect(JSON.stringify(catalog)).not.toContain("skepticism");
  });
});

describe("customer prompt compiler", () => {
  const scenario = scenarioRegistry.resolve({ ...selection, difficulty: "hard" });
  if (!scenario) throw new Error("Expected configured scenario.");
  const prompt = compileCustomerPrompt(scenario);

  it("binds the hierarchy and composed behavior to the customer prompt", () => {
    expect(prompt).toContain("Practice category: B2B SaaS");
    expect(prompt).toContain("Customer archetype: Operations Manager");
    expect(prompt).toContain("Difficulty: Hard");
    expect(prompt).toContain(
      "Why this customer is being contacted: Manual exception handling",
    );
    expect(prompt).toContain("objection frequency 80/100");
    expect(prompt).toContain("The last rollout cost us productivity for months.");
    expect(prompt).toContain("INDUSTRY-SPECIFIC KNOWLEDGE");
    expect(prompt).toContain("DIFFICULTY-SPECIFIC PORTRAYAL");
    expect(prompt).toContain("SELECTED SALES SITUATION");
    expect(prompt).toContain("Difficulty changes resistance");
    expect(prompt).toContain("AUTHORITATIVE STRUCTURED BEHAVIOR CONTRACT");
    expect(prompt).toContain("Before every response, silently verify");
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
    expect(prompt).toContain("first speak exactly one complete, natural final sentence in character");
    expect(prompt).toContain("end_roleplay tool");
    expect(prompt).toContain("The tool call is silent control metadata");
    expect(prompt).toContain("do not generate any further customer response");
    expect(prompt).not.toContain("<END_CALL>");
    expect(prompt).not.toContain('"reason":"Customer ended the call');
  });

  it("injects supplied memory only into a follow-up conversation", () => {
    const followUp = scenarioRegistry.resolve({
      ...selection,
      scenarioId: "decision-follow-up",
      difficulty: "medium",
    });
    const firstCall = scenarioRegistry.resolve({
      ...selection,
      scenarioId: "initial-needs-conversation",
      difficulty: "medium",
    });
    if (!followUp || !firstCall) throw new Error("Expected configured scenarios.");

    const context = {
      lastConversationSummary: "We reviewed the workflow and pricing.",
      agreedNextSteps: "The representative would send a security brief.",
      previousConversationTime: "last-week" as const,
      additionalNotes: "The customer discussed it with the CTO.",
    };
    const followUpPrompt = compileCustomerPrompt(
      attachFollowUpContext(followUp, context),
    );
    const firstCallPrompt = compileCustomerPrompt(
      attachFollowUpContext(firstCall, context),
    );

    expect(followUpPrompt).toContain("FOLLOW-UP CONTEXT");
    expect(followUpPrompt).toContain("We reviewed the workflow and pricing.");
    expect(followUpPrompt).toContain("Last week");
    expect(followUpPrompt).toContain("never a first interaction");
    expect(followUpPrompt).toContain("never recite this context word-for-word");
    expect(firstCallPrompt).not.toContain("FOLLOW-UP CONTEXT");
    expect(firstCallPrompt).not.toContain("We reviewed the workflow and pricing.");
    expect(firstCall.public.followUpContext).toBeUndefined();
  });
});
