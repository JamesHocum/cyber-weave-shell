import { HeaderBar } from "@/components/layout/HeaderBar";
import { SystemPanel } from "@/components/layout/SystemPanel";
import { Terminal } from "@/components/terminal/Terminal";
import { NeuralPanel } from "@/components/chat/NeuralPanel";
import { useTerminalState } from "@/core/terminal/useTerminalState";
import { runBuild } from "@/integrations/build/buildManager";

const Index = () => {
  const terminal = useTerminalState({ runBuild });

  return (
    <div className="flex min-h-screen flex-col">
      <HeaderBar />

      <main className="grid flex-1 gap-3 p-3 lg:grid-cols-[1.4fr_1fr] xl:grid-cols-[1.6fr_1fr_0.7fr]">
        <section className="min-h-[480px] lg:min-h-0">
          <Terminal
            lines={terminal.lines}
            busy={terminal.busy}
            onSubmit={terminal.runInput}
            recentCommands={terminal.memory.recentCommands}
          />
        </section>

        <section className="min-h-[480px] lg:min-h-0">
          <NeuralPanel
            selectedModel={terminal.selectedModel}
            onModelChange={terminal.setSelectedModel}
            runBuild={runBuild}
            onCommandOutput={(lines) =>
              terminal.appendLines(lines.map((text) => ({ kind: "system" as const, text })))
            }
          />
        </section>

        <aside className="hidden xl:block">
          <SystemPanel memory={terminal.memory} selectedModel={terminal.selectedModel} />
        </aside>
      </main>

      <footer className="px-5 py-3 text-center text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
        ⟁ spellweaver studios · veyl'vióra neural shell · 2026
      </footer>
    </div>
  );
};

export default Index;
