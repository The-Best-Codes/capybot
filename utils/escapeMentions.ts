export function escapeMentions(text: string): string {
  if (!text) return text;

  return (
    text
      // Escape @everyone and @here
      .replace(/@everyone/g, "@\u200Beveryone")
      .replace(/@here/g, "@\u200Bhere")
      // Escape user mentions
      .replace(/<@!?(\d+)>/g, "<@\u200B$1>")
      // Escape role mentions
      .replace(/<@&(\d+)>/g, "<@&\u200B$1>")
  );
}
