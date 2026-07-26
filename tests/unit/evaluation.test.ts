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
import { parseCustomerTerminationOutput } from "@/domain/roleplay/termination";
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
  discovery: {
    title: "Discovery",
    score: 15,
    feedback: "Asked what concerned the customer most.",
    evidence: [{ transcriptIndex: 0, speaker: "user", shortQuote: "What concerns you most?", explanation: "This invited the customer to state a priority." }],
  },
  objectionHandling: {
    title: "Objection Handling",
    score: 10,
    feedback: "The cost concern was heard but not explored.",
    evidence: [{ transcriptIndex: 1, speaker: "customer", shortQuote: "worried about the cost", explanation: "This was a clear price concern." }],
  },
  listening: { title: "Listening", score: 12, feedback: "The question invited the customer's concern.", evidence: [] },
  communication: { title: "Communication", score: 14, feedback: "The question was concise and clear.", evidence: [] },
  closing: { title: "Closing", score: 4, feedback: "No next step appears in the transcript.", evidence: [] },
  continuationAdvice:
    "Acknowledge the cost concern and ask one simple follow-up question before suggesting a next step.",
  strengths: [{
    title: "Relevant opening",
    feedback: "Opened with a relevant question.",
    evidence: [{ transcriptIndex: 0, speaker: "user", shortQuote: "What concerns you most?", explanation: "The open question invited discovery." }],
  }],
  missedOpportunities: [{
    title: "Cost discovery",
    feedback: "Did not explore the cost concern.",
    evidence: [{ transcriptIndex: 1, speaker: "customer", shortQuote: "worried about the cost", explanation: "The concern created an opening for follow-up." }],
    betterResponse: "What part of the cost concerns you most?",
  }],
  recommendedImprovements: [{
    title: "Explore the objection",
    feedback: "Ask what makes the expected cost difficult.",
    evidence: [{ transcriptIndex: 1, speaker: "customer", shortQuote: "worried about the cost", explanation: "A follow-up should address this concern." }],
    betterResponse: "Could you share what budget you had in mind?",
  }],
};

describe("shared evaluation contract", () => {
  it("builds an evaluation-only prompt from the completed transcript", () => {
    const prompt = buildEvaluationPrompt(scenario, defaultRubric, request);
    expect(prompt).toContain("customer roleplay has ended");
    expect(prompt).toContain("Completed transcript:");
    expect(prompt).toContain("[0] user (1000ms): What concerns you most?");
    expect(prompt).toContain("Do not invent dialogue or facts");
    expect(prompt).toContain("Strengths may be empty");
    expect(prompt).toContain("Customer lost interest during the conversation");
    expect(prompt).toContain("could have kept the customer talking");
    expect(prompt).toContain('"discovery": { "title": "Discovery", "score": 0');
    expect(prompt).toContain("no additional keys");
  });

  it("removes evidence that does not exactly match the referenced transcript entry", () => {
    const result = parseEvaluationResult(
      JSON.stringify({
        ...modelResponse,
        strengths: [{
          title: "Invented evidence",
          feedback: "This claim is not grounded.",
          evidence: [{
            transcriptIndex: 0,
            speaker: "user",
            shortQuote: "A sentence that was never said.",
            explanation: "Unsupported.",
          }],
        }],
      }),
      request,
    );

    expect(result.strengths[0]?.evidence).toEqual([]);
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

  it("keeps customer end metadata out of dialogue while preserving the report reason", () => {
    const parsedEnding = parseCustomerTerminationOutput(
      'Thanks for your time. I will think about it. <END_CALL>{"category":"other"}</END_CALL>',
    );
    if (!parsedEnding.termination) throw new Error("Expected a customer termination.");
    const completedRequest: EvaluationRequest = {
      ...request,
      transcript: [
        request.transcript[0],
        {
          role: "customer",
          text: parsedEnding.visibleText,
          timestampMs: 2_000,
        },
      ],
      termination: parsedEnding.termination,
    };

    const result = parseEvaluationResult(JSON.stringify(modelResponse), completedRequest);
    expect(completedRequest.transcript.map((entry) => entry.text)).toEqual([
      "What concerns you most?",
      "Thanks for your time. I will think about it.",
    ]);
    expect(JSON.stringify(completedRequest.transcript)).not.toContain("END_CALL");
    expect(JSON.stringify(completedRequest.transcript)).not.toContain("Customer chose to end");
    expect(result.callSummary.endReason).toBe("Customer chose to end the call.");
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
