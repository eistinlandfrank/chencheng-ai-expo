"use client";

import { getResolvedLocale } from "@/i18n";
import { appAIRequest, AppAIClientUnavailableError } from "./app-ai-request";

interface AssistantResponse {
  reply: string;
}

export interface AssistantHistoryItem {
  role: "user" | "assistant";
  content: string;
}

/** Ask the on-site AI assistant through the app's server-only provider. */
export async function askAssistant(
  question: string,
  history: AssistantHistoryItem[] = [],
): Promise<string> {
  const res = await appAIRequest("/api/assistant", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-app-locale": getResolvedLocale(),
    },
    body: JSON.stringify({ question, history }),
  });
  if (!res.ok) {
    if (res.status === 503) throw new AppAIClientUnavailableError();
    throw new Error(`assistant failed: ${res.status}`);
  }
  const data = (await res.json()) as AssistantResponse;
  return data.reply;
}
