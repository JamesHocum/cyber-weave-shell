import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/integrations/auth/AuthProvider";

export type Accent = "cyan" | "violet" | "magenta";
export type Effort = "low" | "medium" | "high";

export interface UserSettings {
  accent: Accent;
  compact_mode: boolean;
  reasoning_effort: Effort;
  preferred_model: string;
}

const DEFAULTS: UserSettings = {
  accent: "cyan",
  compact_mode: false,
  reasoning_effort: "medium",
  preferred_model: "google/gemini-3-flash-preview",
};

interface Ctx {
  settings: UserSettings;
  loading: boolean;
  update: (patch: Partial<UserSettings>) => Promise<void>;
}

const SettingsCtx = createContext<Ctx>({ settings: DEFAULTS, loading: true, update: async () => {} });

const ACCENT_HSL: Record<Accent, { primary: string; glow: string; ring: string; border: string }> = {
  cyan:    { primary: "186 100% 55%", glow: "186 100% 65%", ring: "186 100% 55%", border: "186 70% 30%" },
  violet:  { primary: "268 90% 62%",  glow: "268 90% 72%",  ring: "268 90% 62%",  border: "268 70% 35%" },
  magenta: { primary: "320 95% 60%",  glow: "320 95% 70%",  ring: "320 95% 60%",  border: "320 70% 35%" },
};

function applyAccent(accent: Accent) {
  const root = document.documentElement;
  const c = ACCENT_HSL[accent];
  root.style.setProperty("--primary", c.primary);
  root.style.setProperty("--primary-glow", c.glow);
  root.style.setProperty("--ring", c.ring);
  root.style.setProperty("--border", c.border);
}

function applyCompact(compact: boolean) {
  document.documentElement.dataset.compact = compact ? "true" : "false";
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setSettings(DEFAULTS);
      applyAccent(DEFAULTS.accent);
      applyCompact(DEFAULTS.compact_mode);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const next: UserSettings = data
          ? {
              accent: data.accent as Accent,
              compact_mode: data.compact_mode,
              reasoning_effort: data.reasoning_effort as Effort,
              preferred_model: data.preferred_model,
            }
          : DEFAULTS;
        setSettings(next);
        applyAccent(next.accent);
        applyCompact(next.compact_mode);
        setLoading(false);
      });
  }, [user]);

  const update = useCallback(
    async (patch: Partial<UserSettings>) => {
      const next = { ...settings, ...patch };
      setSettings(next);
      if (patch.accent) applyAccent(patch.accent);
      if (patch.compact_mode !== undefined) applyCompact(patch.compact_mode);
      if (user) {
        await supabase
          .from("user_settings")
          .upsert({ user_id: user.id, ...next }, { onConflict: "user_id" });
      }
    },
    [settings, user]
  );

  return <SettingsCtx.Provider value={{ settings, loading, update }}>{children}</SettingsCtx.Provider>;
}

export const useSettings = () => useContext(SettingsCtx);
