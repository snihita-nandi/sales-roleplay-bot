import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

const serverEnvironmentSchema = z.object({
  GEMINI_API_KEY: z.string().trim().min(1),
});

export function createServerGeminiClient(apiVersion?: string): GoogleGenAI {
  const environment = serverEnvironmentSchema.parse({
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  });

  return new GoogleGenAI({
    apiKey: environment.GEMINI_API_KEY,
    apiVersion,
  });
}

