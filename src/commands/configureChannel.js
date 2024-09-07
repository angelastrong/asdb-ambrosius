const { SlashCommandBuilder, ComponentType, ChannelType, ChatInputCommandInteraction,} 
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

    // const channelCollector = menuResponse.createMessageComponentCollector({ 
    //     componentType: ComponentType.ChannelSelect, 
    //     filter: (i) => i.user.id === interaction.user.id,
    //     time: 3_600_000 });

    // var channelSelection;
    // var hourSelection;

    // channelCollector.on('collect', async c => {
    //     channelSelection = c.values[0];
    //     channelCollector.stop();

    //     // const menuResponse = await c.reply({
    //     //     content: `Configuration for <#${channelSelection}>`,
    //     //     components: [menuRow, saveRow],
    //     //     fetchReply: true
    //     // })
    
    //     const hourCollector = menuResponse.createMessageComponentCollector({ 
    //         componentType: ComponentType.StringSelect, 
    //         //filter: (i) => i.user.id === c.user.id,
    //         time: 3_600_000 });
    
    //     hourCollector.on('collect', async h => {
    //         h.reply('hi');
    //         hourSelection = h.values[0];
    //         hourCollector.stop();
            
    //     });

    //     hourCollector.on('end', () => {
    //         if (!channelSelection || !hourSelection) {
    //             interaction.channel.send('Channel or hour not selected. Please try scheduling the channel again.')
    //         } else {
    //             interaction.channel.send(`Channel: <#${channelSelection}> and Hour: ${hourSelection} `)
    //         }
    //     } )
    // });

    
  },
};