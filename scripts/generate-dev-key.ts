#!/usr/bin/env bun
import "dotenv/config";
import { generateDevKey } from "../utils/auth/devAuth";

const args = process.argv.slice(2);

function printUsage() {
  console.log(`
Usage: bun scripts/generate-dev-key.ts <username> [expiration_days]

Arguments:
  username          Discord username (required)
  expiration_days   Number of days until key expires (optional, defaults to never)

Examples:
  bun scripts/generate-dev-key.ts bestcodes
  bun scripts/generate-dev-key.ts bestcodes 30
  bun scripts/generate-dev-key.ts @bestcodes 90
`);
}

if (args.length < 1) {
  printUsage();
  process.exit(1);
}

const username = args[0].replace(/^@/, "");
const expirationDays = args[1] ? parseInt(args[1], 10) : undefined;

if (expirationDays !== undefined && isNaN(expirationDays)) {
  console.error("Error: expiration_days must be a number");
  process.exit(1);
}

if (!process.env.DEV_AUTH_SECRET) {
  console.error("Error: DEV_AUTH_SECRET environment variable is not set");
  console.error("Add it to your .env file first");
  process.exit(1);
}

try {
  const key = generateDevKey(username, expirationDays);

  console.log("\n✅ Developer key generated successfully!\n");
  console.log(`Username: ${username}`);
  console.log(
    `Expires: ${expirationDays ? `in ${expirationDays} days` : "never"}`,
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
