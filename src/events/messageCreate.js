const { generateResponse } = require('../utils/openai');
const logger = require('../utils/logger');

module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        if (message.author.bot) return;

        if (message.mentions.has(client.user)) {
            try {
                const userInfo = {
                    id: message.author.id,
                    username: message.author.username,
                    discriminator: message.author.discriminator,
                    avatar: message.author.avatarURL(),
                    roles: message.member.roles.cache.map(role => role.name)
                };

                let initialMessage;
                initialMessage = await message.reply('CapyBot is thinking...');

                let messageContent = message.content;
                const botId = client.user.id;
                messageContent = messageContent.replace(`<@${botId}>`, '');
                messageContent = messageContent.trim();

                const response = await generateResponse(userInfo, message.content, message.channel, initialMessage);

                if (initialMessage) {
                    // The response has already been edited into the initial message
                } else {
                    await message.reply(response);
                }
            } catch (error) {
                logger.error('Error in AI response generation:', error);
                message.reply('Sorry, I encountered an error while processing your message.');
            }
        }
    },
};