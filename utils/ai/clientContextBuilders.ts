import { Message } from "discord.js";
import { Context } from "../contextBuilder";

export function buildServerContext(context: Context, message: Message) {
  const serverAttributes = context
    .add("server_attributes")
    .desc("Details about the server you are currently in");
  serverAttributes.add("id", message.guild?.id || "");
  serverAttributes.add("name", message.guild?.name || "");
  serverAttributes.add(
    "member_count",
    message.guild?.memberCount?.toString() || "",
  );
}

export function buildChannelContext(context: Context, message: Message) {
  const channelAttributes = context
    .add("channel_attributes")
    .desc("Details about the channel you are currently in");
  channelAttributes.add("id", message.channel.id);
  // @ts-ignore
  channelAttributes.add("name", message.channel?.name || "Direct Message");
  channelAttributes.add("type", message.channel.type.toString());
}

export function buildUserContext(context: Context, message: Message) {
  const userAttributes = context
    .add("user_attributes")
    .desc(
      "These are details about the user who just sent you a message, triggering a response",
    );
  userAttributes.add("id", message.author.id);
  userAttributes.add("username", message.author.username);
  if (message.member?.nickname) {
    userAttributes
      .add("server_nickname", message.member?.nickname)
      .desc("The user's prefered name in this server");
  }
}

export async function buildReplyContext(context: Context, message: Message) {
  if (!message.reference) return;

  context
    .add("is_reply", "true")
    .desc("This message is a reply to another message");
  const replyAttributes = context
    .add("replying_to")
    .desc("Information about the message being replied to");

  try {
    const referencedMessage = await message.fetchReference();
    replyAttributes.add("message_id", referencedMessage.id);
    replyAttributes.add("content", referencedMessage.content);

    const userAttrs = replyAttributes
      .add("user_attributes")
      .desc("Details about the user who wrote the message being replied to");
    userAttrs.add("id", referencedMessage.author.id);
    userAttrs.add("username", referencedMessage.author.username);
    if (referencedMessage.member?.nickname) {
      userAttrs
        .add("server_nickname", referencedMessage.member?.nickname)
        .desc("User's prefered name in this server");
    }
    if (referencedMessage.author.bot) {
      userAttrs.add("is_bot", "true");
    }
  } catch (error) {
    replyAttributes.add("error", "Could not fetch referenced message");
  }
}
