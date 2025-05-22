import { type Channel, GuildMember, Message, Role, User } from "discord.js";
import client from "../../../clients/discord";
import { Context } from "../../contextBuilder";
import { logger } from "../../logger";

// Define the structure for collected entities (Exported for use in history.ts)
export interface CollectedEntities {
  users: Map<
    string,
    { id: string; name: string; isBot?: boolean; isSelf?: boolean }
  >;
  roles: Map<string, { id: string; name: string }>;
  channels: Map<string, { id: string; name: string }>;
}

// Helper to add user to the collection map
// Can accept a full User/GuildMember object or just partial details if coming from history
export function addUserToCollection(
  entities: CollectedEntities,
  user: User | { id: string; name: string; isBot?: boolean; isSelf?: boolean },
  member?: GuildMember | null, // Optional member for nickname
) {
  if (!entities.users.has(user.id)) {
    // If we have a full User object
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
      // Assume it's the partial details object from history
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

// Helper to add role to the collection map
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

// Helper to add channel to the collection map
export function addChannelToCollection(
  entities: CollectedEntities,
  channel: Channel | { id: string; name: string },
) {
  if (!entities.channels.has(channel.id)) {
    // If we have a full Channel object (like GuildChannel)
    if ("name" in channel && typeof channel.name === "string") {
      entities.channels.set(channel.id, {
        id: channel.id,
        name: channel.name,
      });
    } else {
      // Assume it's the partial details object
      const partialChannel = channel as { id: string; name: string };
      entities.channels.set(partialChannel.id, {
        id: partialChannel.id,
        name: partialChannel.name,
      });
    }
  }
}

// New function to build the centralized entity lookup context
export function buildEntityLookupContext(
  context: Context,
  entities: CollectedEntities,
) {
  if (
    entities.users.size === 0 &&
    entities.roles.size === 0 &&
    entities.channels.size === 0
  ) {
    return; // Skip if no entities collected
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

// Modify buildMentionsContext to use the entity collection
export function buildMentionsContext(
  context: Context,
  message: Message,
  entities: CollectedEntities,
) {
  // Add entities parameter
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
    .add("mentions-in-current-message") // Rename to be specific
    .desc(
      "Information about mentions found *only* in the current message content. Refer to 'entity-details' for full information about these IDs.",
    );

  const mentionedUserIds: string[] = []; // Collect IDs for listing
  const mentionedChannelIds: string[] = [];
  const mentionedRoleIds: string[] = [];
  let everyoneMentioned = false;

  const mentionedUserNames: string[] = []; // Still collect names for summary
  const mentionedChannelNames: string[] = [];
  const mentionedRoleNames: string[] = [];

  if (message.mentions.users.size > 0) {
    message.mentions.users.forEach((user) => {
      // Add user to the global collection (in case they weren't in history)
      addUserToCollection(
        entities,
        user,
        message.guild?.members.cache.get(user.id),
      );
      mentionedUserIds.push(user.id); // List IDs in current message context

      // Get name for summary from the collection
      const userDetails = entities.users.get(user.id);
      if (userDetails) {
        mentionedUserNames.push(
          `${userDetails.name}${userDetails.isSelf ? " (You)" : ""}`,
        );
      }
    });
    if (mentionedUserIds.length > 0) {
      mentionsContext.add("user-ids", mentionedUserIds.join(", ")); // List IDs
    }
  }

  if (message.mentions.channels.size > 0) {
    message.mentions.channels.forEach((channel) => {
      // Add channel to the global collection
      addChannelToCollection(entities, channel);
      mentionedChannelIds.push(channel.id); // List IDs

      // Get name for summary
      const channelDetails = entities.channels.get(channel.id);
      if (channelDetails) {
        mentionedChannelNames.push(channelDetails.name);
      }
    });
    if (mentionedChannelIds.length > 0) {
      mentionsContext.add("channel-ids", mentionedChannelIds.join(", ")); // List IDs
    }
  }

  if (message.mentions.roles.size > 0) {
    message.mentions.roles.forEach((role) => {
      // Add role to the global collection
      addRoleToCollection(entities, role);
      mentionedRoleIds.push(role.id); // List IDs

      // Get name for summary
      const roleDetails = entities.roles.get(role.id);
      if (roleDetails) {
        mentionedRoleNames.push(roleDetails.name);
      }
    });
    if (mentionedRoleIds.length > 0) {
      mentionsContext.add("role-ids", mentionedRoleIds.join(", ")); // List IDs
    }
  }

  if (message.mentions.everyone) {
    mentionsContext
      .add("everyone", "true")
      .desc("The @everyone or @here mention was used");
    everyoneMentioned = true;
  }

  // Keep the summary for quick understanding, using names looked up from collection
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

// Modify buildReplyContext to use the entity collection
export async function buildReplyContext(
  context: Context,
  message: Message,
  entities: CollectedEntities,
) {
  // Add entities parameter
  // Use messageId directly from the reference
  if (!message.reference?.messageId) return;

  const replyAttributes = context
    .add("reply-data")
    .desc("The sent message is a reply to another message");

  try {
    // Fetch the referenced message
    const referencedMessage = await message.fetchReference();

    // Add the author of the referenced message to the global collection
    addUserToCollection(
      entities,
      referencedMessage.author,
      referencedMessage.member,
    );

    // Also collect any mentions *within* the referenced message and add to global collection
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

    // Add minimal details about the referenced message to the main context
    replyAttributes.add("is-reply", "true");
    replyAttributes.add("referenced-message-id", referencedMessage.id);
    replyAttributes.add(
      "referenced-message-author-id",
      referencedMessage.author.id,
    ); // Point to author ID in lookup
    replyAttributes.add(
      "referenced-message-content",
      referencedMessage.content,
    ); // Keep content for quick reference
  } catch (error) {
    replyAttributes.add(
      "error",
      "Could not fetch referenced message or its details",
    );
    // Log the error but don't fail completely
    logger.error(
      `Error fetching referenced message ${message.reference?.messageId}: ${error}`,
    );
  }
}

// Keep buildServerContext, buildChannelContext, buildDMContext, buildUserContext as they are for the *current* message
// buildUserContext implicitly adds the current user to the collection via the call in messageCreate.ts

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
  // @ts-ignore // Keep as is for now, assuming the name property might not always exist or be string on base Channel type
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

// Note: buildUserContext is not needed in main.ts anymore as the user is added to the collection
// and the collection is used to build the lookup. We keep the helper addUserToCollection.
