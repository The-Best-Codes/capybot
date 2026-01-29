import type { Guild, Message, TextBasedChannel } from "discord.js";
import { ChannelType } from "discord.js";
import type {
  DetailedMessage,
  SerializedAttachment,
  SerializedEmbed,
  SerializedMention,
  SerializedReaction,
  SerializedSticker,
} from "./types";

export interface GetMessageParams {
  guild: Guild;
  messageId: string;
  channelId?: string;
}

export async function getMessage({
  guild,
  messageId,
  channelId,
}: GetMessageParams): Promise<DetailedMessage | null> {
  let message: Message | null = null;
  let channelName = "unknown";

  if (channelId) {
    const channel = guild.channels.cache.get(channelId);
    if (channel && isTextBasedChannel(channel)) {
      try {
        message = await (channel as TextBasedChannel).messages.fetch(messageId);
        channelName = "name" in channel ? channel.name : "unknown";
      } catch {
        return null;
      }
    }
  } else {
    const textChannels = guild.channels.cache.filter(isTextBasedChannel);

    for (const channel of textChannels.values()) {
      try {
        message = await (channel as TextBasedChannel).messages.fetch(messageId);
        channelName = "name" in channel ? channel.name : "unknown";
        break;
      } catch {
        continue;
      }
    }
  }

  if (!message) {
    return null;
  }

  return serializeDetailedMessage(message, channelName);
}

function isTextBasedChannel(channel: unknown): boolean {
  if (!channel || typeof channel !== "object") return false;
  const c = channel as { type?: number };
  return (
    c.type === ChannelType.GuildText ||
    c.type === ChannelType.GuildAnnouncement ||
    c.type === ChannelType.PublicThread ||
    c.type === ChannelType.PrivateThread ||
    c.type === ChannelType.AnnouncementThread
  );
}

function serializeDetailedMessage(msg: Message, channelName: string): DetailedMessage {
  const reactions: SerializedReaction[] = msg.reactions.cache.map((reaction) => ({
    emoji: reaction.emoji.name ?? "unknown",
    emojiId: reaction.emoji.id,
    count: reaction.count,
    me: reaction.me,
  }));

  const embeds: SerializedEmbed[] = msg.embeds.map((embed) => ({
    title: embed.title,
    description: embed.description,
    url: embed.url,
    color: embed.color,
    timestamp: embed.timestamp,
    footer: embed.footer?.text ?? null,
    imageUrl: embed.image?.url ?? null,
    thumbnailUrl: embed.thumbnail?.url ?? null,
    authorName: embed.author?.name ?? null,
    fields: embed.fields.map((f) => ({
      name: f.name,
      value: f.value,
      inline: f.inline ?? false,
    })),
  }));

  const attachments: SerializedAttachment[] = msg.attachments.map((att) => ({
    id: att.id,
    name: att.name,
    url: att.url,
    size: att.size,
    contentType: att.contentType,
    width: att.width,
    height: att.height,
  }));

  const stickers: SerializedSticker[] = msg.stickers.map((sticker) => ({
    id: sticker.id,
    name: sticker.name,
    formatType: sticker.format.toString(),
  }));

  const mentions: SerializedMention = {
    users: msg.mentions.users.map((u) => ({ id: u.id, username: u.username })),
    roles: msg.mentions.roles.map((r) => ({ id: r.id, name: r.name })),
    channels: msg.mentions.channels.map((c) => ({
      id: c.id,
      name: "name" in c && c.name ? c.name : "unknown",
    })),
    everyone: msg.mentions.everyone,
  };

  let replyTo: DetailedMessage["replyTo"] = null;
  if (msg.reference?.messageId && msg.mentions.repliedUser) {
    const repliedMessage = msg.channel.messages.cache.get(msg.reference.messageId);
    replyTo = {
      messageId: msg.reference.messageId,
      authorId: msg.mentions.repliedUser.id,
      authorUsername: msg.mentions.repliedUser.username,
      contentPreview: repliedMessage?.content.slice(0, 100) ?? "[Content unavailable]",
    };
  }

  let thread: DetailedMessage["thread"] = null;
  if (msg.thread) {
    thread = {
      id: msg.thread.id,
      name: msg.thread.name,
      messageCount: msg.thread.messageCount ?? 0,
    };
  }

  return {
    id: msg.id,
    content: msg.content,
    authorId: msg.author.id,
    authorUsername: msg.author.username,
    authorDisplayName: msg.member?.displayName ?? msg.author.displayName,
    channelId: msg.channelId,
    channelName,
    timestamp: msg.createdAt.toISOString(),
    editedTimestamp: msg.editedAt?.toISOString() ?? null,
    hasAttachments: msg.attachments.size > 0,
    attachmentCount: msg.attachments.size,
    isPinned: msg.pinned,
    reactions,
    embeds,
    attachments,
    stickers,
    mentions,
    replyTo,
    thread,
    type: msg.type.toString(),
    url: msg.url,
  };
}
