import { ANTHROPIC_MODEL } from "@/server/ai/constants";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

export function getAnthropicApiKey(): string {
  const raw = process.env.ANTHROPIC_API_KEY;
  if (!raw?.trim()) {
    throw new Error("ANTHROPIC_API_KEY non configurée");
  }

  let apiKey = raw.trim();
  if (
    (apiKey.startsWith('"') && apiKey.endsWith('"')) ||
    (apiKey.startsWith("'") && apiKey.endsWith("'"))
  ) {
    apiKey = apiKey.slice(1, -1).trim();
  }

  if (!apiKey.startsWith("sk-ant-")) {
    throw new Error(
      "ANTHROPIC_API_KEY invalide. Utilisez une clé Anthropic (sk-ant-...).",
    );
  }

  return apiKey;
}

function formatAnthropicError(status: number, body: string): string {
  if (status === 401) {
    return "Clé Anthropic invalide. Vérifiez ANTHROPIC_API_KEY dans .env.local (local) ou les variables Vercel (production), puis redémarrez le serveur.";
  }
  if (status === 403) {
    return "Accès Anthropic refusé. Vérifiez les crédits et les permissions de votre clé API.";
  }
  if (status === 429) {
    return "Quota Anthropic dépassé. Réessayez dans quelques minutes ou vérifiez votre solde.";
  }
  return `Anthropic API error (${status}): ${body}`;
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
    const body = await response.text();
    throw new Error(formatAnthropicError(response.status, body));
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
