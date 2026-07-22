import { z } from "zod";

import {
  practiceCatalogSchema,
  publicScenarioSchema,
  scenarioSelectionSchema,
} from "@/domain/scenarios/schema";

export const scenarioListResponseSchema = z
  .object({
    catalog: practiceCatalogSchema,
  })
  .strict();

export const createRoleplaySessionRequestSchema = scenarioSelectionSchema;

export const roleplaySessionResponseSchema = z
  .object({
    sessionId: z.string().uuid(),
    ephemeralToken: z.string().min(1),
    expiresAt: z.string().datetime(),
    model: z.string().min(1),
    scenario: publicScenarioSchema,
  })
  .strict();

export type RoleplaySessionResponse = z.infer<typeof roleplaySessionResponseSchema>;
