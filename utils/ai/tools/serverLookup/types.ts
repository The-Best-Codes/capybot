import type { GuildChannel, GuildMember, Message, ThreadChannel, User } from "discord.js";
import { ChannelType } from "discord.js";

export interface SerializedMessage {
  id: string;
  content: string;
  authorId: string;
  authorUsername: string;
  authorDisplayName: string;
  channelId: string;
  channelName: string;
  timestamp: string;
  hasAttachments: boolean;
  attachmentCount: number;
}

export interface SerializedChannel {
  id: string;
  name: string;
  type: string;
  topic: string | null;
  parentId: string | null;
  parentName: string | null;
  position: number;
  memberCount?: number;
}

export interface SerializedUser {
  id: string;
  username: string;
  displayName: string;
  discriminator: string;
  isBot: boolean;
  nickname: string | null;
  roles: string[];
  rolesString: string;
  joinedAt: string | null;
}

export interface SerializedReaction {
  emoji: string;
  emojiId: string | null;
  count: number;
  me: boolean;
}

export interface SerializedEmbed {
  title: string | null;
  description: string | null;
  url: string | null;
  color: number | null;
  timestamp: string | null;
  footer: string | null;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  authorName: string | null;
  fields: { name: string; value: string; inline: boolean }[];
}

export interface SerializedAttachment {
  id: string;
  name: string;
  url: string;
  size: number;
  contentType: string | null;
  width: number | null;
  height: number | null;
}

export interface SerializedSticker {
  id: string;
  name: string;
  formatType: string;
}

export interface SerializedMention {
  users: { id: string; username: string }[];
  roles: { id: string; name: string }[];
  channels: { id: string; name: string }[];
  everyone: boolean;
}

export interface DetailedMessage extends SerializedMessage {
  editedTimestamp: string | null;
  isPinned: boolean;
  reactions: SerializedReaction[];
  embeds: SerializedEmbed[];
  attachments: SerializedAttachment[];
  stickers: SerializedSticker[];
  mentions: SerializedMention;
  replyTo: {
    messageId: string;
    authorId: string;
    authorUsername: string;
    contentPreview: string;
  } | null;
  thread: {
    id: string;
    name: string;
    messageCount: number;
  } | null;
  type: string;
  url: string;
}

export interface SerializedPermissionOverwrite {
  id: string;
  type: "role" | "member";
  name: string | null;
  allow: string[];
  deny: string[];
}

export interface DetailedChannel extends SerializedChannel {
  nsfw: boolean;
  rateLimitPerUser: number | null;
  lastMessageId: string | null;
  lastMessageTimestamp: string | null;
  createdAt: string;
  permissionOverwrites: SerializedPermissionOverwrite[];
  threadMetadata: {
    archived: boolean;
    locked: boolean;
    autoArchiveDuration: number | null;
    ownerId: string | null;
    ownerUsername: string | null;
    messageCount: number;
    memberCount: number;
  } | null;
  voiceInfo: {
    bitrate: number;
    userLimit: number;
    rtcRegion: string | null;
  } | null;
}

export interface DetailedUser extends SerializedUser {
  avatarUrl: string | null;
  bannerUrl: string | null;
  accentColor: number | null;
  accountCreatedAt: string;
  premiumSince: string | null;
  communicationDisabledUntil: string | null;
  pending: boolean;
  permissions: string[];
  voiceState: {
    channelId: string | null;
    channelName: string | null;
    selfMute: boolean;
    selfDeaf: boolean;
    serverMute: boolean;
    serverDeaf: boolean;
    streaming: boolean;
    camera: boolean;
  } | null;
  presence: {
    status: string;
    clientStatus: {
      desktop: string | null;
      mobile: string | null;
      web: string | null;
    };
    activities: {
      name: string;
      type: string;
      details: string | null;
      state: string | null;
    }[];
  } | null;
}

export function serializeMessage(msg: Message, channelName: string): SerializedMessage {
  return {
    id: msg.id,
    content: msg.content,
    authorId: msg.author.id,
    authorUsername: msg.author.username,
    authorDisplayName: msg.member?.displayName ?? msg.author.displayName,
    channelId: msg.channelId,
    channelName,
    timestamp: msg.createdAt.toISOString(),
    hasAttachments: msg.attachments.size > 0,
    attachmentCount: msg.attachments.size,
  };
}

export function serializeChannel(
  channel: GuildChannel | ThreadChannel,
  parentName: string | null,
): SerializedChannel {
  let topic: string | null = null;
  if ("topic" in channel && typeof channel.topic === "string") {
    topic = channel.topic;
  }

  let memberCount: number | undefined;
  if ("members" in channel && channel.members && "size" in channel.members) {
    memberCount = channel.members.size;
  }

  return {
    id: channel.id,
    name: channel.name,
    type: ChannelType[channel.type] ?? `Unknown(${channel.type})`,
    topic,
    parentId: channel.parentId,
    parentName,
    position: "position" in channel ? channel.position : 0,
    memberCount,
  };
}

export function serializeUser(member: GuildMember): SerializedUser {
  const roles = member.roles.cache.map((r) => r.name).filter((n) => n !== "@everyone");
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
  };
}

export function serializeBasicUser(user: User): SerializedUser {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    discriminator: user.discriminator,
    isBot: user.bot,
    nickname: null,
    roles: [],
    rolesString: "",
    joinedAt: null,
  };
}
