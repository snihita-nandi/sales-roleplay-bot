"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";

import { roleplaySessionResponseSchema } from "@/domain/roleplay/api";
import { createInitialRoleplayState, getCallMetrics, roleplayReducer } from "@/domain/roleplay/reducer";
import type { CallTermination } from "@/domain/roleplay/termination";
import type { CallMetrics, TranscriptEntry } from "@/domain/roleplay/types";
import type { PublicScenario } from "@/domain/scenarios/schema";
import { GeminiLiveTransport } from "@/infrastructure/gemini/browser-live-transport";

export interface CompletedRoleplay {
  transcript: TranscriptEntry[];
  metrics: CallMetrics;
  termination: CallTermination;
}

export function useRoleplaySession(
  scenario: PublicScenario,
  onComplete: (result: CompletedRoleplay) => void,
) {
  const durationSeconds = scenario.expectedDurationMinutes * 60;
  const [state, dispatch] = useReducer(
    roleplayReducer,
    durationSeconds,
    createInitialRoleplayState,
  );
  const transportRef = useRef<GeminiLiveTransport | null>(null);
  const completionSentRef = useRef(false);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const start = useCallback(async () => {
    dispatch({ type: "START" });
    completionSentRef.current = false;
    let stream: MediaStream | null = null;

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });
      dispatch({ type: "PERMISSION_GRANTED" });

      const response = await fetch("/api/roleplay-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: scenario.categoryId,
          archetypeId: scenario.archetypeId,
          difficulty: scenario.difficulty,
        }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error("A secure live session could not be created.");
      }
      const bootstrap = roleplaySessionResponseSchema.parse(payload);
      const transport = new GeminiLiveTransport(bootstrap, stream, {
        onConnected: () => dispatch({ type: "CONNECTED", at: Date.now() }),
        onTranscript: (entry) => dispatch({ type: "TRANSCRIPT", entry }),
        onInterrupted: () => dispatch({ type: "INTERRUPTED" }),
        onCustomerEnded: (termination) =>
          dispatch({ type: "CUSTOMER_ENDED", termination }),
        onError: (message) => dispatch({ type: "FAIL", message }),
        onClosed: () => dispatch({ type: "CLOSED" }),
      });
      transportRef.current = transport;
      await transport.connect();
    } catch (error: unknown) {
      for (const track of stream?.getTracks() ?? []) track.stop();
      const message =
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "Microphone access was denied. Allow access in your browser and try again."
          : error instanceof Error
            ? error.message
            : "The roleplay could not be started.";
      dispatch({ type: "FAIL", message });
    }
  }, [scenario.archetypeId, scenario.categoryId, scenario.difficulty]);

  const end = useCallback(() => dispatch({ type: "END" }), []);

  const toggleMute = useCallback(() => {
    transportRef.current?.setMuted(!state.muted);
    dispatch({ type: "TOGGLE_MUTE" });
  }, [state.muted]);

  const reset = useCallback(() => {
    completionSentRef.current = false;
    dispatch({ type: "RESET", durationSeconds });
  }, [durationSeconds]);

  useEffect(() => {
    if (state.phase !== "active") return;
    const timer = window.setInterval(() => dispatch({ type: "TICK" }), 1_000);
    return () => window.clearInterval(timer);
  }, [state.phase]);

  useEffect(() => {
    if (state.phase !== "ending") return;
    if (state.termination?.endedBy === "customer") return;
    void transportRef.current?.close().catch(() => dispatch({ type: "CLOSED" }));
  }, [state.phase, state.termination]);

  useEffect(() => {
    if (state.phase !== "completed" || completionSentRef.current) return;
    if (!state.termination) return;
    completionSentRef.current = true;
    const transcript = state.transcript
      .filter((entry) => entry.text.trim())
      .map((entry) => ({ ...entry, final: true }));
    onCompleteRef.current({
      transcript,
      metrics: getCallMetrics(state, durationSeconds),
      termination: state.termination,
    });
  }, [durationSeconds, state]);

  useEffect(
    () => () => {
      void transportRef.current?.close();
    },
    [],
  );

  return { state, start, end, toggleMute, reset };
}
