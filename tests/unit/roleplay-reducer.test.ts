import { describe, expect, it } from "vitest";

import { createInitialRoleplayState, getCallMetrics, roleplayReducer } from "@/domain/roleplay/reducer";
import {
  createCustomerTermination,
  parseCustomerTerminationOutput,
} from "@/domain/roleplay/termination";
import type { RoleplayState } from "@/domain/roleplay/types";

describe("roleplay reducer", () => {
  it("models a complete call without mixing evaluation state", () => {
    let state = createInitialRoleplayState(120);
    state = roleplayReducer(state, { type: "START" });
    expect(state.phase).toBe("requesting-permission");
    state = roleplayReducer(state, { type: "PERMISSION_GRANTED" });
    state = roleplayReducer(state, { type: "CONNECTED", at: 1_000 });
    expect(state.phase).toBe("active");
    state = roleplayReducer(state, { type: "END" });
    expect(state.phase).toBe("ending");
    expect(state.termination).toEqual({
      endedBy: "representative",
      endReason: "The sales representative chose to end the call.",
      endCategory: "representative-ended",
    });
    state = roleplayReducer(state, { type: "CLOSED" });
    expect(state.phase).toBe("completed");
    expect(state).not.toHaveProperty("evaluation");
  });

  it("updates interim transcripts in place and counts final turns", () => {
    let state = createInitialRoleplayState(120);
    state = roleplayReducer(state, {
      type: "TRANSCRIPT",
      entry: { id: "turn-1", role: "representative", text: "How", timestampMs: 1, final: false },
    });
    state = roleplayReducer(state, {
      type: "TRANSCRIPT",
      entry: {
        id: "turn-1",
        role: "representative",
        text: "How do you handle exceptions?",
        timestampMs: 2,
        final: true,
      },
    });
    expect(state.transcript).toHaveLength(1);
    expect(getCallMetrics(state, 120).representativeTurns).toBe(1);
  });

  it("never modifies a finalized transcript entry", () => {
    let state = createInitialRoleplayState(120);
    state = roleplayReducer(state, {
      type: "TRANSCRIPT",
      entry: { id: "user-1", role: "representative", text: "Hello", timestampMs: 1, final: true },
    });
    state = roleplayReducer(state, {
      type: "TRANSCRIPT",
      entry: {
        id: "user-1",
        role: "representative",
        text: "Hello Are you speaking from XYZ company?",
        timestampMs: 2,
        final: true,
      },
    });

    expect(state.transcript).toEqual([
      { id: "user-1", role: "representative", text: "Hello", timestampMs: 1, final: true },
    ]);
  });

  it("preserves distinct user and assistant turns during rapid back-and-forth", () => {
    let state = createInitialRoleplayState(120);
    const entries = [
      { id: "user-1", role: "representative", text: "Hello", timestampMs: 1, final: true },
      { id: "bot-1", role: "customer", text: "Hello.", timestampMs: 2, final: true },
      {
        id: "user-2",
        role: "representative",
        text: "Are you speaking from XYZ company?",
        timestampMs: 3,
        final: true,
      },
      { id: "bot-2", role: "customer", text: "Yes.", timestampMs: 4, final: true },
      { id: "bot-3", role: "customer", text: "How can I help?", timestampMs: 5, final: true },
    ] as const;

    for (const entry of entries) {
      state = roleplayReducer(state, { type: "TRANSCRIPT", entry });
    }

    expect(state.transcript.map((entry) => entry.text)).toEqual([
      "Hello",
      "Hello.",
      "Are you speaking from XYZ company?",
      "Yes.",
      "How can I help?",
    ]);
    expect(getCallMetrics(state, 120)).toMatchObject({
      representativeTurns: 2,
      customerTurns: 3,
    });
  });

  it("keeps every turn separate through three complete exchanges", () => {
    let state = createInitialRoleplayState(120);
    const entries = [
      { id: "user-1", role: "representative", text: "Hello.", timestampMs: 1, final: true },
      {
        id: "assistant-1",
        role: "customer",
        text: "Hello, this is Elijah.",
        timestampMs: 2,
        final: true,
      },
      {
        id: "user-2",
        role: "representative",
        text: "I'm Rachel from XYZ.",
        timestampMs: 3,
        final: true,
      },
      {
        id: "assistant-2",
        role: "customer",
        text: "Hi Rachel, what is this about?",
        timestampMs: 4,
        final: true,
      },
      {
        id: "user-3",
        role: "representative",
        text: "I wanted to ask about your current process.",
        timestampMs: 5,
        final: true,
      },
      {
        id: "assistant-3",
        role: "customer",
        text: "Okay, what would you like to know?",
        timestampMs: 6,
        final: true,
      },
    ] as const;

    for (const entry of entries) state = roleplayReducer(state, { type: "TRANSCRIPT", entry });

    expect(state.transcript.map(({ id, text }) => ({ id, text }))).toEqual(
      entries.map(({ id, text }) => ({ id, text })),
    );
    expect(getCallMetrics(state, 120)).toMatchObject({
      representativeTurns: 3,
      customerTurns: 3,
    });
  });

  it("keeps a user interruption separate from the assistant draft", () => {
    let state = createInitialRoleplayState(120);
    state = roleplayReducer(state, {
      type: "TRANSCRIPT",
      entry: {
        id: "bot-1",
        role: "customer",
        text: "Let me explain",
        timestampMs: 1,
        final: false,
      },
    });
    state = roleplayReducer(state, {
      type: "TRANSCRIPT",
      entry: {
        id: "user-1",
        role: "representative",
        text: "Wait, what does that mean?",
        timestampMs: 2,
        final: true,
      },
    });
    state = roleplayReducer(state, {
      type: "TRANSCRIPT",
      entry: {
        id: "bot-1",
        role: "customer",
        text: "Let me explain that differently.",
        timestampMs: 3,
        final: true,
      },
    });

    expect(state.transcript).toEqual([
      {
        id: "bot-1",
        role: "customer",
        text: "Let me explain that differently.",
        timestampMs: 3,
        final: true,
      },
      {
        id: "user-1",
        role: "representative",
        text: "Wait, what does that mean?",
        timestampMs: 2,
        final: true,
      },
    ]);
  });

  it("ends automatically when the conservative timer reaches zero", () => {
    let state: RoleplayState = { ...createInitialRoleplayState(1), phase: "active" };
    state = roleplayReducer(state, { type: "TICK" });
    expect(state.remainingSeconds).toBe(0);
    expect(state.phase).toBe("ending");
    expect(state.termination?.endCategory).toBe("time-limit");
  });

  it("stores a customer-controlled ending before closing the session", () => {
    let state: RoleplayState = { ...createInitialRoleplayState(120), phase: "active" };
    state = roleplayReducer(state, {
      type: "CUSTOMER_ENDED",
      termination: {
        endedBy: "customer",
        endReason: "Customer felt their questions were not being answered.",
        endCategory: "loss-of-trust",
      },
    });

    expect(state.phase).toBe("ending");
    expect(state.termination).toEqual({
      endedBy: "customer",
      endReason: "Customer felt their questions were not being answered.",
      endCategory: "loss-of-trust",
    });

    state = roleplayReducer(state, { type: "CLOSED" });
    expect(state.phase).toBe("completed");
    expect(state.termination?.endedBy).toBe("customer");
  });
});

