import Groq from "groq-sdk";
import type { ChatCompletion } from "groq-sdk/resources/chat/completions";
import { z, ZodError } from "zod";

import type { CustomerScenario } from "@/domain/scenarios/schema";
import type {
  EvaluationRequest,
  EvaluationResult,
  EvaluationRubric,
} from "@/domain/evaluation/schema";
import {
  buildEvaluationPrompt,
  EVALUATION_ATTEMPT_TIMEOUT_MS,
  isRetryableEvaluationError,
  parseEvaluationResult,
  type EvaluationProvider,
  withEvaluationRetries,
} from "@/infrastructure/evaluation/provider";

export const GROQ_EVALUATION_MODEL = "llama-3.3-70b-versatile";

const groqEnvironmentSchema = z.object({
  GROQ_API_KEY: z.string().trim().min(1),
});

export class GroqEvaluator implements EvaluationProvider {
  private readonly client: Groq;

  constructor() {
    const environment = groqEnvironmentSchema.parse({
      GROQ_API_KEY: process.env.GROQ_API_KEY,
    });
    this.client = new Groq({ apiKey: environment.GROQ_API_KEY, maxRetries: 0 });
  }

  async evaluateRoleplay(
    scenario: CustomerScenario,
    rubric: EvaluationRubric,
    request: EvaluationRequest,
  ): Promise<EvaluationResult> {
    const prompt = buildEvaluationPrompt(scenario, rubric, request);
    return withEvaluationRetries(
      async () => {
        const response = await this.client.chat.completions.create(
          {
            model: GROQ_EVALUATION_MODEL,
            messages: [{ role: "system", content: prompt }],
            response_format: { type: "json_object" },
            temperature: 0.1,
          },
          { timeout: EVALUATION_ATTEMPT_TIMEOUT_MS },
        );
        const responseText = response.choices[0]?.message.content;
        if (!responseText) throw new Error("Groq returned an empty evaluation.");
        logRawGroqResponse(response, responseText);
        logParsedGroqContent(responseText);
        return parseEvaluationResult(responseText, request);
      },
      (error) =>
        isRetryableEvaluationError(error) ||
        error instanceof SyntaxError ||
        error instanceof ZodError,
    );
  }
}

function logRawGroqResponse(
  response: ChatCompletion,
  responseText: string,
): void {
  if (process.env.NODE_ENV !== "development") return;

  console.error("[evaluation][groq] Complete SDK response:");
  console.error(JSON.stringify(response, null, 2));
  console.error("[evaluation][groq] Model:", response.model ?? GROQ_EVALUATION_MODEL);
  console.error(
    "[evaluation][groq] Finish reason:",
    response.choices[0]?.finish_reason ?? "Not available",
  );
  console.error("[evaluation][groq] Token usage:");
  console.error(JSON.stringify(response.usage ?? null, null, 2));
  console.error("[evaluation][groq] Response length:", responseText.length);
  console.error("[evaluation][groq] Complete raw response:");
  console.error(responseText);
}

function logParsedGroqContent(responseText: string): void {
  if (process.env.NODE_ENV !== "development") return;

  try {
    const parsedContent: unknown = JSON.parse(responseText);
    console.error("[evaluation][groq] Parsed content:");
    console.error(JSON.stringify(parsedContent, null, 2));
  } catch (error: unknown) {
    console.error("RAW RESPONSE START");
    console.error(responseText);
    console.error("RAW RESPONSE END");
    throw error;
  }
}
