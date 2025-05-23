import {
  ApplicationFlags,
  ChatInputCommandInteraction,
  ContainerBuilder,
  MessageFlags,
  SeparatorBuilder,
  SeparatorSpacingSize,
  SlashCommandBuilder,
  TextDisplayBuilder,
} from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("components_v2_tester")
    .setDescription(
      "See what Discord components v2 would look like with an example AI response & tool calling.",
    ),

  async execute(data: { interaction: ChatInputCommandInteraction }) {
    const interaction = data.interaction;

    const components = [
      new TextDisplayBuilder().setContent(
        "[Example purposes only]\nSure! Hang tight while I take a closer look at the image…",
      ),
      new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("Used tool `get_image_base64`."),
        )
        .addSeparatorComponents(
          new SeparatorBuilder()
            .setSpacing(SeparatorSpacingSize.Large)
            .setDivider(true),
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("Used tool `describe_image`."),
        ),
      new TextDisplayBuilder().setContent(
        "It looks like the image is a logo for bestcodes.dev. It features a gradient background and the text “bestcodes.dev” in white in the center of the image. Is there anything else I can assist you with?",
      ),
    ];

    await interaction.reply({
      components: components,
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
