import { z } from "zod";

export const CUSTOMER_END_CALL_START_MARKER = "<END_CALL>";
export const CUSTOMER_END_CALL_END_MARKER = "</END_CALL>";

export const customerEndCategorySchema = z.enum([
  "confusion",
  "busy",
  "wrong-person",
  "loss-of-trust",
  "loss-of-interest",
  "other",
]);

export const endCategorySchema = z.enum([
  ...customerEndCategorySchema.options,
  "representative-ended",
  "time-limit",
  "connection-ended",
]);

export const callTerminationSchema = z
  .object({
    endedBy: z.enum(["customer", "representative", "system"]),
    endReason: z.string().trim().min(1).max(300),
    endCategory: endCategorySchema,
  })
  .strict();

const customerEndCallMarkerSchema = z
  .object({
    endedBy: z.string().trim().min(1),
    reason: z.string().trim().min(1).max(300),
    category: z.string().trim().min(1),
  })
  .passthrough();

export type CallTermination = z.infer<typeof callTerminationSchema>;

export interface ParsedCustomerTerminationOutput {
  visibleText: string;
  termination: CallTermination | null;
  markerFound: boolean;
  status: "none" | "pending" | "valid" | "invalid";
}

export function parseCustomerTerminationOutput(
  output: string,
): ParsedCustomerTerminationOutput {
  const marker = findOpeningMarker(output);
  if (!marker) {
    const potentialMarkerStart = findPotentialMarkerStart(output);
    return {
      visibleText: output.slice(0, potentialMarkerStart ?? output.length).trim(),
      termination: null,
      markerFound: false,
      status: potentialMarkerStart === null ? "none" : "pending",
    };
  }

  const visibleText = output.slice(0, marker.index).trim();
  const jsonStart = skipWhitespace(output, marker.index + marker.length);
  if (jsonStart >= output.length) {
    return { visibleText, termination: null, markerFound: true, status: "pending" };
  }
  if (output[jsonStart] !== "{") {
    return { visibleText, termination: null, markerFound: true, status: "invalid" };
  }

  const jsonEnd = findJsonObjectEnd(output, jsonStart);
  if (jsonEnd === null) {
    return { visibleText, termination: null, markerFound: true, status: "pending" };
  }

  try {
    const parsed = customerEndCallMarkerSchema.parse(
      JSON.parse(output.slice(jsonStart, jsonEnd)) as unknown,
    );
    const endedBy = parsed.endedBy.toLowerCase();
    const category = customerEndCategorySchema.parse(
      parsed.category.toLowerCase().replaceAll("_", "-"),
    );
    if (endedBy !== "customer") {
      return { visibleText, termination: null, markerFound: true, status: "invalid" };
    }
    return {
      visibleText,
      termination: {
        endedBy: "customer",
        endReason: parsed.reason,
        endCategory: category,
      },
      markerFound: true,
      status: "valid",
    };
  } catch {
    return { visibleText, termination: null, markerFound: true, status: "invalid" };
  }
}

interface MarkerLocation {
  index: number;
  length: number;
}

function findOpeningMarker(output: string): MarkerLocation | null {
  const match = /<\s*END_CALL\s*>?|END_CALL\s*>?/iu.exec(output);
  return match ? { index: match.index, length: match[0].length } : null;
}

function findPotentialMarkerStart(output: string): number | null {
  for (let index = 0; index < output.length; index += 1) {
    const suffix = output.slice(index);
    const compact = suffix.replaceAll(/\s/gu, "").toUpperCase();
    if (
      (compact.startsWith("<") && "<END_CALL".startsWith(compact)) ||
      (compact.includes("_") && "END_CALL".startsWith(compact))
    ) {
      return index;
    }
  }
  return null;
}

function skipWhitespace(output: string, start: number): number {
  let index = start;
  while (index < output.length && /\s/u.test(output[index])) index += 1;
  return index;
}

function findJsonObjectEnd(output: string, start: number): number | null {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < output.length; index += 1) {
    const character = output[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === '"') {
        inString = false;
      }
      continue;
    }

    if (character === '"') {
      inString = true;
    } else if (character === "{") {
      depth += 1;
    } else if (character === "}") {
      depth -= 1;
      if (depth === 0) return index + 1;
    }
  }

  return null;
}
