const { SlashCommandBuilder, ChannelType, ChatInputCommandInteraction,} 
    = require('discord.js');
const config = require('../models/config');
const channelConfigInteraction = require('../utils/channel-config-interaction');
const ChannelConfig = config.ChannelConfig

module.exports = {
    /**
     * @param {Object} param0
     * @param {ChatInputCommandInteraction} param0.interaction
     */
  data: new SlashCommandBuilder()
          .setName('configure-channel')
          .setDescription('Creates or updates schedule for channel')
          .addChannelOption(option =>
            option
                .setName('channel')
                .setDescription('The channel you want to configure')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
          ),
          
  run: async ({ interaction, client, handler }) => {
    const channel = interaction.options.getChannel('channel');

    let channelConfig = await ChannelConfig.findOne({ channelId: channel.id});
    if (!channelConfig) {
        channelConfig = new ChannelConfig({
            guildId: interaction.guildId,
            channelId: channel.id,
            active: false,
            pinPost: false
        });
        channelConfig = await channelConfig.save();
    }

    await interaction.reply(channelConfigInteraction(channelConfig));
    const menuResponse = await interaction.fetchReply();

    channelConfig.configureMessageId = menuResponse.id;
    channelConfig = await channelConfig.save();
    
  },
};