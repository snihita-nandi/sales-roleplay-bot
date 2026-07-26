import { z } from "zod";

const idSchema = z.string().regex(/^[a-z0-9-]+$/);
const nonEmptyText = z.string().trim().min(1).max(1_000);
const shortText = z.string().trim().min(1).max(160);
const traitSchema = z.number().int().min(0).max(100);
const modifierSchema = z.number().int().min(-100).max(100);

export const difficultyLevelSchema = z.enum(["easy", "medium", "hard", "expert"]);

export const followUpTimeSchema = z.enum([
  "earlier-today",
  "yesterday",
  "two-three-days-ago",
  "last-week",
  "two-weeks-ago",
  "last-month",
  "custom",
]);

export const followUpContextSchema = z
  .object({
    lastConversationSummary: z.string().trim().max(2_000),
    agreedNextSteps: z.string().trim().max(2_000),
    previousConversationTime: followUpTimeSchema,
    customDate: z.iso.date().optional(),
    additionalNotes: z.string().trim().max(2_000),
  })
  .strict()
  .refine(
    ({ customDate, previousConversationTime }) =>
      previousConversationTime !== "custom" || Boolean(customDate),
    {
      message: "A custom date is required.",
      path: ["customDate"],
    },
  );

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

const behavioralContractSchema = z
  .object({
    openingBehavior: nonEmptyText,
    mustAlwaysBeTrue: z.array(nonEmptyText).min(2).max(10),
    mustNeverBeTrue: z.array(nonEmptyText).min(1).max(10),
    trustRule: nonEmptyText,
    emotionalIntensity: z.enum(["low", "moderate", "high", "extreme"]),
  })
  .strict();

export const difficultyProfileSchema = z
  .object({
    id: difficultyLevelSchema,
    label: shortText,
    description: nonEmptyText,
    modifiers: difficultyModifiersSchema,
    behaviorContract: behavioralContractSchema,
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

const difficultyCompatibilitySchema = z
  .object({
    easy: nonEmptyText,
    medium: nonEmptyText,
    hard: nonEmptyText,
    expert: nonEmptyText,
  })
  .strict();

const buyingStageSchema = z.enum([
  "exploring",
  "comparing",
  "validating",
  "negotiating",
  "decision",
  "renewal",
  "expansion",
  "retention",
]);

const productKnowledgeLevelSchema = z.enum(["low", "moderate", "high"]);

export const publicProfileScenarioSchema = z
  .object({
    id: idSchema,
    name: shortText,
    summary: nonEmptyText,
    reasonForCall: nonEmptyText,
    buyingStage: buyingStageSchema,
  })
  .strict();

const defaultHardConstraints = {
  immutableFacts: [
    "The configured customer identity is true.",
    "The configured current situation is true.",
  ],
  mustAlwaysBeTrue: [
    "Remain in the configured sales situation.",
    "Keep the configured buying stage consistent.",
  ],
  mustNeverBeTrue: [
    "Do not invent a different buying situation.",
    "Do not contradict the configured customer history.",
  ],
  requiredBehaviors: ["Respond consistently with the configured situation."],
  openingBehavior: "Open in a way that establishes the configured situation.",
};

const defaultEmotionalBaseline = {
  primary: "contextual",
  secondary: ["realistic"],
  expression: "Express the emotional stakes implied by the configured situation.",
};

const profileScenarioSchema = z
  .object({
    public: publicProfileScenarioSchema,
    private: z
      .object({
        background: nonEmptyText,
        currentSituation: nonEmptyText,
        goals: z.array(nonEmptyText).min(1).max(6),
        buyingMotivations: z.array(nonEmptyText).min(1).max(6),
        primaryObjections: z.array(nonEmptyText).min(1).max(6),
        secondaryObjections: z.array(nonEmptyText).min(1).max(6),
        emotionalState: nonEmptyText,
        productKnowledgeLevel: productKnowledgeLevelSchema,
        hardConstraints: z
          .object({
            immutableFacts: z.array(nonEmptyText).min(2).max(10),
            mustAlwaysBeTrue: z.array(nonEmptyText).min(2).max(10),
            mustNeverBeTrue: z.array(nonEmptyText).min(2).max(10),
            requiredBehaviors: z.array(nonEmptyText).min(1).max(10),
            openingBehavior: nonEmptyText,
          })
          .strict()
          .default(defaultHardConstraints),
        emotionalBaseline: z
          .object({
            primary: shortText,
            secondary: z.array(shortText).min(1).max(5),
            expression: nonEmptyText,
          })
          .strict()
          .default(defaultEmotionalBaseline),
      })
      .strict(),
  })
  .strict();

const legacyProfileScenario = {
  public: {
    id: "standard-conversation",
    name: "Standard conversation",
    summary: "A sales conversation based on the configured customer situation.",
    reasonForCall: "The customer is discussing the configured need with a salesperson.",
    buyingStage: "exploring" as const,
  },
  private: {
    background: "Use the background configured for this customer profile.",
    currentSituation: "Use the current situation configured for this customer profile.",
    goals: ["Understand whether the offering fits the customer's needs."],
    buyingMotivations: ["Find credible value with manageable risk."],
    primaryObjections: ["The fit and value have not yet been demonstrated."],
    secondaryObjections: ["Cost, effort, and risk still require clarification."],
    emotionalState: "Respond with the emotional stakes configured for the customer profile.",
    productKnowledgeLevel: "moderate" as const,
    hardConstraints: defaultHardConstraints,
    emotionalBaseline: defaultEmotionalBaseline,
  },
};

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
    scenarios: z
      .array(publicProfileScenarioSchema)
      .min(1)
      .default([legacyProfileScenario.public]),
  })
  .strict();

