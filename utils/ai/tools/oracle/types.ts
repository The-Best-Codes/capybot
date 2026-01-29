import type { GuildChannel, GuildMember, Message, ThreadChannel, User } from "discord.js";

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
  joinedAt: string | null;
}

export interface MessageSearchResult {
  message: SerializedMessage;
  score: number;
}

export interface ChannelSearchResult {
  channel: SerializedChannel;
  score: number;
}

export interface UserSearchResult {
  user: SerializedUser;
  score: number;
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
    type: channel.type.toString(),
    topic,
    parentId: channel.parentId,
    parentName,
    position: "position" in channel ? channel.position : 0,
    memberCount,
  };
}

export function serializeUser(member: GuildMember): SerializedUser {
  return {
    id: member.id,
    username: member.user.username,
    displayName: member.displayName,
    discriminator: member.user.discriminator,
    isBot: member.user.bot,
    nickname: member.nickname,
    roles: member.roles.cache.map((r) => r.name).filter((n) => n !== "@everyone"),
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
    joinedAt: null,
  };
}
