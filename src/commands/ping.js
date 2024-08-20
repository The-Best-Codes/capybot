const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Unleash the power of PONG!')
        .addStringOption(option =>
            option.setName('style')
                .setDescription('Choose your ping style')
                .setRequired(false)
                .addChoices(
                    { name: '🎾 Tennis', value: 'tennis' },
                    { name: '🏓 Table Tennis', value: 'table_tennis' },
                    { name: '🏐 Volleyball', value: 'volleyball' },
                    { name: '🧠 Telepathic', value: 'telepathic' },
                )),

    async execute(interaction) {
        const pingStyles = {
            tennis: { emoji: '🎾', sound: 'Pop!' },
            table_tennis: { emoji: '🏓', sound: 'Tik-tok!' },
            volleyball: { emoji: '🏐', sound: 'Boing!' },
            telepathic: { emoji: '🧠', sound: '...' },
        };

        const style = interaction.options.getString('style') || 'tennis';
        const { emoji, sound } = pingStyles[style];

        const startTime = Date.now();

        const response = async () => {
            const endTime = Date.now();
            const latency = endTime - startTime;

            const embed = new EmbedBuilder()
                .setColor('#FF1493')
                .setTitle(`${emoji} Super Pong-tastic!`)
                .setDescription(`**${sound}** Your ping bounced back in style!`)
                .addFields(
                    { name: 'Latency', value: `${latency}ms`, inline: true },
                    { name: 'Pong Power', value: `${Math.max(0, 100 - latency)}%`, inline: true },
                )
                .setFooter({ text: 'Powered by quantum entanglement' })
                .setTimestamp();

            return { embeds: [embed], content: "" };
        };

        if (interaction.deferred) {
            await interaction.editReply(await response());
        } else {
            await interaction.reply(await response());
        }

        // Easter egg: 1% chance of a surprise reaction
        if (Math.random() < 0.01) {
            await interaction.followUp("🎉 Wow! You've discovered the secret pong! \nThere's a 1% chance of receiving this message.");
        }
    },
};