describe("customer termination marker", () => {
  it("creates silent termination metadata from an out-of-band tool category", () => {
    expect(createCustomerTermination("loss-of-interest")).toEqual({
      endedBy: "customer",
      endReason: "Customer ended the call because they were no longer interested in continuing.",
      endCategory: "loss-of-interest",
    });
    expect(createCustomerTermination("not-a-category")).toBeNull();
  });

  it("withholds a partial marker from the visible customer transcript", () => {
    const parsed = parseCustomerTerminationOutput("I need to get back to work. <END_");

    expect(parsed.visibleText).toBe("I need to get back to work.");
    expect(parsed.termination).toBeNull();
  });

  it("strips and validates a complete termination marker", () => {
    const parsed = parseCustomerTerminationOutput(
      'I need to go now. <END_CALL>{"endedBy":"customer","reason":"Customer was busy and chose to end the call.","category":"busy"}</END_CALL>',
    );

    expect(parsed.visibleText).toBe("I need to go now.");
    expect(parsed.visibleText).not.toContain("END_CALL");
    expect(parsed.termination).toEqual({
      endedBy: "customer",
      endReason: "Customer ended the call because they needed to return to other priorities.",
      endCategory: "busy",
    });
    expect(parsed.status).toBe("valid");
  });

  it.each([
    "END_CALL>",
    "<END_CALL",
    "END_CALL",
    "<  END_CALL  >",
  ])("accepts the malformed or spaced opening marker %s", (openingMarker) => {
    const parsed = parseCustomerTerminationOutput(
      `I have to go. ${openingMarker}\n {"endedBy":"Customer","reason":"Customer was busy and chose to end the call.","category":"BUSY"}</END_CALL>`,
    );

    expect(parsed.visibleText).toBe("I have to go.");
    expect(parsed.termination).toEqual({
      endedBy: "customer",
      endReason: "Customer ended the call because they needed to return to other priorities.",
      endCategory: "busy",
    });
  });

  it("ignores model-authored reasons and derives trusted report metadata locally", () => {
    const parsed = parseCustomerTerminationOutput(
      'That is all. END_CALL>{"endedBy":"customer","reason":"Customer said the {details} were unclear.","category":"confusion"}',
    );

    expect(parsed.status).toBe("valid");
    expect(parsed.termination?.endReason).toBe(
      "Customer ended the call because the conversation remained unclear.",
    );
    expect(parsed.visibleText).toBe("That is all.");
  });

  it("accepts a category-only control block with no speakable evaluation reason", () => {
    const parsed = parseCustomerTerminationOutput(
      'Thanks for your time. I will think about it. <END_CALL>{"category":"other"}</END_CALL>',
    );

    expect(parsed.visibleText).toBe("Thanks for your time. I will think about it.");
    expect(parsed.termination).toEqual({
      endedBy: "customer",
      endReason: "Customer chose to end the call.",
      endCategory: "other",
    });
  });

  it("never exposes a malformed control block as dialogue", () => {
    const parsed = parseCustomerTerminationOutput(
      "Goodbye. <END_CALL>{not valid JSON}</END_CALL>",
    );

    expect(parsed.visibleText).toBe("Goodbye.");
    expect(parsed.termination).toBeNull();
    expect(parsed.markerFound).toBe(true);
    expect(parsed.status).toBe("invalid");
  });

  it("withholds incomplete JSON metadata while waiting for later chunks", () => {
    const parsed = parseCustomerTerminationOutput(
      'Goodbye. END_CALL> {"endedBy":"customer","reason":"Customer was busy',
    );

    expect(parsed.visibleText).toBe("Goodbye.");
    expect(parsed.termination).toBeNull();
    expect(parsed.status).toBe("pending");
  });
});
