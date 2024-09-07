const { SlashCommandBuilder } = require('discord.js');
const testSchema = require('../models/test');

module.exports = {
  data: new SlashCommandBuilder()
          .setName('test-schema')
          .setDescription('Testing a schema')
          .addStringOption(option => option.setName('schema-input').setDescription('text to save').setRequired(true)),
          
  run: ({ interaction, client, handler }) => {
    const { options } = interaction;
    const string = options.getString('schema-input');

    testSchema.create({
        name: string
    })

    interaction.reply('I saved the data');
  },
};