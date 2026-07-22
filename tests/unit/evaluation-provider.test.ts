import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createEvaluationProvider,
  getEvaluationProviderName,
} from "@/infrastructure/evaluation";
import { GeminiEvaluator } from "@/infrastructure/evaluation/gemini-evaluator";
import { GroqEvaluator } from "@/infrastructure/evaluation/groq-evaluator";

describe("evaluation provider factory", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("creates Groq when EVALUATION_PROVIDER is groq", () => {
    vi.stubEnv("EVALUATION_PROVIDER", "groq");
    vi.stubEnv("GROQ_API_KEY", "groq-test-key");
    expect(getEvaluationProviderName()).toBe("groq");
    expect(createEvaluationProvider()).toBeInstanceOf(GroqEvaluator);
  });

  it("creates Gemini when EVALUATION_PROVIDER is gemini", () => {
    vi.stubEnv("EVALUATION_PROVIDER", "gemini");
    vi.stubEnv("GEMINI_API_KEY", "gemini-test-key");
    expect(getEvaluationProviderName()).toBe("gemini");
    expect(createEvaluationProvider()).toBeInstanceOf(GeminiEvaluator);
  });

  it("defaults to Gemini only when EVALUATION_PROVIDER is unset", () => {
    vi.stubEnv("EVALUATION_PROVIDER", "");
    vi.stubEnv("GEMINI_API_KEY", "gemini-test-key");
    expect(getEvaluationProviderName()).toBe("gemini");
    expect(createEvaluationProvider()).toBeInstanceOf(GeminiEvaluator);
  });

  it("rejects unsupported provider names", () => {
    vi.stubEnv("EVALUATION_PROVIDER", "unsupported");
    expect(() => createEvaluationProvider()).toThrow("Unsupported evaluation provider");
  });
});
