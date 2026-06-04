import type { Guild, GuildChannel, ThreadChannel, VoiceChannel } from "discord.js";
import { ChannelType, PermissionsBitField } from "discord.js";
import type { DetailedChannel, SerializedPermissionOverwrite } from "./types";

export interface GetChannelParams {
  guild: Guild;
  channelId: string;
}

export async function getChannel({
  guild,
  channelId,
}: GetChannelParams): Promise<DetailedChannel | null> {
  try {
    await guild.channels.fetch(channelId);
  } catch {
    // no-op
  }

  const channel = guild.channels.cache.get(channelId);
  if (!channel) {
    return null;
  }

  return serializeDetailedChannel(channel, guild);
}

function serializeDetailedChannel(
  channel: GuildChannel | ThreadChannel,
  guild: Guild,
): DetailedChannel {
  const parent = channel.parentId ? guild.channels.cache.get(channel.parentId) : null;
  const parentName = parent && "name" in parent ? parent.name : null;

  let topic: string | null = null;
  if ("topic" in channel && typeof channel.topic === "string") {
    topic = channel.topic;
  }

  let memberCount: number | undefined;
  if ("members" in channel && channel.members && "size" in channel.members) {
    memberCount = channel.members.size;
  }

  let nsfw = false;
  if ("nsfw" in channel && typeof channel.nsfw === "boolean") {
    nsfw = channel.nsfw;
  }

  let rateLimitPerUser: number | null = null;
  if ("rateLimitPerUser" in channel && typeof channel.rateLimitPerUser === "number") {
    rateLimitPerUser = channel.rateLimitPerUser;
  }

  let lastMessageId: string | null = null;
  let lastMessageTimestamp: string | null = null;
  if ("lastMessageId" in channel) {
    lastMessageId = channel.lastMessageId;
  }
  if ("lastMessage" in channel && channel.lastMessage) {
    lastMessageTimestamp = channel.lastMessage.createdAt.toISOString();
  }

  const permissionOverwrites: SerializedPermissionOverwrite[] = [];
  if ("permissionOverwrites" in channel) {
    for (const overwrite of channel.permissionOverwrites.cache.values()) {
      let name: string | null = null;
      let type: "role" | "member" = "role";

      if (overwrite.type === 0) {
        const role = guild.roles.cache.get(overwrite.id);
        name = role?.name ?? null;
        type = "role";
      } else {
        const member = guild.members.cache.get(overwrite.id);
        name = member?.displayName ?? null;
        type = "member";
      }

      const allowBits = new PermissionsBitField(overwrite.allow);
      const denyBits = new PermissionsBitField(overwrite.deny);

      permissionOverwrites.push({
        id: overwrite.id,
        type,
        name,
        allow: allowBits.toArray(),
        deny: denyBits.toArray(),
      });
    }
  }

  let threadMetadata: DetailedChannel["threadMetadata"] = null;
  if (isThreadChannel(channel)) {
    let ownerUsername: string | null = null;
    if (channel.ownerId) {
      const owner = guild.members.cache.get(channel.ownerId);
      ownerUsername = owner?.user.username ?? null;
    }

    threadMetadata = {
      archived: channel.archived ?? false,
      locked: channel.locked ?? false,
      autoArchiveDuration: channel.autoArchiveDuration ?? null,
      ownerId: channel.ownerId,
      ownerUsername,
      messageCount: channel.messageCount ?? 0,
      memberCount: channel.memberCount ?? 0,
    };
  }

  let voiceInfo: DetailedChannel["voiceInfo"] = null;
  if (isVoiceChannel(channel)) {
    voiceInfo = {
      bitrate: channel.bitrate,
      userLimit: channel.userLimit,
      rtcRegion: channel.rtcRegion,
    };
  }

  return {
    id: channel.id,
    name: channel.name,
    type: ChannelType[channel.type] ?? channel.type.toString(),
    topic,
    parentId: channel.parentId,
    parentName,
    position: "position" in channel ? channel.position : 0,
    memberCount,
    nsfw,
    rateLimitPerUser,
    lastMessageId,
    lastMessageTimestamp,
    createdAt: channel.createdAt?.toISOString() ?? new Date().toISOString(),
    permissionOverwrites,
    threadMetadata,
    voiceInfo,
  };
}

function isThreadChannel(channel: GuildChannel | ThreadChannel): channel is ThreadChannel {
  return (
    channel.type === ChannelType.PublicThread ||
    channel.type === ChannelType.PrivateThread ||
    channel.type === ChannelType.AnnouncementThread
  );
}

function isVoiceChannel(channel: GuildChannel | ThreadChannel): channel is VoiceChannel {
  return channel.type === ChannelType.GuildVoice || channel.type === ChannelType.GuildStageVoice;
}
