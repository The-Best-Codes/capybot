import {
  ChannelType,
  GuildMember,
  Role,
  User,
  type Channel,
  type GuildBasedChannel,
} from "discord.js";

export interface SerializedAttachment {
  id: string;
  name: string;
  url: string;
  mime_type: string | null;
  size: number;
  width: number | null;
  height: number | null;
}

export interface ReferencedMessage {
  id: string;
  author_id: string;
  content: string;
  timestamp: string;
  referenced_message_id: string | null;
  attachments?: SerializedAttachment[];
}

export class ContextDictionary {
  private users = new Map<string, User | GuildMember>();
  private channels = new Map<string, Channel | GuildBasedChannel>();
  private roles = new Map<string, Role>();
  private referencedMessages = new Map<string, ReferencedMessage>();

  registerUser(user: User | GuildMember) {
    if (!this.users.has(user.id)) {
      this.users.set(user.id, user);
    }
  }

  registerChannel(channel: Channel | GuildBasedChannel) {
    if (!this.channels.has(channel.id)) {
      this.channels.set(channel.id, channel);
    }
  }

  registerRole(role: Role) {
    if (!this.roles.has(role.id)) {
      this.roles.set(role.id, role);
    }
  }

  registerReferencedMessage(message: ReferencedMessage) {
    if (!this.referencedMessages.has(message.id)) {
      this.referencedMessages.set(message.id, message);
    }
  }

  getDictionary() {
    const users: Record<string, any> = {};
    for (const [id, entity] of this.users) {
      const isMember = "user" in entity;
      const userObj = isMember ? entity.user : (entity as User);
      const memberObj = isMember ? (entity as GuildMember) : undefined;

      users[id] = {
        username: userObj.username,
        display_name: memberObj?.displayName || userObj.displayName,
        is_bot: userObj.bot,
      };
    }

    const channels: Record<string, any> = {};
    for (const [id, channel] of this.channels) {
      const name = "name" in channel ? channel.name : "dm-channel";
      const type = "type" in channel ? ChannelType[channel.type] : "Unknown";
      channels[id] = { name, type };
    }

    const roles: Record<string, any> = {};
    for (const [id, role] of this.roles) {
      roles[id] = { name: role.name };
    }

    const referenced_messages: Record<string, ReferencedMessage> = {};
    for (const [id, msg] of this.referencedMessages) {
      referenced_messages[id] = msg;
    }

    return {
      users,
      channels,
      roles,
      referenced_messages,
    };
  }
}
