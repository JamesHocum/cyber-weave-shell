import { useEffect, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/integrations/auth/AuthProvider";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

export default function AuthPage() {
  const { session, loading } = useAuth();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    document.title = "Sign in · veyl.vióra neural shell";
  }, []);

  if (loading) return <div className="grid min-h-screen place-items-center text-primary"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (session) return <Navigate to="/" replace />;

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast({ title: "Login failed", description: error.message, variant: "destructive" });
    else nav("/", { replace: true });
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { display_name: displayName || email.split("@")[0] },
      },
    });
    setBusy(false);
    if (error) toast({ title: "Signup failed", description: error.message, variant: "destructive" });
    else toast({ title: "Account created", description: "Check your inbox to verify, then sign in." });
  };

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="glass-panel w-full max-w-md p-6">
        <div className="mb-5 text-center">
          <h1 className="display-font neon-text text-2xl">VEYL'VIÓRA</h1>
          <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">Neural Shell · Access</p>
        </div>

        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-background/40">
            <TabsTrigger value="signin">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Create account</TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <form onSubmit={signIn} className="space-y-3 pt-3">
              <Field label="Email" type="email" value={email} onChange={setEmail} required />
              <Field label="Password" type="password" value={password} onChange={setPassword} required />
              <button type="submit" disabled={busy} className="neon-btn neon-btn--primary w-full">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enter the grid"}
              </button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={signUp} className="space-y-3 pt-3">
              <Field label="Display name" value={displayName} onChange={setDisplayName} />
              <Field label="Email" type="email" value={email} onChange={setEmail} required />
              <Field label="Password (min 6 chars)" type="password" value={password} onChange={setPassword} required />
              <button type="submit" disabled={busy} className="neon-btn neon-btn--primary w-full">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Initialize identity"}
              </button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function Field({ label, type = "text", value, onChange, required }: { label: string; type?: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] uppercase tracking-widest text-primary/80">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full rounded-xl border border-primary/25 bg-background/70 px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:shadow-[0_0_14px_hsl(var(--primary)/0.4)]"
      />
    </label>
  );
}
