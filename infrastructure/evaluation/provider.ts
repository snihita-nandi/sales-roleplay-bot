import type { CustomerScenario } from "@/domain/scenarios/schema";
import type {
  EvaluationModelResponse,
  EvaluationRequest,
  EvaluationResult,
  EvaluationRubric,
} from "@/domain/evaluation/schema";
import { evaluationModelResponseSchema } from "@/domain/evaluation/schema";

const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [400, 1_200] as const;
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

export const EVALUATION_ATTEMPT_TIMEOUT_MS = 15_000;

const dimensionJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["score", "evidence"],
  properties: {
    score: { type: "integer", minimum: 0, maximum: 20 },
    evidence: { type: "string" },
  },
} as const;

export const evaluationJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "summary",
    "discovery",
    "objectionHandling",
    "listening",
    "communication",
    "closing",
    "continuationAdvice",
    "strengths",
    "missedOpportunities",
    "recommendedImprovements",
  ],
  properties: {
    summary: { type: "string" },
    discovery: dimensionJsonSchema,
    objectionHandling: dimensionJsonSchema,
    listening: dimensionJsonSchema,
    communication: dimensionJsonSchema,
    closing: dimensionJsonSchema,
    continuationAdvice: { type: "string" },
    strengths: { type: "array", items: { type: "string" }, minItems: 0, maxItems: 5 },
    missedOpportunities: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      maxItems: 5,
    },
    recommendedImprovements: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      maxItems: 5,
    },
  },
} as const;

export interface EvaluationProvider {
  evaluateRoleplay(
    scenario: CustomerScenario,
    rubric: EvaluationRubric,
    request: EvaluationRequest,
  ): Promise<EvaluationResult>;
}

export function buildEvaluationPrompt(
  scenario: CustomerScenario,
  rubric: EvaluationRubric,
  request: EvaluationRequest,
): string {
  const transcript =
    request.transcript
      .map((entry) => `[${entry.timestampMs}ms] ${entry.role}: ${entry.text}`)
      .join("\n") || "No transcript was captured.";

  return `
You are evaluating a completed sales practice call. The customer roleplay has ended. Analyze only the completed transcript and do not continue the conversation.

Scenario objective: ${scenario.public.objective}
Representative role: ${scenario.public.representativeRole}
Practice category: ${scenario.public.categoryName}
Customer archetype: ${scenario.public.archetypeName}
Difficulty: ${scenario.public.difficultyLabel}
Customer role and context: ${scenario.public.customerRole} — ${scenario.public.customerContext}

Scoring rubric (20 points each):
${rubric.criteria.map((criterion) => `- ${criterion.title}: ${criterion.description}`).join("\n")}

Call metrics: ${JSON.stringify(request.metrics)}
Call ending: ${JSON.stringify(request.termination)}

Completed transcript:
${transcript}

Return only a JSON object with exactly this structure and no additional keys:
{
  "summary": "Concise overall assessment",
  "discovery": { "score": 0, "evidence": "Transcript-grounded evidence" },
  "objectionHandling": { "score": 0, "evidence": "Transcript-grounded evidence" },
  "listening": { "score": 0, "evidence": "Transcript-grounded evidence" },
  "communication": { "score": 0, "evidence": "Transcript-grounded evidence" },
  "closing": { "score": 0, "evidence": "Transcript-grounded evidence" },
  "continuationAdvice": "A simple, practical explanation of what the representative could have said or done to keep the customer in the conversation",
  "strengths": ["Concrete transcript-grounded strength"],
  "missedOpportunities": ["Concrete missed opportunity"],
  "recommendedImprovements": ["Concrete recommended improvement"]
}
Each score must be an integer from 0 to 20. If evidence is absent, say so and score accordingly. Strengths may be an empty array when the transcript contains no defensible positive evidence; never invent a strength. Use simple, natural English throughout. The continuationAdvice must explain how the representative could have kept the customer talking, not merely repeat why the call ended. Ground it in the transcript and the stated ending. Do not invent dialogue or facts. Do not include an overall score or call summary; the application calculates those from trusted call data.
`.trim();
}

function getErrorStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null || !("status" in error)) return undefined;
  return typeof error.status === "number" ? error.status : undefined;
}

export function isRetryableEvaluationError(error: unknown): boolean {
  const status = getErrorStatus(error);
  const isTimeout =
    error instanceof DOMException && (error.name === "AbortError" || error.name === "TimeoutError");
  return (
    error instanceof TypeError ||
    isTimeout ||
    (status !== undefined && RETRYABLE_STATUS_CODES.has(status))
  );
}

export function parseEvaluationResult(
  responseText: string,
  request: EvaluationRequest,
): EvaluationResult {
  const result = evaluationModelResponseSchema.parse(JSON.parse(responseText) as unknown);
  return addOverallScore(result, request);
}

export async function withEvaluationRetries<T>(
  operation: () => Promise<T>,
  shouldRetryError: (error: unknown) => boolean = isRetryableEvaluationError,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    try {
      return await operation();
    } catch (error: unknown) {
      lastError = error;
      const shouldRetry = attempt < MAX_ATTEMPTS - 1 && shouldRetryError(error);
      if (!shouldRetry) throw error;
      await waitBeforeRetry(RETRY_DELAYS_MS[attempt] ?? RETRY_DELAYS_MS.at(-1) ?? 0);
    }
  }

  throw lastError;
}

function waitBeforeRetry(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

function addOverallScore(
  result: EvaluationModelResponse,
  request: EvaluationRequest,
): EvaluationResult {
  return {
    ...result,
    overallScore:
      result.discovery.score +
      result.objectionHandling.score +
      result.listening.score +
      result.communication.score +
      result.closing.score,
    callSummary: {
      ...request.termination,
      durationSeconds: request.metrics.durationSeconds,
      conversationTurns: request.metrics.representativeTurns + request.metrics.customerTurns,
    },
  };
}
