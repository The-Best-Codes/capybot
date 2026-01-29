import type { Guild, Message, NewsChannel, TextChannel, ThreadChannel } from "discord.js";
import { ChannelType } from "discord.js";
import { fuzzySearch } from "./fuzzy";
import { type MessageSearchResult, type SerializedMessage, serializeMessage } from "./types";

export interface SearchMessagesParams {
  guild: Guild;
  query?: string;
  channelId?: string;
  limit?: number;
}

interface MessageWithChannel {
  message: Message;
  channelName: string;
}

export async function searchMessages({
  guild,
  query,
  channelId,
  limit = 10,
}: SearchMessagesParams): Promise<MessageSearchResult[]> {
  const clampedLimit = Math.min(Math.max(limit, 1), 100);
  const messagesToSearch: MessageWithChannel[] = [];

  if (channelId) {
    const channel = guild.channels.cache.get(channelId);
    if (!channel) {
      return [];
    }

    if (!isTextBasedChannel(channel)) {
      return [];
    }

    const messages = await fetchChannelMessages(channel, clampedLimit * 5);
    messagesToSearch.push(...messages.map((m) => ({ message: m, channelName: channel.name })));
  } else {
    const textChannels = guild.channels.cache.filter(isTextBasedChannel);
    const fetchLimit = Math.ceil((clampedLimit * 3) / textChannels.size) || 20;

    const fetchPromises = [...textChannels.values()].map(async (channel) => {
      const textChannel = channel as TextBasedGuildChannel;
      const messages = await fetchChannelMessages(textChannel, fetchLimit);
      return messages.map((m) => ({ message: m, channelName: textChannel.name }));
    });

    const results = await Promise.all(fetchPromises);
    for (const channelMessages of results) {
      messagesToSearch.push(...channelMessages);
    }
  }

  const serializedMessages: SerializedMessage[] = messagesToSearch.map((m) =>
    serializeMessage(m.message, m.channelName),
  );

  if (!query?.trim()) {
    const sorted = serializedMessages
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, clampedLimit);

    return sorted.map((message) => ({
      message,
      score: 1,
    }));
  }

  const searchResults = fuzzySearch({
    items: serializedMessages,
    keys: ["content", "authorUsername", "authorDisplayName"],
    query,
    limit: clampedLimit,
  });

  return searchResults.map((r) => ({
    message: r.item,
    score: r.score,
  }));
}

type TextBasedGuildChannel = TextChannel | NewsChannel | ThreadChannel;

function isTextBasedChannel(channel: unknown): channel is TextBasedGuildChannel {
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

async function fetchChannelMessages(
  channel: TextBasedGuildChannel,
  limit: number,
): Promise<Message[]> {
  try {
    const messages = await channel.messages.fetch({ limit: Math.min(limit, 100) });
    return [...messages.values()];
  } catch {
    return [];
  }
}
