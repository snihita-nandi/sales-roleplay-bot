import {
  EndSensitivity,
  Modality,
  StartSensitivity,
} from "@google/genai";

import type { CustomerScenario } from "@/domain/scenarios/schema";
import { compileCustomerPrompt } from "@/domain/scenarios/prompt";
import { createServerGeminiClient } from "@/infrastructure/gemini/client";
import {
  createCustomerSpeechConfig,
  type CustomerVoice,
} from "@/infrastructure/gemini/customer-voice";
import {
  GEMINI_LIVE_MODEL,
  LIVE_TOKEN_LIFETIME_MS,
  LIVE_TOKEN_START_WINDOW_MS,
} from "@/infrastructure/gemini/constants";

export interface ProvisionedLiveSession {
  ephemeralToken: string;
  expiresAt: string;
  model: string;
}

export async function provisionLiveSession(
  scenario: CustomerScenario,
  voiceName: CustomerVoice,
): Promise<ProvisionedLiveSession> {
  const client = createServerGeminiClient("v1alpha");
  const now = Date.now();
  const expiresAt = new Date(now + LIVE_TOKEN_LIFETIME_MS).toISOString();
  const newSessionExpiresAt = new Date(now + LIVE_TOKEN_START_WINDOW_MS).toISOString();
  const systemInstruction = compileCustomerPrompt(scenario);

  const token = await client.authTokens.create({
    config: {
      uses: 1,
      expireTime: expiresAt,
      newSessionExpireTime: newSessionExpiresAt,
      liveConnectConstraints: {
        model: GEMINI_LIVE_MODEL,
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: createCustomerSpeechConfig(voiceName),
          realtimeInputConfig: {
            automaticActivityDetection: {
              disabled: false,
              startOfSpeechSensitivity: StartSensitivity.START_SENSITIVITY_HIGH,
              endOfSpeechSensitivity: EndSensitivity.END_SENSITIVITY_HIGH,
              prefixPaddingMs: 120,
              silenceDurationMs: 600,
            },
          },
        },
      },
      lockAdditionalFields: [],
    },
  });

  if (!token.name) {
    throw new Error("Gemini did not return an ephemeral token.");
  }

  return {
    ephemeralToken: token.name,
    expiresAt,
    model: GEMINI_LIVE_MODEL,
  };
}
