// Lovable AI Gateway model catalog — fronted by the secure /chat edge function.
// No API key needs to live in the client; LOVABLE_API_KEY is auto-provisioned server-side.

export interface AiModelOption {
  id: string;
  label: string;
  provider: "lovable-ai";
  free: boolean;
  family: "gemini" | "openai" | "image";
  description?: string;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export const FREE_MODEL_OPTIONS: AiModelOption[] = [
  { id: "google/gemini-3-flash-preview", label: "Gemini 3 Flash (preview)", provider: "lovable-ai", free: true, family: "gemini", description: "Default — fast, balanced, multimodal." },
  { id: "google/gemini-3.1-pro-preview", label: "Gemini 3.1 Pro (preview)", provider: "lovable-ai", free: false, family: "gemini", description: "Next-gen reasoning model." },
  { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro", provider: "lovable-ai", free: false, family: "gemini", description: "Top Gemini reasoning + vision." },
  { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash", provider: "lovable-ai", free: false, family: "gemini", description: "Balanced cost/latency." },
  { id: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite", provider: "lovable-ai", free: true, family: "gemini", description: "Fastest, cheapest Gemini." },
  { id: "openai/gpt-5.2", label: "GPT-5.2", provider: "lovable-ai", free: false, family: "openai", description: "Latest OpenAI flagship." },
  { id: "openai/gpt-5", label: "GPT-5", provider: "lovable-ai", free: false, family: "openai", description: "Powerful all-rounder." },
  { id: "openai/gpt-5-mini", label: "GPT-5 Mini", provider: "lovable-ai", free: false, family: "openai", description: "Lower cost, strong reasoning." },
  { id: "openai/gpt-5-nano", label: "GPT-5 Nano", provider: "lovable-ai", free: true, family: "openai", description: "Fast & cheap." },
  { id: "google/gemini-2.5-flash-image", label: "Nano Banana (image)", provider: "lovable-ai", free: true, family: "image", description: "Default image gen." },
  { id: "google/gemini-3.1-flash-image-preview", label: "Nano Banana 2 (image)", provider: "lovable-ai", free: false, family: "image", description: "Fast pro-quality image." },
  { id: "google/gemini-3-pro-image-preview", label: "Nano Banana Pro (image)", provider: "lovable-ai", free: false, family: "image", description: "Highest quality image." },
];

export const DEFAULT_MODEL = "google/gemini-3-flash-preview";
export const DEFAULT_IMAGE_MODEL = "google/gemini-2.5-flash-image";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
const IMAGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-image`;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export interface StreamChatOptions {
  messages: ChatMessage[];
  model: string;
  mode?: "chat" | "code" | "neural";
  signal?: AbortSignal;
  onDelta: (chunk: string) => void;
  onDone: () => void;
  onError?: (err: Error) => void;
}

export async function streamChat(options: StreamChatOptions): Promise<void> {
  try {
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ANON}`,
      },
      body: JSON.stringify({ messages: options.messages, model: options.model, mode: options.mode ?? "chat" }),
      signal: options.signal,
    });

    if (!resp.ok || !resp.body) {
      let msg = `Chat failed (${resp.status})`;
      try { const j = await resp.json(); if (j?.error) msg = j.error; } catch { /* ignore */ }
      throw new Error(msg);
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let done = false;

    while (!done) {
      const { done: d, value } = await reader.read();
      if (d) break;
      buffer += decoder.decode(value, { stream: true });

      let idx: number;
      while ((idx = buffer.indexOf("\n")) !== -1) {
        let line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (!line || line.startsWith(":")) continue;
        if (!line.startsWith("data: ")) continue;
        const payload = line.slice(6).trim();
        if (payload === "[DONE]") { done = true; break; }
        try {
          const parsed = JSON.parse(payload);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) options.onDelta(content);
        } catch {
          buffer = line + "\n" + buffer;
          break;
        }
      }
    }

    options.onDone();
  } catch (err) {
    options.onError?.(err instanceof Error ? err : new Error(String(err)));
    options.onDone();
  }
}

export async function generateImage(prompt: string, model = DEFAULT_IMAGE_MODEL): Promise<{ imageUrl: string | null; text: string }> {
  const resp = await fetch(IMAGE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ANON}`,
    },
    body: JSON.stringify({ prompt, model }),
  });
  if (!resp.ok) {
    let msg = `Image gen failed (${resp.status})`;
    try { const j = await resp.json(); if (j?.error) msg = j.error; } catch { /* ignore */ }
    throw new Error(msg);
  }
  return resp.json();
}
