import {
  ChannelType,
  ChatInputCommandInteraction,
  LabelBuilder,
  MessageFlags,
  ModalBuilder,
  ModalSubmitInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import {
  engagementPromptConfig,
  type EngagementPromptConfig,
} from "../utils/engagementPrompts/config";
import { engagementPromptService } from "../utils/engagementPrompts/service";

export const ENGAGEMENT_PROMPT_MODAL_ID = "engagement_prompt_setup";
const INTERVAL_INPUT_ID = "engagement_prompt_interval_hours";
const CONTEXT_INPUT_ID = "engagement_prompt_extra_context";
const DEFAULT_INTERVAL_HOURS = 24;
const MIN_INTERVAL_HOURS = 1;
const MAX_INTERVAL_HOURS = 168;

function canManage(interaction: ChatInputCommandInteraction | ModalSubmitInteraction): boolean {
  return (
    !!interaction.guildId && !!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)
  );
}

function formatTimestamp(timestamp: number | null): string {
  if (!timestamp) return "Not scheduled";
  const unix = Math.floor(timestamp / 1000);
  return `<t:${unix}:F> (<t:${unix}:R>)`;
}

function formatStatus(config: EngagementPromptConfig | null): string {
  if (!config) {
    return "Engagement prompts are not configured for this server.";
  }

  const lines = [
    `Status: **${config.enabled ? "enabled" : "disabled"}**`,
    `Channel: <#${config.channelId}>`,
    `Schedule: every **${config.intervalHours} hour${config.intervalHours === 1 ? "" : "s"}**`,
    `Next post: ${formatTimestamp(config.nextRunAt)}`,
    `Last post: ${formatTimestamp(config.lastPostedAt)}`,
    `Extra context: ${config.extraContext || "none"}`,
  ];

  return lines.join("\n");
}

function createSetupModal(
  guildId: string,
  channelId: string,
  config: EngagementPromptConfig | null,
): ModalBuilder {
  const modal = new ModalBuilder()
    .setCustomId(`${ENGAGEMENT_PROMPT_MODAL_ID}:${guildId}:${channelId}`)
    .setTitle("Engagement Prompt Setup");

  const intervalInput = new TextInputBuilder()
    .setCustomId(INTERVAL_INPUT_ID)
    .setPlaceholder(`Default ${DEFAULT_INTERVAL_HOURS} hours`)
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(3)
    .setValue(String(config?.intervalHours ?? DEFAULT_INTERVAL_HOURS));

  const contextInput = new TextInputBuilder()
    .setCustomId(CONTEXT_INPUT_ID)
    .setPlaceholder("Optional vibe, interests, inside jokes, or boundaries")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setMaxLength(1000);

  if (config?.extraContext) {
    contextInput.setValue(config.extraContext);
  }

  modal.addLabelComponents(
    new LabelBuilder().setLabel("Schedule in hours").setTextInputComponent(intervalInput),
    new LabelBuilder().setLabel("Extra context (optional)").setTextInputComponent(contextInput),
  );

  return modal;
}

async function showStatus(interaction: ChatInputCommandInteraction): Promise<void> {
  const config = await engagementPromptConfig.get(interaction.guildId!);
  await interaction.reply({
    content: formatStatus(config),
    flags: MessageFlags.Ephemeral,
  });
}

