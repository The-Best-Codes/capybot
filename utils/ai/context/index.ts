import {
  ChannelType,
  Message,
  type OmitPartialGroupDMChannel,
} from "discord.js";
import { ContextDictionary } from "./dictionary";
import { formatTimestamp, serializeToXML } from "./xml";

async function fetchHistory(
  channel: Message["channel"],
  dictionary: ContextDictionary,
  limit = 10,
) {
  try {
    const messages = await channel.messages.fetch({ limit: limit });
    const sorted = Array.from(messages.values())
      .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
      .filter((msg) => !msg.system);

    return sorted.map((msg) => {
      dictionary.registerUser(msg.member || msg.author);

      msg.mentions.users.forEach((u) => dictionary.registerUser(u));
      msg.mentions.channels.forEach((c) =>
        dictionary.registerChannel(c as any),
      );
      msg.mentions.roles.forEach((r) => dictionary.registerRole(r));

      return {
        id: msg.id,
        author_id: msg.author.id,
        content: msg.content,
        timestamp: formatTimestamp(msg.createdTimestamp),
        is_reply: msg.reference ? true : false,
      };
    });
  } catch (e) {
    return [];
  }
}

export async function buildContextXML(
  message: OmitPartialGroupDMChannel<Message<boolean>>,
): Promise<string> {
  const dictionary = new ContextDictionary();
  const { guild, channel, author } = message;

  dictionary.registerUser(message.member || author);
  // dictionary.registerChannel(channel);

  message.mentions.users.forEach((u) => dictionary.registerUser(u));
  message.mentions.channels.forEach((c) =>
    dictionary.registerChannel(c as any),
  );
  message.mentions.roles.forEach((r) => dictionary.registerRole(r));

  const rawHistory = await fetchHistory(channel, dictionary);

  const history = rawHistory.filter((h) => h.id !== message.id);

  const guildInfo = guild
    ? {
        id: guild.id,
        name: guild.name,
        member_count: guild.memberCount,
      }
    : null;

  const currentChannelInfo = {
    id: channel.id,
    name: "name" in channel ? channel.name : "dm-channel",
    type: ChannelType[channel.type] || "Unknown",
    topic: "topic" in channel ? channel.topic : null,
  };

  const currentMessage = {
    id: message.id,
    author_id: author.id,
    channel_id: channel.id,
    content: message.content,
    timestamp: formatTimestamp(message.createdTimestamp),
    referenced_message_id: message.reference?.messageId || null,
  };

  const dictionaryXML = dictionary.getXML();

  const guildXML = serializeToXML("current_guild", guildInfo);
  const channelXML = serializeToXML("current_channel", currentChannelInfo);

  const historyXML =
    history.length > 0
      ? `<message_history>${history
          .map((h) =>
            [
              `<message id="${h.id}" author_id="${h.author_id}">`,
              serializeToXML("content", h.content),
              serializeToXML("time", h.timestamp),
              serializeToXML("is_reply", h.is_reply),
              `</message>`,
            ].join(""),
          )
          .join("")}</message_history>`
      : "";

  const messageXML = [
    `<current_message id="${currentMessage.id}" author_id="${currentMessage.author_id}">`,
    serializeToXML("content", currentMessage.content),
    serializeToXML("timestamp", currentMessage.timestamp),
    serializeToXML("replying_to", currentMessage.referenced_message_id),
    `</current_message>`,
  ].join("");

  return `<root>${dictionaryXML}${guildXML}${channelXML}${historyXML}${messageXML}</root>`;
}
