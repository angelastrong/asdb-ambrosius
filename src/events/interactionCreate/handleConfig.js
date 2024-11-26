const { Interaction, EmbedBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle
 } = require('discord.js')
const { ChannelConfig } = require('../../models/config')
const actions = require('../../constants/actions')
const channelConfigInteraction = require('../../utils/channel-config-interaction');
const cron = require('cron-validate');
const startSchedule = require('../../utils/start-schedule')
const stopSchedule = require('../../utils/stop-schedule')

/**
 * 
 * @param {Interaction} interaction 
 */
module.exports = async (interaction, client, handler) => {
    if (!interaction.customId) return;

    try {
        const [type, channelId, action, subaction] = interaction.customId.split('.');

        if (!type || !channelId || !action) return;
        if (type !== 'config') return;

        let channelConfig = await ChannelConfig.findOne( { channelId: channelId });
        const configureMessage = await interaction.channel.messages.fetch(channelConfig.configureMessageId);

        let embedUpdate = new EmbedBuilder();

        if (action === actions.EXIT) { 
            embedUpdate.setTitle(`You have finished configuring <#${channelId}>`);
            configureMessage.edit({
                embeds: [embedUpdate],
                components: []
            });
            interaction.reply({
                content: 'You have exited channel configuration',
                ephemeral: true
            });
            channelConfig.configureMessageId = null;
            await channelConfig.save();
            return;
        }

        if (action === actions.PIN_POST) {
            channelConfig.pinPost = subaction === 'true';   
        }

        if (action === actions.PIN_MAX_NUM) {
            if (subaction === 'input') {
                const pinMaxNum = interaction.fields.getTextInputValue('pinMaxNumInput');
                if (isNaN(pinMaxNum)) {
                    interaction.reply({ 
                        content: 'You did not input a number >:[',
                        ephemeral: true
                    })
                    return;
                }
                if (pinMaxNum < 1 || pinMaxNum > 50) {
                    interaction.reply({ 
                        content: 'Number must be between 1 and 50 inclusive!! >:[',
                        ephemeral: true
                    })
                    return;
                }
                channelConfig.pinnedPostsNumMax = pinMaxNum;
            } else {
                const modal = new ModalBuilder()
                    .setCustomId(`config.${channelId}.${actions.PIN_MAX_NUM}.input`)
                    .setTitle('Edit max number of pinned posts');

                const postIntervalInput = new TextInputBuilder()
                    .setCustomId('pinMaxNumInput')
                    .setLabel('Number must be between 1 and 50 inclusive')
                    //.setPlaceholder('Enter the number of days')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);
                
                const row = new ActionRowBuilder().addComponents(postIntervalInput);

                modal.addComponents(row);

                await interaction.showModal(modal);
                return;
            }
        }

        if (action === actions.SCHEDULE) {
            if (subaction === 'input') {
                const timeString = interaction.fields.getTextInputValue('timeInput');
                const cronString = interaction.fields.getTextInputValue('cronInput');

                if (cronString) {
                    const cronResult = cron(cronString);
                    if (cronResult.isValid()) {
                        channelConfig.cron = cronString;
                    } else {
                        interaction.reply({ 
                            content: 'Invalid cron format >:[',
                            ephemeral: true
                        })
                        return;
                    }
                } else if (channelConfig.cron) {
                    channelConfig.cron = null;
                }
                if (timeString) {
                    const regex = new RegExp(/^(?:\d|[01]\d|2[0-3]):[0-5]\d$/);

                    if (regex.test(timeString)) {
                        const time = timeString.split(':');
                        channelConfig.dailyPostHour = time[0];
                        channelConfig.dailyPostMinute = time[1];
                        channelConfig.dailyPostTime = timeString;
                    } else {
                        interaction.reply({ 
                            content: 'Invalid time format >:[',
                            ephemeral: true
                        })
                        return;
                    }   
                } else if (channelConfig.dailyPostTime) {
                    channelConfig.dailyPostHour = null;
                    channelConfig.dailyPostMinute = null;
                    channelConfig.dailyPostTime = null;
                }

                if (channelConfig.active) {
                    stopSchedule(channelConfig);
                    await startSchedule(client, channelConfig);
                }
                
            } else {
                const modal = new ModalBuilder()
                    .setCustomId(`config.${channelId}.${actions.SCHEDULE}.input`)
                    .setTitle('Edit the schedule');

                const timeInput = new TextInputBuilder()
                    .setCustomId('timeInput')
                    .setLabel('Set the daily post time in UTC')
                    .setPlaceholder('Use the 24-hour format (0-23 for hour) eg. 18:15')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false);

                const cronInput = new TextInputBuilder()
                    .setCustomId('cronInput')
                    .setLabel('Or use cron-style scheduling')
                    .setPlaceholder('For example: Every 15 minutes = */15 * * * * ')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false);
                
                const row1 = new ActionRowBuilder().addComponents(timeInput);
                const row2 = new ActionRowBuilder().addComponents(cronInput);

                modal.addComponents(row1, row2);

                await interaction.showModal(modal);
                return;
            }
            
        }

        if (action === actions.TEMPLATE) {
            if (subaction === 'input') {
                const template = interaction.fields.getTextInputValue('templateInput');
                if (!template.includes('<MSG>')) {
                    interaction.reply({ 
                        content: 'The template needs to contain <MSG> >:[',
                        ephemeral: true
                    })
                    return;
                }
                channelConfig.template = template;
            } else {
                const modal = new ModalBuilder()
                    .setCustomId(`config.${channelId}.${actions.TEMPLATE}.input`)
                    .setTitle('Edit template');

                const templateInput = new TextInputBuilder()
                    .setCustomId('templateInput')
                    .setLabel('Set the message template')
                    .setPlaceholder('Use <MSG> to indicate where the message will go in the template for example:\nDaily post: <MSG>')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true);
                
                const row = new ActionRowBuilder().addComponents(templateInput);

                modal.addComponents(row);

                await interaction.showModal(modal);
                return;
            }

        }

        if (action === actions.POST_INTERVAL) {
            if (subaction === 'input') {
                const postIntervalInput = interaction.fields.getTextInputValue('postIntervalInput');
                if (isNaN(postIntervalInput)) {
                    interaction.reply({ 
                        content: 'You did not input a number >:[',
                        ephemeral: true
                    })
                    return;
                }
                channelConfig.postIntervalDays = postIntervalInput;
            } else {
                const modal = new ModalBuilder()
                    .setCustomId(`config.${channelId}.${actions.POST_INTERVAL}.input`)
                    .setTitle('Edit repeat posting minimum interval');

                const postIntervalInput = new TextInputBuilder()
                    .setCustomId('postIntervalInput')
                    .setLabel('Set the minimum interval between repeat posts')
                    .setPlaceholder('Enter the number of days')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);
                
                const row = new ActionRowBuilder().addComponents(postIntervalInput);

                modal.addComponents(row);

                await interaction.showModal(modal);
                return;
            }

        }

        if (action === actions.ENABLE) {
            await startSchedule(client, channelConfig);
            channelConfig.active = true;
        }

        if (action === actions.DISABLE) {
            stopSchedule(channelConfig);
            channelConfig.active = false;
        }

        channelConfig = await channelConfig.save();
        embedUpdate.setTitle(`Configuration updated for <#${channelId}>`);
        configureMessage.edit({
            embeds: [embedUpdate],
            components: []
        });

        await interaction.reply(channelConfigInteraction(channelConfig));
        const menuResponse = await interaction.fetchReply();
    
        channelConfig.configureMessageId = menuResponse.id;
        channelConfig = await channelConfig.save();



    } catch (error) {
        console.log(`Error in handleConfig.js: ${error}`)
    }

}