import {
  ChatInputCommandInteraction,
  ContextMenuCommandInteraction,
  MessageContextMenuCommandInteraction,
  UserContextMenuCommandInteraction,
} from "discord.js";
import { Context } from "../../contextBuilder";
import { type CollectedEntities, addUserToCollection } from "./main";

export function buildInteractionContext(
  context: Context,
  interaction: ChatInputCommandInteraction | ContextMenuCommandInteraction,
  allMentionedEntities: CollectedEntities,
): void {
  const interactionContext = context.add("interaction");

  // Basic interaction info
  interactionContext.add("type", interaction.type.toString());
  interactionContext.add("id", interaction.id);
  interactionContext.add("timestamp", interaction.createdAt.toISOString());

  // User info
  addUserToCollection(
    allMentionedEntities,
    interaction.user,
    interaction.member as any,
  );
  interactionContext.add("user-id", interaction.user.id);
  const userName =
    (interaction.member as any)?.nickname || interaction.user.displayName;
  interactionContext.add("user-name", userName);

  // Guild and channel info
  if (interaction.guild) {
    interactionContext.add("guild-id", interaction.guild.id);
    interactionContext.add("guild-name", interaction.guild.name);
  }

  if (interaction.channel) {
    interactionContext.add("channel-id", interaction.channel.id);
    if ("name" in interaction.channel && interaction.channel.name) {
      interactionContext.add("channel-name", interaction.channel.name);
    }
  }

  // Handle different interaction types
  if (interaction.isChatInputCommand()) {
    buildChatInputCommandContext(
      interactionContext,
      interaction,
      allMentionedEntities,
    );
  } else if (interaction.isMessageContextMenuCommand()) {
    buildMessageContextMenuContext(
      interactionContext,
      interaction,
      allMentionedEntities,
    );
  } else if (interaction.isUserContextMenuCommand()) {
    buildUserContextMenuContext(
      interactionContext,
      interaction,
      allMentionedEntities,
    );
  }
}

function buildChatInputCommandContext(
  context: Context,
  interaction: ChatInputCommandInteraction,
  allMentionedEntities: CollectedEntities,
): void {
  const commandContext = context.add("chat-input-command");
  commandContext.add("name", interaction.commandName);

  // Add subcommand info if present
  try {
    const subcommand = interaction.options.getSubcommand();
    if (subcommand) {
      commandContext.add("subcommand", subcommand);
    }
  } catch {
    // No subcommand
  }

  try {
    const subcommandGroup = interaction.options.getSubcommandGroup();
    if (subcommandGroup) {
      commandContext.add("subcommand-group", subcommandGroup);
    }
  } catch {
    // No subcommand group
  }

  // Add options
  const options = interaction.options.data;
  if (options.length > 0) {
    const optionsContext = commandContext.add("options");
    options.forEach((option, index) => {
      const optionContext = optionsContext.add(`option-${index}`);
      optionContext.add("name", option.name);
      optionContext.add("type", option.type.toString());

      if (option.value !== undefined) {
        optionContext.add("value", option.value.toString());
      }

      // Handle user mentions in options
      if (option.user) {
        addUserToCollection(
          allMentionedEntities,
          option.user,
          option.member as any,
        );
      }

      // Handle channel mentions in options
      if (option.channel) {
        // Add channel to entities if needed
      }

      // Handle role mentions in options
      if (option.role) {
        // Add role to entities if needed
      }
    });
  }
}

function buildMessageContextMenuContext(
  context: Context,
  interaction: MessageContextMenuCommandInteraction,
  allMentionedEntities: CollectedEntities,
): void {
  const commandContext = context.add("message-context-menu");
  commandContext.add("name", interaction.commandName);

  // Add target message info
  const targetMessage = interaction.targetMessage;
  const messageContext = commandContext.add("target-message");
  messageContext.add("id", targetMessage.id);
  messageContext.add("content", targetMessage.content || "[No text content]");
  messageContext.add("timestamp", targetMessage.createdAt.toISOString());

  // Add target message author
  addUserToCollection(
    allMentionedEntities,
    targetMessage.author,
    targetMessage.member,
  );
  messageContext.add("author-id", targetMessage.author.id);
  const authorName =
    targetMessage.member?.nickname || targetMessage.author.displayName;
  messageContext.add("author-name", authorName);

  // Add attachment info if present
  if (targetMessage.attachments.size > 0) {
    const attachmentsContext = messageContext.add("attachments");
    let attachmentIndex = 0;
    targetMessage.attachments.forEach((attachment) => {
      const attachmentContext = attachmentsContext.add(`attachment-${attachmentIndex}`);
      attachmentContext.add("name", attachment.name || "unknown");
      attachmentContext.add("size", attachment.size.toString());
      attachmentContext.add(
        "content-type",
        attachment.contentType || "unknown",
      );
      attachmentIndex++;
    });
  }
}

function buildUserContextMenuContext(
  context: Context,
  interaction: UserContextMenuCommandInteraction,
  allMentionedEntities: CollectedEntities,
): void {
  const commandContext = context.add("user-context-menu");
  commandContext.add("name", interaction.commandName);

  // Add target user info
  const targetUser = interaction.targetUser;
  const targetMember = interaction.targetMember;

  addUserToCollection(allMentionedEntities, targetUser, targetMember as any);

  const userContext = commandContext.add("target-user");
  userContext.add("id", targetUser.id);
  userContext.add("username", targetUser.username);
  userContext.add("display-name", targetUser.displayName);

  if (
    targetMember &&
    "nickname" in targetMember &&
    (targetMember as any).nickname
  ) {
    userContext.add("nickname", (targetMember as any).nickname);
  }

  if (targetUser.bot) {
    userContext.add("is-bot", "true");
  }
}
