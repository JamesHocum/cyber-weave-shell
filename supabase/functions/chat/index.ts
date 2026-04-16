// Lovable AI Gateway streaming chat edge function
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

function supportsReasoning(model: string): boolean {
  return model.startsWith("openai/gpt-5") || model === "google/gemini-3.1-pro-preview" || model === "google/gemini-2.5-pro";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, model, mode, reasoning_effort } = await req.json() as {
      messages: ChatMessage[];
      model?: string;
      mode?: keyof typeof MODE_SYSTEM_PROMPTS;
      reasoning_effort?: "low" | "medium" | "high";
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
        return new Response(JSON.stringify({ error: "Rate limit exceeded — slow down or wait a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Lovable AI credits exhausted — top up at Settings → Workspace → Usage." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: `AI gateway error: ${response.status}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
