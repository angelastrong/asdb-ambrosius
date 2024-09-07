const { SlashCommandBuilder, ChannelSelectMenuBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, 
    ComponentType, ChannelType } 
    = require('discord.js');
const createConfig = require('../utils/create-config')
const config = require('../models/config')

module.exports = {
    deleted: true,
    data: new SlashCommandBuilder()
          .setName('schedule-channel')
          .setDescription('Creates or updates schedule for channel'),
          
  run: async ({ interaction, client, handler }) => {
    let serverConfig = await config.find({ guildId: interaction.guild.id}).exec()

    if (!serverConfig.length) {
        await createConfig(interaction.guild.id);
        serverConfig = await config.find({ guildId: interaction.guild.id}).exec()
    }

    const channelSelect = new ChannelSelectMenuBuilder()
        .setChannelTypes(ChannelType.GuildText)
        .setCustomId('channels')
        .setPlaceholder('Select channel');

    var hourOptions = [];

    for (let i = 0; i <= 23; i++) {
        hourOptions.push(new StringSelectMenuOptionBuilder().setLabel(i.toString()).setValue(i.toString()));
    }

    const hourSelect = new StringSelectMenuBuilder()
        .setCustomId('hours')
        .setPlaceholder('Select hour for schedule')
        .addOptions(hourOptions)


    const row1 = new ActionRowBuilder()
        .addComponents(channelSelect);

    const row2 = new ActionRowBuilder()
        .addComponents(hourSelect);

    const channelResponse = await interaction.reply({
        content: 'Select channel to schedule',
        components: [row1]
    })

    const channelCollector = channelResponse.createMessageComponentCollector({ 
        componentType: ComponentType.ChannelSelect, 
        filter: (i) => i.user.id === interaction.user.id,
        time: 3_600_000 });

    var channelSelection;
    var hourSelection;

    channelCollector.on('collect', async c => {
        channelSelection = c.values[0];
        channelCollector.stop();

        const hourResponse = await c.reply({
            content: 'Select hour for daily post',
            components: [row2]
        })
    
        const hourCollector = hourResponse.createMessageComponentCollector({ 
            componentType: ComponentType.StringSelect, 
            //filter: (i) => i.user.id === c.user.id,
            time: 3_600_000 });
    
        hourCollector.on('collect', async h => {
            h.reply('hi');
            hourSelection = h.values[0];
            hourCollector.stop();
            
        });

        hourCollector.on('end', () => {
            if (!channelSelection || !hourSelection) {
                interaction.channel.send('Channel or hour not selected. Please try scheduling the channel again.')
            } else {
                interaction.channel.send(`Channel: <#${channelSelection}> and Hour: ${hourSelection} `)
            }
        } )
    });

    
  },
};