async function disablePrompt(interaction: ChatInputCommandInteraction): Promise<void> {
  const existing = await engagementPromptConfig.get(interaction.guildId!);

  if (!existing || !existing.enabled) {
    await interaction.reply({
      content: "Engagement prompts are already disabled for this server.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await engagementPromptConfig.set({
    ...existing,
    enabled: false,
    nextRunAt: null,
    updatedAt: Date.now(),
    updatedBy: interaction.user.id,
  });

  await interaction.reply({
    content: `Disabled engagement prompts for <#${existing.channelId}>.`,
    flags: MessageFlags.Ephemeral,
  });
}

async function triggerPrompt(interaction: ChatInputCommandInteraction): Promise<void> {
  const existing = await engagementPromptConfig.get(interaction.guildId!);

  if (!existing || !existing.enabled) {
    await interaction.reply({
      content: "Enable engagement prompts first before triggering a test post.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const result = await engagementPromptService.triggerNow(interaction.client, interaction.guildId!);

  if (!result.ok) {
    await interaction.editReply(result.error);
    return;
  }

  const updated = await engagementPromptConfig.get(interaction.guildId!);
  await interaction.editReply(
    `Triggered a test engagement prompt in <#${existing.channelId}>. Next post: ${formatTimestamp(updated?.nextRunAt ?? null)}`,
  );
}

export async function handleEngagementPromptModal(
  interaction: ModalSubmitInteraction,
): Promise<void> {
  if (!canManage(interaction)) {
    await interaction.reply({
      content: "You need Manage Server permission to configure this feature.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const [, guildId, channelId] = interaction.customId.split(":");
  if (!guildId || !channelId || interaction.guildId !== guildId) {
    await interaction.reply({
      content: "That setup dialog is no longer valid.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const intervalRaw = interaction.fields.getTextInputValue(INTERVAL_INPUT_ID).trim();
  const extraContext = interaction.fields.getTextInputValue(CONTEXT_INPUT_ID).trim();
  const intervalHours = Number.parseInt(intervalRaw, 10);

  if (
    !Number.isInteger(intervalHours) ||
    intervalHours < MIN_INTERVAL_HOURS ||
    intervalHours > MAX_INTERVAL_HOURS
  ) {
    await interaction.reply({
      content: `Schedule must be a whole number between ${MIN_INTERVAL_HOURS} and ${MAX_INTERVAL_HOURS} hours.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const existing = await engagementPromptConfig.get(guildId);
  const now = Date.now();

  await engagementPromptConfig.set({
    guildId,
    channelId,
    intervalHours,
    extraContext,
    enabled: true,
    createdAt: existing?.createdAt ?? now,
    createdBy: existing?.createdBy ?? interaction.user.id,
    updatedAt: now,
    updatedBy: interaction.user.id,
    lastPostedAt: existing?.lastPostedAt ?? null,
    nextRunAt: now + intervalHours * 60 * 60 * 1000,
  });

  await interaction.reply({
    content:
      `Enabled engagement prompts for <#${channelId}> every **${intervalHours} hour${intervalHours === 1 ? "" : "s"}**.\n` +
      `Next post: ${formatTimestamp(now + intervalHours * 60 * 60 * 1000)}`,
    flags: MessageFlags.Ephemeral,
  });
}

export default {
  data: new SlashCommandBuilder()
    .setName("engagement_prompt")
    .setDescription("Manage scheduled AI engagement prompts for this server")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((option) =>
      option
        .setName("action")
        .setDescription("What to do")
        .setRequired(false)
        .addChoices(
          { name: "Enable", value: "enable" },
          { name: "Trigger Now", value: "trigger" },
          { name: "Status", value: "status" },
          { name: "Disable", value: "disable" },
        ),
    )
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Which channel CapyBot should post in")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false),
    ),

  async execute(data: { interaction: ChatInputCommandInteraction }) {
    const interaction = data.interaction;

    if (!interaction.guildId) {
      await interaction.reply({
        content: "This command can only be used in a server.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!canManage(interaction)) {
      await interaction.reply({
        content: "You need Manage Server permission to configure this feature.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const action = interaction.options.getString("action") || "status";

    if (action === "status") {
      await showStatus(interaction);
      return;
    }

    if (action === "disable") {
      await disablePrompt(interaction);
      return;
    }

    if (action === "trigger") {
      await triggerPrompt(interaction);
      return;
    }

    const channel = interaction.options.getChannel("channel", false, [ChannelType.GuildText]);
    if (!channel) {
      await interaction.reply({
        content: "Pick a server text channel when enabling engagement prompts.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const existing = await engagementPromptConfig.get(interaction.guildId);
    await interaction.showModal(createSetupModal(interaction.guildId, channel.id, existing));
  },
};
