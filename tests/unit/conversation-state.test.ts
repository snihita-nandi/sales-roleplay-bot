import { describe, expect, it } from "vitest";

import {
  acceptsCustomerOutput,
  acceptsMicrophoneInput,
  completeCustomerEnding,
  enterCustomerEnding,
} from "@/infrastructure/gemini/conversation-state";

describe("irreversible live conversation termination", () => {
  it("allows only active to ending to ended", () => {
    const ending = enterCustomerEnding("active");
    expect(ending).toBe("ending");
    expect(enterCustomerEnding(ending)).toBe("ending");

    const ended = completeCustomerEnding(ending);
    expect(ended).toBe("ended");
    expect(enterCustomerEnding(ended)).toBe("ended");
    expect(completeCustomerEnding(ended)).toBe("ended");
  });

  it("ignores salesperson microphone input throughout ending and after ended", () => {
    expect(acceptsMicrophoneInput("active")).toBe(true);
    expect(acceptsMicrophoneInput("ending")).toBe(false);
    expect(acceptsMicrophoneInput("ended")).toBe(false);
  });

  it("allows only the farewell output while ending", () => {
    expect(acceptsCustomerOutput("active")).toBe(true);
    expect(acceptsCustomerOutput("ending")).toBe(true);
    expect(acceptsCustomerOutput("ended")).toBe(false);
  });

  it("rejects microphone and customer audio callbacks from a closed stale session", () => {
    const staleSessionState = completeCustomerEnding(
      enterCustomerEnding("active"),
    );
    expect(acceptsMicrophoneInput(staleSessionState)).toBe(false);
    expect(acceptsCustomerOutput(staleSessionState)).toBe(false);
  });
});
