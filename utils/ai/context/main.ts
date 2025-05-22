import { Message } from "discord.js";
import client from "../../../clients/discord";
import { Context } from "../../contextBuilder";

export function buildServerContext(context: Context, message: Message) {
  const serverAttributes = context
    .add("server-attributes")
    .desc("Details about the server the message was sent in");
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
    .desc("Details about the channel the message was sent in");
  channelAttributes.add("id", message.channel.id);
  // @ts-ignore
  channelAttributes.add("name", message.channel?.name || "Unknown");
}

export function buildDMContext(context: Context, message: Message) {
  const channelAttributes = context
    .add("channel-attributes")
    .desc("Details about the direct message channel");
  channelAttributes.add("id", message.channel.id);
  channelAttributes.add("name", "Direct Message");
  channelAttributes.add("is-dm", "true");
}

export function buildUserContext(context: Context, message: Message) {
  const userAttributes = context
    .add("user-attributes")
    .desc("Details about the user who sent the message");
  userAttributes.add("id", message.author.id);
  if (message.member?.nickname) {
    userAttributes.add("server-nickname", message.member?.nickname);
  } else {
    userAttributes.add("display-name", message.author.displayName);
  }

  if (message.author.id === client.user?.id) {
    userAttributes.add("is-self", "true").desc("The user is you!");
  }
}

export async function buildReplyContext(context: Context, message: Message) {
  if (!message.reference) return;

  const replyAttributes = context
    .add("reply-data")
    .desc("The sent message is a reply to another message");

  try {
    const referencedMessage = await message.fetchReference();
    const replyMessageAttributes = replyAttributes
      .add("message-attributes")
      .desc("Details about the referenced message");
    replyMessageAttributes.add("id", referencedMessage.id);
    replyMessageAttributes.add("content", referencedMessage.content);

    const userAttrs = replyMessageAttributes.add("user-attributes");
    userAttrs.add("id", referencedMessage.author.id);
    if (referencedMessage.member?.nickname) {
      userAttrs.add("server-nickname", referencedMessage.member?.nickname);
    } else {
      userAttrs.add("display-name", referencedMessage.author.displayName);
    }
    if (referencedMessage.author.bot) {
      userAttrs.add("is-bot", "true");
    }
    if (referencedMessage.author.id === client.user?.id) {
      userAttrs.add("is-self", "true").desc("The user is you!");
    }
  } catch (error) {
    replyAttributes.add("error", "Could not fetch referenced message");
  }
}

export function buildMentionsContext(context: Context, message: Message) {
  const hasMentions =
    message.mentions.users.size > 0 ||
    message.mentions.roles.size > 0 ||
    message.mentions.channels.size > 0;
  if (!hasMentions) return;

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
      const member = message.guild?.members.cache.get(user.id);
      if (member?.nickname) {
        userMention.add("server-nickname", member.nickname);
      } else {
        userMention.add("display-name", user.displayName);
      }
      if (user.bot) {
        userMention.add("is-bot", "true");
      }
      if (user.id === client.user?.id) {
        userMention.add("is-self", "true").desc("The user is you!");
      }
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
    });
  }

  if (message.mentions.everyone) {
    mentionsContext
      .add("everyone", "true")
      .desc("The @everyone or @here mention was used");
  }
}
