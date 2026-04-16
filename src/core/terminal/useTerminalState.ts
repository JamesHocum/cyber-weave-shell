import { useCallback, useEffect, useState } from "react";
import { executeTerminalInput, type ExecutionResponse } from "./executor";
import type { CommandContext, CommandResult } from "../commands/registry";
import {
  loadMemoryState,
  pushRecentCommand,
  setPreferredModel,
  type MemoryState,
} from "../memory/store";

export interface TerminalLine {
  id: string;
  kind: "input" | "output" | "system" | "error";
  text: string;
}

const id = () => `ln_${Math.random().toString(36).slice(2, 10)}`;

export interface UseTerminalStateOptions {
  runBuild?: CommandContext["runBuild"];
  generateImage?: CommandContext["generateImage"];
}

export function useTerminalState(options: UseTerminalStateOptions = {}) {
  const [memory, setMemory] = useState<MemoryState>(() => loadMemoryState());
  const [selectedModel, setSelectedModelState] = useState<string>(memory.preferredModel);
  const [lines, setLines] = useState<TerminalLine[]>([
    { id: id(), kind: "system", text: "▣ Cyberpunk Termux v2026.1 — neural shell online." },
    { id: id(), kind: "system", text: "type 'help' to view commands or speak naturally." },
  ]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setMemory(loadMemoryState());
  }, []);

  const setSelectedModel = useCallback((model: string) => {
    setSelectedModelState(model);
    const next = setPreferredModel(model);
    setMemory(next);
  }, []);

  const appendLines = useCallback((entries: Omit<TerminalLine, "id">[]) => {
    setLines((prev) => [...prev, ...entries.map((e) => ({ ...e, id: id() }))]);
  }, []);

  const clear = useCallback(() => {
    setLines([{ id: id(), kind: "system", text: "▣ terminal cleared." }]);
  }, []);

  const runInput = useCallback(
    async (raw: string): Promise<ExecutionResponse | null> => {
      const trimmed = raw.trim();
      if (!trimmed || busy) return null;

      setBusy(true);
      appendLines([{ kind: "input", text: trimmed }]);

      const next = pushRecentCommand(trimmed);
      setMemory(next);

      const ctx: CommandContext = {
        selectedModel,
        setSelectedModel,
        runBuild: options.runBuild,
        generateImage: options.generateImage,
      };

      try {
        const exec = await executeTerminalInput({ raw: trimmed, ctx });
        const r: CommandResult = exec.result;

        if (r.message === "__CLEAR__") {
          clear();
          setBusy(false);
          return exec;
        }

        const out: Omit<TerminalLine, "id">[] = [];
        out.push({
          kind: r.success ? "output" : "error",
          text: `▸ ${exec.resolvedCommand || "input"}${exec.mode === "natural-language" ? " (nl)" : ""} — ${r.message}`,
        });
        for (const log of r.logs ?? []) out.push({ kind: r.success ? "output" : "error", text: log });
        appendLines(out);
        setBusy(false);
        return exec;
      } catch (err) {
        appendLines([
          { kind: "error", text: `! execution error: ${err instanceof Error ? err.message : String(err)}` },
        ]);
        setBusy(false);
        return null;
      }
    },
    [appendLines, busy, clear, options.generateImage, options.runBuild, selectedModel, setSelectedModel]
  );

  return {
    memory,
    selectedModel,
    setSelectedModel,
    lines,
    busy,
    runInput,
    clear,
    appendLines,
  };
}
