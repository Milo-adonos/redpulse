import { ANTHROPIC_MODEL } from "@/server/ai/constants";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

export function getAnthropicApiKey(): string {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY non configurée");
  }
  return apiKey;
}

export type AnthropicCallParams = {
  max_tokens: number;
  temperature?: number;
  system?: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
};

export async function callAnthropic(params: AnthropicCallParams): Promise<string> {
  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": getAnthropicApiKey(),
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: params.max_tokens,
      ...(params.temperature !== undefined ? { temperature: params.temperature } : {}),
      ...(params.system ? { system: params.system } : {}),
      messages: params.messages,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Anthropic API error (${response.status}): ${await response.text()}`,
    );
  }

  const data = (await response.json()) as {
    content: Array<{ type: string; text?: string }>;
  };

  const text = data.content.find((b) => b.type === "text")?.text?.trim() ?? "";
  if (!text) {
    throw new Error("Réponse vide de Claude");
  }

  return text;
}

export { ANTHROPIC_MODEL };
