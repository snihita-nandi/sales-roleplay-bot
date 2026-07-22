import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { defaultRubric } from "@/config/rubrics/default";
import { scenarioRegistry } from "@/config/scenarios";
import {
  evaluationRequestSchema,
  type EvaluationRequest,
} from "@/domain/evaluation/schema";
import {
  evaluateRoleplay,
  getEvaluationProviderDiagnostics,
  isRetryableEvaluationError,
} from "@/infrastructure/evaluation";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 250_000;

function getExceptionProperty(error: unknown, property: string): unknown {
  if (typeof error !== "object" || error === null || !(property in error)) return undefined;
  return (error as Record<string, unknown>)[property];
}

function logEvaluationException(
  error: unknown,
  input: EvaluationRequest,
  requestPayloadSizeBytes: number,
): void {
  if (process.env.NODE_ENV !== "development") return;

  const exceptionName = error instanceof Error ? error.name : typeof error;
  const exceptionMessage = error instanceof Error ? error.message : String(error);
  const stackTrace = error instanceof Error ? error.stack : undefined;
  const providerResponse = getExceptionProperty(error, "response");
  const providerDiagnostics = getEvaluationProviderDiagnostics();

  console.error("[evaluation] Original exception:", error);
  console.error("[evaluation] Exception name:", exceptionName);
  console.error("[evaluation] Exception message:", exceptionMessage);
  console.error("[evaluation] Stack trace:", stackTrace);
  console.error("[evaluation] Provider response:", providerResponse ?? "Not available");
  console.error("[evaluation] Provider status:", getExceptionProperty(error, "status"));
  console.error("[evaluation] Provider code:", getExceptionProperty(error, "code"));
  console.error("[evaluation] Provider details:", getExceptionProperty(error, "details"));
  console.error("[evaluation] Provider:", providerDiagnostics.provider);
  console.error("[evaluation] Model:", providerDiagnostics.model);
  console.error("[evaluation] Request payload size (bytes):", requestPayloadSizeBytes);
  console.error("[evaluation] Transcript entries:", input.transcript.length);
  console.error(
    "[evaluation] Transcript characters:",
    input.transcript.reduce((total, entry) => total + entry.text.length, 0),
  );
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Transcript is too large." }, { status: 413 });
  }

  let input: EvaluationRequest;
  let requestPayloadSizeBytes = contentLength;
  try {
    const requestBody = await request.text();
    requestPayloadSizeBytes = new TextEncoder().encode(requestBody).byteLength;
    if (requestPayloadSizeBytes > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Transcript is too large." }, { status: 413 });
    }
    input = evaluationRequestSchema.parse(JSON.parse(requestBody) as unknown);
  } catch (error: unknown) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid evaluation request." }, { status: 400 });
    }
    return NextResponse.json({ error: "Evaluation request could not be read." }, { status: 400 });
  }

  const scenario = scenarioRegistry.get(input.scenarioId);
  if (!scenario) {
    return NextResponse.json({ error: "Scenario not found." }, { status: 404 });
  }

  try {
    const evaluation = await evaluateRoleplay(scenario, defaultRubric, input);
    return NextResponse.json({ evaluation }, { headers: { "Cache-Control": "no-store" } });
  } catch (error: unknown) {
    logEvaluationException(error, input, requestPayloadSizeBytes);
    const retryable = isRetryableEvaluationError(error);
    return NextResponse.json(
      {
        error: retryable
          ? "The evaluation provider is temporarily busy. Your transcript is safe; retry shortly."
          : "The evaluator returned an invalid response. Your transcript is safe; please retry.",
        retryable: true,
      },
      { status: retryable ? 503 : 502 },
    );
  }
}
