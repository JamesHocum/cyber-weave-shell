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

const MEMORY_KEY = "cyberpunk-termux-memory-v2";

const VALID_MODEL_IDS = new Set([
  "google/gemini-3-flash-preview",
  "google/gemini-3.1-pro-preview",
  "google/gemini-2.5-pro",
  "google/gemini-2.5-flash",
  "google/gemini-2.5-flash-lite",
  "openai/gpt-5.2",
  "openai/gpt-5",
  "openai/gpt-5-mini",
  "openai/gpt-5-nano",
  "google/gemini-2.5-flash-image",
  "google/gemini-3.1-flash-image-preview",
  "google/gemini-3-pro-image-preview",
]);

const DEFAULT_MODEL = "google/gemini-3-flash-preview";

const defaultMemoryState: MemoryState = {
  preferredModel: DEFAULT_MODEL,
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
    const merged: MemoryState = {
      ...defaultMemoryState,
      ...parsed,
      ui: { ...defaultMemoryState.ui, ...(parsed.ui ?? {}) },
    };
    if (!VALID_MODEL_IDS.has(merged.preferredModel)) {
      merged.preferredModel = DEFAULT_MODEL;
    }
    return merged;
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
