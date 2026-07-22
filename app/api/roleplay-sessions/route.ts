import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { scenarioRegistry } from "@/config/scenarios";
import { createRoleplaySessionRequestSchema } from "@/domain/roleplay/api";
import { provisionLiveSession } from "@/infrastructure/gemini/live-session";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 2_048;

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Request body is too large." }, { status: 413 });
  }

  try {
    const input = createRoleplaySessionRequestSchema.parse(await request.json());
    const scenario = scenarioRegistry.resolve(input);
    if (!scenario) {
      return NextResponse.json({ error: "Scenario not found." }, { status: 404 });
    }

    const session = await provisionLiveSession(scenario);
    return NextResponse.json(
      {
        sessionId: randomUUID(),
        ...session,
        scenario: scenario.public,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error: unknown) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid session request." }, { status: 400 });
    }
    return NextResponse.json(
      { error: "The live session could not be created. Please try again." },
      { status: 502 },
    );
  }
}
