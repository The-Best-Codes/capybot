#!/usr/bin/env bun
import "dotenv/config";
import { program } from "commander";
import {
  generateDevKey,
  getKeyInfo,
  revokeKey,
  revokeUserSessions,
} from "../utils/auth/devAuth";

program
  .name("dev-auth")
  .description("CapyBot developer authentication management")
  .version("1.0.0");

program
  .command("generate")
  .description("Generate a new developer key")
  .argument("<username>", "Discord username")
  .option("-e, --expires <days>", "Number of days until key expires")
  .action((username: string, options: { expires?: string }) => {
    if (!process.env.DEV_AUTH_SECRET) {
      console.error("Error: DEV_AUTH_SECRET environment variable is not set");
      console.error("Add it to your .env file first");
      process.exit(1);
    }

    const normalizedUsername = username.replace(/^@/, "");
    const expirationDays = options.expires
      ? parseInt(options.expires, 10)
      : undefined;

    if (expirationDays !== undefined && isNaN(expirationDays)) {
      console.error("Error: --expires must be a number");
      process.exit(1);
    }

    try {
      const key = generateDevKey(normalizedUsername, expirationDays);

      console.log("\nDeveloper key generated successfully\n");
      console.log(`Username: ${normalizedUsername}`);
      console.log(
        `Expires:  ${expirationDays ? `in ${expirationDays} days` : "never"}`,
      );
      console.log(`\nKey:\n${key}\n`);
      console.log(
        "Share this key securely with the user. They can use /devlogin to authenticate.",
      );
    } catch (error) {
      console.error(
        "Error generating key:",
        error instanceof Error ? error.message : error,
      );
      process.exit(1);
    }
  });

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
      const daysRemaining = Math.ceil(
        (info.expiresAt - Date.now()) / (24 * 60 * 60 * 1000),
      );

      if (daysRemaining > 0) {
        console.log(
          `Expires: ${expiresDate.toISOString()} (${daysRemaining} days remaining)`,
        );
      } else {
        console.log(`Expired: ${expiresDate.toISOString()}`);
      }
    }

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
        console.log(
          "Any active sessions using this key have been terminated.\n",
        );
      } else {
        console.log("\nKey was already revoked\n");
      }
    }

    if (options.user) {
      const normalizedUsername = options.user.replace(/^@/, "");
      const count = revokeUserSessions(normalizedUsername);

      if (count > 0) {
        console.log(
          `\nRevoked ${count} session(s) for ${normalizedUsername}\n`,
        );
      } else {
        console.log(`\nNo active sessions found for ${normalizedUsername}\n`);
      }
    }
  });

program.parse();
