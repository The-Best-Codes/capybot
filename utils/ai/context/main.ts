import { Message } from "discord.js";
import { Context } from "../../contextBuilder";

export function buildServerContext(context: Context, message: Message) {
  const serverAttributes = context
    .add("server-attributes")
    .desc("Details about the server you are currently in");
  serverAttributes.add("id", message.guild?.id || "");
  serverAttributes.add("name", message.guild?.name || "");
  serverAttributes.add(
    "member-count",
    message.guild?.memberCount?.toString() || "",
  );
}

export function buildChannelContext(context: Context, message: Message) {
  const channelAttributes = context
    .add("channel-attributes")
    .desc("Details about the channel you are currently in");
  channelAttributes.add("id", message.channel.id);
  // @ts-ignore
  channelAttributes.add("name", message.channel?.name || "Direct Message");
  channelAttributes.add("type", message.channel.type.toString());
}

export function buildUserContext(context: Context, message: Message) {
  const userAttributes = context
    .add("user-attributes")
    .desc(
      "These are details about the user who just sent you a message, triggering a response",
    );
  userAttributes.add("id", message.author.id);
  userAttributes.add("username", message.author.username);
  userAttributes
    .add("display-name", message.author.displayName)
    .desc("The user's prefered name on Discord");
  if (message.member?.nickname) {
    userAttributes
      .add("server-nickname", message.member?.nickname)
      .desc("The user's prefered name in this server");
  }
}

export async function buildReplyContext(context: Context, message: Message) {
  if (!message.reference) return;

  context
    .add("is-reply", "true")
    .desc("This message is a reply to another message");
  const replyAttributes = context
    .add("replying-to")
    .desc("Information about the message being replied to");

  try {
    const referencedMessage = await message.fetchReference();
    replyAttributes.add("message-id", referencedMessage.id);
    replyAttributes.add("content", referencedMessage.content);

    const userAttrs = replyAttributes
      .add("user-attributes")
      .desc("Details about the user who wrote the message being replied to");
    userAttrs.add("id", referencedMessage.author.id);
    userAttrs.add("username", referencedMessage.author.username);
    userAttrs
      .add("display-name", referencedMessage.author.displayName)
      .desc("The user's prefered name on Discord");
    if (referencedMessage.member?.nickname) {
      userAttrs
        .add("server-nickname", referencedMessage.member?.nickname)
        .desc("The user's prefered name in this server");
    }
    if (referencedMessage.author.bot) {
      userAttrs.add("is-bot", "true");
    }
  } catch (error) {
    replyAttributes.add("error", "Could not fetch referenced message");
  }
}

export function buildMentionsContext(context: Context, message: Message) {
  const mentionsContext = context
    .add("mentions")
    .desc("Information about mentions found in the message content");

  if (message.mentions.users.size > 0) {
    const userMentions = mentionsContext
      .add("users")
      .desc("User mentions found in the message");
    message.mentions.users.forEach((user) => {
      const userMention = userMentions
        .add(`user-${user.id}`)
        .desc(`Details for user mention with ID ${user.id}`);
      userMention.add("id", user.id);
      userMention.add("username", user.username);
      userMention
        .add("display-name", user.displayName)
        .desc("The user's prefered name on Discord");
      const member = message.guild?.members.cache.get(user.id);
      if (member?.nickname) {
        userMention
          .add("server-nickname", member.nickname)
          .desc("The user's prefered name in this server");
      }
      userMention.add("is-bot", user.bot ? "true" : "false");
    });
  }

  if (message.mentions.channels.size > 0) {
    const channelMentions = mentionsContext
      .add("channels")
      .desc("Channel mentions found in the message");
    message.mentions.channels.forEach((channel) => {
      const channelMention = channelMentions
        .add(`channel-${channel.id}`)
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
        .add(`role-${role.id}`)
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
      .desc("The @everyone or @here mention was used");
  }
}
