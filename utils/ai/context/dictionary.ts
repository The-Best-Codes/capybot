import {
  ChannelType,
  GuildMember,
  Role,
  User,
  type Channel,
  type GuildBasedChannel,
} from "discord.js";
import { escapeXML, serializeToXML } from "./xml";

export interface ReferencedMessage {
  id: string;
  author_id: string;
  content: string;
  timestamp: string;
  referenced_message_id: string | null;
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

  getXML(): string {
    let xml = "<dictionary>";

    if (this.users.size > 0) {
      xml += "<users>";
      for (const [id, entity] of this.users) {
        const isMember = "user" in entity;
        const userObj = isMember ? entity.user : (entity as User);
        const memberObj = isMember ? (entity as GuildMember) : undefined;

        const content = [
          serializeToXML("username", userObj.username),
          serializeToXML(
            "display_name",
            memberObj?.displayName || userObj.displayName,
          ),
          serializeToXML("is_bot", userObj.bot || undefined),
        ].join("");

        xml += `<user id="${escapeXML(id)}">${content}</user>`;
      }
      xml += "</users>";
    }

    if (this.channels.size > 0) {
      xml += "<channels>";
      for (const [id, channel] of this.channels) {
        const name = "name" in channel ? channel.name : "dm-channel";
        const type = "type" in channel ? ChannelType[channel.type] : "Unknown";

        const content = [
          serializeToXML("name", name),
          serializeToXML("type", type),
        ].join("");

        xml += `<channel id="${escapeXML(id)}">${content}</channel>`;
      }
      xml += "</channels>";
    }

    if (this.roles.size > 0) {
      xml += "<roles>";
      for (const [id, role] of this.roles) {
        xml += `<role id="${escapeXML(id)}">${serializeToXML("name", role.name)}</role>`;
      }
      xml += "</roles>";
    }

    if (this.referencedMessages.size > 0) {
      xml += "<referenced_messages>";
      for (const [id, msg] of this.referencedMessages) {
        const content = [
          serializeToXML("content", msg.content),
          serializeToXML("timestamp", msg.timestamp),
          msg.referenced_message_id
            ? serializeToXML("reference_message_id", msg.referenced_message_id)
            : "",
        ].join("");

        xml += `<message id="${escapeXML(id)}" author_id="${escapeXML(msg.author_id)}">${content}</message>`;
      }
      xml += "</referenced_messages>";
    }

    xml += "</dictionary>";
    return xml;
  }
}
