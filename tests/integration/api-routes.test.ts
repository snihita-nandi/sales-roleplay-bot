import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/infrastructure/gemini/live-session", () => ({
  provisionLiveSession: vi.fn(async () => ({
    ephemeralToken: "ephemeral-test-token",
    expiresAt: "2026-07-22T12:00:00.000Z",
    model: "gemini-live-test",
  })),
}));

const evaluationMocks = vi.hoisted(() => ({
  evaluateRoleplay: vi.fn(async () => ({
    overallScore: 25,
    summary: "The representative opened clearly but did not explore the customer's needs.",
    discovery: { score: 2, evidence: "No discovery question was asked." },
    objectionHandling: { score: 3, evidence: "The objection was acknowledged briefly." },
    listening: { score: 5, evidence: "The response referenced the customer's concern." },
    communication: { score: 10, evidence: "The opening was concise and understandable." },
    closing: { score: 5, evidence: "No explicit next step was agreed." },
    continuationAdvice:
      "Acknowledge the concern and ask one clear question before moving on.",
    strengths: ["Opened the conversation clearly."],
    missedOpportunities: ["Did not ask a discovery question."],
    recommendedImprovements: ["Ask an open discovery question before presenting."],
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

describe("API routes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns public scenario summaries without private facts", async () => {
    const response = listScenarios();
    const body = (await response.json()) as {
      catalog: { categories: unknown[]; difficulties: unknown[] };
    };
    expect(response.status).toBe(200);
    expect(body.catalog.categories).toHaveLength(4);
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
    expect(body.scenario.id).toBe("insurance--new-parent--hard");
    expect(body.scenario.difficulty).toBe("hard");
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
