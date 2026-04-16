export function tokenize(input: string): string[] {
  return (
    input
      .trim()
      .match(/"[^"]*"|'[^']*'|\S+/g)
      ?.map((token) => token.replace(/^["']|["']$/g, "")) ?? []
  );
}
