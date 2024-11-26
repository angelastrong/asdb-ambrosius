const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder} = require('discord.js');
const channelConfigured = require('../utils/channel-configured');
const config = require('../models/config')
const ChannelConfig = config.ChannelConfig
const actions = require('../constants/actions')
const constants = require('../constants/default')

    /**
     * @param {ChannelConfig} channelConfig
     */

function channelConfigInteraction(channelConfig) {
    const channelId = channelConfig.channelId;

    let schedule;
    if (channelConfig.cron) {
        schedule = `Cron: \`${channelConfig.cron}\``;
    } else if (channelConfig.dailyPostTime) {
        schedule = `Daily Post Time: \`${channelConfig.dailyPostTime}\``;
    }
        
    let channelConfigEmbed = new EmbedBuilder()
        .setTitle(`Configuration for <#${channelId}>`)
        .addFields(
            { name: 'Schedule', value: (schedule !== null) ? `${schedule}` : 'not configured'},
            { name: 'Message Template', value: channelConfig.template ? `${channelConfig.template}` : 'not configured'},
            { name: 'Repeat Post Min Time Interval', value: channelConfig.postIntervalDays ? `${channelConfig.postIntervalDays} days` : 'not configured'},
            { name: 'Pin Post', value: channelConfig.pinPost ? 'TRUE: Message will be pinned after posting' : 'FALSE: Message will not be pinned after posting.'},
            { name: 'Max Number of Pinned Posts', value: `${channelConfig.pinnedPostsNumMax || constants.MAX_PINNED_POSTS}` },
            { name: 'Scheduler', value: channelConfig.active ? 'ENABLED' : 'DISABLED'},
            { name: 'Instruction', value: 'Use buttons below to edit settings.'}
        )

    if (!channelConfigured(channelConfig)) {
        channelConfigEmbed.addFields(
            { name: 'To Enable', value: 'All fields must be configured before scheduler can be enabled for this channel.'}
        )
    }

    //Menu Buttons Row 1
    const dailyPostTimeButton = new ButtonBuilder()
        .setCustomId(`config.${channelId}.${actions.SCHEDULE}`)
        .setLabel('Schedule')
        .setStyle(ButtonStyle.Primary);
    
    const templateButton = new ButtonBuilder()
        .setCustomId(`config.${channelId}.${actions.TEMPLATE}`)
        .setLabel('Message Template')
        .setStyle(ButtonStyle.Primary);

    const postIntervalButton = new ButtonBuilder()
        .setCustomId(`config.${channelId}.${actions.POST_INTERVAL}`)
        .setLabel('Repeat Post Min Time Interval')
        .setStyle(ButtonStyle.Primary);

    //Menu Buttons Row 2

    const pinMessageButton = new ButtonBuilder()
        .setCustomId(`config.${channelId}.${actions.PIN_POST}.${channelConfig.pinPost ? 'false' : 'true'}`)
        .setLabel(`Pin Post Set ${channelConfig.pinPost ? 'False' : 'True'}`)
        .setStyle(ButtonStyle.Primary);

    const pinMaxNumButton = new ButtonBuilder()
        .setCustomId(`config.${channelId}.${actions.PIN_MAX_NUM}`)
        .setLabel('Max Number Pinned Posts')
        .setStyle(ButtonStyle.Primary);

    // Enable and Cancel
    const enableButton = new ButtonBuilder()
        .setCustomId(`config.${channelId}.${actions.ENABLE}`)
        .setLabel('Enable')
        .setStyle(ButtonStyle.Success)
        .setDisabled(!channelConfigured(channelConfig));

    const disableButton = new ButtonBuilder()
        .setCustomId(`config.${channelId}.${actions.DISABLE}`)
        .setLabel('Disable')
        .setStyle(ButtonStyle.Danger);

    const changeStatusButton = channelConfig.active ? disableButton : enableButton;

    const exitButton = new ButtonBuilder()
        .setCustomId(`config.${channelId}.${actions.EXIT}`)
        .setLabel('Exit')
        .setStyle(ButtonStyle.Secondary);

    const menuRow1 = new ActionRowBuilder()
        .addComponents(dailyPostTimeButton, templateButton, postIntervalButton);

    const menuRow2 = new ActionRowBuilder()
        .addComponents(pinMessageButton, pinMaxNumButton);

    const statusRow = new ActionRowBuilder()
        .addComponents(changeStatusButton, exitButton);

    return {
        embeds: [channelConfigEmbed],
        components: [menuRow1, menuRow2, statusRow]
    }
}

module.exports = channelConfigInteraction