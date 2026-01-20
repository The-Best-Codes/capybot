import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { checkDevAuth } from "./devAuth";
import { hasPermission } from "./permissions";

export async function requireDevAuth(
  interaction: ChatInputCommandInteraction,
): Promise<boolean> {
  const authResult = checkDevAuth(
    interaction.user.id,
    interaction.user.username,
  );

  if (!authResult.loggedIn) {
    let message: string;

    if (authResult.error === "expired") {
      message =
        "Your developer session has expired. Please login again with a new key.";
    } else if (authResult.error === "wrong_user") {
      message =
        "Your session is invalid (username mismatch). Please login again.";
    } else {
      message =
        "This command requires developer authentication. Please login first.";
    }

    await interaction.reply({
      content: `${message}\n\nUse the \`/dev_login\` command to authenticate.`,
      flags: MessageFlags.Ephemeral,
    });

    return false;
  }

  if (!hasPermission(authResult.permissions, "dev_slash_commands")) {
    await interaction.reply({
      content:
        "Your developer key does not have permission to use developer slash commands. Contact an admin to update your key permissions.",
      flags: MessageFlags.Ephemeral,
    });
    return false;
  }

  return true;
}
