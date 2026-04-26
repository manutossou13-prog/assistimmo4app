import Anthropic from "@anthropic-ai/sdk";

let cached: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (cached) return cached;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error("ANTHROPIC_API_KEY is missing. Add it in Vercel env vars.");
  }
  cached = new Anthropic({ apiKey: key });
  return cached;
}

// Modèles utilisés par les agents
export const MODELS = {
  fast: "claude-haiku-4-5", // intent / extraction simple
  standard: "claude-sonnet-4-5", // production agent default
  reasoning: "claude-opus-4-1", // analyse stratégique (Hugo, Gabriel)
} as const;
