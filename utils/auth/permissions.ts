/**
 * Developer key permissions
 */

export type DevPermission =
  | "dm"
  | "dev_slash_commands"
  | "manual_message"
  | "summarize"
  | "view_dashboard";

export const PERMISSION_DESCRIPTIONS: Record<DevPermission, string> = {
  dm: "Allow sending and receiving DMs with the bot",
  dev_slash_commands: "Allow using developer slash commands",
  manual_message: "Allow sending manual bot messages to server channels",
  summarize: "Allow summarizing recent server conversations",
  view_dashboard: "Allow viewing the analytics dashboard",
};

export const ALL_PERMISSIONS: DevPermission[] = [
  "dm",
  "dev_slash_commands",
  "manual_message",
  "summarize",
  "view_dashboard",
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
