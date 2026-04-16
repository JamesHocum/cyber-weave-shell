export interface AiModelOption {
  id: string;
  label: string;
  provider: "openrouter";
  free: boolean;
  description?: string;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionOptions {
  model: string;
  messages: ChatMessage[];
  apiKey?: string;
}

export const FREE_MODEL_OPTIONS: AiModelOption[] = [
  { id: "openrouter/auto", label: "Auto (free-capable)", provider: "openrouter", free: true, description: "Best available free-capable route" },
  { id: "meta-llama/llama-3.1-8b-instruct:free", label: "Llama 3.1 8B Free", provider: "openrouter", free: true },
  { id: "mistralai/mistral-7b-instruct:free", label: "Mistral 7B Free", provider: "openrouter", free: true },
  { id: "qwen/qwen-2.5-7b-instruct:free", label: "Qwen 2.5 7B Free", provider: "openrouter", free: true },
  { id: "google/gemma-2-9b-it:free", label: "Gemma 2 9B Free", provider: "openrouter", free: true },
];

export function getMasterApiKey(): string | undefined {
  return (
    (import.meta.env.VITE_OPENROUTER_API_KEY as string | undefined) ||
    (import.meta.env.VITE_MASTER_API_KEY as string | undefined) ||
    (import.meta.env.VITE_AI_API_KEY as string | undefined)
  );
}

export async function requestChatCompletion(options: ChatCompletionOptions): Promise<string> {
  const apiKey = options.apiKey ?? getMasterApiKey();
  if (!apiKey) {
    return "⟁ No master API key configured. Add VITE_OPENROUTER_API_KEY to enable neural responses. (Preview-safe fallback active.)";
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: options.model, messages: options.messages }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`AI request failed: ${response.status} ${text}`);
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return json.choices?.[0]?.message?.content?.trim() || "No response returned.";
}
