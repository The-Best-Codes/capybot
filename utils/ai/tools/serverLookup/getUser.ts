import type { Guild, GuildMember } from "discord.js";
import { ActivityType, PermissionsBitField } from "discord.js";
import type { DetailedUser } from "./types";

export interface GetUserParams {
  guild: Guild;
  userId: string;
}

export async function getUser({ guild, userId }: GetUserParams): Promise<DetailedUser | null> {
  let member: GuildMember | null = null;

  try {
    member = await guild.members.fetch(userId);
  } catch {
    return null;
  }

  if (!member) {
    return null;
  }

  return serializeDetailedUser(member, guild);
}

function serializeDetailedUser(member: GuildMember, guild: Guild): DetailedUser {
  const roles = member.roles.cache.filter((r) => r.name !== "@everyone").map((r) => r.name);

  const avatarUrl = member.displayAvatarURL({ size: 256 });

  let bannerUrl: string | null = null;
  if (member.user.banner) {
    bannerUrl = member.user.bannerURL({ size: 256 }) ?? null;
  }

  const permissionsBits = new PermissionsBitField(member.permissions);
  const permissions = permissionsBits.toArray();

  let voiceState: DetailedUser["voiceState"] = null;
  if (member.voice.channelId) {
    const voiceChannel = guild.channels.cache.get(member.voice.channelId);
    voiceState = {
      channelId: member.voice.channelId,
      channelName: voiceChannel && "name" in voiceChannel ? voiceChannel.name : null,
      selfMute: member.voice.selfMute ?? false,
      selfDeaf: member.voice.selfDeaf ?? false,
      serverMute: member.voice.serverMute ?? false,
      serverDeaf: member.voice.serverDeaf ?? false,
      streaming: member.voice.streaming ?? false,
      camera: member.voice.selfVideo ?? false,
    };
  }

  let presence: DetailedUser["presence"] = null;
  if (member.presence) {
    presence = {
      status: member.presence.status,
      clientStatus: {
        desktop: member.presence.clientStatus?.desktop ?? null,
        mobile: member.presence.clientStatus?.mobile ?? null,
        web: member.presence.clientStatus?.web ?? null,
      },
      activities: member.presence.activities.map((activity) => ({
        name: activity.name,
        type: ActivityType[activity.type] ?? activity.type.toString(),
        details: activity.details,
        state: activity.state,
      })),
    };
  }

  return {
    id: member.id,
    username: member.user.username,
    displayName: member.displayName,
    discriminator: member.user.discriminator,
    isBot: member.user.bot,
    nickname: member.nickname,
    roles,
    rolesString: roles.join(" "),
    joinedAt: member.joinedAt?.toISOString() ?? null,
    avatarUrl,
    bannerUrl,
    accentColor: member.user.accentColor ?? null,
    accountCreatedAt: member.user.createdAt.toISOString(),
    premiumSince: member.premiumSince?.toISOString() ?? null,
    communicationDisabledUntil: member.communicationDisabledUntil?.toISOString() ?? null,
    pending: member.pending ?? false,
    permissions,
    voiceState,
    presence,
  };
}
