export function HeaderBar() {
  return (
    <header className="glass-panel mx-3 mt-3 flex items-center justify-between px-5 py-3">
      <div className="flex items-center gap-3">
        <div className="relative h-9 w-9">
          <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-primary via-secondary to-accent opacity-90" />
          <div className="absolute inset-[2px] rounded-md bg-background flex items-center justify-center">
            <span className="display-font text-base text-primary">⌬</span>
          </div>
        </div>
        <div>
          <h1 className="display-font text-sm sm:text-base">
            <span className="neon-text">VEYL'VIÓRA'S</span>
            <span className="ml-2 text-primary">HACKER · TERMINAL</span>
          </h1>
          <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            Cyberpunk Termux · v2026.1 · spellweaver studios
          </p>
        </div>
      </div>

      <div className="hidden items-center gap-2 sm:flex">
        <Indicator label="shell" tone="primary" />
        <Indicator label="neural" tone="secondary" />
        <Indicator label="memory" tone="accent" />
      </div>
    </header>
  );
}

function Indicator({ label, tone }: { label: string; tone: "primary" | "secondary" | "accent" }) {
  const ring =
    tone === "primary"
      ? "shadow-[0_0_10px_hsl(var(--primary))] bg-primary"
      : tone === "secondary"
      ? "shadow-[0_0_10px_hsl(var(--secondary))] bg-secondary"
      : "shadow-[0_0_10px_hsl(var(--accent))] bg-accent";
  return (
    <div className="flex items-center gap-2 rounded-full border border-primary/20 bg-background/60 px-3 py-1">
      <span className={`h-1.5 w-1.5 rounded-full ${ring}`} />
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
    </div>
  );
}
