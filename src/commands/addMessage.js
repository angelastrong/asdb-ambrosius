const { SlashCommandBuilder } = require('discord.js');
const messageSchema = require('../models/message');

module.exports = {
  data: new SlashCommandBuilder()
          .setName('add-message')
          .setDescription('Adds message to collection')
          .addStringOption(option => option.setName('message').setDescription('Message to add to collection').setRequired(true))
          .addStringOption(option => option.setName('schedule-date').setDescription('Optional schedule date in format YYYY-MM-DD')),
          
  run: ({ interaction, client, handler }) => {
    const { options } = interaction;
    const scheduledDateString = options.getString('schedule-date');
    const scheduleDate = Date.parse(scheduledDateString);

    if (scheduledDateString && isNaN(scheduleDate)) {
        interaction.reply('Schedule date is not a valid date format');
    } else {
        try {
                const message = options.getString('message');

                messageSchema.create({
                    message: message,
                    date: scheduledDateString ? scheduleDate : null
                })
            interaction.reply('Message has been added');
        } catch (error) {
            interaction.reply('There was an error')
            console.log(`Error: ${error}`);
        }
    }
  },
};