export const customerArchetypeSchema = z
  .object({
    public: publicArchetypeSchema,
    scenarios: z.array(profileScenarioSchema).min(1).default([legacyProfileScenario]),
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
        industryKnowledge: z
          .array(nonEmptyText)
          .min(1)
          .max(6)
          .default(["Knowledge appropriate to the configured customer role and situation."]),
        emotionalContext: nonEmptyText.default(
          "Respond with the natural emotional stakes implied by the configured situation.",
        ),
        difficultyCompatibility: difficultyCompatibilitySchema.default({
          easy: "Be open and patient while remaining in the configured customer role.",
          medium: "Behave as a typical customer in the configured role and situation.",
          hard: "Be guarded and demanding while remaining faithful to the configured identity.",
          expert: "Test the representative rigorously without changing the configured identity.",
        }),
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
    profileScenarioId: idSchema,
    profileScenarioName: shortText,
    reasonForCall: nonEmptyText,
    buyingStage: buyingStageSchema,
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
    followUpContext: followUpContextSchema.optional(),
  })
  .strict();

export const customerScenarioSchema = z
  .object({
    public: publicScenarioSchema,
    private: customerArchetypeSchema.shape.private.omit({ baselineBehavior: true }).extend({
      behavior: behaviorTraitsSchema,
      difficultyContract: behavioralContractSchema,
      selectedScenario: profileScenarioSchema.shape.private,
      followUpContext: followUpContextSchema.optional(),
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
    scenarioId: idSchema.optional(),
    difficulty: difficultyLevelSchema,
    followUpContext: followUpContextSchema.optional(),
  })
  .strict();

export type DifficultyLevel = z.infer<typeof difficultyLevelSchema>;
export type FollowUpTime = z.infer<typeof followUpTimeSchema>;
export type FollowUpContext = z.infer<typeof followUpContextSchema>;
export type DifficultyProfile = z.infer<typeof difficultyProfileSchema>;
export type PublicDifficultyProfile = z.infer<typeof publicDifficultyProfileSchema>;
export type BehaviorTraits = z.infer<typeof behaviorTraitsSchema>;
export type CustomerArchetype = z.infer<typeof customerArchetypeSchema>;
export type ProfileScenario = z.infer<typeof profileScenarioSchema>;
export type PublicProfileScenario = z.infer<typeof publicProfileScenarioSchema>;
export type PublicArchetype = z.infer<typeof publicArchetypeSchema>;
export type PracticeCategory = z.infer<typeof practiceCategorySchema>;
export type PublicPracticeCategory = z.infer<typeof publicPracticeCategorySchema>;
export type PracticeCatalog = z.infer<typeof practiceCatalogSchema>;
export type ScenarioSelection = z.infer<typeof scenarioSelectionSchema>;
export type PublicScenario = z.infer<typeof publicScenarioSchema>;
export type CustomerScenario = z.infer<typeof customerScenarioSchema>;
