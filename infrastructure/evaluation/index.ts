import type { CustomerScenario } from "@/domain/scenarios/schema";
import type {
  EvaluationRequest,
  EvaluationResult,
  EvaluationRubric,
} from "@/domain/evaluation/schema";
import {
  GEMINI_EVALUATION_MODEL,
  GeminiEvaluator,
} from "@/infrastructure/evaluation/gemini-evaluator";
import {
  GROQ_EVALUATION_MODEL,
  GroqEvaluator,
} from "@/infrastructure/evaluation/groq-evaluator";
import type { EvaluationProvider } from "@/infrastructure/evaluation/provider";

export { isRetryableEvaluationError } from "@/infrastructure/evaluation/provider";

export type EvaluationProviderName = "gemini" | "groq";

export function getEvaluationProviderName(): EvaluationProviderName {
  const configuredProvider = process.env.EVALUATION_PROVIDER?.trim().toLowerCase();
  if (!configuredProvider || configuredProvider === "gemini") return "gemini";
  if (configuredProvider === "groq") return "groq";
  throw new Error(`Unsupported evaluation provider: ${configuredProvider}`);
}

export function createEvaluationProvider(): EvaluationProvider {
  return getEvaluationProviderName() === "groq" ? new GroqEvaluator() : new GeminiEvaluator();
}

export function getEvaluationProviderDiagnostics(): {
  provider: EvaluationProviderName | "invalid";
  model: string;
} {
  try {
    const provider = getEvaluationProviderName();
    return {
      provider,
      model: provider === "groq" ? GROQ_EVALUATION_MODEL : GEMINI_EVALUATION_MODEL,
    };
  } catch {
    return { provider: "invalid", model: "unknown" };
  }
}

export async function evaluateRoleplay(
  scenario: CustomerScenario,
  rubric: EvaluationRubric,
  request: EvaluationRequest,
): Promise<EvaluationResult> {
  return createEvaluationProvider().evaluateRoleplay(scenario, rubric, request);
}
