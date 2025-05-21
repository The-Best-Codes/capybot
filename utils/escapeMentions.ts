export function escapeMentions(text: string): string {
  if (!text) return text;

  return (
    text
      .replace(/@everyone/g, "@\u200Beveryone")
      .replace(/@here/g, "@\u200Bhere")
      .replace(/<@&(\d+)>/g, "<@&\u200B$1>") // Roles
  );
}
