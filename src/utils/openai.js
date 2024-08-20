const { OpenAI } = require('openai');
const config = require('../config');

const openai = new OpenAI({
    apiKey: config.openai.apiKey,
    baseURL: config.openai.baseUrl,
});

let memory = {};

async function generateResponse(userInfo, message, channel, initialMessage = null) {
    const { id, username, discriminator, avatar, roles } = userInfo;

    try {
        if (!memory[id]) {
            memory[id] = [];
        }

        memory[id].push({ role: 'user', content: message });

        const systemMessage = {
            role: 'system',
            content: 'You are CapyBot, a helpful and friendly Discord bot. You can access user information, get the last n messages, and channel names.'
        };

        const response = await openai.chat.completions.create({
            model: config.openai.model || 'gpt-3.5-turbo',
            messages: [
                systemMessage,
                ...memory[id],
            ],
            functions: [
                {
                    name: 'get_channel_name',
                    description: 'Get the name of the current Discord channel',
                    parameters: { type: 'object', properties: {} },
                },
                {
                    name: 'get_last_n_messages',
                    description: 'Get the last n messages in the channel',
                    parameters: {
                        type: 'object',
                        properties: {
                            n: {
                                type: 'integer',
                                minimum: 1,
                                maximum: 25
                            }
                        },
                        required: ['n']
                    },
                },
                {
                    name: 'get_user_info',
                    description: 'Get information about the user',
                    parameters: {
                        type: 'object',
                        properties: {
                            field: {
                                type: 'string',
                                enum: ['username', 'discriminator', 'avatar', 'roles']
                            }
                        },
                        required: ['field']
                    },
                },
            ],
        });

        const aiMessage = response.choices[0].message;

        let content = aiMessage.content || '';

        if (aiMessage.function_call) {
            if (aiMessage.function_call.name === 'get_channel_name') {
                const channelName = channel.name;
                memory[id].push({
                    role: 'function',
                    name: 'get_channel_name',
                    content: channelName,
                });
            } else if (aiMessage.function_call.name === 'get_user_info') {
                let args;
                try {
                    args = JSON.parse(aiMessage.function_call.arguments);
                } catch (error) {
                    console.error('Error parsing function arguments:', error);
                    args = {};
                }
                const field = args.field;
                let userInfoContent;
                switch (field) {
                    case 'username':
                        userInfoContent = username;
                        break;
                    case 'discriminator':
                        userInfoContent = discriminator;
                        break;
                    case 'avatar':
                        userInfoContent = avatar;
                        break;
                    case 'roles':
                        userInfoContent = roles.join(', ');
                        break;
                    default:
                        userInfoContent = 'Invalid field requested';
                }
                memory[id].push({
                    role: 'function',
                    name: 'get_user_info',
                    content: userInfoContent,
                });
            } else if (aiMessage.function_call.name === 'get_last_n_messages') {
                let args;
                try {
                    args = JSON.parse(aiMessage.function_call.arguments);
                } catch (error) {
                    console.error('Error parsing function arguments:', error);
                    args = {};
                }
                const n = args.n;
                const messages = await channel.messages.fetch({ limit: n });
                const lastMessages = messages.map(message => ({
                    username: message.author.username,
                    content: message.content,
                }));
                memory[id].push({
                    role: 'function',
                    name: 'get_last_n_messages',
                    content: JSON.stringify(lastMessages),
                });
            }

            const followUpResponse = await openai.chat.completions.create({
                model: config.openai.model || 'gpt-3.5-turbo',
                messages: [
                    systemMessage,
                    ...memory[id],
                ],
            });

            const followUpMessage = followUpResponse.choices[0].message;
            content = followUpMessage.content || '';
        }

        if (!content || content.trim() === '') {
            content = "I'm sorry, but I don't have a response for that. Can you please rephrase or ask something else?";
        }

        memory[id].push({ role: 'assistant', content: content });
        if (memory[id].length > 15) {
            memory[id] = memory[id].slice(-15);
        }

        if (initialMessage) {
            await initialMessage.edit(content);
        }

        return content;
    } catch (error) {
        console.error('Error in generateResponse:', error);
        if (error.response) {
            console.error('OpenAI API Error:', error.response.data);
        }
        return 'Sorry, I encountered an error while processing your message.';
    }
}

module.exports = { generateResponse };