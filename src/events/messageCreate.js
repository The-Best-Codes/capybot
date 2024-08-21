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

                // Replace user mentions with @(username)
                messageContent = await replaceMentionsWithUsernames(messageContent, client);

                const response = await generateResponse(userInfo, messageContent, message.channel, initialMessage);

                if (!initialMessage) {
                    await message.reply(response);
                }
            } catch (error) {
                logger.error('Error in AI response generation:', error);
                if (error === 'OPENAI ERROR') {
                    message.reply('Sorry, I encountered an error while processing your message. [OPENAI ERROR]');
                } else {
                    message.reply('Sorry, I encountered an error while processing your message. [UNCAUGHT MESSAGE ERROR]');
                }
            }
        }
    },
};

async function replaceMentionsWithUsernames(content, client) {
    const mentionRegex = /<@!?(\d+)>/g;
    let match;
    let newContent = content;

    while ((match = mentionRegex.exec(content)) !== null) {
        const userId = match[1];
        try {
            const user = await client.users.fetch(userId);
            newContent = newContent.replace(match[0], `@(${user.username})`);
        } catch (error) {
            logger.error(`Error fetching user ${userId}:`, error);
            // If we can't fetch the user, we'll leave the mention as is
        }
    }

    return newContent;
}