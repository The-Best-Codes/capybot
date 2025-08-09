import { Client, Events, GatewayIntentBits } from "discord.js";
import { configDotenv } from "dotenv";
import { logger } from "./utils/logger";

configDotenv();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

async function sendMessageAndExit(
  guildId: string,
  channelId: string,
  messageContent: string,
) {
  try {
    logger.start("Logging in to Discord...");
    await client.login(process.env.DISCORD_TOKEN);

    client.once(Events.ClientReady, async (c) => {
      logger.success(`Logged in as ${c.user.tag}!`);
      try {
        const guild = await client.guilds.fetch(guildId);
        if (!guild) {
          logger.error(`Guild with ID ${guildId} not found.`);
          await client.destroy();
          process.exit(1);
          return;
        }
        logger.info(`Found guild: ${guild.name}`);

        const channel = await guild.channels.fetch(channelId);
        if (!channel || !channel.isTextBased()) {
          logger.error(
            `Channel with ID ${channelId} not found or is not a text channel in guild ${guild.name}.`,
          );
          await client.destroy();
          process.exit(1);
          return;
        }
        logger.info(`Found text channel: #${channel.name}`);

        logger.info(
          `Sending message to channel #${channel.name} in ${guild.name}...`,
        );
        await channel.send(messageContent);
        logger.success("Message sent successfully!");
      } catch (error) {
        logger.error("Error sending message:", error);
      } finally {
        logger.info("Exiting...");
        await client.destroy();
        process.exit(0);
      }
    });
  } catch (error) {
    logger.error("Error during login or setup:", error);
    await client.destroy();
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const guildId = args[0];
const channelId = args[1];
const messageContent = args.slice(2).join(" ");

if (!guildId || !channelId || !messageContent) {
  logger.info(
    "Usage: bun send-custom.ts <guild_id> <channel_id> <your_message_content>",
  );
  logger.info(
    'Example: bun send-custom.ts 123456789012345678 987654321098765432 "Hello from CapyBot!"',
  );
  process.exit(1);
}

sendMessageAndExit(guildId, channelId, messageContent);

process.on("uncaughtException", (err) => {
  logger.error("Uncaught exception:", err);
  client.destroy();
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  logger.error("Unhandled rejection:", err);
  client.destroy();
  process.exit(1);
});
