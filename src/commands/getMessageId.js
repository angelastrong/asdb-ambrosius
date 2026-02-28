const { SlashCommandBuilder, ChannelType } = require('discord.js');
const MessageSchema = require('../models/message');

module.exports = {
    /**
     * @param {Object} param0
     * @param {ChatInputCommandInteraction} interaction
     */
  data: new SlashCommandBuilder()
          .setName('get-message-id')
          .setDescription('Gets message id by channel and text')
          .addChannelOption(option => 
            option 
                .setName('channel')
                .setDescription('Channel that message is related to')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
          )
          .addStringOption(option => 
            option 
                .setName('message')
                .setDescription('Exact text of the message only')
                .setRequired(true)
          ),
          
          
  run: async ({ interaction, client, handler }) => {
    const { options } = interaction;
    const channel = options.getChannel('channel');
    const message = options.getString('message');

    await interaction.deferReply({
        ephemeral: true,
        fetchReply: true
    });

    let messageObject = 
        await MessageSchema.findOne({
            guildId: interaction.guildId,
            channelId: channel.id,
            message: message
    });

    if (!messageObject) {
        interaction.editReply({
            ephemeral: true,
            content: 'Message not found!'
        })
    } else {
        interaction.editReply({
            ephemeral: true,
            content: `Message id: ${messageObject._id.toString()}`
        })
    }

  },
};