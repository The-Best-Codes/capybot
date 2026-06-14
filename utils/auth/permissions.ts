/**
 * Developer key permissions
 */

export type DevPermission = "dm" | "dev_slash_commands" | "manual_message" | "summarize";

export const PERMISSION_DESCRIPTIONS: Record<DevPermission, string> = {
  dm: "Allow sending and receiving DMs with the bot",
  dev_slash_commands: "Allow using developer slash commands",
  manual_message: "Allow sending manual bot messages to server channels",
  summarize: "Allow summarizing recent server conversations",
};

export const ALL_PERMISSIONS: DevPermission[] = [
  "dm",
  "dev_slash_commands",
  "manual_message",
  "summarize",
];

export function hasPermission(
  permissions: DevPermission[] | undefined,
  permission: DevPermission,
): boolean {
  if (!permissions || permissions.length === 0) {
    return false;
  }
  return permissions.includes(permission);
}
