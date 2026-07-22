import type { CallTermination } from "@/domain/roleplay/termination";

export type TranscriptRole = "representative" | "customer";

export interface TranscriptEntry {
  id: string;
  role: TranscriptRole;
  text: string;
  timestampMs: number;
  final: boolean;
}

export interface CallMetrics {
  durationSeconds: number;
  representativeTurns: number;
  customerTurns: number;
  interruptions: number;
}

export type RoleplayPhase =
  | "idle"
  | "requesting-permission"
  | "connecting"
  | "active"
  | "ending"
  | "completed"
  | "error";

export interface RoleplayState {
  phase: RoleplayPhase;
  muted: boolean;
  remainingSeconds: number;
  startedAt: number | null;
  transcript: TranscriptEntry[];
  interruptions: number;
  termination: CallTermination | null;
  error: string | null;
}

export type RoleplayEvent =
  | { type: "START" }
  | { type: "PERMISSION_GRANTED" }
  | { type: "CONNECTED"; at: number }
  | { type: "TRANSCRIPT"; entry: TranscriptEntry }
  | { type: "INTERRUPTED" }
  | { type: "TICK" }
  | { type: "TOGGLE_MUTE" }
  | { type: "END" }
  | { type: "CUSTOMER_ENDED"; termination: CallTermination }
  | { type: "CLOSED" }
  | { type: "FAIL"; message: string }
  | { type: "RESET"; durationSeconds: number };

export interface RoleplayTransportCallbacks {
  onConnected(): void;
  onTranscript(entry: TranscriptEntry): void;
  onInterrupted(): void;
  onCustomerEnded(termination: CallTermination): void;
  onError(message: string): void;
  onClosed(): void;
}

export interface RoleplayTransport {
  connect(): Promise<void>;
  setMuted(muted: boolean): void;
  interrupt(): void;
  close(): Promise<void>;
}
