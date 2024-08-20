const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');
const config = require('../config');

const filterPrompt = (prompt) => {
    const inappropriateWords = ['nsfw', 'nude', 'explicit'];
    return inappropriateWords.some(word => prompt.toLowerCase().includes(word));
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('image')
        .setDescription('Generate an image based on a prompt')
        .addStringOption(option =>
            option.setName('prompt')
                .setDescription('Describe the image you want to generate')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('width')
                .setDescription('Image width (default: 1024)')
                .setRequired(false)
                .setMinValue(256)
                .setMaxValue(2048))
        .addIntegerOption(option =>
            option.setName('height')
                .setDescription('Image height (default: 576)')
                .setRequired(false)
                .setMinValue(256)
                .setMaxValue(2048)),

    async execute(interaction) {
        const prompt = interaction.options.getString('prompt');
        const width = interaction.options.getInteger('width') || 1024;
        const height = interaction.options.getInteger('height') || 576;

        if (filterPrompt(prompt)) {
            await interaction.editReply('Sorry, your prompt contains inappropriate content. Please try a different prompt.');
            return;
        }

        const seed = Math.floor(Math.random() * 1000000);
        const encodedPrompt = encodeURIComponent(prompt);
        const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&nologo=poll&nofeed=yes&seed=${seed}`;

        try {
            // Pre-fetch the image
            await axios.get(imageUrl, { responseType: 'arraybuffer' });

            const embed = new EmbedBuilder()
                .setColor('#00FFFF')
                .setTitle('Generated Image')
                .setDescription(`Prompt: ${prompt}`)
                .setImage(imageUrl)
                .setFooter({ text: 'Powered by Pollinations AI' })
                .setTimestamp();

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('report_image')
                        .setLabel('Report Image')
                        .setStyle(ButtonStyle.Danger)
                );

            const message = await interaction.editReply({ embeds: [embed], components: [row] });

            const collector = message.createMessageComponentCollector({ time: 60000 });

            collector.on('collect', async i => {
                if (i.customId === 'report_image') {
                    const owner = await interaction.client.users.fetch(config.discord.owner_id);
                    await owner.send(`Image reported by ${interaction.user.tag}:\nPrompt: ${prompt}\nImage URL: ${imageUrl}`);
                    await i.reply({ content: 'Image reported. Thank you for your feedback!', ephemeral: true });
                }
            });

            collector.on('end', () => {
                interaction.editReply({ components: [] }).catch(console.error);
            });

        } catch (error) {
            console.error('Error generating image:', error);
            await interaction.editReply('Sorry, there was an error generating the image. Please try again later.');
        }
    },
};