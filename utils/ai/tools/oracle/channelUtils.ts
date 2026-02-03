import type { NewsChannel, TextChannel, ThreadChannel } from "discord.js";
import { ChannelType } from "discord.js";

export type TextBasedGuildChannel = TextChannel | NewsChannel | ThreadChannel;

const TEXT_BASED_CHANNEL_TYPES = new Set([
  ChannelType.GuildText,
  ChannelType.GuildAnnouncement,
  ChannelType.PublicThread,
  ChannelType.PrivateThread,
  ChannelType.AnnouncementThread,
]);

export function isTextBasedChannel(channel: unknown): channel is TextBasedGuildChannel {
  if (!channel || typeof channel !== "object") return false;
  const c = channel as { type?: number };
  return c.type !== undefined && TEXT_BASED_CHANNEL_TYPES.has(c.type);
}

export function getChannelTypeName(type: ChannelType): string {
  return ChannelType[type] ?? `Unknown(${type})`;
}
