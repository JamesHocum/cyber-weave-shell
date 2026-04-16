import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { HeaderBar } from "@/components/layout/HeaderBar";
import { SystemPanel } from "@/components/layout/SystemPanel";
import { Terminal } from "@/components/terminal/Terminal";
import { NeuralPanel } from "@/components/chat/NeuralPanel";
import { SessionsSidebar } from "@/components/layout/SessionsSidebar";
import { SettingsDrawer } from "@/components/settings/SettingsDrawer";
import { useTerminalState } from "@/core/terminal/useTerminalState";
import { runBuild } from "@/integrations/build/buildManager";
import { useAuth } from "@/integrations/auth/AuthProvider";
import { useSettings } from "@/integrations/settings/SettingsProvider";
import { createConversation, listConversations } from "@/integrations/conversations/api";
import { Loader2 } from "lucide-react";

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const { settings } = useSettings();
  const terminal = useTerminalState({ runBuild });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [bootstrapping, setBootstrapping] = useState(true);

  // Bootstrap: load latest convo or create one
  useEffect(() => {
    if (!user) {
      setBootstrapping(false);
      return;
    }
    (async () => {
      const items = await listConversations(user.id);
      if (items.length > 0) setActiveId(items[0].id);
      else {
        const c = await createConversation(user.id, "neural", settings.preferred_model);
        setActiveId(c.id);
        setRefreshKey((k) => k + 1);
      }
      setBootstrapping(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (authLoading) {
    return <div className="grid min-h-screen place-items-center text-primary"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <SessionsSidebar
          activeId={activeId}
          onSelect={(id) => setActiveId(id || null)}
          refreshKey={refreshKey}
        />
        <div className="flex min-h-screen flex-1 flex-col">
          <header className="flex items-center gap-2 border-b border-primary/15 bg-background/40 px-3 py-2 backdrop-blur">
            <SidebarTrigger className="text-primary" />
            <div className="flex-1"><HeaderBar /></div>
            <SettingsDrawer />
          </header>

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
              {bootstrapping || !activeId ? (
                <div className="glass-panel flex h-full items-center justify-center text-primary">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : (
                <NeuralPanel
                  key={activeId}
                  conversationId={activeId}
                  selectedModel={terminal.selectedModel}
                  onModelChange={terminal.setSelectedModel}
                  runBuild={runBuild}
                  onCommandOutput={(lines) =>
                    terminal.appendLines(lines.map((text) => ({ kind: "system" as const, text })))
                  }
                  onTitleUpdate={() => setRefreshKey((k) => k + 1)}
                />
              )}
            </section>

            <aside className="hidden xl:block">
              <SystemPanel memory={terminal.memory} selectedModel={terminal.selectedModel} />
            </aside>
          </main>

          <footer className="px-5 py-3 text-center text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            ⟁ spellweaver studios · veyl'vióra neural shell · 2026
          </footer>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Index;
