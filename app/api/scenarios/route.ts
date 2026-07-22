import { NextResponse } from "next/server";

import { scenarioRegistry } from "@/config/scenarios";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json(
    { catalog: scenarioRegistry.getCatalog() },
    { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" } },
  );
}
