const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const diceEmojis = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

function rollDie(sides) {
    return Math.floor(Math.random() * sides) + 1;
}

function getDiceAsciiArt(result, sides) {
    if (sides === 6 && result <= 6) {
        return diceEmojis[result - 1];
    }
    return `[${result}]`;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roll')
        .setDescription('Roll one or more dice')
        .addIntegerOption(option =>
            option.setName('dice')
                .setDescription('Number of dice to roll')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(10))
        .addIntegerOption(option =>
            option.setName('sides')
                .setDescription('Number of sides on each die')
                .setRequired(false)
                .setMinValue(2)
                .setMaxValue(100)),

    async execute(interaction) {
        const dice = interaction.options.getInteger('dice') || 1;
        const sides = interaction.options.getInteger('sides') || 6;

        let results = [];
        let total = 0;
        for (let i = 0; i < dice; i++) {
            const roll = rollDie(sides);
            results.push(roll);
            total += roll;
        }

        const diceVisual = results.map(r => getDiceAsciiArt(r, sides)).join(' ');
        const resultString = results.join(' + ');

        const embed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('🎲 Dice Roll Results 🎲')
            .setDescription(`You rolled ${dice} ${sides}-sided ${dice === 1 ? 'die' : 'dice'}`)
            .addFields(
                { name: 'Dice', value: diceVisual, inline: false },
                { name: 'Results', value: resultString, inline: true },
                { name: 'Total', value: total.toString(), inline: true }
            )
            .setFooter({ text: 'May the odds be ever in your favor!' })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('reroll')
                    .setLabel('Roll Again')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('double')
                    .setLabel('Double or Nothing')
                    .setStyle(ButtonStyle.Danger)
            );

        await interaction.editReply({ embeds: [embed], components: [row] });

        const message = await interaction.fetchReply();
        const collector = message.createMessageComponentCollector({ time: 60000 });

        collector.on('collect', async i => {
            if (i.customId === 'reroll') {
                results = [];
                total = 0;
                for (let i = 0; i < dice; i++) {
                    const roll = rollDie(sides);
                    results.push(roll);
                    total += roll;
                }
                const newDiceVisual = results.map(r => getDiceAsciiArt(r, sides)).join(' ');
                const newResultString = results.join(' + ');
                embed.setFields(
                    { name: 'Dice', value: newDiceVisual, inline: false },
                    { name: 'Results', value: newResultString, inline: true },
                    { name: 'Total', value: total.toString(), inline: true }
                );
                await i.update({ embeds: [embed], components: [row] });
            } else if (i.customId === 'double') {
                const doubleRoll = rollDie(sides);
                if (doubleRoll > sides / 2) {
                    total *= 2;
                    embed.setFields(
                        { name: 'Double or Nothing', value: `You rolled ${doubleRoll}. Your total is doubled!`, inline: false },
                        { name: 'New Total', value: total.toString(), inline: true }
                    );
                } else {
                    embed.setFields(
                        { name: 'Double or Nothing', value: `You rolled ${doubleRoll}. You lose everything!`, inline: false },
                        { name: 'New Total', value: '0', inline: true }
                    );
                }
                await i.update({ embeds: [embed], components: [] });
            }
        });

        collector.on('end', () => {
            interaction.editReply({ components: [] }).catch(console.error);
        });
    },
};