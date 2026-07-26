const CUSTOMER_VOICES = [
  "Achernar",
  "Aoede",
  "Charon",
  "Despina",
  "Enceladus",
  "Erinome",
  "Fenrir",
  "Gacrux",
  "Kore",
  "Leda",
  "Orus",
  "Puck",
  "Sulafat",
  "Umbriel",
  "Vindemiatrix",
  "Zephyr",
] as const;

export type CustomerVoice = (typeof CUSTOMER_VOICES)[number];

export function isCustomerVoice(value: string | null): value is CustomerVoice {
  return CUSTOMER_VOICES.some((voice) => voice === value);
}

/**
 * The archetype id is the sole input so scenario, difficulty, category, and
 * conversation state can never change a customer's permanent voice.
 */
export function resolveCustomerVoice(archetypeId: string): CustomerVoice {
  let hash = 2_166_136_261;
  for (const character of archetypeId) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16_777_619);
  }
  return CUSTOMER_VOICES[(hash >>> 0) % CUSTOMER_VOICES.length];
}

export function createCustomerSpeechConfig(voiceName: string) {
  return {
    voiceConfig: {
      prebuiltVoiceConfig: { voiceName },
    },
  };
}
