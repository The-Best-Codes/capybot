const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const axios = require('axios');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('weather')
        .setDescription('Get the weather forecast for a location')
        .addStringOption(option =>
            option.setName('location')
                .setDescription('The location to get the weather for')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('unit')
                .setDescription('Temperature unit')
                .setRequired(false)
                .addChoices(
                    { name: 'Celsius', value: 'metric' },
                    { name: 'Fahrenheit', value: 'imperial' },
                    { name: 'Kelvin', value: 'standard' },
                )),

    async execute(interaction) {
        const location = interaction.options.getString('location');
        const unit = interaction.options.getString('unit') || 'metric';
        const apiKey = config.weather.apiKey;
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${apiKey}&units=${unit}`;

        try {
            const response = await axios.get(url);
            const data = response.data;

            const weather = data.weather[0].main;
            const description = data.weather[0].description;
            const temp = data.main.temp;
            const feelsLike = data.main.feels_like;
            const humidity = data.main.humidity;
            const windSpeed = data.wind.speed;
            const city = data.name;
            const country = data.sys.country;
            const iconCode = data.weather[0].icon;

            const unitSymbol = unit === 'imperial' ? '°F' : (unit === 'standard' ? 'K' : '°C');
            const windUnit = unit === 'imperial' ? 'mph' : 'm/s';

            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle(`Weather in ${city}, ${country}`)
                .setDescription(`**${weather}**: ${description}`)
                .setThumbnail(`http://openweathermap.org/img/wn/${iconCode}@2x.png`)
                .addFields(
                    { name: 'Temperature', value: `${temp}${unitSymbol}`, inline: true },
                    { name: 'Feels Like', value: `${feelsLike}${unitSymbol}`, inline: true },
                    { name: 'Humidity', value: `${humidity}%`, inline: true },
                    { name: 'Wind Speed', value: `${windSpeed} ${windUnit}`, inline: true },
                )
                .setFooter({ text: 'Data provided by OpenWeatherMap' })
                .setTimestamp();

            const responseData = async () => {
                return { embeds: [embed] };
            };

            if (interaction.deferred) {
                await interaction.editReply(await responseData());
            } else {
                await interaction.reply(await responseData());
            }

        } catch (error) {
            console.error(error);
            const errorResponse = "Sorry, I couldn't fetch the weather information. Please check the location and try again.";
            
            if (interaction.deferred) {
                await interaction.editReply(errorResponse);
            } else {
                await interaction.reply(errorResponse);
            }
        }
    },
};