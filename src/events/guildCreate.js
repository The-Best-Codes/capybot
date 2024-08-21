const logger = require('../utils/logger');
const config = require('../config');
const { REST, Collection, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'guildCreate',
    execute(guild, client) {
        logger.info(`Joined a new guild: ${guild.name} (ID: ${guild.id})`);
        const rest = new REST({ version: '10' }).setToken(config.discord.token);

        client.commands = client.commands || new Collection();

        const commandFiles = fs.readdirSync(path.join(__dirname, '../commands')).filter(file => file.endsWith('.js'));

        const commands = [];
        for (const file of commandFiles) {
            const command = require(`../commands/${file}`);
            client.commands.set(command.data.name, command);
            commands.push(command.data.toJSON());
        }

        try {
            rest.put(
                Routes.applicationGuildCommands(client.user.id, guild.id),
                { body: commands },
            ).then(() => {
                logger.info(`Successfully registered application commands for guild ${guild.name}`);
            });
        } catch (error) {
            logger.error(`Error registering application commands for guild ${guild.name}:`, error);
        }
    },
};
