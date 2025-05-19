import { Message } from "discord.js";
import { Context } from "../contextBuilder";

export function buildMentionContext(context: Context, message: Message) {
  const mentionsContext = context
    .add("mentions")
    .desc("Information about mentions found in the message content");

  if (message.mentions.users.size > 0) {
    const userMentions = mentionsContext
      .add("users")
      .desc("User mentions found in the message");
    message.mentions.users.forEach((user) => {
      const userMention = userMentions
        .add(`user_${user.id}`)
        .desc(`Details for user mention with ID ${user.id}`);
      userMention.add("id", user.id);
      userMention.add("username", user.username);
      userMention
        .add("display_name", user.displayName)
        .desc("The user's prefered name on Discord");
      const member = message.guild?.members.cache.get(user.id);
      if (member?.nickname) {
        userMention
          .add("server_nickname", member.nickname)
          .desc("The user's prefered name in this server");
      }
      userMention.add("is_bot", user.bot ? "true" : "false");
    });
  }

  if (message.mentions.channels.size > 0) {
    const channelMentions = mentionsContext
      .add("channels")
      .desc("Channel mentions found in the message");
    message.mentions.channels.forEach((channel) => {
      const channelMention = channelMentions
        .add(`channel_${channel.id}`)
        .desc(`Details for channel mention with ID ${channel.id}`);
      channelMention.add("id", channel.id);
      if ("name" in channel && typeof channel.name === "string") {
        channelMention.add("name", channel.name);
      }
      channelMention.add("type", channel.type.toString());
    });
  }

  if (message.mentions.roles.size > 0) {
    const roleMentions = mentionsContext
      .add("roles")
      .desc("Role mentions found in the message");
    message.mentions.roles.forEach((role) => {
      const roleMention = roleMentions
        .add(`role_${role.id}`)
        .desc(`Details for role mention with ID ${role.id}`);
      roleMention.add("id", role.id);
      roleMention.add("name", role.name);
      roleMention.add("color", role.color.toString());
      roleMention.add("type", "role");
    });
  }

  if (message.mentions.everyone) {
    mentionsContext
      .add("everyone", "true")
      .desc("The @everyone mention was used");
  }
}
