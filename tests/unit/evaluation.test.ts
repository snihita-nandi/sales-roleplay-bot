import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const generateContent = vi.hoisted(() => vi.fn());

vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    readonly models = { generateContent };
  },
}));

import { defaultRubric } from "@/config/rubrics/default";
import { scenarioRegistry } from "@/config/scenarios";
import type { EvaluationModelResponse, EvaluationRequest } from "@/domain/evaluation/schema";
import { GeminiEvaluator } from "@/infrastructure/evaluation/gemini-evaluator";
import {
  buildEvaluationPrompt,
  isRetryableEvaluationError,
  parseEvaluationResult,
} from "@/infrastructure/evaluation/provider";

const scenario = scenarioRegistry.get("insurance--new-parent--hard");
if (!scenario) throw new Error("Expected configured evaluation scenario.");

const request: EvaluationRequest = {
  scenarioId: scenario.public.id,
  transcript: [
    { role: "representative", text: "What concerns you most?", timestampMs: 1_000 },
    { role: "customer", text: "I am worried about the cost.", timestampMs: 2_000 },
  ],
  metrics: {
    durationSeconds: 45,
    representativeTurns: 1,
    customerTurns: 1,
    interruptions: 0,
  },
  termination: {
    endedBy: "customer",
    endReason: "Customer lost interest during the conversation.",
    endCategory: "loss-of-interest",
  },
};

export const modelResponse: EvaluationModelResponse = {
  summary: "The representative opened with a relevant question but did not earn a next step.",
  discovery: { score: 15, evidence: "Asked what concerned the customer most." },
  objectionHandling: { score: 10, evidence: "The cost concern was heard but not explored." },
  listening: { score: 12, evidence: "The question invited the customer's concern." },
  communication: { score: 14, evidence: "The question was concise and clear." },
  closing: { score: 4, evidence: "No next step appears in the transcript." },
  continuationAdvice:
    "Acknowledge the cost concern and ask one simple follow-up question before suggesting a next step.",
  strengths: ["Opened with a relevant question."],
  missedOpportunities: ["Did not explore the cost concern."],
  recommendedImprovements: ["Ask what makes the expected cost difficult."],
};

describe("shared evaluation contract", () => {
  it("builds an evaluation-only prompt from the completed transcript", () => {
    const prompt = buildEvaluationPrompt(scenario, defaultRubric, request);
    expect(prompt).toContain("customer roleplay has ended");
    expect(prompt).toContain("Completed transcript:");
    expect(prompt).toContain("representative: What concerns you most?");
    expect(prompt).toContain("Do not invent dialogue or facts");
    expect(prompt).toContain("Strengths may be an empty array");
    expect(prompt).toContain("Customer lost interest during the conversation");
    expect(prompt).toContain("could have kept the customer talking");
    expect(prompt).toContain('"discovery": { "score": 0, "evidence"');
    expect(prompt).toContain("no additional keys");
  });

  it("classifies provider capacity and timeouts as retryable", () => {
    expect(isRetryableEvaluationError(Object.assign(new Error("busy"), { status: 503 }))).toBe(
      true,
    );
    expect(isRetryableEvaluationError(new DOMException("timed out", "TimeoutError"))).toBe(true);
    expect(isRetryableEvaluationError(new Error("invalid structured response"))).toBe(false);
  });

  it("accepts an empty strengths list when the transcript has no positive evidence", () => {
    const result = parseEvaluationResult(
      JSON.stringify({
        ...modelResponse,
        strengths: [],
      }),
      request,
    );

    expect(result.strengths).toEqual([]);
    expect(result.overallScore).toBe(55);
    expect(result.callSummary).toEqual({
      ...request.termination,
      durationSeconds: 45,
      conversationTurns: 2,
    });
  });
});

describe("Gemini evaluator", () => {
  beforeEach(() => {
    vi.stubEnv("GEMINI_API_KEY", "gemini-test-key");
    generateContent.mockReset();
  });

  afterEach(() => vi.unstubAllEnvs());

  it("validates structured JSON and computes the overall score deterministically", async () => {
    generateContent.mockResolvedValueOnce({ text: JSON.stringify(modelResponse) });
    const result = await new GeminiEvaluator().evaluateRoleplay(
      scenario,
      defaultRubric,
      request,
    );
    expect(result.overallScore).toBe(55);
    expect(result.discovery.score).toBe(15);
    expect(result.recommendedImprovements).toHaveLength(1);
  });

  it("retries a transient Gemini outage and then returns an evaluation", async () => {
    vi.useFakeTimers();
    try {
      generateContent
        .mockRejectedValueOnce(Object.assign(new Error("busy"), { status: 503 }))
        .mockResolvedValueOnce({ text: JSON.stringify(modelResponse) });
      const resultPromise = new GeminiEvaluator().evaluateRoleplay(
        scenario,
        defaultRubric,
        request,
      );
      await vi.advanceTimersByTimeAsync(400);
      const result = await resultPromise;
      expect(generateContent).toHaveBeenCalledTimes(2);
      expect(result.overallScore).toBe(55);
    } finally {
      vi.useRealTimers();
    }
  });
});
