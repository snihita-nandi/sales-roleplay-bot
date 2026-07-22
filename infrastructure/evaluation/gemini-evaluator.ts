import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

import type { CustomerScenario } from "@/domain/scenarios/schema";
import type {
  EvaluationRequest,
  EvaluationResult,
  EvaluationRubric,
} from "@/domain/evaluation/schema";
import {
  buildEvaluationPrompt,
  EVALUATION_ATTEMPT_TIMEOUT_MS,
  evaluationJsonSchema,
  parseEvaluationResult,
  type EvaluationProvider,
  withEvaluationRetries,
} from "@/infrastructure/evaluation/provider";

export const GEMINI_EVALUATION_MODEL = "gemini-3.5-flash";

const geminiEnvironmentSchema = z.object({
  GEMINI_API_KEY: z.string().trim().min(1),
});

export class GeminiEvaluator implements EvaluationProvider {
  private readonly client: GoogleGenAI;

  constructor() {
    const environment = geminiEnvironmentSchema.parse({
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    });
    this.client = new GoogleGenAI({ apiKey: environment.GEMINI_API_KEY });
  }

  async evaluateRoleplay(
    scenario: CustomerScenario,
    rubric: EvaluationRubric,
    request: EvaluationRequest,
  ): Promise<EvaluationResult> {
    const prompt = buildEvaluationPrompt(scenario, rubric, request);
    return withEvaluationRetries(async () => {
      const response = await this.client.models.generateContent({
        model: GEMINI_EVALUATION_MODEL,
        contents: prompt,
        config: {
          abortSignal: AbortSignal.timeout(EVALUATION_ATTEMPT_TIMEOUT_MS),
          responseMimeType: "application/json",
          responseJsonSchema: evaluationJsonSchema,
        },
      });

      if (!response.text) throw new Error("Gemini returned an empty evaluation.");
      return parseEvaluationResult(response.text, request);
    });
  }
}
