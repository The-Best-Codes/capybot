import {
  ChatInputCommandInteraction,
  LabelBuilder,
  MessageFlags,
  ModalBuilder,
  ModalSubmitInteraction,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import {
  checkDevAuth,
  clearSession,
  saveSession,
  validateDevKey,
} from "../utils/auth/devAuth";

export const DEV_LOGIN_MODAL_ID = "dev_login_modal";
export const DEV_KEY_INPUT_ID = "dev_key_input";

export function createLoginModal(): ModalBuilder {
  const modal = new ModalBuilder()
    .setCustomId(DEV_LOGIN_MODAL_ID)
    .setTitle("CapyBot Developer Login");

  const keyInput = new TextInputBuilder()
    .setCustomId(DEV_KEY_INPUT_ID)
    .setPlaceholder("Enter your CapyBot developer key")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const label = new LabelBuilder()
    .setLabel("Developer Key")
    .setTextInputComponent(keyInput);

  modal.addLabelComponents(label);

  return modal;
}

export async function handleLoginModal(
  interaction: ModalSubmitInteraction,
): Promise<void> {
  const key = interaction.fields.getTextInputValue(DEV_KEY_INPUT_ID);
  const username = interaction.user.username;

  const result = validateDevKey(key, username);

  if (!result.valid) {
    let errorMessage: string;

    switch (result.error) {
      case "invalid_signature":
        errorMessage = "Invalid developer key. Please check and try again.";
        break;
      case "expired":
        errorMessage =
          "This developer key has expired. Please request a new one.";
        break;
      case "wrong_user":
        errorMessage = `This key was issued for a different user. Please use your own key.`;
        break;
      case "revoked":
        errorMessage =
          "This developer key has been revoked. Please request a new one.";
        break;
      default:
        errorMessage = "Authentication failed.";
    }

    await interaction.reply({
      content: errorMessage,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  saveSession(interaction.user.id, key);

  const expiryMessage =
    result.daysRemaining !== null
      ? `Your session will expire in **${result.daysRemaining} day${result.daysRemaining === 1 ? "" : "s"}**.`
      : "Your session won't expire unless manually revoked.";

  await interaction.reply({
    content: `Successfully logged in as a CapyBot developer!\n${expiryMessage}`,
    flags: MessageFlags.Ephemeral,
  });
}

async function showStatus(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const authResult = checkDevAuth(
    interaction.user.id,
    interaction.user.username,
  );

  if (!authResult.loggedIn) {
    await interaction.reply({
      content: "You are not logged in as a developer.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const expiryMessage =
    authResult.daysRemaining !== null
      ? `Your session expires in **${authResult.daysRemaining} day${authResult.daysRemaining === 1 ? "" : "s"}**.`
      : "Your session **never expires** unless manually revoked.";

  await interaction.reply({
    content: `Logged in as **${authResult.username}**.\n${expiryMessage}`,
    flags: MessageFlags.Ephemeral,
  });
}

export default {
  data: new SlashCommandBuilder()
    .setName("dev_login")
    .setDescription("Login as a CapyBot developer")
    .addStringOption((option) =>
      option
        .setName("action")
        .setDescription("Login action")
        .setRequired(false)
        .addChoices(
          { name: "Login", value: "login" },
          { name: "Status", value: "status" },
          { name: "Logout", value: "logout" },
        ),
    ),

  async execute(data: { interaction: ChatInputCommandInteraction }) {
    const interaction = data.interaction;
    const action = interaction.options.getString("action") || "login";

    if (action === "status") {
      await showStatus(interaction);
      return;
    }

    if (action === "logout") {
      const wasLoggedIn = checkDevAuth(
        interaction.user.id,
        interaction.user.username,
      ).loggedIn;

      clearSession(interaction.user.id);

      await interaction.reply({
        content: wasLoggedIn
          ? "Successfully logged out."
          : "You were not logged in.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const authResult = checkDevAuth(
      interaction.user.id,
      interaction.user.username,
    );

    if (authResult.loggedIn) {
      await showStatus(interaction);
      return;
    }

    const modal = createLoginModal();
    await interaction.showModal(modal);
  },
};
