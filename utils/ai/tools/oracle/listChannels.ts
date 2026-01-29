import type { Guild, GuildChannel, ThreadChannel } from "discord.js";
import { fuzzySearch } from "./fuzzy";
import { type ChannelSearchResult, serializeChannel, type SerializedChannel } from "./types";

export interface ListChannelsParams {
  guild: Guild;
  query?: string;
  limit?: number;
}

export async function listChannels({
  guild,
  query,
  limit = 100,
}: ListChannelsParams): Promise<ChannelSearchResult[]> {
  const clampedLimit = Math.min(Math.max(limit, 1), 100);

  try {
    await guild.channels.fetch();
  } catch {
    // no-op
  }

  const channels = guild.channels.cache;

  const serializedChannels: SerializedChannel[] = [];

  for (const channel of channels.values()) {
    if (!isValidChannel(channel)) continue;

    const parent = channel.parentId ? channels.get(channel.parentId) : null;
    const parentName = parent && "name" in parent ? parent.name : null;

    serializedChannels.push(serializeChannel(channel, parentName));
  }

  if (!query?.trim()) {
    const sorted = serializedChannels
      .sort((a, b) => a.position - b.position)
      .slice(0, clampedLimit);

    return sorted.map((channel) => ({
      channel,
      score: 1,
    }));
  }

  const searchResults = fuzzySearch({
    items: serializedChannels,
    keys: ["name", "topic"],
    query,
    limit: clampedLimit,
  });

  return searchResults.map((r) => ({
    channel: r.item,
    score: r.score,
  }));
}

function isValidChannel(
  channel: GuildChannel | ThreadChannel,
): channel is GuildChannel | ThreadChannel {
  return "name" in channel && typeof channel.name === "string";
}
