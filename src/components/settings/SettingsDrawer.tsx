import { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Settings as SettingsIcon, Loader2, Upload, Trash2, LogOut, Github, Check } from "lucide-react";
import { useSettings, type Accent, type Effort } from "@/integrations/settings/SettingsProvider";
import { useAuth } from "@/integrations/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { clearMemoryState } from "@/core/memory/store";
import { toast } from "@/hooks/use-toast";

const ACCENTS: { id: Accent; label: string; swatch: string }[] = [
  { id: "cyan", label: "Cyan", swatch: "hsl(186 100% 55%)" },
  { id: "violet", label: "Violet", swatch: "hsl(268 90% 62%)" },
  { id: "magenta", label: "Magenta", swatch: "hsl(320 95% 60%)" },
];
const EFFORTS: Effort[] = ["low", "medium", "high"];

export function SettingsDrawer() {
  const { user, signOut } = useAuth();
  const { settings, update } = useSettings();
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<{ display_name: string; avatar_url: string | null; github_username: string | null }>({
    display_name: "",
    avatar_url: null,
    github_username: null,
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || !user) return;
    supabase
      .from("profiles")
      .select("display_name, avatar_url, github_username")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setProfile({ display_name: data.display_name ?? "", avatar_url: data.avatar_url, github_username: data.github_username });
      });
  }, [open, user]);

  const saveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: profile.display_name,
        github_username: profile.github_username,
      })
      .eq("user_id", user.id);
    setSavingProfile(false);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else toast({ title: "Profile saved" });
  };

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const ext = file.name.split(".").pop() ?? "png";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (upErr) {
      toast({ title: "Upload failed", description: upErr.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    await supabase.from("profiles").update({ avatar_url: pub.publicUrl }).eq("user_id", user.id);
    setProfile((p) => ({ ...p, avatar_url: pub.publicUrl }));
    setUploading(false);
    toast({ title: "Avatar updated" });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button type="button" className="neon-btn neon-btn--icon" aria-label="Settings">
          <SettingsIcon className="h-4 w-4" />
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[400px] overflow-y-auto border-primary/30 bg-popover/95 backdrop-blur-xl sm:w-[440px]">
        <SheetHeader>
          <SheetTitle className="display-font neon-text">SYSTEM SETTINGS</SheetTitle>
        </SheetHeader>

        {/* Profile */}
        <Section title="Profile">
          <div className="flex items-center gap-3">
            <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-primary/50 shadow-[0_0_18px_hsl(var(--primary)/0.5)]">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="avatar" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center bg-muted text-xs text-muted-foreground">none</div>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <button type="button" onClick={() => fileRef.current?.click()} className="neon-btn text-[10px]" disabled={uploading}>
                {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                Upload avatar
              </button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={onUpload} />
              <span className="text-[10px] text-muted-foreground">PNG / JPG / WebP</span>
            </div>
          </div>
          <Field label="Display name" value={profile.display_name} onChange={(v) => setProfile((p) => ({ ...p, display_name: v }))} />
          <Field
            label={<span className="flex items-center gap-1"><Github className="h-3 w-3" /> GitHub username</span>}
            value={profile.github_username ?? ""}
            onChange={(v) => setProfile((p) => ({ ...p, github_username: v }))}
            placeholder="octocat"
          />
          <button type="button" onClick={saveProfile} className="neon-btn neon-btn--primary w-full" disabled={savingProfile}>
            {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Save profile
          </button>
        </Section>

        {/* GitHub */}
        <Section title="GitHub Integration">
          <p className="text-[11px] text-muted-foreground">
            Connect a Personal Access Token to let the assistant read your repos and create issues.
            Generate one at <span className="text-primary">github.com/settings/tokens</span> with <span className="text-primary">repo</span> scope.
          </p>
          <GitHubTokenManager />
        </Section>

        {/* Accent */}
        <Section title="Accent Color">
          <div className="grid grid-cols-3 gap-2">
            {ACCENTS.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => update({ accent: a.id })}
                className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-[10px] uppercase tracking-widest transition ${
                  settings.accent === a.id ? "border-primary shadow-[0_0_14px_hsl(var(--primary)/0.5)]" : "border-primary/20 hover:border-primary/50"
                }`}
              >
                <span className="h-6 w-6 rounded-full" style={{ background: a.swatch, boxShadow: `0 0 12px ${a.swatch}` }} />
                {a.label}
              </button>
            ))}
          </div>
        </Section>

        {/* Compact */}
        <Section title="Display">
          <Toggle label="Compact mode" value={settings.compact_mode} onChange={(v) => update({ compact_mode: v })} />
        </Section>

        {/* Reasoning */}
        <Section title="Reasoning Effort">
          <div className="grid grid-cols-3 gap-2">
            {EFFORTS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => update({ reasoning_effort: e })}
                className={`mode-pill justify-center ${settings.reasoning_effort === e ? "mode-pill--active" : ""}`}
              >
                {e}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground">Applied to GPT-5 family and Gemini Pro models. Ignored elsewhere.</p>
        </Section>

        {/* Memory */}
        <Section title="Local Memory">
          <button
            type="button"
            onClick={() => {
              clearMemoryState();
              toast({ title: "Local memory cleared" });
            }}
            className="neon-btn neon-btn--danger w-full"
          >
            <Trash2 className="h-4 w-4" /> Clear local memory
          </button>
        </Section>

        {/* Account */}
        <Section title="Account">
          <div className="text-[11px] text-muted-foreground">Signed in as <span className="text-primary">{user?.email}</span></div>
          <button type="button" onClick={signOut} className="neon-btn w-full">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </Section>
      </SheetContent>
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5 space-y-2">
      <h3 className="display-font text-[10px] tracking-widest text-primary">{title}</h3>
      <div className="space-y-2 rounded-xl border border-primary/15 bg-background/40 p-3">{children}</div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: React.ReactNode; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] uppercase tracking-widest text-primary/80">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-primary/25 bg-background/70 px-3 py-1.5 text-sm text-foreground outline-none transition focus:border-primary"
      />
    </label>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex w-full items-center justify-between rounded-lg border border-primary/20 bg-background/40 px-3 py-2 text-xs"
    >
      <span>{label}</span>
      <span className={`relative h-5 w-9 rounded-full transition ${value ? "bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.6)]" : "bg-muted"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-background transition ${value ? "left-4" : "left-0.5"}`} />
      </span>
    </button>
  );
}

function GitHubTokenManager() {
  const KEY = "veyl_github_pat";
  const [token, setToken] = useState(() => (typeof localStorage !== "undefined" ? localStorage.getItem(KEY) ?? "" : ""));
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-2">
      <input
        type={show ? "text" : "password"}
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="ghp_..."
        className="w-full rounded-lg border border-primary/25 bg-background/70 px-3 py-1.5 text-xs font-mono text-foreground outline-none focus:border-primary"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            localStorage.setItem(KEY, token);
            toast({ title: "GitHub token saved" });
          }}
          className="neon-btn flex-1"
        >
          <Check className="h-3.5 w-3.5" /> Save token
        </button>
        <button type="button" onClick={() => setShow((s) => !s)} className="neon-btn">
          {show ? "Hide" : "Show"}
        </button>
      </div>
    </div>
  );
}
