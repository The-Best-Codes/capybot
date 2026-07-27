import { generateText } from "ai";
import { ChannelType, Client, TextChannel } from "discord.js";
import { globalModel } from "../../clients/ai";
import { logger } from "../logger";
import { engagementPromptConfig, type EngagementPromptConfig } from "./config";

const CHECK_INTERVAL_MS = 60 * 1000;
const FAILURE_RETRY_MS = 60 * 60 * 1000;
const HISTORY_LIMIT = 20;
const MAX_MESSAGE_LENGTH = 240;

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}

function formatRelativeTime(timestamp: number | null): string {
  if (!timestamp) return "not scheduled";
  return `<t:${Math.floor(timestamp / 1000)}:R>`;
}

async function buildPromptContext(
  config: EngagementPromptConfig,
  channel: TextChannel,
): Promise<string> {
  const messages = await channel.messages.fetch({ limit: HISTORY_LIMIT }).catch(() => null);
  const transcript = messages
    ? Array.from(messages.values())
        .filter((message) => !message.system && !message.author.bot)
        .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
        .map((message) => {
          const name =
            message.member?.displayName || message.author.globalName || message.author.username;
          const content =
            message.content.trim() || (message.attachments.size > 0 ? "[attachment]" : "[no text]");
          return `- ${name}: ${truncate(content, MAX_MESSAGE_LENGTH)}`;
        })
        .join("\n")
    : "";

  return [
    `Server name: ${channel.guild.name}`,
    `Server member count: ${channel.guild.memberCount}`,
    `Target channel: #${channel.name}`,
    `Channel topic: ${channel.topic || "none"}`,
    `Configured cadence: every ${config.intervalHours} hours`,
    `Extra admin context: ${config.extraContext || "none"}`,
    transcript ? `Recent channel activity:\n${transcript}` : "Recent channel activity: unavailable",
  ].join("\n\n");
}

async function generatePromptMessage(
  config: EngagementPromptConfig,
  channel: TextChannel,
): Promise<string> {
  const promptContext = await buildPromptContext(config, channel);
  const result = await generateText({
    model: globalModel,
    system:
      "You write Discord community conversation starters for CapyBot. Produce exactly one short message for a server channel. It should feel fun, natural, safe for work, and easy to reply to. Usually make it an unrelated topic instead of continuing the recent conversation, but keep it suitable for the server vibe and the admin context. Avoid mentioning AI, prompts, or analysis. Avoid repeating topics that are already active in the recent context. Keep it to 1-3 sentences. End with a clear engaging question when possible.",
    prompt: `Write the next conversation starter for this server channel.\n\n${promptContext}`,
  });

  return result.text.replace(/^<think>[\s\S]*?<\/think>\s*/, "").trim();
}

class EngagementPromptService {
  private initialized = false;
  private runningGuilds = new Set<string>();

  async initialize(client: Client): Promise<void> {
    if (this.initialized) return;

    await engagementPromptConfig.initialize();
    this.initialized = true;

    await this.processDuePrompts(client);
    setInterval(() => {
      this.processDuePrompts(client).catch((error) => {
        logger.error(`[EngagementPrompts] Scheduled run failed: ${error}`);
      });
    }, CHECK_INTERVAL_MS);

    logger.success("[EngagementPrompts] Service initialized");
  }

  async processDuePrompts(client: Client): Promise<void> {
    const configs = await engagementPromptConfig.getAll();
    const now = Date.now();
    const dueConfigs = configs.filter(
      (config) => config.enabled && config.nextRunAt !== null && config.nextRunAt <= now,
    );

    await Promise.allSettled(dueConfigs.map((config) => this.runPrompt(client, config)));
  }

  private async runPrompt(client: Client, config: EngagementPromptConfig): Promise<void> {
    if (this.runningGuilds.has(config.guildId)) {
      return;
    }

    this.runningGuilds.add(config.guildId);

    try {
      const channel = await client.channels.fetch(config.channelId).catch(() => null);

      if (!channel || channel.type !== ChannelType.GuildText || !(channel instanceof TextChannel)) {
        logger.warn(
          `[EngagementPrompts] Channel ${config.channelId} for guild ${config.guildId} is unavailable; disabling feature`,
        );
        await engagementPromptConfig.set({
          ...config,
          enabled: false,
          nextRunAt: null,
          updatedAt: Date.now(),
          updatedBy: "system",
        });
        return;
      }

      const content = await generatePromptMessage(config, channel);

      if (!content) {
        throw new Error("AI returned an empty engagement prompt");
      }

      await channel.send({ content, allowedMentions: { parse: [] } });

      const now = Date.now();
      await engagementPromptConfig.set({
        ...config,
        lastPostedAt: now,
        nextRunAt: now + config.intervalHours * 60 * 60 * 1000,
        updatedAt: now,
        updatedBy: "system",
      });

      logger.info(
        `[EngagementPrompts] Posted prompt in guild ${channel.guild.name} (${config.guildId}), next run ${formatRelativeTime(now + config.intervalHours * 60 * 60 * 1000)}`,
      );
    } catch (error) {
      logger.error(`[EngagementPrompts] Failed for guild ${config.guildId}: ${error}`);
      await engagementPromptConfig.set({
        ...config,
        nextRunAt: Date.now() + FAILURE_RETRY_MS,
        updatedAt: Date.now(),
        updatedBy: "system",
      });
    } finally {
      this.runningGuilds.delete(config.guildId);
    }
  }
}

export const engagementPromptService = new EngagementPromptService();
