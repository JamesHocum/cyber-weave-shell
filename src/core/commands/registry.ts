import type {
  CommandCategory,
  CommandContext,
  CommandDefinition,
  CommandResult,
} from "./types";

export type { CommandCategory, CommandContext, CommandDefinition, CommandResult };

const getBrowserInfo = () => {
  if (typeof window === "undefined") {
    return { platform: "unknown", language: "unknown", online: false, userAgent: "unknown" };
  }
  return {
    platform: navigator.platform || "unknown",
    language: navigator.language || "unknown",
    online: navigator.onLine,
    userAgent: navigator.userAgent,
  };
};

const getHelpText = (commands: CommandDefinition[]) =>
  commands.map((cmd) => `${cmd.name.padEnd(16)} ${cmd.description}`).join("\n");

export const commandRegistry: CommandDefinition[] = [
  {
    name: "help",
    description: "List available terminal commands",
    usage: "help",
    category: "utility",
    handler: async () => ({
      success: true,
      message: "Available commands",
      logs: [getHelpText(commandRegistry)],
    }),
  },
  {
    name: "whoami",
    description: "Display active user identity",
    usage: "whoami",
    category: "system",
    handler: async () => ({
      success: true,
      message: "Active operator",
      logs: ["operator: James", "mode: cyberpunk-termux", "status: dangerous"],
    }),
  },
  {
    name: "ipconfig",
    aliases: ["ifconfig"],
    description: "Show local runtime/network info",
    usage: "ipconfig",
    category: "network",
    handler: async () => {
      const info = getBrowserInfo();
      return {
        success: true,
        message: "Local runtime information",
        logs: [
          `platform: ${info.platform}`,
          `language: ${info.language}`,
          `online: ${String(info.online)}`,
          `userAgent: ${info.userAgent}`,
        ],
      };
    },
  },
  {
    name: "publicip",
    description: "Fetch public IP address",
    usage: "publicip",
    category: "network",
    handler: async () => {
      try {
        const response = await fetch("https://api.ipify.org?format=json");
        const data = (await response.json()) as { ip: string };
        return { success: true, message: "Public IP detected", logs: [`ip: ${data.ip}`] };
      } catch {
        return {
          success: false,
          message: "Could not fetch public IP",
          logs: ["Network request failed or blocked."],
        };
      }
    },
  },
  {
    name: "sysinfo",
    description: "Show environment and device info",
    usage: "sysinfo",
    category: "system",
    handler: async () => {
      const info = getBrowserInfo();
      const width = typeof window !== "undefined" ? window.innerWidth : 0;
      const height = typeof window !== "undefined" ? window.innerHeight : 0;
      return {
        success: true,
        message: "System information",
        logs: [
          `screen: ${width}x${height}`,
          `platform: ${info.platform}`,
          `language: ${info.language}`,
          `online: ${String(info.online)}`,
          `timestamp: ${new Date().toISOString()}`,
        ],
      };
    },
  },
  {
    name: "netstat",
    description: "Show current network status summary",
    usage: "netstat",
    category: "network",
    handler: async () => ({
      success: true,
      message: "Network status",
      logs: [
        "mode: browser runtime",
        `online: ${String(typeof navigator !== "undefined" ? navigator.onLine : false)}`,
        "connections: browser sandbox prevents raw socket inspection",
      ],
    }),
  },
  {
    name: "processes",
    aliases: ["ps"],
    description: "Show logical app process map",
    usage: "processes",
    category: "system",
    handler: async () => ({
      success: true,
      message: "Logical process map",
      logs: [
        "ui-shell          running",
        "command-engine    running",
        "nl-router         running",
        "memory-store      running",
        "ai-provider       standby",
      ],
    }),
  },
  {
    name: "select_ai",
    description: "Switch active model",
    usage: "select_ai <modelId>",
    category: "ai",
    handler: async (args, ctx) => {
      const model = args[0];
      if (!model) {
        return { success: false, message: "No model specified", logs: ["Usage: select_ai <modelId>"] };
      }
      ctx.setSelectedModel?.(model);
      return { success: true, message: `Selected model: ${model}`, logs: [`activeModel: ${model}`] };
    },
  },
  {
    name: "generate_image",
    description: "Generate an image from a prompt",
    usage: "generate_image <prompt>",
    category: "ai",
    handler: async (args, ctx) => {
      const prompt = args.join(" ").trim();
      if (!prompt) {
        return { success: false, message: "Missing image prompt", logs: ["Usage: generate_image <prompt>"] };
      }
      if (ctx.generateImage) return ctx.generateImage(prompt);
      return {
        success: true,
        message: "Image generation stub executed",
        logs: [`prompt: ${prompt}`, "No image backend is wired yet."],
      };
    },
  },
  {
    name: "build_android",
    description: "Trigger Android build flow",
    usage: "build_android",
    category: "build",
    handler: async (_args, ctx) => {
      if (ctx.runBuild) return ctx.runBuild("android");
      return { success: true, message: "Android build stub executed", logs: ["No real Android build pipeline wired yet."] };
    },
  },
  {
    name: "build_windows",
    description: "Trigger Windows build flow",
    usage: "build_windows",
    category: "build",
    handler: async (_args, ctx) => {
      if (ctx.runBuild) return ctx.runBuild("windows");
      return { success: true, message: "Windows build stub executed", logs: ["No real Windows build pipeline wired yet."] };
    },
  },
  {
    name: "build_desktop",
    description: "Trigger desktop build flow",
    usage: "build_desktop",
    category: "build",
    handler: async (_args, ctx) => {
      if (ctx.runBuild) return ctx.runBuild("desktop");
      return { success: true, message: "Desktop build stub executed", logs: ["No real desktop build pipeline wired yet."] };
    },
  },
  {
    name: "clear",
    aliases: ["cls"],
    description: "Clear terminal output",
    usage: "clear",
    category: "utility",
    handler: async () => ({ success: true, message: "__CLEAR__" }),
  },
];

export function findCommand(name: string): CommandDefinition | undefined {
  const normalized = name.trim().toLowerCase();
  return commandRegistry.find(
    (cmd) => cmd.name === normalized || cmd.aliases?.some((a) => a.toLowerCase() === normalized)
  );
}
