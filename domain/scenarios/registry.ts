import {
  customerScenarioSchema,
  difficultyProfileSchema,
  practiceCategorySchema,
  type BehaviorTraits,
  type CustomerArchetype,
  type CustomerScenario,
  type DifficultyProfile,
  type FollowUpContext,
  type PracticeCatalog,
  type PracticeCategory,
  type ProfileScenario,
  type PublicArchetype,
  type PublicDifficultyProfile,
  type PublicProfileScenario,
  type PublicScenario,
  type ScenarioSelection,
} from "@/domain/scenarios/schema";
import { FOLLOW_UP_SCENARIO_ID } from "@/domain/scenarios/follow-up-context";

const clampTrait = (value: number) => Math.max(0, Math.min(100, value));

function composeBehavior(
  baseline: BehaviorTraits,
  difficulty: DifficultyProfile,
): BehaviorTraits {
  return {
    skepticism: clampTrait(baseline.skepticism + difficulty.modifiers.skepticism),
    patience: clampTrait(baseline.patience + difficulty.modifiers.patience),
    objectionFrequency: clampTrait(
      baseline.objectionFrequency + difficulty.modifiers.objectionFrequency,
    ),
    trustProgression: clampTrait(
      baseline.trustProgression + difficulty.modifiers.trustProgression,
    ),
    interruptionTendency: clampTrait(
      baseline.interruptionTendency + difficulty.modifiers.interruptionTendency,
    ),
  };
}

export function createScenarioId(selection: ScenarioSelection): string {
  return selection.scenarioId
    ? `${selection.categoryId}--${selection.archetypeId}--${selection.scenarioId}--${selection.difficulty}`
    : `${selection.categoryId}--${selection.archetypeId}--${selection.difficulty}`;
}

export function composePublicScenario(
  category: Pick<PracticeCategory, "id" | "name">,
  archetype: PublicArchetype,
  profileScenario: PublicProfileScenario,
  difficulty: PublicDifficultyProfile,
): PublicScenario {
  const selection = {
    categoryId: category.id,
    archetypeId: archetype.id,
    scenarioId: profileScenario.id,
    difficulty: difficulty.id,
  };

  return {
    id: createScenarioId(selection),
    categoryId: category.id,
    categoryName: category.name,
    archetypeId: archetype.id,
    archetypeName: archetype.name,
    profileScenarioId: profileScenario.id,
    profileScenarioName: profileScenario.name,
    reasonForCall: profileScenario.reasonForCall,
    buyingStage: profileScenario.buyingStage,
    title: profileScenario.name,
    summary: profileScenario.summary,
    difficulty: difficulty.id,
    difficultyLabel: difficulty.label,
    representativeRole: archetype.representativeRole,
    objective: archetype.objective,
    expectedDurationMinutes: archetype.expectedDurationMinutes,
    customerName: archetype.customerName,
    customerRole: archetype.customerRole,
    customerContext: archetype.customerContext,
  };
}

export function attachFollowUpContext(
  scenario: CustomerScenario,
  context: FollowUpContext | undefined,
): CustomerScenario {
  if (
    !context ||
    scenario.public.profileScenarioId !== FOLLOW_UP_SCENARIO_ID
  ) {
    return scenario;
  }

  return customerScenarioSchema.parse({
    public: { ...scenario.public, followUpContext: context },
    private: { ...scenario.private, followUpContext: context },
  });
}

function composeScenario(
  category: PracticeCategory,
  archetype: CustomerArchetype,
  profileScenario: ProfileScenario,
  difficulty: DifficultyProfile,
): CustomerScenario {
  const { baselineBehavior, ...stablePrivateConfiguration } = archetype.private;
  return customerScenarioSchema.parse({
    public: composePublicScenario(category, archetype.public, profileScenario.public, difficulty),
    private: {
      ...stablePrivateConfiguration,
      behavior: composeBehavior(baselineBehavior, difficulty),
      difficultyContract: difficulty.behaviorContract,
      selectedScenario: profileScenario.private,
    },
  });
}

export function createScenarioRegistry(
  rawCategories: readonly unknown[],
  rawDifficulties: readonly unknown[],
) {
  const categories = rawCategories.map((category) => practiceCategorySchema.parse(category));
  const difficulties = rawDifficulties.map((difficulty) =>
    difficultyProfileSchema.parse(difficulty),
  );
  const difficultyById = new Map(difficulties.map((difficulty) => [difficulty.id, difficulty]));
  const categoryById = new Map<string, PracticeCategory>();
  const scenariosById = new Map<string, CustomerScenario>();
  const legacyScenarioAliases = new Map<string, CustomerScenario>();

  if (difficultyById.size !== difficulties.length || difficultyById.size !== 4) {
    throw new Error("Difficulty configuration must define easy, medium, hard, and expert once.");
  }

  for (const category of categories) {
    if (categoryById.has(category.id)) throw new Error(`Duplicate category id: ${category.id}`);
    categoryById.set(category.id, category);
    const archetypeIds = new Set<string>();

    for (const archetype of category.archetypes) {
      if (archetypeIds.has(archetype.public.id)) {
        throw new Error(`Duplicate archetype id in ${category.id}: ${archetype.public.id}`);
      }
      archetypeIds.add(archetype.public.id);
      const profileScenarioIds = new Set<string>();
      for (const [profileScenarioIndex, profileScenario] of archetype.scenarios.entries()) {
        if (profileScenarioIds.has(profileScenario.public.id)) {
          throw new Error(
            `Duplicate scenario id in ${category.id}/${archetype.public.id}: ${profileScenario.public.id}`,
          );
        }
        profileScenarioIds.add(profileScenario.public.id);
        for (const difficulty of difficulties) {
          const scenario = composeScenario(category, archetype, profileScenario, difficulty);
          scenariosById.set(scenario.public.id, scenario);
          if (profileScenarioIndex === 0) {
            legacyScenarioAliases.set(
              createScenarioId({
                categoryId: category.id,
                archetypeId: archetype.public.id,
                difficulty: difficulty.id,
              }),
              scenario,
            );
          }
        }
      }
    }
  }

  const catalog: PracticeCatalog = {
    categories: categories.map((category) => ({
      id: category.id,
      name: category.name,
      description: category.description,
      archetypes: category.archetypes.map((archetype) => archetype.public),
    })),
    difficulties: difficulties.map(({ id, label, description }) => ({ id, label, description })),
  };

  return {
    resolve(selection: ScenarioSelection): CustomerScenario | undefined {
      if (selection.scenarioId) return scenariosById.get(createScenarioId(selection));
      return legacyScenarioAliases.get(createScenarioId(selection));
    },
    get(id: string): CustomerScenario | undefined {
      return scenariosById.get(id) ?? legacyScenarioAliases.get(id);
    },
    getPublicScenario(selection: ScenarioSelection): PublicScenario | undefined {
      return this.resolve(selection)?.public;
    },
    getCatalog(): PracticeCatalog {
      return catalog;
    },
    listPublic(): PublicScenario[] {
      return [...scenariosById.values()].map((scenario) => scenario.public);
    },
  };
}
