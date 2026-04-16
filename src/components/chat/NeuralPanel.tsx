import { useEffect, useMemo, useRef, useState } from "react";
import { FREE_MODEL_OPTIONS, requestChatCompletion } from "@/integrations/ai/providers";
import {
  loadMemoryState,
  pushRecentCommand,
  setPreferredModel,
} from "@/core/memory/store";
import { executeTerminalInput } from "@/core/terminal/executor";
import type { CommandContext } from "@/core/commands/registry";

interface NeuralPanelProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
  onCommandOutput?: (lines: string[]) => void;
  runBuild?: CommandContext["runBuild"];
  generateImage?: CommandContext["generateImage"];
}

interface ChatEntry {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const makeId = () => `msg_${Math.random().toString(36).slice(2, 10)}`;

export function NeuralPanel({
  selectedModel,
  onModelChange,
  onCommandOutput,
  runBuild,
  generateImage,
}: NeuralPanelProps) {
  const [memory, setMemory] = useState(loadMemoryState());
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<ChatEntry[]>([
    {
      id: makeId(),
      role: "assistant",
      content:
        "⟁ Neural interface online. Speak commands, ask questions, or describe an intent — I will route to shell, AI, or build pipelines.",
    },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const modelOptions = useMemo(() => FREE_MODEL_OPTIONS, []);

  useEffect(() => {
    setMemory(loadMemoryState());
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const setSelectedModel = (model: string) => {
    onModelChange(model);
    const next = setPreferredModel(model);
    setMemory(next);
  };

  const appendAssistant = (content: string) =>
    setMessages((p) => [...p, { id: makeId(), role: "assistant", content }]);
  const appendUser = (content: string) =>
    setMessages((p) => [...p, { id: makeId(), role: "user", content }]);

  const handleSubmit = async () => {
    const raw = input.trim();
    if (!raw || busy) return;
    setBusy(true);
    setInput("");
    appendUser(raw);

    try {
      const nextMemory = pushRecentCommand(raw);
      setMemory(nextMemory);

      const ctx: CommandContext = { selectedModel, setSelectedModel, runBuild, generateImage };
      const execution = await executeTerminalInput({ raw, ctx });

      if (execution.result.success || execution.resolvedCommand !== "unknown") {
        const lines = [
          `[${execution.mode}] ${execution.resolvedCommand || "input"}`,
          execution.result.message,
          ...(execution.result.logs ?? []),
        ];
        onCommandOutput?.(lines);
        appendAssistant(lines.join("\n"));
        setBusy(false);
        return;
      }

      const completion = await requestChatCompletion({
        model: selectedModel,
        messages: [
          {
            role: "system",
            content:
              "You are Veyl'Vióra, the neural copilot of a 2026 cyberpunk hacker terminal. Be concise, technical, stylish, and dangerous. Speak in short sharp paragraphs.",
          },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
          { role: "user", content: raw },
        ],
      });
      appendAssistant(completion);
    } catch (error) {
      appendAssistant(error instanceof Error ? error.message : "Neural panel request failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="glass-panel relative flex h-full flex-col overflow-hidden">
      <header className="border-b border-secondary/20 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="display-font text-[11px] uppercase text-secondary">
              ⟁ Neural Command Interface
            </h3>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Free-cloud models · NL routing · memory-aware
            </p>
          </div>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="rounded-lg border border-secondary/30 bg-input/80 px-3 py-2 text-xs text-foreground outline-none focus:border-secondary focus:shadow-[0_0_12px_hsl(var(--secondary)/0.4)] transition"
          >
            {modelOptions.map((m) => (
              <option key={m.id} value={m.id} className="bg-card">
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`rounded-xl border px-3 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
              m.role === "assistant"
                ? "border-primary/20 bg-primary/5 text-foreground"
                : "border-secondary/30 bg-secondary/10 text-foreground/90"
            }`}
          >
            {m.content}
          </div>
        ))}
      </div>

      <div className="border-t border-secondary/20 bg-background/40 px-4 py-3">
        <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
          <span>model · {selectedModel}</span>
          <span className={busy ? "text-secondary animate-pulse" : "text-primary/70"}>
            {busy ? "thinking…" : "ready"}
          </span>
        </div>
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="speak naturally — e.g. 'build me an android version'"
            className="min-h-[72px] flex-1 resize-none rounded-xl border border-secondary/25 bg-input/80 px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-secondary focus:shadow-[0_0_14px_hsl(var(--secondary)/0.35)] transition"
          />
          <button
            onClick={handleSubmit}
            disabled={busy}
            className="rounded-xl border border-primary/40 bg-gradient-to-br from-primary/20 to-secondary/20 px-4 text-sm font-semibold uppercase tracking-wider text-primary transition hover:shadow-[var(--glow-cyan)] disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
