import type { FollowUpContext, FollowUpTime } from "@/domain/scenarios/schema";

export const FOLLOW_UP_SCENARIO_ID = "decision-follow-up";

export const FOLLOW_UP_TIME_OPTIONS: ReadonlyArray<{
  value: FollowUpTime;
  label: string;
}> = [
  { value: "earlier-today", label: "Earlier today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "two-three-days-ago", label: "2–3 days ago" },
  { value: "last-week", label: "Last week" },
  { value: "two-weeks-ago", label: "Two weeks ago" },
  { value: "last-month", label: "Last month" },
  { value: "custom", label: "Custom" },
];

export function createEmptyFollowUpContext(): FollowUpContext {
  return {
    lastConversationSummary: "",
    agreedNextSteps: "",
    previousConversationTime: "last-week",
    additionalNotes: "",
  };
}

export function formatFollowUpTime(context: FollowUpContext): string {
  if (context.previousConversationTime === "custom") {
    return context.customDate ?? "Custom date not provided";
  }

  return (
    FOLLOW_UP_TIME_OPTIONS.find(
      ({ value }) => value === context.previousConversationTime,
    )?.label ?? context.previousConversationTime
  );
}
