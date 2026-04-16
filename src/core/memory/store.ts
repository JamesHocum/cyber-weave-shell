export interface MemoryState {
  preferredModel: string;
  recentCommands: string[];
  workflowNotes: string[];
  ui: {
    compactMode: boolean;
    accent: "cyan" | "violet" | "magenta";
  };
  updatedAt: string;
}

const MEMORY_KEY = "cyberpunk-termux-memory-v1";

const defaultMemoryState: MemoryState = {
  preferredModel: "openrouter/auto",
  recentCommands: [],
  workflowNotes: [],
  ui: { compactMode: false, accent: "cyan" },
  updatedAt: new Date().toISOString(),
};

export function loadMemoryState(): MemoryState {
  try {
    if (typeof localStorage === "undefined") return defaultMemoryState;
    const raw = localStorage.getItem(MEMORY_KEY);
    if (!raw) return defaultMemoryState;
    const parsed = JSON.parse(raw) as MemoryState;
    return {
      ...defaultMemoryState,
      ...parsed,
      ui: { ...defaultMemoryState.ui, ...(parsed.ui ?? {}) },
    };
  } catch {
    return defaultMemoryState;
  }
}

export function saveMemoryState(state: MemoryState): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(
    MEMORY_KEY,
    JSON.stringify({ ...state, updatedAt: new Date().toISOString() })
  );
}

export function pushRecentCommand(command: string): MemoryState {
  const state = loadMemoryState();
  const deduped = [command, ...state.recentCommands.filter((c) => c !== command)].slice(0, 25);
  const next: MemoryState = { ...state, recentCommands: deduped, updatedAt: new Date().toISOString() };
  saveMemoryState(next);
  return next;
}

export function setPreferredModel(model: string): MemoryState {
  const state = loadMemoryState();
  const next: MemoryState = { ...state, preferredModel: model, updatedAt: new Date().toISOString() };
  saveMemoryState(next);
  return next;
}

export function addWorkflowNote(note: string): MemoryState {
  const trimmed = note.trim();
  if (!trimmed) return loadMemoryState();
  const state = loadMemoryState();
  const next: MemoryState = {
    ...state,
    workflowNotes: [trimmed, ...state.workflowNotes].slice(0, 20),
    updatedAt: new Date().toISOString(),
  };
  saveMemoryState(next);
  return next;
}

export function clearMemoryState(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(MEMORY_KEY);
}
