export interface RoutedIntent {
  command: string;
  args: string[];
}

const contains = (input: string, values: string[]) =>
  values.some((value) => input.includes(value));

export function routeNaturalLanguageCommand(input: string): RoutedIntent | null {
  const text = input.toLowerCase().trim();
  if (!text) return null;

  if (contains(text, ["help me", "show commands", "what can you do"])) return { command: "help", args: [] };
  if (contains(text, ["who am i", "whoami", "active user"])) return { command: "whoami", args: [] };
  if (contains(text, ["public ip", "my ip", "what is my ip"])) return { command: "publicip", args: [] };
  if (contains(text, ["system info", "device info", "environment info"])) return { command: "sysinfo", args: [] };
  if (contains(text, ["network status", "netstat", "connections"])) return { command: "netstat", args: [] };
  if (contains(text, ["running processes", "process list", "what is running"])) return { command: "processes", args: [] };

  if (contains(text, ["switch model", "change model", "use model", "select model"])) {
    const match = text.match(/(gpt|gemini|claude|deepseek|mistral|llama|qwen)[\w\-.:/]*/i);
    if (match) return { command: "select_ai", args: [match[0]] };
    return { command: "select_ai", args: [] };
  }

  if (contains(text, ["build android", "android build", "make android version", "package android"]))
    return { command: "build_android", args: [] };
  if (contains(text, ["build windows", "windows build", "make windows version", "package windows"]))
    return { command: "build_windows", args: [] };
  if (contains(text, ["build desktop", "desktop build", "package desktop", "make desktop app"]))
    return { command: "build_desktop", args: [] };

  if (contains(text, ["generate image", "make image", "create wallpaper", "render image", "cyberpunk wallpaper"])) {
    const cleaned = text
      .replace(/(generate image|make image|create wallpaper|render image|cyberpunk wallpaper)/g, "")
      .trim();
    return { command: "generate_image", args: cleaned ? [cleaned] : [] };
  }

  return null;
}
