import { type Channel, GuildMember, Message, Role, User } from "discord.js";
import client from "../../../clients/discord";
import { Context } from "../../contextBuilder";
import { logger } from "../../logger";

export interface CollectedEntities {
  users: Map<
    string,
    { id: string; name: string; isBot?: boolean; isSelf?: boolean }
  >;
  roles: Map<string, { id: string; name: string }>;
  channels: Map<string, { id: string; name: string }>;
}

export function addUserToCollection(
  entities: CollectedEntities,
  user: User | { id: string; name: string; isBot?: boolean; isSelf?: boolean },
  member?: GuildMember | null,
) {
  if (!entities.users.has(user.id)) {
    if ("displayName" in user) {
      const fullUser = user as User;
      const name = member?.nickname || fullUser.displayName;
      entities.users.set(fullUser.id, {
        id: fullUser.id,
        name: name,
        isBot: fullUser.bot,
        isSelf: fullUser.id === client.user?.id,
      });
    } else {
      const partialUser = user as {
        id: string;
        name: string;
        isBot?: boolean;
        isSelf?: boolean;
      };
      entities.users.set(partialUser.id, {
        id: partialUser.id,
        name: partialUser.name,
        isBot: partialUser.isBot,
        isSelf: partialUser.isSelf,
      });
    }
  }
}

export function addRoleToCollection(
  entities: CollectedEntities,
  role: Role | { id: string; name: string },
) {
  if (!entities.roles.has(role.id)) {
    entities.roles.set(role.id, {
      id: role.id,
      name: role.name,
    });
  }
}

export function addChannelToCollection(
  entities: CollectedEntities,
  channel: Channel | { id: string; name: string },
) {
  if (!entities.channels.has(channel.id)) {
    if ("name" in channel && typeof channel.name === "string") {
      entities.channels.set(channel.id, {
        id: channel.id,
        name: channel?.name ?? "Unknown",
      });
    } else {
      const partialChannel = channel as { id: string; name: string };
      entities.channels.set(partialChannel.id, {
        id: partialChannel.id,
        name: partialChannel.name,
      });
    }
  }
}

export function buildEntityLookupContext(
  context: Context,
  entities: CollectedEntities,
) {
  if (
    entities.users.size === 0 &&
    entities.roles.size === 0 &&
    entities.channels.size === 0
  ) {
    return;
  }

  const entityDetails = context
    .add("entity-details")
    .desc(
      "Lookup table for users, roles, and channels mentioned in the conversation",
    );

  if (entities.users.size > 0) {
    const usersNode = entityDetails
      .add("users")
      .desc("Details for users keyed by ID");
    for (const [id, details] of entities.users.entries()) {
      const userNode = usersNode.add(id);
      userNode.add("id", details.id);
      userNode.add("name", details.name);
      if (details.isSelf) {
        userNode.add("is-self", "true").desc("You");
      } else if (details.isBot) {
        userNode.add("is-bot", "true");
      }
    }
  }

  if (entities.roles.size > 0) {
    const rolesNode = entityDetails
      .add("roles")
      .desc("Details for roles keyed by ID");
    for (const [id, details] of entities.roles.entries()) {
      const roleNode = rolesNode.add(id);
      roleNode.add("id", details.id);
      roleNode.add("name", details.name);
    }
  }

  if (entities.channels.size > 0) {
    const channelsNode = entityDetails
      .add("channels")
      .desc("Details for channels keyed by ID");
    for (const [id, details] of entities.channels.entries()) {
      const channelNode = channelsNode.add(id);
      channelNode.add("id", details.id);
      channelNode.add("name", details.name);
    }
  }
}

