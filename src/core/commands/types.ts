export type CommandCategory =
  | "system"
  | "network"
  | "ai"
  | "build"
  | "utility"
  | "settings";

export interface CommandResult {
  success: boolean;
  message: string;
  logs?: string[];
  metadata?: Record<string, unknown>;
  artifacts?: Array<{
    label: string;
    href?: string;
    kind?: "url" | "file" | "text";
    value?: string;
  }>;
}

export interface CommandContext {
  selectedModel: string;
  setSelectedModel?: (model: string) => void;
  appendHistory?: (entry: string) => void;
  runBuild?: (target: "android" | "windows" | "desktop") => Promise<CommandResult>;
  generateImage?: (prompt: string) => Promise<CommandResult>;
}

export interface CommandDefinition {
  name: string;
  aliases?: string[];
  description: string;
  usage: string;
  category: CommandCategory;
  handler: (args: string[], ctx: CommandContext) => Promise<CommandResult> | CommandResult;
}
