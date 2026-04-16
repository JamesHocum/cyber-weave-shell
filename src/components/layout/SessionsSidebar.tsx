import { useEffect, useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/integrations/auth/AuthProvider";
import {
  listConversations,
  createConversation,
  deleteConversation,
  type Conversation,
} from "@/integrations/conversations/api";
import { useSettings } from "@/integrations/settings/SettingsProvider";
import { Plus, MessageSquare, Trash2, Sparkles, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Props {
  activeId: string | null;
  onSelect: (id: string) => void;
  refreshKey: number;
}

export function SessionsSidebar({ activeId, onSelect, refreshKey }: Props) {
  const { user } = useAuth();
  const { settings } = useSettings();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const [items, setItems] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!user) return;
    setLoading(true);
    try {
      setItems(await listConversations(user.id));
    } catch (e) {
      toast({ title: "Failed to load sessions", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, refreshKey]);

  const newSession = async () => {
    if (!user) return;
    try {
      const c = await createConversation(user.id, "neural", settings.preferred_model);
      setItems((prev) => [c, ...prev]);
      onSelect(c.id);
    } catch (e) {
      toast({ title: "Couldn't create session", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    }
  };

  const removeOne = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    await deleteConversation(id);
    setItems((prev) => prev.filter((x) => x.id !== id));
    if (activeId === id) onSelect("");
  };

  return (
    <Sidebar collapsible="icon" className="border-primary/20">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center justify-between text-primary">
            {!collapsed && <span className="display-font text-[10px] tracking-widest">SESSIONS</span>}
            <button
              type="button"
              onClick={newSession}
              title="New session"
              className="ml-auto rounded-md p-1 text-primary hover:bg-primary/15 hover:shadow-[0_0_10px_hsl(var(--primary)/0.6)]"
            >
              <Plus className="h-4 w-4" />
            </button>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {loading && (
                <SidebarMenuItem>
                  <div className="flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {!collapsed && "loading"}
                  </div>
                </SidebarMenuItem>
              )}
              {!loading && items.length === 0 && !collapsed && (
                <li className="px-2 py-3 text-[11px] text-muted-foreground">
                  No sessions yet. Hit <Sparkles className="inline h-3 w-3 text-primary" /> + to start one.
                </li>
              )}
              {items.map((c) => {
                const active = c.id === activeId;
                return (
                  <SidebarMenuItem key={c.id}>
                    <SidebarMenuButton
                      isActive={active}
                      onClick={() => onSelect(c.id)}
                      className={`group ${active ? "bg-primary/15 text-primary shadow-[0_0_12px_hsl(var(--primary)/0.4)_inset]" : ""}`}
                    >
                      <MessageSquare className="h-4 w-4 shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="flex-1 truncate text-xs">{c.title || "New session"}</span>
                          <button
                            type="button"
                            onClick={(e) => removeOne(c.id, e)}
                            className="opacity-0 transition group-hover:opacity-100 hover:text-destructive"
                            aria-label="Delete session"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
