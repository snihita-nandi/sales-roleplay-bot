import { z } from "zod";

const idSchema = z.string().regex(/^[a-z0-9-]+$/);
const nonEmptyText = z.string().trim().min(1).max(1_000);
const shortText = z.string().trim().min(1).max(160);
const traitSchema = z.number().int().min(0).max(100);
const modifierSchema = z.number().int().min(-100).max(100);

export const difficultyLevelSchema = z.enum(["easy", "medium", "hard", "expert"]);

export const behaviorTraitsSchema = z
  .object({
    skepticism: traitSchema,
    patience: traitSchema,
    objectionFrequency: traitSchema,
    trustProgression: traitSchema,
    interruptionTendency: traitSchema,
  })
  .strict();

export const difficultyModifiersSchema = z
  .object({
    skepticism: modifierSchema,
    patience: modifierSchema,
    objectionFrequency: modifierSchema,
    trustProgression: modifierSchema,
    interruptionTendency: modifierSchema,
  })
  .strict();

export const difficultyProfileSchema = z
  .object({
    id: difficultyLevelSchema,
    label: shortText,
    description: nonEmptyText,
    modifiers: difficultyModifiersSchema,
  })
  .strict();

export const publicDifficultyProfileSchema = difficultyProfileSchema.pick({
  id: true,
  label: true,
  description: true,
});

const personalitySchema = z
  .object({
    openness: traitSchema,
    assertiveness: traitSchema,
    detailOrientation: traitSchema,
  })
  .strict();

const objectionSchema = z
  .object({
    id: idSchema,
    trigger: nonEmptyText,
    statement: nonEmptyText,
    resolutionSignals: z.array(nonEmptyText).min(1).max(5),
  })
  .strict();

const disclosureSchema = z
  .object({
    fact: nonEmptyText,
    revealWhen: nonEmptyText,
    minimumTrust: traitSchema,
  })
  .strict();

export const publicArchetypeSchema = z
  .object({
    id: idSchema,
    name: shortText,
    practiceTitle: shortText,
    summary: nonEmptyText,
    representativeRole: shortText,
    objective: nonEmptyText,
    expectedDurationMinutes: z.number().int().min(3).max(8),
    customerName: shortText,
    customerRole: shortText,
    customerContext: shortText,
  })
  .strict();

export const customerArchetypeSchema = z
  .object({
    public: publicArchetypeSchema,
    private: z
      .object({
        identity: z
          .object({
            background: nonEmptyText,
            currentSituation: nonEmptyText,
            decisionRole: nonEmptyText,
          })
          .strict(),
        goals: z.array(nonEmptyText).min(1).max(6),
        painPoints: z.array(nonEmptyText).min(1).max(8),
        knownFacts: z.array(nonEmptyText).min(1).max(10),
        disclosures: z.array(disclosureSchema).min(1).max(10),
        objections: z.array(objectionSchema).min(1).max(8),
        personality: personalitySchema,
        baselineBehavior: behaviorTraitsSchema,
        speakingStyle: z
          .object({
            tone: shortText,
            pace: z.enum(["measured", "natural", "brisk"]),
            responseLength: z.enum(["brief", "moderate", "detailed"]),
            verbalHabits: z.array(shortText).max(5),
          })
          .strict(),
        endConditions: z.array(nonEmptyText).min(1).max(6),
      })
      .strict(),
  })
  .strict();

export const publicPracticeCategorySchema = z
  .object({
    id: idSchema,
    name: shortText,
    description: nonEmptyText,
    archetypes: z.array(publicArchetypeSchema).min(2),
  })
  .strict();

export const practiceCategorySchema = z
  .object({
    id: idSchema,
    name: shortText,
    description: nonEmptyText,
    archetypes: z.array(customerArchetypeSchema).min(2),
  })
  .strict();

export const publicScenarioSchema = z
  .object({
    id: idSchema,
    categoryId: idSchema,
    categoryName: shortText,
    archetypeId: idSchema,
    archetypeName: shortText,
    title: shortText,
    summary: nonEmptyText,
    difficulty: difficultyLevelSchema,
    difficultyLabel: shortText,
    representativeRole: shortText,
    objective: nonEmptyText,
    expectedDurationMinutes: z.number().int().min(3).max(8),
    customerName: shortText,
    customerRole: shortText,
    customerContext: shortText,
  })
  .strict();

export const customerScenarioSchema = z
  .object({
    public: publicScenarioSchema,
    private: customerArchetypeSchema.shape.private.omit({ baselineBehavior: true }).extend({
      behavior: behaviorTraitsSchema,
    }),
  })
  .strict();

export const practiceCatalogSchema = z
  .object({
    categories: z.array(publicPracticeCategorySchema).min(1),
    difficulties: z.array(publicDifficultyProfileSchema).length(4),
  })
  .strict();

export const scenarioSelectionSchema = z
  .object({
    categoryId: idSchema,
    archetypeId: idSchema,
    difficulty: difficultyLevelSchema,
  })
  .strict();

export type DifficultyLevel = z.infer<typeof difficultyLevelSchema>;
export type DifficultyProfile = z.infer<typeof difficultyProfileSchema>;
export type PublicDifficultyProfile = z.infer<typeof publicDifficultyProfileSchema>;
export type BehaviorTraits = z.infer<typeof behaviorTraitsSchema>;
export type CustomerArchetype = z.infer<typeof customerArchetypeSchema>;
export type PublicArchetype = z.infer<typeof publicArchetypeSchema>;
export type PracticeCategory = z.infer<typeof practiceCategorySchema>;
export type PublicPracticeCategory = z.infer<typeof publicPracticeCategorySchema>;
export type PracticeCatalog = z.infer<typeof practiceCatalogSchema>;
export type ScenarioSelection = z.infer<typeof scenarioSelectionSchema>;
export type PublicScenario = z.infer<typeof publicScenarioSchema>;
export type CustomerScenario = z.infer<typeof customerScenarioSchema>;