export function buildMentionsContext(
  context: Context,
  message: Message,
  entities: CollectedEntities,
) {
  const hasMentions =
    message.mentions.users.size > 0 ||
    message.mentions.roles.size > 0 ||
    message.mentions.channels.size > 0 ||
    message.mentions.everyone;

  if (!hasMentions) return;

  const mentionsContext = context
    .add("mentions-in-current-message")
    .desc(
      "Mentions in the current message. Refer to 'entity-details' for full info.",
    );

  if (message.mentions.users.size > 0) {
    const userIdsNode = mentionsContext.add("user-ids");
    message.mentions.users.forEach((user) => {
      addUserToCollection(
        entities,
        user,
        message.guild?.members.cache.get(user.id),
      );
      userIdsNode.add(user.id, "true");
    });
  }

  if (message.mentions.channels.size > 0) {
    const channelIdsNode = mentionsContext.add("channel-ids");
    message.mentions.channels.forEach((channel) => {
      addChannelToCollection(entities, channel);
      channelIdsNode.add(channel.id, "true");
    });
  }

  if (message.mentions.roles.size > 0) {
    const roleIdsNode = mentionsContext.add("role-ids");
    message.mentions.roles.forEach((role) => {
      addRoleToCollection(entities, role);
      roleIdsNode.add(role.id, "true");
    });
  }

  if (message.mentions.everyone) {
    mentionsContext.add("everyone", "true").desc("@everyone or @here mention");
  }
}

export async function buildReferenceContext(
  context: Context,
  message: Message,
  entities: CollectedEntities,
) {
  if (!message.reference?.messageId) return;

  const referenceAttributes = context
    .add("reference-data")
    .desc("The message sent is a reply to another message");

  try {
    const referencedMessage = await message.fetchReference();

    addUserToCollection(
      entities,
      referencedMessage.author,
      referencedMessage.member,
    );

    referencedMessage.mentions.users.forEach((user) =>
      addUserToCollection(
        entities,
        user,
        referencedMessage.guild?.members.cache.get(user.id),
      ),
    );
    referencedMessage.mentions.roles.forEach((role) =>
      addRoleToCollection(entities, role),
    );
    referencedMessage.mentions.channels.forEach((channel) => {
      addChannelToCollection(entities, channel);
    });

    referenceAttributes.add("referenced-message-id", referencedMessage.id);
    referenceAttributes.add(
      "referenced-message-author-id",
      referencedMessage.author.id,
    );
    referenceAttributes.add(
      "referenced-message-content",
      referencedMessage.content,
    );
  } catch (error) {
    referenceAttributes.add(
      "error",
      "Could not fetch referenced message or its details",
    );
    logger.warn(
      `Error fetching referenced message ${message.reference?.messageId} for context: ${error}`,
    );
  }
}

export function buildServerContext(context: Context, message: Message) {
  const serverAttributes = context
    .add("server-attributes")
    .desc("Details about the server");
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
    .desc("Details about the channel");
  channelAttributes.add("id", message.channel.id);
  // @ts-ignore
  channelAttributes.add("name", (message.channel as any)?.name || "Unknown");
}

export function buildDMContext(context: Context, message: Message) {
  const channelAttributes = context
    .add("channel-attributes")
    .desc("Details about the direct message channel");
  channelAttributes.add("id", message.channel.id);
  channelAttributes.add("name", "Direct Message");
  channelAttributes.add("is-dm", "true");
}

export function buildAttachmentContext(
  context: Context,
  message: Message,
  desc?: string,
) {
  if (message.attachments.size === 0) {
    return;
  }

  let attachmentDesc = "Details about the attachments in this message";
  if (desc !== undefined && desc.trim().length > 0) {
    attachmentDesc = desc;
  } else if (desc === undefined) {
    attachmentDesc = "Details about attachments in the current message";
  }

  const attachmentsContext = context.add("attachments").desc(attachmentDesc);

  message.attachments.forEach((attachment) => {
    const attachmentNode = attachmentsContext.add(attachment.id);
    attachmentNode.add("name", attachment.name);
    attachmentNode.add("url", attachment.url);
    attachmentNode.add("content_type", attachment.contentType || "Unknown");
    attachmentNode
      .add("size", attachment.size.toString())
      .desc("Size in bytes");
  });
}
