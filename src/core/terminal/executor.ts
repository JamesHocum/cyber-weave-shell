import {
  commandRegistry,
  findCommand,
  type CommandContext,
  type CommandResult,
} from "../commands/registry";
import { tokenize } from "./parser";
import { routeNaturalLanguageCommand } from "./nlRouter";

export interface ExecutionPayload {
  raw: string;
  ctx: CommandContext;
}

export interface ExecutionResponse {
  input: string;
  resolvedCommand: string;
  result: CommandResult;
  mode: "command" | "natural-language";
}

export async function executeTerminalInput(
  payload: ExecutionPayload
): Promise<ExecutionResponse> {
  const { raw, ctx } = payload;
  const trimmed = raw.trim();

  if (!trimmed) {
    return {
      input: raw,
      resolvedCommand: "",
      mode: "command",
      result: { success: false, message: "No input provided" },
    };
  }

  const tokens = tokenize(trimmed);
  const direct = findCommand(tokens[0]);

  if (direct) {
    const result = await direct.handler(tokens.slice(1), ctx);
    return { input: raw, resolvedCommand: direct.name, result, mode: "command" };
  }

  const nl = routeNaturalLanguageCommand(trimmed);
  if (nl) {
    const command = findCommand(nl.command);
    if (!command) {
      return {
        input: raw,
        resolvedCommand: nl.command,
        mode: "natural-language",
        result: { success: false, message: `Resolved command "${nl.command}" is not registered` },
      };
    }
    const result = await command.handler(nl.args, ctx);
    return { input: raw, resolvedCommand: command.name, result, mode: "natural-language" };
  }

  return {
    input: raw,
    resolvedCommand: "unknown",
    mode: "command",
    result: {
      success: false,
      message: "Unknown command",
      logs: [
        `Input "${trimmed}" did not match a terminal command.`,
        "Try 'help' or use a clearer natural-language request.",
      ],
      metadata: { availableCommands: commandRegistry.map((cmd) => cmd.name) },
    },
  };
}
