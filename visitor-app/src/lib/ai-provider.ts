type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ChatCompletion = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

export class AIProviderUnavailableError extends Error {
  code = "ai_provider_unavailable";

  constructor(message = "AI 功能暂时不可用，请稍后重试。") {
    super(message);
    this.name = "AIProviderUnavailableError";
  }
}

export async function createChatCompletion(messages: ChatMessage[]): Promise<ChatCompletion> {
  const baseUrl = process.env.AI_BASE_URL?.replace(/\/+$/, "");
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL || "deepseek-v4-flash";
  if (!baseUrl || !apiKey) throw new AIProviderUnavailableError();

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
      max_tokens: 500,
      stream: false,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  }).catch(() => {
    throw new AIProviderUnavailableError();
  });

  if (!response.ok) throw new AIProviderUnavailableError();
  return (await response.json()) as ChatCompletion;
}
