import { beforeEach, describe, expect, it, vi } from "vitest";

const createAuthToken = vi.hoisted(() =>
  vi.fn(async (request: unknown) => {
    void request;
    return { name: "ephemeral-test-token" };
  }),
);

vi.mock("@/infrastructure/gemini/client", () => ({
  createServerGeminiClient: () => ({
    authTokens: { create: createAuthToken },
  }),
}));

import { scenarioRegistry } from "@/config/scenarios";
import { createBrowserLiveConfig } from "@/infrastructure/gemini/browser-live-transport";
import { resolveCustomerVoice } from "@/infrastructure/gemini/customer-voice";
import { provisionLiveSession } from "@/infrastructure/gemini/live-session";

describe("Gemini Live session provisioning", () => {
  beforeEach(() => createAuthToken.mockClear());

  it("keeps tools out of ephemeral-token constraints", async () => {
    const scenario = scenarioRegistry.resolve({
      categoryId: "b2b-saas",
      archetypeId: "startup-founder",
      scenarioId: "initial-needs-conversation",
      difficulty: "medium",
    });
    if (!scenario) throw new Error("Expected configured scenario.");

    const voiceName = resolveCustomerVoice(scenario.public.archetypeId);
    await provisionLiveSession(scenario, voiceName);

    const request = createAuthToken.mock.calls[0]?.[0] as {
      config: {
        liveConnectConstraints: {
          config: Record<string, unknown>;
        };
      };
    };
    expect(request?.config.liveConnectConstraints.config).not.toHaveProperty("tools");
    expect(request?.config.liveConnectConstraints.config.systemInstruction).toContain(
      "end_roleplay tool",
    );
    expect(request.config.liveConnectConstraints.config).toMatchObject({
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName },
        },
      },
    });
    expect(createBrowserLiveConfig(voiceName)).toMatchObject({
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName },
        },
      },
    });
  });
});
