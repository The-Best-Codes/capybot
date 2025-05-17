import { Message } from "discord.js";
import { Context } from "../contextBuilder";

export function buildServerContext(context: Context, message: Message) {
  const serverAttributes = context
    .add("server_attributes")
    .desc("Details about the server you are currently in.");
  serverAttributes.add("id", message.guild?.id || "");
  serverAttributes.add("name", message.guild?.name || "");
  serverAttributes.add("icon_url", message.guild?.iconURL() || "");
  serverAttributes.add(
    "member_count",
    message.guild?.memberCount?.toString() || "",
  );
}

export function buildChannelContext(context: Context, message: Message) {
  const channelAttributes = context
    .add("channel_attributes")
    .desc("Details about the channel you are currently in.");
  channelAttributes.add("id", message.channel.id);
  // @ts-ignore
  channelAttributes.add("name", message.channel?.name || "Direct Message");
  channelAttributes.add("url", message.channel.url);
  channelAttributes.add("type", message.channel.type.toString());
}

export function buildUserContext(context: Context, message: Message) {
  const userAttributes = context
    .add("user_attributes")
    .desc("These are details about the user who just sent you a message.");
  userAttributes.add("id", message.author.id);
  userAttributes.add("name", message.author.username);
  userAttributes.add("avatar_url", message.author.avatarURL() || "");
  if (message.member?.nickname) {
    userAttributes.add("server_nickname", message.member?.nickname);
  }
}
