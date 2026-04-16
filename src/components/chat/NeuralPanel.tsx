import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  FREE_MODEL_OPTIONS,
  streamChat,
  generateImage,
  DEFAULT_IMAGE_MODEL,
  type ChatMessage,
} from "@/integrations/ai/providers";
import {
  loadMemoryState,
  pushRecentCommand,
  setPreferredModel,
} from "@/core/memory/store";
import { executeTerminalInput } from "@/core/terminal/executor";
import { commandRegistry } from "@/core/commands/registry";
import type { CommandContext } from "@/core/commands/registry";
import { useAuth } from "@/integrations/auth/AuthProvider";
import { useSettings } from "@/integrations/settings/SettingsProvider";
import {
  insertMessage,
  listMessages,
  touchConversation,
} from "@/integrations/conversations/api";
import { Menu, Send, Sparkles, Code2, Image as ImageIcon, Terminal as TerminalIcon, Square } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Mode = "neural" | "chat" | "code" | "image";

interface NeuralPanelProps {
  conversationId: string;
  selectedModel: string;
  onModelChange?: (model: string) => void;
  runBuild?: CommandContext["runBuild"];
  generateImage?: CommandContext["generateImage"];
  onCommandOutput?: (lines: string[]) => void;
  onTitleUpdate?: () => void;
}

interface ChatEntry {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
  _streaming?: boolean;
}

const id = () => `m_${Math.random().toString(36).slice(2, 10)}`;

const MODE_META: Record<Mode, { label: string; icon: React.ComponentType<{ className?: string }>; hint: string }> = {
  neural: { label: "Neural", icon: TerminalIcon, hint: "Route to terminal commands or NL handlers" },
  chat:   { label: "Chat",   icon: Sparkles,     hint: "Free-form AI conversation" },
  code:   { label: "Code",   icon: Code2,        hint: "Code generation & explanation" },
  image:  { label: "Image",  icon: ImageIcon,    hint: "Generate images with Nano Banana" },
};

