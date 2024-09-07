const { SlashCommandBuilder } = require('discord.js');
const config = require('../models/config')

module.exports = {
  data: new SlashCommandBuilder()
          .setName('view-config')
          .setDescription('View config for server and channels'),
          
  run: async ({ interaction, client, handler }) => {
    const result = await config.find({ guildId: interaction.guild.id}).exec()
    if (result.length) {
        interaction.reply('Config: ' + result.toString())
    } else {
        interaction.reply('No config found. Use /create-config to create')
    }
  },
};