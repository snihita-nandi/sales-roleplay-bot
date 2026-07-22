import type { RoleplayEvent, RoleplayState, TranscriptEntry } from "@/domain/roleplay/types";

export function createInitialRoleplayState(durationSeconds: number): RoleplayState {
  return {
    phase: "idle",
    muted: false,
    remainingSeconds: durationSeconds,
    startedAt: null,
    transcript: [],
    interruptions: 0,
    termination: null,
    error: null,
  };
}

function upsertTranscript(entries: TranscriptEntry[], incoming: TranscriptEntry): TranscriptEntry[] {
  const index = entries.findIndex((entry) => entry.id === incoming.id);
  if (index === -1) {
    return [...entries, incoming];
  }
  if (entries[index].final) return entries;
  return entries.map((entry, entryIndex) => (entryIndex === index ? incoming : entry));
}

export function roleplayReducer(state: RoleplayState, event: RoleplayEvent): RoleplayState {
  switch (event.type) {
    case "START":
      return { ...state, phase: "requesting-permission", error: null };
    case "PERMISSION_GRANTED":
      return { ...state, phase: "connecting" };
    case "CONNECTED":
      return { ...state, phase: "active", startedAt: event.at };
    case "TRANSCRIPT":
      return { ...state, transcript: upsertTranscript(state.transcript, event.entry) };
    case "INTERRUPTED":
      return { ...state, interruptions: state.interruptions + 1 };
    case "TICK": {
      if (state.phase !== "active") return state;
      const remainingSeconds = Math.max(0, state.remainingSeconds - 1);
      return {
        ...state,
        remainingSeconds,
        phase: remainingSeconds === 0 ? "ending" : state.phase,
        termination:
          remainingSeconds === 0
            ? {
                endedBy: "system",
                endReason: "The practice time limit was reached.",
                endCategory: "time-limit",
              }
            : state.termination,
      };
    }
    case "TOGGLE_MUTE":
      return state.phase === "active" ? { ...state, muted: !state.muted } : state;
    case "END":
      return state.phase === "active" || state.phase === "connecting"
        ? {
            ...state,
            phase: "ending",
            termination: {
              endedBy: "representative",
              endReason: "The sales representative chose to end the call.",
              endCategory: "representative-ended",
            },
          }
        : state;
    case "CUSTOMER_ENDED":
      return state.phase === "active"
        ? { ...state, phase: "ending", termination: event.termination }
        : state;
    case "CLOSED":
      return {
        ...state,
        phase: "completed",
        muted: true,
        termination: state.termination ?? {
          endedBy: "system",
          endReason: "The live connection ended the call.",
          endCategory: "connection-ended",
        },
      };
    case "FAIL":
      return { ...state, phase: "error", muted: true, error: event.message };
    case "RESET":
      return createInitialRoleplayState(event.durationSeconds);
  }
}

export function getCallMetrics(state: RoleplayState, durationSeconds: number): CallMetricsResult {
  return {
    durationSeconds: Math.max(0, durationSeconds - state.remainingSeconds),
    representativeTurns: state.transcript.filter(
      (entry) => entry.role === "representative" && entry.final,
    ).length,
    customerTurns: state.transcript.filter((entry) => entry.role === "customer" && entry.final).length,
    interruptions: state.interruptions,
  };
}

type CallMetricsResult = {
  durationSeconds: number;
  representativeTurns: number;
  customerTurns: number;
  interruptions: number;
};
