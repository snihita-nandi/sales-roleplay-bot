import { z } from "zod";

import { callTerminationSchema, endCategorySchema } from "@/domain/roleplay/termination";

export const transcriptEntrySchema = z
  .object({
    role: z.enum(["representative", "customer"]),
    text: z.string().trim().min(1).max(4_000),
    timestampMs: z.number().int().nonnegative(),
  })
  .strict();

export const callMetricsSchema = z
  .object({
    durationSeconds: z.number().int().nonnegative().max(3_600),
    representativeTurns: z.number().int().nonnegative().max(1_000),
    customerTurns: z.number().int().nonnegative().max(1_000),
    interruptions: z.number().int().nonnegative().max(1_000),
  })
  .strict();

export const evaluationRequestSchema = z
  .object({
    scenarioId: z.string().regex(/^[a-z0-9-]+$/),
    transcript: z.array(transcriptEntrySchema).max(500),
    metrics: callMetricsSchema,
    termination: callTerminationSchema,
  })
  .strict();

export const rubricCriterionSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    title: z.string().trim().min(1).max(80),
    description: z.string().trim().min(1).max(500),
    maxScore: z.literal(20),
  })
  .strict();

export const evaluationRubricSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    criteria: z.array(rubricCriterionSchema).length(5),
  })
  .strict();

export const evaluationEvidenceSchema = z
  .object({
    transcriptIndex: z.number().int().nonnegative().max(499),
    speaker: z.enum(["user", "customer"]),
    shortQuote: z.string().trim().min(1).max(300),
    explanation: z.string().trim().min(1).max(500),
  })
  .strict();

export const evaluationFeedbackItemSchema = z
  .object({
    title: z.string().trim().min(1).max(100),
    score: z.number().int().min(0).max(20).optional(),
    feedback: z.string().trim().min(1).max(1_000),
    evidence: z.array(evaluationEvidenceSchema).max(5),
    betterResponse: z.string().trim().min(1).max(1_000).optional(),
  })
  .strict();

export const evaluationDimensionSchema = evaluationFeedbackItemSchema
  .extend({
    score: z.number().int().min(0).max(20),
  })
  .strict();

export const evaluationModelResponseSchema = z
  .object({
    summary: z.string().trim().min(1).max(1_000),
    discovery: evaluationDimensionSchema,
    objectionHandling: evaluationDimensionSchema,
    listening: evaluationDimensionSchema,
    communication: evaluationDimensionSchema,
    closing: evaluationDimensionSchema,
    continuationAdvice: z.string().trim().min(1).max(1_000),
    strengths: z.array(evaluationFeedbackItemSchema).max(5),
    missedOpportunities: z.array(evaluationFeedbackItemSchema).min(1).max(5),
    recommendedImprovements: z.array(evaluationFeedbackItemSchema).min(1).max(5),
  })
  .strict();

export const callSummarySchema = z
  .object({
    endedBy: z.enum(["customer", "representative", "system"]),
    endReason: z.string().trim().min(1).max(300),
    endCategory: endCategorySchema,
    durationSeconds: z.number().int().nonnegative().max(3_600),
    conversationTurns: z.number().int().nonnegative().max(2_000),
  })
  .strict();

export const evaluationResultSchema = evaluationModelResponseSchema
  .extend({
    overallScore: z.number().int().min(0).max(100),
    callSummary: callSummarySchema,
  })
  .strict();

export const evaluationResponseSchema = z
  .object({ evaluation: evaluationResultSchema })
  .strict();

export const evaluationErrorResponseSchema = z
  .object({
    error: z.string().trim().min(1).max(500),
    retryable: z.boolean().optional(),
  })
  .strict();

export type EvaluationRequest = z.infer<typeof evaluationRequestSchema>;
export type EvaluationRubric = z.infer<typeof evaluationRubricSchema>;
export type EvaluationResult = z.infer<typeof evaluationResultSchema>;
export type EvaluationModelResponse = z.infer<typeof evaluationModelResponseSchema>;
export type EvaluationEvidence = z.infer<typeof evaluationEvidenceSchema>;
export type EvaluationFeedbackItem = z.infer<typeof evaluationFeedbackItemSchema>;
