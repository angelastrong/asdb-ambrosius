const { SlashCommandBuilder } = require('discord.js');
const createConfig = require('../utils/create-config')

module.exports = {
  data: new SlashCommandBuilder()
          .setName('create-config')
          .setDescription('Creates config for server'),
          
  run: async ({ interaction, client, handler }) => {
    const configCreated = await createConfig(interaction.guild.id)
    if (configCreated) {
        interaction.reply('Server config created')
    } else {
        interaction.reply('Unable to create server config. Config may already exist')
    }
  },
};