const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');
const config = require('../config');

const filterJoke = (joke) => {
    const inappropriateWords = ['inappropriate', 'offensive', 'nsfw']; // Add more words as needed
    return inappropriateWords.some(word => joke.toLowerCase().includes(word)) ? null : joke;
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('joke')
        .setDescription('Get a random joke')
        .addStringOption(option =>
            option.setName('category')
                .setDescription('Choose your joke category')
                .setRequired(false)
                .addChoices(
                    { name: '😂 General', value: 'general' },
                    { name: '💻 Programming', value: 'programming' },
                    { name: '🤓 Dad', value: 'dad' },
                )),

    async execute(interaction) {
        const category = interaction.options.getString('category') || 'general';
        const jokeApi = {
            general: 'https://official-joke-api.appspot.com/random_joke',
            programming: 'https://v2.jokeapi.dev/joke/Programming?type=twopart&safe-mode',
            dad: 'https://icanhazdadjoke.com/',
        };

        try {
            const response = await axios.get(jokeApi[category], {
                headers: category === 'dad' ? { Accept: 'application/json' } : {}
            });

            let setup, punchline;

            switch (category) {
                case 'general':
                    ({ setup, punchline } = response.data);
                    break;
                case 'programming':
                    ({ setup, delivery: punchline } = response.data);
                    break;
                case 'dad':
                    setup = response.data.joke;
                    punchline = "The punchline is missing. 🤷‍♂️";
                    break;
            }

            // Filter the joke
            setup = filterJoke(setup);
            punchline = filterJoke(punchline);

            if (!setup || !punchline) {
                throw new Error('Inappropriate content filtered');
            }

            const embed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('🎭 Joke Time!')
                .setDescription(setup)
                .addFields({ name: 'Punchline', value: punchline })
                .setFooter({ text: `Category: ${category.charAt(0).toUpperCase() + category.slice(1)}` })
                .setTimestamp();

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('report_joke')
                        .setLabel('Report Joke')
                        .setStyle(ButtonStyle.Danger)
                );

            await interaction.editReply({ embeds: [embed], components: [row] });

            // Create a message component collector
            const message = await interaction.fetchReply();
            const filter = i => i.customId === 'report_joke' && i.user.id === interaction.user.id;
            const collector = message.createMessageComponentCollector({ filter, time: 60000 });

            collector.on('collect', async i => {
                const owner = await interaction.client.users.fetch(config.discord.owner_id);
                await owner.send(`Joke reported by ${interaction.user.tag}:\n\nSetup: ${setup}\nPunchline: ${punchline}`);
                await i.reply({ content: 'Joke reported. Thank you for your feedback!', ephemeral: true });
            });

            // Easter egg: 5% chance of a groan reaction
            if (Math.random() < 0.05) {
                await interaction.followUp("😩 That was terrible! But hey, at least you didn't have to pay for it!");
            }

        } catch (error) {
            console.error(error);
            const errorMessage = error.message === 'Inappropriate content filtered'
                ? 'Sorry, that joke didn\'t pass our content filter. Let me find you a better one!'
                : 'Sorry, I couldn\'t fetch a joke. My comedy career is in shambles!';

            await interaction.editReply({ content: errorMessage, ephemeral: true });
        }
    },
};