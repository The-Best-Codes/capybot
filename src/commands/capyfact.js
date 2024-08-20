const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const facts = [
    "Capybaras are the largest rodents in the world, weighing up to 150 pounds.",
    "Capybaras can hold their breath underwater for up to five minutes.",
    "Capybaras are social animals and live in groups of 10-20 individuals called herds.",
    "Capybaras can run as fast as 35 km/h (22 mph), almost as fast as a small horse.",
    "Capybaras have webbed feet, which helps them swim and walk on muddy ground.",
    "Capybaras are herbivores and can eat up to 8 pounds of grass per day.",
    "Capybaras are native to South America and are found in dense forests near bodies of water.",
    "Capybaras can sleep in water, keeping their noses above the surface.",
    "The scientific name for capybara is 'Hydrochoerus hydrochaeris', which means 'water pig'.",
    "Capybaras can vocalize in various ways, including barks, whistles, and purrs.",
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('capyfact')
        .setDescription('Get a random capybara fact'),
    async execute(interaction) {
        const randomFact = facts[Math.floor(Math.random() * facts.length)];

        const embed = new EmbedBuilder()
            .setColor('#964B00')
            .setTitle('🐹 Capybara Fact 🐹')
            .setDescription(randomFact)
            .setFooter({ text: 'Capybaras are awesome!' })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('new_capyfact')
                    .setLabel('New Fact')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('love_capybara')
                    .setLabel('❤️')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.editReply({ embeds: [embed], components: [row] });

        const message = await interaction.fetchReply();
        const collector = message.createMessageComponentCollector({ time: 60000 });

        collector.on('collect', async i => {
            if (i.customId === 'new_capyfact') {
                const newFact = facts[Math.floor(Math.random() * facts.length)];
                embed.setDescription(newFact);
                await i.update({ embeds: [embed], components: [row] });
            } else if (i.customId === 'love_capybara') {
                await i.reply({ content: 'Capybaras love you too! 🐹❤️', ephemeral: true });
            }
        });

        collector.on('end', () => {
            interaction.editReply({ components: [] }).catch(console.error);
        });
    },
};