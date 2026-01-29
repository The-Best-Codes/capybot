#!/usr/bin/env bun
import "dotenv/config";
import { program } from "commander";
import { confirm, multiselect, select, text } from "@clack/prompts";
import { generateDevKey, getKeyInfo, revokeKey, revokeUserSessions } from "../utils/auth/devAuth";
import { ALL_PERMISSIONS, PERMISSION_DESCRIPTIONS } from "../utils/auth/permissions";
import type { DevPermission } from "../utils/auth/permissions";
import packageJson from "../package.json";

program
  .name("dev-auth")
  .description("CapyBot developer authentication management")
  .version(packageJson.version || "0.0.0");

program
  .command("generate")
  .description("Generate a new developer key")
  .argument("[username]", "Discord username (optional, will prompt if not provided)")
  .option("-e, --expires <days>", "Number of days until key expires")
  .option("-p, --permissions <perms>", "Comma-separated permissions (dm,dev_slash_commands)")
  .action(
    async (username: string | undefined, options: { expires?: string; permissions?: string }) => {
      if (!process.env.DEV_AUTH_SECRET) {
        console.error("Error: DEV_AUTH_SECRET environment variable is not set");
        console.error("Add it to your .env file first");
        process.exit(1);
      }

      try {
        // Get username interactively if not provided
        let finalUsername = username;
        if (!finalUsername) {
          finalUsername = (await text({
            message: "Enter Discord username:",
            placeholder: "username",
          })) as string;

          if (!finalUsername) {
            console.error("Username is required");
            process.exit(1);
          }
        }

        finalUsername = finalUsername.replace(/^@/, "");

        // Get expiration interactively if not provided
        let expirationDays: number | undefined = undefined;
        if (options.expires) {
          expirationDays = parseInt(options.expires, 10);
          if (isNaN(expirationDays)) {
            console.error("Error: --expires must be a number");
            process.exit(1);
          }
        } else {
          const promptExpiration = (await confirm({
            message: "Should this key expire?",
            initialValue: false,
          })) as boolean;

          if (promptExpiration) {
            const expirationStr = (await select({
              message: "Number of days until expiration:",
              options: [
                { value: "7", label: "7 days" },
                { value: "14", label: "14 days" },
                { value: "30", label: "30 days" },
                { value: "60", label: "60 days" },
                { value: "90", label: "90 days" },
                { value: "365", label: "1 year" },
              ],
              initialValue: "30",
            })) as string;

            expirationDays = parseInt(expirationStr, 10);
          }
        }

        // Get permissions interactively if not provided
        let permissions: DevPermission[] = [];
        if (options.permissions) {
          permissions = options.permissions
            .split(",")
            .map((p) => p.trim())
            .filter((p) => ALL_PERMISSIONS.includes(p as DevPermission)) as DevPermission[];
        } else {
          const permissionOptions = ALL_PERMISSIONS.map((perm) => ({
            value: perm,
            label: `${perm} - ${PERMISSION_DESCRIPTIONS[perm]}`,
          }));

          const selected = (await multiselect({
            message: "Select permissions for this key:",
            options: permissionOptions,
          })) as DevPermission[] | undefined;

          permissions = selected || [];
        }

        const key = generateDevKey(finalUsername, expirationDays, permissions);

        console.log("\nDeveloper key generated successfully\n");
        console.log(`Username:    ${finalUsername}`);
        console.log(`Expires:     ${expirationDays ? `in ${expirationDays} days` : "never"}`);
        console.log(`Permissions: ${permissions.length > 0 ? permissions.join(", ") : "none"}`);
        console.log(`\nKey:\n${key}\n`);
        console.log(
          "Share this key securely with the user. They can use /dev_login to authenticate.",
        );
      } catch (error) {
        console.error("Error generating key:", error instanceof Error ? error.message : error);
        process.exit(1);
      }
    },
  );

program
  .command("info")
  .description("Get information about a developer key")
  .argument("<key>", "The developer key to inspect")
  .action((key: string) => {
    if (!process.env.DEV_AUTH_SECRET) {
      console.error("Error: DEV_AUTH_SECRET environment variable is not set");
      process.exit(1);
    }

    const info = getKeyInfo(key);

    console.log("\nKey Information\n");

    if (info.error && !info.username) {
      console.log(`Status: Invalid`);
      console.log(`Error: ${info.error}`);
      return;
    }

    console.log(`Username: ${info.username}`);

    if (info.revoked) {
      console.log(`Status: Revoked`);
    } else if (info.expired) {
      console.log(`Status: Expired`);
    } else if (info.valid) {
      console.log(`Status: Valid`);
    } else {
      console.log(`Status: Invalid`);
    }

    if (info.neverExpires) {
      console.log(`Expires: Never`);
    } else if (info.expiresAt) {
      const expiresDate = new Date(info.expiresAt);
      const daysRemaining = Math.ceil((info.expiresAt - Date.now()) / (24 * 60 * 60 * 1000));

      if (daysRemaining > 0) {
        console.log(`Expires: ${expiresDate.toISOString()} (${daysRemaining} days remaining)`);
      } else {
        console.log(`Expired: ${expiresDate.toISOString()}`);
      }
    }

    console.log(
      `Permissions: ${
        info.permissions && info.permissions.length > 0 ? info.permissions.join(", ") : "none"
      }`,
    );

    console.log();
  });

program
  .command("revoke")
  .description("Revoke a developer key or all sessions for a user")
  .option("-k, --key <key>", "Revoke a specific key")
  .option("-u, --user <username>", "Revoke all sessions for a username")
  .action((options: { key?: string; user?: string }) => {
    if (!process.env.DEV_AUTH_SECRET) {
      console.error("Error: DEV_AUTH_SECRET environment variable is not set");
      process.exit(1);
    }

    if (!options.key && !options.user) {
      console.error("Error: Must provide either --key or --user");
      process.exit(1);
    }

    if (options.key && options.user) {
      console.error("Error: Cannot use both --key and --user");
      process.exit(1);
    }

    if (options.key) {
      const info = getKeyInfo(options.key);
      if (!info.username) {
        console.error("Error: Invalid key");
        process.exit(1);
      }

      if (info.revoked) {
        console.log("\nKey is already revoked\n");
        return;
      }

      const success = revokeKey(options.key);
      if (success) {
        console.log(`\nKey for ${info.username} has been revoked\n`);
        console.log("Any active sessions using this key have been terminated.\n");
      } else {
        console.log("\nKey was already revoked\n");
      }
    }

    if (options.user) {
      const normalizedUsername = options.user.replace(/^@/, "");
      const count = revokeUserSessions(normalizedUsername);

      if (count > 0) {
        console.log(`\nRevoked ${count} session(s) for ${normalizedUsername}\n`);
      } else {
        console.log(`\nNo active sessions found for ${normalizedUsername}\n`);
      }
    }
  });

program.parse();
