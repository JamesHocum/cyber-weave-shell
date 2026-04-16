import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { TerminalLine } from "@/core/terminal/useTerminalState";

interface TerminalProps {
  lines: TerminalLine[];
  busy: boolean;
  onSubmit: (raw: string) => void;
  recentCommands: string[];
}

export function Terminal({ lines, busy, onSubmit, recentCommands }: TerminalProps) {
  const [input, setInput] = useState("");
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [lines]);

  const submit = () => {
    if (!input.trim()) return;
    onSubmit(input);
    setInput("");
    setHistoryIndex(-1);
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const next = Math.min(historyIndex + 1, recentCommands.length - 1);
      if (next >= 0 && recentCommands[next]) {
        setHistoryIndex(next);
        setInput(recentCommands[next]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = historyIndex - 1;
      if (next < 0) {
        setHistoryIndex(-1);
        setInput("");
      } else {
        setHistoryIndex(next);
        setInput(recentCommands[next] ?? "");
      }
    }
  };

  return (
    <div
      className="glass-panel scanline relative flex h-full flex-col overflow-hidden"
      onClick={() => inputRef.current?.focus()}
    >
      <header className="flex items-center justify-between border-b border-primary/15 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-destructive shadow-[0_0_8px_hsl(var(--destructive))]" />
          <span className="h-2.5 w-2.5 rounded-full bg-secondary shadow-[0_0_8px_hsl(var(--secondary))]" />
          <span className="h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]" />
          <span className="ml-3 display-font text-[11px] text-primary/80">SHELL // tty.cyber.0</span>
        </div>
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          {busy ? "executing…" : "idle"}
        </span>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 text-sm leading-relaxed">
        {lines.map((line) => (
          <div key={line.id} className={lineClass(line.kind)}>
            {line.kind === "input" ? (
              <span>
                <span className="text-secondary">veyl@cyber</span>
                <span className="text-muted-foreground">:</span>
                <span className="text-primary">~</span>
                <span className="text-muted-foreground">$ </span>
                {line.text}
              </span>
            ) : (
              <span className="whitespace-pre-wrap">{line.text}</span>
            )}
          </div>
        ))}
        {busy && <div className="text-primary/70 terminal-caret">processing</div>}
      </div>

      <div className="border-t border-primary/15 bg-background/50 px-5 py-3">
        <div className="flex items-center gap-2 font-mono text-sm">
          <span className="text-secondary">veyl@cyber</span>
          <span className="text-muted-foreground">:</span>
          <span className="text-primary">~</span>
          <span className="text-muted-foreground">$</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            disabled={busy}
            spellCheck={false}
            autoFocus
            placeholder="type a command — try 'help', 'sysinfo', or 'build me an android version'"
            className="flex-1 bg-transparent text-foreground caret-primary outline-none placeholder:text-muted-foreground/60"
          />
        </div>
      </div>
    </div>
  );
}

function lineClass(kind: TerminalLine["kind"]) {
  switch (kind) {
    case "input":
      return "text-foreground/90";
    case "error":
      return "text-destructive";
    case "system":
      return "text-primary/80";
    default:
      return "text-foreground/75";
  }
}
