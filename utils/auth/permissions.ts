/**
 * Developer key permissions
 */

export type DevPermission = "dm" | "dev_slash_commands";

export const PERMISSION_DESCRIPTIONS: Record<DevPermission, string> = {
  dm: "Allow sending and receiving DMs with the bot",
  dev_slash_commands: "Allow using developer slash commands",
};

export const ALL_PERMISSIONS: DevPermission[] = ["dm", "dev_slash_commands"];

export function hasPermission(
  permissions: DevPermission[] | undefined,
  permission: DevPermission,
): boolean {
  if (!permissions || permissions.length === 0) {
    return false;
  }
  return permissions.includes(permission);
}
