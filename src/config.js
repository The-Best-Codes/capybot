require('dotenv').config();

module.exports = {
    discord: {
        token: process.env.BOT_TOKEN,
        owner_id: process.env.OWNER_ID,
    },
    openai: {
        apiKey: process.env.AI_API_KEY,
        baseUrl: process.env.AI_BASE_URL,
        model: process.env.BOT_AI_MODEL || 'gpt-3.5-turbo',
    },
    weather: {
        apiKey: process.env.WEATHER_API_KEY || 'test',
    },
};