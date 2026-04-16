// Lovable AI Gateway streaming chat edge function
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

const MODE_SYSTEM_PROMPTS: Record<string, string> = {
  chat:
    "You are Veyl'Vióra, the neural copilot of a Cyberpunk Termux flagship terminal built by Spellweaver Studios. Be sharp, concise, technically precise, and stylish. Use markdown.",
  code:
    "You are an elite coding assistant inside a cyberpunk terminal IDE. Always respond with clean, production-quality code in fenced markdown blocks with the language tag. Explain briefly before code.",
  neural:
    "You are the Neural Command interpreter. Help the operator translate intent into terminal commands. Be terse and operational.",
};

const ALLOWED_MODELS = new Set([
  "google/gemini-3-flash-preview",
  "google/gemini-3.1-pro-preview",
  "google/gemini-2.5-pro",
  "google/gemini-2.5-flash",
  "google/gemini-2.5-flash-lite",
  "openai/gpt-5.2",
  "openai/gpt-5",
  "openai/gpt-5-mini",
  "openai/gpt-5-nano",
]);

const MAX_MESSAGES = 50;
const MAX_MESSAGE_CHARS = 32000;

function supportsReasoning(model: string): boolean {
  return model.startsWith("openai/gpt-5") || model === "google/gemini-3.1-pro-preview" || model === "google/gemini-2.5-pro";
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // --- AuthN: require valid Supabase JWT ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }
    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const { messages, model, mode, reasoning_effort } = await req.json() as {
      messages: ChatMessage[];
      model?: string;
      mode?: keyof typeof MODE_SYSTEM_PROMPTS;
      reasoning_effort?: "low" | "medium" | "high";
    };

    // --- Input validation ---
    if (!Array.isArray(messages) || messages.length === 0) {
      return json({ error: "messages must be a non-empty array" }, 400);
    }
    if (messages.length > MAX_MESSAGES) {
      return json({ error: `Too many messages (max ${MAX_MESSAGES})` }, 400);
    }
    for (const m of messages) {
      if (!m || typeof m.content !== "string" || !["system", "user", "assistant"].includes(m.role)) {
        return json({ error: "Invalid message format" }, 400);
      }
      if (m.content.length > MAX_MESSAGE_CHARS) {
        return json({ error: `Message too long (max ${MAX_MESSAGE_CHARS} chars)` }, 400);
      }
    }
    if (model && !ALLOWED_MODELS.has(model)) {
      return json({ error: "Invalid model" }, 400);
    }
    if (reasoning_effort && !["low", "medium", "high"].includes(reasoning_effort)) {
      return json({ error: "Invalid reasoning_effort" }, 400);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return json({ error: "LOVABLE_API_KEY not configured" }, 500);
    }

    const systemPrompt = MODE_SYSTEM_PROMPTS[mode ?? "chat"] ?? MODE_SYSTEM_PROMPTS.chat;
    const selectedModel = model ?? "google/gemini-3-flash-preview";

    const body: Record<string, unknown> = {
      model: selectedModel,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      stream: true,
    };
    if (reasoning_effort && supportsReasoning(selectedModel)) {
      body.reasoning_effort = reasoning_effort;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return json({ error: "Rate limit exceeded — slow down or wait a moment." }, 429);
      }
      if (response.status === 402) {
        return json({ error: "Lovable AI credits exhausted — top up at Settings → Workspace → Usage." }, 402);
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return json({ error: `AI gateway error: ${response.status}` }, 500);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
