import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { scenarioRegistry } from "@/config/scenarios";
import { createRoleplaySessionRequestSchema } from "@/domain/roleplay/api";
import { attachFollowUpContext } from "@/domain/scenarios/registry";
import { provisionLiveSession } from "@/infrastructure/gemini/live-session";
import { resolveCustomerVoice } from "@/infrastructure/gemini/customer-voice";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 8_192;

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Request body is too large." }, { status: 413 });
  }

  try {
    const input = createRoleplaySessionRequestSchema.parse(await request.json());
    const resolvedScenario = scenarioRegistry.resolve(input);
    if (!resolvedScenario) {
      return NextResponse.json({ error: "Scenario not found." }, { status: 404 });
    }
    const scenario = attachFollowUpContext(
      resolvedScenario,
      input.followUpContext,
    );

    const voiceName = resolveCustomerVoice(scenario.public.archetypeId);
    const session = await provisionLiveSession(scenario, voiceName);
    return NextResponse.json(
      {
        sessionId: randomUUID(),
        ...session,
        scenario: scenario.public,
      },
      {
        headers: {
          "Cache-Control": "no-store",
          "X-Customer-Voice": voiceName,
        },
      },
    );
  } catch (error: unknown) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid session request." }, { status: 400 });
    }
    if (process.env.NODE_ENV === "development") {
      console.error("[roleplay-session] Live session provisioning failed.", error);
    }
    return NextResponse.json(
      { error: "The live session could not be created. Please try again." },
      { status: 502 },
    );
  }
}
