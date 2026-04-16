import type { MemoryState } from "@/core/memory/store";

interface SystemPanelProps {
  memory: MemoryState;
  selectedModel: string;
}

export function SystemPanel({ memory, selectedModel }: SystemPanelProps) {
  const stats = [
    { label: "model", value: selectedModel },
    { label: "history", value: `${memory.recentCommands.length} cmds` },
    { label: "accent", value: memory.ui.accent },
    { label: "updated", value: new Date(memory.updatedAt).toLocaleTimeString() },
  ];

  return (
    <div className="glass-panel flex h-full flex-col overflow-hidden">
      <header className="border-b border-accent/20 px-4 py-3">
        <h3 className="display-font text-[11px] uppercase text-accent">◈ System Telemetry</h3>
        <p className="mt-1 text-[11px] text-muted-foreground">Memory · history · runtime</p>
      </header>

      <div className="grid grid-cols-2 gap-2 p-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-lg border border-primary/15 bg-background/40 px-3 py-2"
          >
            <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
              {s.label}
            </div>
            <div className="mt-1 truncate text-xs text-primary">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="mb-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
          recent commands
        </div>
        {memory.recentCommands.length === 0 ? (
          <div className="text-xs text-muted-foreground/60 italic">no history yet…</div>
        ) : (
          <ul className="space-y-1">
            {memory.recentCommands.slice(0, 12).map((c, i) => (
              <li
                key={`${c}-${i}`}
                className="truncate rounded border border-primary/10 bg-background/30 px-2 py-1 text-xs text-foreground/80 hover:border-primary/40 hover:text-primary transition"
              >
                <span className="text-secondary">›</span> {c}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
