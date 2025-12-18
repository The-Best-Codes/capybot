import {
  GuildMember,
  Role,
  User,
  type Channel,
  type GuildBasedChannel,
} from "discord.js";
import { escapeXML, serializeToXML } from "./xml";

export class ContextDictionary {
  private users = new Map<string, User | GuildMember>();
  private channels = new Map<string, Channel | GuildBasedChannel>();
  private roles = new Map<string, Role>();

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
        const type = "type" in channel ? String(channel.type) : "unknown";

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

    xml += "</dictionary>";
    return xml;
  }
}