export function NeuralPanel({ conversationId, selectedModel, onModelChange, runBuild, generateImage: imgFromCtx, onCommandOutput, onTitleUpdate }: NeuralPanelProps) {
  const { user } = useAuth();
  const { settings } = useSettings();
  const [memory, setMemory] = useState(loadMemoryState());
  const [mode, setMode] = useState<Mode>("neural");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [messages, setMessages] = useState<ChatEntry[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load persisted messages when conversation changes
  useEffect(() => {
    if (!conversationId) return;
    listMessages(conversationId)
      .then((rows) => {
        if (rows.length === 0) {
          setMessages([
            {
              id: id(),
              role: "assistant",
              content:
                "**Neural interface online.** Switch modes with the bar above. Try `help`, `build android`, or just chat.",
            },
          ]);
        } else {
          setMessages(
            rows
              .filter((r) => r.role !== "system")
              .map((r) => ({
                id: r.id,
                role: r.role as "user" | "assistant",
                content: r.content,
                imageUrl: r.image_url ?? undefined,
              }))
          );
        }
      })
      .catch((e) => toast({ title: "Failed to load conversation", description: e.message, variant: "destructive" }));
  }, [conversationId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, busy]);

  const grouped = useMemo(() => {
    const g: Record<string, typeof FREE_MODEL_OPTIONS> = { gemini: [], openai: [], image: [] };
    FREE_MODEL_OPTIONS.forEach((m) => g[m.family].push(m));
    return g;
  }, []);

  const setModel = (m: string) => {
    onModelChange?.(m);
    const next = setPreferredModel(m);
    setMemory(next);
  };

  const append = (entry: Omit<ChatEntry, "id">) =>
    setMessages((prev) => [...prev, { ...entry, id: id() }]);

  const updateLastAssistant = (text: string) => {
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.role === "assistant" && last._streaming) {
        return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: text } : m));
      }
      return [...prev, { id: id(), role: "assistant", content: text, _streaming: true }];
    });
  };

  const stop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setBusy(false);
  };

  const runCommand = async (raw: string) => {
    setBusy(true);
    append({ role: "user", content: raw });
    const next = pushRecentCommand(raw);
    setMemory(next);

    const ctx: CommandContext = {
      selectedModel,
      setSelectedModel: setModel,
      runBuild,
      generateImage: imgFromCtx,
    };
    try {
      const exec = await executeTerminalInput({ raw, ctx });
      const lines = [
        `[${exec.mode}] ▸ ${exec.resolvedCommand || "input"}`,
        exec.result.message,
        ...(exec.result.logs ?? []),
      ];
      onCommandOutput?.(lines);
      append({ role: "assistant", content: "```\n" + lines.join("\n") + "\n```" });
    } catch (e) {
      append({ role: "assistant", content: `**Error:** ${e instanceof Error ? e.message : String(e)}` });
    } finally {
      setBusy(false);
    }
  };

  const runChatStream = async (raw: string, requestedMode: "chat" | "code" | "neural") => {
    setBusy(true);
    append({ role: "user", content: raw });

    const history: ChatMessage[] = messages
      .filter((m) => !m.imageUrl)
      .map((m) => ({ role: m.role, content: m.content }));
    history.push({ role: "user", content: raw });

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    let assembled = "";
    await streamChat({
      messages: history,
      model: selectedModel,
      mode: requestedMode,
      signal: ctrl.signal,
      onDelta: (chunk) => {
        assembled += chunk;
        updateLastAssistant(assembled);
      },
      onError: (err) => {
        toast({ title: "Neural error", description: err.message, variant: "destructive" });
        append({ role: "assistant", content: `**Error:** ${err.message}` });
      },
      onDone: () => {
        setMessages((prev) =>
          prev.map((m, i) => (i === prev.length - 1 ? { ...m, _streaming: false } : m))
        );
      },
    });
    abortRef.current = null;
    setBusy(false);
  };

  const runImage = async (prompt: string) => {
    setBusy(true);
    append({ role: "user", content: prompt });
    try {
      const imageModel =
        FREE_MODEL_OPTIONS.find((m) => m.id === selectedModel)?.family === "image"
          ? selectedModel
          : DEFAULT_IMAGE_MODEL;
      const { imageUrl, text } = await generateImage(prompt, imageModel);
      append({
        role: "assistant",
        content: text || (imageUrl ? "Image generated." : "No image returned."),
        imageUrl: imageUrl ?? undefined,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: "Image gen failed", description: msg, variant: "destructive" });
      append({ role: "assistant", content: `**Error:** ${msg}` });
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async () => {
    const raw = input.trim();
    if (!raw || busy) return;
    setInput("");
    if (mode === "neural") return runCommand(raw);
    if (mode === "image") return runImage(raw);
    return runChatStream(raw, mode);
  };

  const insertCommand = (cmd: string) => {
    setInput((prev) => (prev ? `${prev} ${cmd}` : cmd));
    setMenuOpen(false);
    setMode("neural");
  };

  return (
    <div className="glass-panel relative flex h-full flex-col overflow-hidden">
      <header className="border-b border-primary/15 px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Open command menu"
              className="neon-btn neon-btn--icon"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="display-font text-[11px] text-primary/80 hidden sm:block">NEURAL // veyl.vióra</div>
          </div>

          <select
            value={selectedModel}
            onChange={(e) => setModel(e.target.value)}
            className="neon-select max-w-[200px] truncate"
          >
            <optgroup label="Gemini">
              {grouped.gemini.map((m) => (
                <option key={m.id} value={m.id}>{m.label}{m.free ? " · free" : ""}</option>
              ))}
            </optgroup>
            <optgroup label="OpenAI">
              {grouped.openai.map((m) => (
                <option key={m.id} value={m.id}>{m.label}{m.free ? " · free" : ""}</option>
              ))}
            </optgroup>
            <optgroup label="Image">
              {grouped.image.map((m) => (
                <option key={m.id} value={m.id}>{m.label}{m.free ? " · free" : ""}</option>
              ))}
            </optgroup>
          </select>
        </div>

        <div className="mt-3 flex items-center gap-1.5 overflow-x-auto">
          {(Object.keys(MODE_META) as Mode[]).map((m) => {
            const meta = MODE_META[m];
            const Icon = meta.icon;
            const active = mode === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`mode-pill ${active ? "mode-pill--active" : ""}`}
                aria-pressed={active}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{meta.label}</span>
              </button>
            );
          })}
          <span className="ml-auto hidden text-[10px] uppercase tracking-widest text-muted-foreground sm:inline">
            {MODE_META[mode].hint}
          </span>
        </div>

        {menuOpen && (
          <div className="absolute left-3 top-[68px] z-30 max-h-[60vh] w-72 overflow-y-auto rounded-xl border border-primary/30 bg-popover/95 shadow-[0_0_30px_hsl(var(--primary)/0.4)] backdrop-blur-xl">
            <div className="sticky top-0 border-b border-primary/15 bg-popover/95 px-3 py-2 text-[10px] uppercase tracking-widest text-primary">
              Neural Commands
            </div>
            <ul className="p-2">
              {commandRegistry.map((c) => (
                <li key={c.name}>
                  <button
                    type="button"
                    onClick={() => insertCommand(c.name)}
                    className="group flex w-full flex-col items-start gap-0.5 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-primary/10"
                  >
                    <span className="font-mono text-primary group-hover:text-primary-glow">{c.name}</span>
                    <span className="text-[10px] text-muted-foreground">{c.description}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </header>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[92%] rounded-2xl border px-3 py-2.5 text-sm ${
              m.role === "assistant"
                ? "mr-auto border-primary/20 bg-primary/5 text-foreground"
                : "ml-auto border-secondary/30 bg-secondary/10 text-foreground"
            }`}
          >
            {m.imageUrl && (
              <img
                src={m.imageUrl}
                alt="generated"
                loading="lazy"
                className="mb-2 max-h-[360px] w-full rounded-lg border border-primary/20 object-contain"
              />
            )}
            <div className="prose prose-invert prose-sm max-w-none prose-pre:bg-background/70 prose-pre:border prose-pre:border-primary/20 prose-code:text-primary">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content || "…"}</ReactMarkdown>
            </div>
          </div>
        ))}
        {busy && <div className="text-xs text-primary/70 terminal-caret">processing</div>}
      </div>

      <div className="border-t border-primary/15 bg-background/40 px-3 py-3">
        <div className="mb-1.5 flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
          <span>mode: <span className="text-primary">{MODE_META[mode].label}</span></span>
          <span>preferred: {memory.preferredModel.split("/").pop()}</span>
        </div>
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder={
              mode === "neural"
                ? "Type a command — try 'help' or 'build me an android version'"
                : mode === "image"
                ? "Describe an image — e.g. 'cyberpunk skyline at dusk, neon rain'"
                : mode === "code"
                ? "Ask for code — e.g. 'write a Rust LRU cache'"
                : "Chat with the neural copilot…"
            }
            rows={2}
            className="min-h-[60px] flex-1 resize-none rounded-xl border border-primary/20 bg-background/70 px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-primary/60 focus:shadow-[0_0_18px_hsl(var(--primary)/0.35)]"
          />
          {busy ? (
            <button type="button" onClick={stop} className="neon-btn neon-btn--danger" aria-label="Stop">
              <Square className="h-4 w-4" />
            </button>
          ) : (
            <button type="button" onClick={handleSubmit} className="neon-btn neon-btn--primary" aria-label="Send">
              <Send className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
