import type { Guild, Message } from "discord.js";
import { isTextBasedChannel, type TextBasedGuildChannel } from "./channelUtils";
import { fuzzySearch } from "./fuzzy";
import { type SerializedMessage, serializeMessage } from "./types";

export interface SearchMessagesParams {
  guild: Guild;
  query?: string;
  channelId?: string;
  limit?: number;
}

export interface SearchMessagesResult {
  results: MessageSearchResult[];
  totalSearched: number;
  truncated: boolean;
  warning?: string;
}

export interface MessageSearchResult {
  message: SerializedMessage;
  score: number;
}

interface MessageWithChannel {
  message: Message;
  channelName: string;
}

const MAX_MESSAGES_PER_CHANNEL = 100;

export async function searchMessages({
  guild,
  query,
  channelId,
  limit = 10,
}: SearchMessagesParams): Promise<SearchMessagesResult> {
  const clampedLimit = Math.min(Math.max(limit, 1), 100);
  const messagesToSearch: MessageWithChannel[] = [];

  if (channelId) {
    const channel = guild.channels.cache.get(channelId);
    if (!channel) {
      return { results: [], totalSearched: 0, truncated: false };
    }

    if (!isTextBasedChannel(channel)) {
      return { results: [], totalSearched: 0, truncated: false };
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

  const totalSearched = messagesToSearch.length;
  const serializedMessages: SerializedMessage[] = messagesToSearch.map((m) =>
    serializeMessage(m.message, m.channelName),
  );

  let searchResults: MessageSearchResult[];

  if (!query?.trim()) {
    const sorted = serializedMessages
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, clampedLimit);

    searchResults = sorted.map((message) => ({
      message,
      score: -1,
    }));
  } else {
    const fuzzyResults = fuzzySearch({
      items: serializedMessages,
      keys: ["content", "authorUsername", "authorDisplayName"],
      query,
      limit: clampedLimit,
    });

    searchResults = fuzzyResults.map((r) => ({
      message: r.item,
      score: r.score,
    }));
  }

  const truncated = totalSearched > clampedLimit;
  const warning =
    `Searched ${totalSearched} recent messages (max ${MAX_MESSAGES_PER_CHANNEL}/channel). ` +
    `Older messages are not searchable via this API.`;

  return {
    results: searchResults,
    totalSearched,
    truncated,
    warning,
  };
}

async function fetchChannelMessages(
  channel: TextBasedGuildChannel,
  limit: number,
): Promise<Message[]> {
  try {
    const messages = await channel.messages.fetch({
      limit: Math.min(limit, MAX_MESSAGES_PER_CHANNEL),
    });
    return [...messages.values()];
  } catch {
    return [];
  }
}
