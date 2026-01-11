import {
  ChatInputCommandInteraction,
  MessageFlags,
} from "discord.js";
import { checkDevAuth } from "./devAuth";

export async function requireDevAuth(
  interaction: ChatInputCommandInteraction,
): Promise<boolean> {
  const authResult = checkDevAuth(
    interaction.user.id,
    interaction.user.username,
  );

  if (authResult.loggedIn) {
    return true;
  }

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
    content: `${message}\n\nUse the \`/devlogin\` command to authenticate.`,
    flags: MessageFlags.Ephemeral,
  });

  return false;
}
