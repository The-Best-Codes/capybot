import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

export default {
  data: new SlashCommandBuilder().setName("ping").setDescription("Check CapyBot status"),

  async execute(data: { interaction: ChatInputCommandInteraction }) {
    const interaction = data.interaction;

    const uptimeSeconds = Math.floor(process.uptime());
    const uptime = `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor((uptimeSeconds % 3600) / 60)}m`;

    await interaction.reply(
      `Pong! 🟢\nLatency: **${interaction.client.ws.ping}ms**\nUptime: **${uptime}**`,
    );
  },
};
