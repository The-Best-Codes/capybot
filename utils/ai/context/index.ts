import {
  ChannelType,
  Message,
  type OmitPartialGroupDMChannel,
} from "discord.js";
import { ContextDictionary, type ReferencedMessage } from "./dictionary";
import { serializeAttachment } from "./attachments";

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toUTCString();
}

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

      msg.attachments.forEach((att) =>
        dictionary.registerAttachment(serializeAttachment(att)),
      );

      return {
        id: msg.id,
        author_id: msg.author.id,
        content: msg.content,
        timestamp: formatTimestamp(msg.createdTimestamp),
        referenced_message_id: msg.reference?.messageId || null,
      };
    });
  } catch (e) {
    return [];
  }
}

async function fetchReferencedMessage(
  channel: Message["channel"],
  messageId: string,
  dictionary: ContextDictionary,
): Promise<ReferencedMessage | null> {
  try {
    const msg = await channel.messages.fetch(messageId);

    dictionary.registerUser(msg.member || msg.author);
    msg.mentions.users.forEach((u) => dictionary.registerUser(u));
    msg.mentions.channels.forEach((c) => dictionary.registerChannel(c as any));
    msg.mentions.roles.forEach((r) => dictionary.registerRole(r));

    msg.attachments.forEach((att) =>
      dictionary.registerAttachment(serializeAttachment(att)),
    );

    return {
      id: msg.id,
      author_id: msg.author.id,
      content: msg.content,
      timestamp: formatTimestamp(msg.createdTimestamp),
      referenced_message_id: msg.reference?.messageId || null,
    };
  } catch (e) {
    return null;
  }
}

export async function buildContext(
  message: OmitPartialGroupDMChannel<Message<boolean>>,
): Promise<string> {
  const dictionary = new ContextDictionary();
  const { guild, channel, author } = message;

  dictionary.registerUser(message.member || author);
  message.mentions.users.forEach((u) => dictionary.registerUser(u));
  message.mentions.channels.forEach((c) =>
    dictionary.registerChannel(c as any),
  );
  message.mentions.roles.forEach((r) => dictionary.registerRole(r));
  message.attachments.forEach((att) =>
    dictionary.registerAttachment(serializeAttachment(att)),
  );

  const rawHistory = await fetchHistory(channel, dictionary);
  const history = rawHistory.filter((h) => h.id !== message.id);

  const referencedMessageIds = new Set<string>();
  history.forEach((h) => {
    if (h.referenced_message_id) {
      referencedMessageIds.add(h.referenced_message_id);
    }
  });
  if (message.reference?.messageId) {
    referencedMessageIds.add(message.reference.messageId);
  }

  const historyIds = new Set(history.map((h) => h.id));
  const missingReferencedIds = Array.from(referencedMessageIds).filter(
    (id) => !historyIds.has(id),
  );

  for (const refId of missingReferencedIds) {
    const refMsg = await fetchReferencedMessage(channel, refId, dictionary);
    if (refMsg) {
      dictionary.registerReferencedMessage(refMsg);
    }
  }

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
    attachment_ids: Array.from(message.attachments.keys()),
  };

  const contextData = {
    dictionary: dictionary.getDictionary(),
    current_guild: guildInfo,
    current_channel: currentChannelInfo,
    message_history: history,
    current_message: currentMessage,
  };

  return JSON.stringify(contextData, null, 2);
}
