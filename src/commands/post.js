const { SlashCommandBuilder, ChannelType } = require('discord.js');
const postMessage = require('../utils/post-message')

module.exports = {
  data: new SlashCommandBuilder()
          .setName('post')
          .setDescription('Posts next message to current or selected channel')
          .addChannelOption(
            option => 
                option
                .setName('channel')
                .setDescription('The channel you want to post to')
                .addChannelTypes(ChannelType.GuildText)
          ),
          
  run: async ({ interaction, client, handler }) => {
    await interaction.deferReply({ 
        fetchReply: true,
        ephemeral: true 
    });
    const channel = interaction.options.getChannel('channel') || interaction.channel;

    const result = await postMessage(interaction.guildId, channel.id, client);

    if (result === -1) {
        await interaction.editReply({
            content: 'There was an error'
        });
    } else {
        await interaction.editReply({
            content: 'Message posted!'
        });
    }
  },
};