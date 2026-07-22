import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const completionCreate = vi.hoisted(() => vi.fn());
const groqConstructor = vi.hoisted(() => vi.fn());

vi.mock("groq-sdk", () => ({
  default: class {
    readonly chat = { completions: { create: completionCreate } };

    constructor(options: unknown) {
      groqConstructor(options);
    }
  },
}));

import { defaultRubric } from "@/config/rubrics/default";
import { scenarioRegistry } from "@/config/scenarios";
import type { EvaluationModelResponse, EvaluationRequest } from "@/domain/evaluation/schema";
import {
  GROQ_EVALUATION_MODEL,
  GroqEvaluator,
} from "@/infrastructure/evaluation/groq-evaluator";

const scenario = scenarioRegistry.get("insurance--new-parent--hard");
if (!scenario) throw new Error("Expected configured evaluation scenario.");

const request: EvaluationRequest = {
  scenarioId: scenario.public.id,
  transcript: [{ role: "representative", text: "What matters most?", timestampMs: 1_000 }],
  metrics: {
    durationSeconds: 20,
    representativeTurns: 1,
    customerTurns: 0,
    interruptions: 0,
  },
  termination: {
    endedBy: "representative",
    endReason: "The sales representative chose to end the call.",
    endCategory: "representative-ended",
  },
};

const modelResponse: EvaluationModelResponse = {
  summary: "The representative asked one useful question.",
  discovery: { score: 12, evidence: "Asked what matters most." },
  objectionHandling: { score: 0, evidence: "No objection occurred." },
  listening: { score: 5, evidence: "There was no customer response to follow." },
  communication: { score: 12, evidence: "The question was concise." },
  closing: { score: 0, evidence: "No next step was discussed." },
  continuationAdvice:
    "Wait for the customer's answer and ask a useful follow-up question.",
  strengths: ["Asked an open question."],
  missedOpportunities: ["The call ended before follow-up discovery."],
  recommendedImprovements: ["Continue with a relevant follow-up question."],
};

describe("Groq evaluator", () => {
  beforeEach(() => {
    vi.stubEnv("GROQ_API_KEY", "groq-test-key");
    completionCreate.mockReset();
    groqConstructor.mockClear();
  });

  afterEach(() => vi.unstubAllEnvs());

  it("uses the configured Groq key and supported Llama model", async () => {
    completionCreate.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify(modelResponse) } }],
    });
    const result = await new GroqEvaluator().evaluateRoleplay(scenario, defaultRubric, request);

    expect(groqConstructor).toHaveBeenCalledWith({ apiKey: "groq-test-key", maxRetries: 0 });
    expect(completionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: GROQ_EVALUATION_MODEL,
        response_format: { type: "json_object" },
      }),
      { timeout: 15_000 },
    );
    expect(result.overallScore).toBe(29);
    expect(result.callSummary.endedBy).toBe("representative");
  });

  it("retries output that does not match the frontend evaluation contract", async () => {
    vi.useFakeTimers();
    try {
      completionCreate
        .mockResolvedValueOnce({
          choices: [{ message: { content: JSON.stringify({ summary: "Incomplete" }) } }],
        })
        .mockResolvedValueOnce({
          choices: [{ message: { content: JSON.stringify(modelResponse) } }],
        });
      const resultPromise = new GroqEvaluator().evaluateRoleplay(scenario, defaultRubric, request);
      await vi.advanceTimersByTimeAsync(400);
      const result = await resultPromise;
      expect(completionCreate).toHaveBeenCalledTimes(2);
      expect(result.overallScore).toBe(29);
    } finally {
      vi.useRealTimers();
    }
  });

  it("accepts an honest empty strengths list instead of rejecting a weak call", async () => {
    completionCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              ...modelResponse,
              strengths: [],
            }),
          },
        },
      ],
    });

    const result = await new GroqEvaluator().evaluateRoleplay(scenario, defaultRubric, request);

    expect(result.strengths).toEqual([]);
    expect(completionCreate).toHaveBeenCalledTimes(1);
  });
});
