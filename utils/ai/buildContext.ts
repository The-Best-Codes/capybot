import { Message, type OmitPartialGroupDMChannel } from "discord.js";
import prettier from "prettier";

function escapeXML(str: string): string {
  return str.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

class ContextBuilder {
  private sections: Map<string, unknown> = new Map();

  addUser(user: {
    id: string;
    username: string;
    discriminator: string;
    bot: boolean;
  }) {
    this.sections.set("user", user);
    return this;
  }

  addMessage(message: {
    id: string;
    content: string;
    timestamp: number;
    mentions_bot: boolean;
    is_reply: boolean;
  }) {
    this.sections.set("message", message);
    return this;
  }

  addChannel(channel: { id: string; name: string; type: string }) {
    this.sections.set("channel", channel);
    return this;
  }

  addGuild(guild: { id: string; name: string; member_count: number } | null) {
    if (guild) {
      this.sections.set("guild", guild);
    }
    return this;
  }

  addMessageHistory(
    messages: Array<{ author: string; content: string; timestamp: number }>,
  ) {
    this.sections.set("message_history", messages);
    return this;
  }

  addMentions(mentions: {
    users?: Array<{ id: string; username: string; bot: boolean }>;
    channels?: Array<{ id: string; name: string; type: string }>;
    roles?: Array<{ id: string; name: string }>;
  }) {
    this.sections.set("mentions", mentions);
    return this;
  }

  private serializeValue(value: unknown): string {
    if (value === null || value === undefined) {
      return "";
    }

    if (typeof value === "string") {
      return escapeXML(value);
    }

    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }

    if (Array.isArray(value)) {
      if (value.length === 0) return "";

      return value
        .map((item) => {
          if (typeof item === "object" && item !== null) {
            const entries = Object.entries(item as Record<string, unknown>);
            const itemContent = entries
              .map(
                ([key, val]) => `<${key}>${this.serializeValue(val)}</${key}>`,
              )
              .join("");
            return `<item>${itemContent}</item>`;
          }
          return `<item>${this.serializeValue(item)}</item>`;
        })
        .join("");
    }

    if (typeof value === "object") {
      const entries = Object.entries(value as Record<string, unknown>);
      return entries
        .map(([key, val]) => {
          const serialized = this.serializeValue(val);
          return `<${key}>${serialized}</${key}>`;
        })
        .join("");
    }

    return String(value);
  }

  async toXML(): Promise<string> {
    const sections = Array.from(this.sections.entries())
      .map(([key, value]) => {
        const serialized = this.serializeValue(value);
        return `<${key}>${serialized}</${key}>`;
      })
      .join("");

    const rawXML = `<context>${sections}</context>`;

    const formattedXML = await prettier.format(rawXML, {
      parser: "html",
      htmlWhitespaceSensitivity: "ignore",
      printWidth: 120,
      tabWidth: 2,
      useTabs: false,
      singleQuote: false,
      bracketSameLine: true,
      bracketSpacing: false,
    });

    return formattedXML;
  }
}

export async function buildContextXML(
  message: OmitPartialGroupDMChannel<Message<boolean>>,
): Promise<string> {
  const author = message.author;
  const guild = message.guild;
  const channel = message.channel;

  let messageHistory: Array<{
    author: string;
    content: string;
    timestamp: number;
  }> = [];
  try {
    const messages = await channel.messages.fetch({ limit: 6 });
    messageHistory = Array.from(messages.values())
      .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
      .slice(0, -1)
      .map((msg) => ({
        author: msg.author.bot
          ? `${msg.author.username} [BOT]`
          : msg.author.username,
        content: msg.content,
        timestamp: msg.createdTimestamp,
      }));
  } catch (error) {
    // no-op
  }

  const mentionedUsers = Array.from(message.mentions.users.values()).map(
    (user) => ({
      id: user.id,
      username: user.username,
      bot: user.bot,
    }),
  );

  const mentionedChannels = Array.from(message.mentions.channels.values()).map(
    (ch) => ({
      id: ch.id,
      name: ("name" in ch ? ch.name : null) || "Unknown",
      type: String(ch.type),
    }),
  );

  const mentionedRoles = Array.from(message.mentions.roles.values()).map(
    (role) => ({
      id: role.id,
      name: role.name,
    }),
  );

  const context = new ContextBuilder()
    .addUser({
      id: author.id,
      username: author.username,
      discriminator: author.discriminator,
      bot: author.bot,
    })
    .addMessage({
      id: message.id,
      content: message.content,
      timestamp: message.createdTimestamp,
      mentions_bot: message.mentions.has(message.client.user!.id),
      is_reply: message.reference !== null,
    })
    .addChannel({
      id: channel.id,
      name: channel.isDMBased() ? "DM" : channel.name!,
      type: channel.isDMBased() ? "dm" : "guild",
    })
    .addGuild(
      guild
        ? {
            id: guild.id,
            name: guild.name,
            member_count: guild.memberCount,
          }
        : null,
    )
    .addMessageHistory(messageHistory)
    .addMentions({
      users: mentionedUsers.length > 0 ? mentionedUsers : undefined,
      channels: mentionedChannels.length > 0 ? mentionedChannels : undefined,
      roles: mentionedRoles.length > 0 ? mentionedRoles : undefined,
    });

  return context.toXML();
}
