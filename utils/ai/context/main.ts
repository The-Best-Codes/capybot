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
        name: channel.name,
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
      "Lookup table for users, roles, and channels mentioned in the conversation (history + current message)",
    );

  if (entities.users.size > 0) {
    const usersNode = entityDetails
      .add("users")
      .desc("Details for users keyed by ID");
    for (const [id, details] of entities.users.entries()) {
      const userNode = usersNode.add(id);
      userNode.add("id", details.id);
      userNode.add("name", details.name);
      if (details.isBot) userNode.add("is-bot", "true");
      if (details.isSelf)
        userNode.add("is-self", "true").desc("You (@Capybot)");
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
  const botMentioned = message.mentions.users.has(
    client.user?.id || "dummy_id_to_prevent_undefined_lookup",
  );
  if (botMentioned) {
    context
      .add("bot-mentioned", "true")
      .desc("You (@Capybot) were mentioned in this message");
  }

  const hasMentions =
    message.mentions.users.size > 0 ||
    message.mentions.roles.size > 0 ||
    message.mentions.channels.size > 0 ||
    message.mentions.everyone;

  if (!hasMentions) return;

  const mentionsContext = context
    .add("mentions-in-current-message")
    .desc(
      "Information about mentions found *only* in the current message content. Refer to 'entity-details' for full information about these IDs.",
    );

  const mentionedUserIds: string[] = [];
  const mentionedChannelIds: string[] = [];
  const mentionedRoleIds: string[] = [];
  let everyoneMentioned = false;

  const mentionedUserNames: string[] = [];
  const mentionedChannelNames: string[] = [];
  const mentionedRoleNames: string[] = [];

  if (message.mentions.users.size > 0) {
    message.mentions.users.forEach((user) => {
      addUserToCollection(
        entities,
        user,
        message.guild?.members.cache.get(user.id),
      );
      mentionedUserIds.push(user.id);

      const userDetails = entities.users.get(user.id);
      if (userDetails) {
        mentionedUserNames.push(
          `${userDetails.name}${userDetails.isSelf ? " (You)" : ""}`,
        );
      }
    });
    if (mentionedUserIds.length > 0) {
      mentionsContext.add("user-ids", mentionedUserIds.join(", "));
    }
  }

  if (message.mentions.channels.size > 0) {
    message.mentions.channels.forEach((channel) => {
      addChannelToCollection(entities, channel);
      mentionedChannelIds.push(channel.id);

      const channelDetails = entities.channels.get(channel.id);
      if (channelDetails) {
        mentionedChannelNames.push(channelDetails.name);
      }
    });
    if (mentionedChannelIds.length > 0) {
      mentionsContext.add("channel-ids", mentionedChannelIds.join(", "));
    }
  }

  if (message.mentions.roles.size > 0) {
    message.mentions.roles.forEach((role) => {
      addRoleToCollection(entities, role);
      mentionedRoleIds.push(role.id);

      const roleDetails = entities.roles.get(role.id);
      if (roleDetails) {
        mentionedRoleNames.push(roleDetails.name);
      }
    });
    if (mentionedRoleIds.length > 0) {
      mentionsContext.add("role-ids", mentionedRoleIds.join(", "));
    }
  }

  if (message.mentions.everyone) {
    mentionsContext
      .add("everyone", "true")
      .desc("The @everyone or @here mention was used");
    everyoneMentioned = true;
  }

  const summaryParts: string[] = [];
  if (mentionedUserNames.length > 0) {
    summaryParts.push(`Users: [${mentionedUserNames.join(", ")}]`);
  }
  if (mentionedChannelNames.length > 0) {
    summaryParts.push(`Channels: [${mentionedChannelNames.join(", ")}]`);
  }
  if (mentionedRoleNames.length > 0) {
    summaryParts.push(`Roles: [${mentionedRoleNames.join(", ")}]`);
  }
  if (everyoneMentioned) {
    summaryParts.push(`Everyone: [True]`);
  }

  if (summaryParts.length > 0) {
    mentionsContext
      .add("summary", summaryParts.join("; "))
      .desc("A concise summary of mentions in the current message");
  }
}

export async function buildReplyContext(
  context: Context,
  message: Message,
  entities: CollectedEntities,
) {
  if (!message.reference?.messageId) return;

  const replyAttributes = context
    .add("reply-data")
    .desc("The sent message is a reply to another message");

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

    replyAttributes.add("is-reply", "true");
    replyAttributes.add("referenced-message-id", referencedMessage.id);
    replyAttributes.add(
      "referenced-message-author-id",
      referencedMessage.author.id,
    );
    replyAttributes.add(
      "referenced-message-content",
      referencedMessage.content,
    );
  } catch (error) {
    replyAttributes.add(
      "error",
      "Could not fetch referenced message or its details",
    );
    logger.error(
      `Error fetching referenced message ${message.reference?.messageId}: ${error}`,
    );
  }
}

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
