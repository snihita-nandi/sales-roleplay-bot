import { beforeEach, describe, expect, it, vi } from "vitest";

const liveSessionMocks = vi.hoisted(() => ({
  provisionLiveSession: vi.fn(async (scenario: unknown, voiceName: string) => {
    void scenario;
    void voiceName;
    return {
      ephemeralToken: "ephemeral-test-token",
      expiresAt: "2026-07-22T12:00:00.000Z",
      model: "gemini-live-test",
    };
  }),
}));

vi.mock("@/infrastructure/gemini/live-session", () => liveSessionMocks);

const evaluationMocks = vi.hoisted(() => ({
  evaluateRoleplay: vi.fn(async () => ({
    overallScore: 25,
    summary: "The representative opened clearly but did not explore the customer's needs.",
    discovery: { title: "Discovery", score: 2, feedback: "No discovery question was asked.", evidence: [] },
    objectionHandling: { title: "Objection Handling", score: 3, feedback: "The objection was acknowledged briefly.", evidence: [] },
    listening: { title: "Listening", score: 5, feedback: "The response referenced the customer's concern.", evidence: [] },
    communication: { title: "Communication", score: 10, feedback: "The opening was concise and understandable.", evidence: [] },
    closing: { title: "Closing", score: 5, feedback: "No explicit next step was agreed.", evidence: [] },
    continuationAdvice:
      "Acknowledge the concern and ask one clear question before moving on.",
    strengths: [{ title: "Clear opening", feedback: "Opened the conversation clearly.", evidence: [] }],
    missedOpportunities: [{ title: "Discovery", feedback: "Did not ask a discovery question.", evidence: [], betterResponse: "What matters most to you?" }],
    recommendedImprovements: [{ title: "Ask first", feedback: "Ask an open discovery question before presenting.", evidence: [], betterResponse: "What would you like to improve?" }],
    callSummary: {
      endedBy: "representative",
      endReason: "The sales representative chose to end the call.",
      endCategory: "representative-ended",
      durationSeconds: 30,
      conversationTurns: 1,
    },
  })),
  isRetryableEvaluationError: vi.fn((error: unknown) => {
    return (
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      error.status === 503
    );
  }),
  getEvaluationProviderDiagnostics: vi.fn(() => ({
    provider: "groq",
    model: "llama-3.3-70b-versatile",
  })),
}));

vi.mock("@/infrastructure/evaluation", () => evaluationMocks);

import { POST as evaluate } from "@/app/api/evaluations/route";
import { POST as createSession } from "@/app/api/roleplay-sessions/route";
import { GET as listScenarios } from "@/app/api/scenarios/route";
import { resolveCustomerVoice } from "@/infrastructure/gemini/customer-voice";

describe("API routes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns public scenario summaries without private facts", async () => {
    const response = listScenarios();
    const body = (await response.json()) as {
      catalog: { categories: unknown[]; difficulties: unknown[] };
    };
    expect(response.status).toBe(200);
    expect(body.catalog.categories).toHaveLength(11);
    expect(body.catalog.difficulties).toHaveLength(4);
    expect(JSON.stringify(body)).not.toContain("Missed service levels cost");
    expect(JSON.stringify(body)).not.toContain("skepticism");
  });

  it("creates a no-store session from a valid scenario id", async () => {
    const response = await createSession(
      new Request("http://localhost/api/roleplay-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: "insurance",
          archetypeId: "new-parent",
          scenarioId: "comparing-options",
          difficulty: "hard",
        }),
      }),
    );
    const body = (await response.json()) as {
      ephemeralToken: string;
      scenario: { id: string; difficulty: string };
    };
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body.ephemeralToken).toBe("ephemeral-test-token");
    expect(response.headers.get("x-customer-voice")).toBe(
      resolveCustomerVoice("new-parent"),
    );
    expect(liveSessionMocks.provisionLiveSession.mock.calls[0]?.[1]).toBe(
      response.headers.get("x-customer-voice"),
    );
    expect(body.scenario.id).toBe("insurance--new-parent--comparing-options--hard");
    expect(body.scenario.difficulty).toBe("hard");
  });

  it("keeps legacy session requests compatible by selecting the profile default", async () => {
    const response = await createSession(
      new Request("http://localhost/api/roleplay-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: "insurance",
          archetypeId: "new-parent",
          difficulty: "easy",
        }),
      }),
    );
    const body = (await response.json()) as {
      scenario: { profileScenarioId: string };
    };
    expect(response.status).toBe(200);
    expect(body.scenario.profileScenarioId).toBe("initial-needs-conversation");
  });

  it("carries context into a follow-up session", async () => {
    const response = await createSession(
      new Request("http://localhost/api/roleplay-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: "b2b-saas",
          archetypeId: "startup-founder",
          scenarioId: "decision-follow-up",
          difficulty: "medium",
          followUpContext: {
            lastConversationSummary: "We reviewed the workflow.",
            agreedNextSteps: "A security brief would be sent.",
            previousConversationTime: "yesterday",
            additionalNotes: "",
          },
        }),
      }),
    );
    const body = (await response.json()) as {
      scenario: {
        followUpContext?: { lastConversationSummary: string };
      };
    };

    expect(response.status).toBe(200);
    expect(body.scenario.followUpContext?.lastConversationSummary).toBe(
      "We reviewed the workflow.",
    );
  });

  it("rejects unknown scenarios before calling Gemini", async () => {
    const response = await createSession(
      new Request("http://localhost/api/roleplay-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: "not-real",
          archetypeId: "not-real",
          difficulty: "medium",
        }),
      }),
    );
    expect(response.status).toBe(404);
  });

  it("validates evaluation transcripts at the boundary", async () => {
    const response = await evaluate(
      new Request("http://localhost/api/evaluations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId: "logistics-operations", transcript: [], metrics: {} }),
      }),
    );
    expect(response.status).toBe(400);
  });

  it("returns a structured evaluation for a completed transcript", async () => {
    const response = await evaluate(
      new Request("http://localhost/api/evaluations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenarioId: "insurance--new-parent--hard",
          transcript: [
            { role: "representative", text: "What matters most to you?", timestampMs: 1_000 },
          ],
          metrics: {
            durationSeconds: 30,
            representativeTurns: 1,
            customerTurns: 0,
            interruptions: 0,
          },
          termination: {
            endedBy: "representative",
            endReason: "The sales representative chose to end the call.",
            endCategory: "representative-ended",
          },
        }),
      }),
    );
    const body = (await response.json()) as { evaluation: { overallScore: number } };
    expect(response.status).toBe(200);
    expect(body.evaluation.overallScore).toBe(25);
  });

  it("reports a retryable provider outage without exposing provider details", async () => {
    evaluationMocks.evaluateRoleplay.mockRejectedValueOnce(
      Object.assign(new Error("internal provider diagnostic"), { status: 503 }),
    );
    const response = await evaluate(
      new Request("http://localhost/api/evaluations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenarioId: "insurance--new-parent--hard",
          transcript: [],
          metrics: {
            durationSeconds: 0,
            representativeTurns: 0,
            customerTurns: 0,
            interruptions: 0,
          },
          termination: {
            endedBy: "system",
            endReason: "The live connection ended the call.",
            endCategory: "connection-ended",
          },
        }),
      }),
    );
    const body = (await response.json()) as { error: string; retryable: boolean };
    expect(response.status).toBe(503);
    expect(body.retryable).toBe(true);
    expect(body.error).toContain("temporarily busy");
    expect(body.error).not.toContain("internal provider diagnostic");
  });
});
