const { Interaction, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
    ModalBuilder, TextInputBuilder, TextInputStyle
 } = require('discord.js')
const { ChannelConfig } = require('../../models/config')
const actions = require('../../constants/actions')
const channelConfigInteraction = require('../../utils/channel-config-interaction');

/**
 * 
 * @param {Interaction} interaction 
 */
module.exports = async (interaction) => {
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
            interaction.reply('You have exited channel configuration');
            channelConfig.configureMessageId = null;
            await channelConfig.save();
            return;
        }

        if (action === actions.PIN_POST) {
            channelConfig.pinPost = subaction === 'true';   
        }

        // if (action === actions.DAILY_POST_TIME) {
        //     if (subaction === 'input') {
        //         const hourSelected = interaction.values[0];
        //         channelConfig.dailyPostTime = hourSelected;
        //         await interaction.message.edit({
        //             content: `${hourSelected} selected for Daily Post Time`,
        //             components: []
        //         })
        //     } else {
        //         var hourOptions = [];

        //         for (let i = 0; i <= 23; i++) {
        //             hourOptions.push(new StringSelectMenuOptionBuilder().setLabel(i.toString()).setValue(i.toString()));
        //         }
            
        //         const hourSelect = new StringSelectMenuBuilder()
        //             .setCustomId(`config.${channelId}.${actions.DAILY_POST_TIME}.input`)
        //             .setPlaceholder('Select hour for schedule')
        //             .addOptions(hourOptions)
            
        //         const row = new ActionRowBuilder()
        //             .addComponents(hourSelect);

        //         await interaction.reply({
        //             content: 'Select the hour in PT as the daily posting time for this channel',
        //             components: [row]
        //         })
        //         return;
        //     }
            
        // }

        if (action === actions.DAILY_POST_TIME) {
            if (subaction === 'input') {
                const timeString = interaction.fields.getTextInputValue('hourInput');
                let regex = new RegExp(/^(?:\d|[01]\d|2[0-3]):[0-5]\d$/);

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
            } else {
                const modal = new ModalBuilder()
                    .setCustomId(`config.${channelId}.${actions.DAILY_POST_TIME}.input`)
                    .setTitle('Edit daily post time');

                const hourInput = new TextInputBuilder()
                    .setCustomId('hourInput')
                    .setLabel('Set the daily post time in PT')
                    .setPlaceholder('Use the 24-hour format (0-23 for hour) eg. 18:15')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);
                
                const row = new ActionRowBuilder().addComponents(hourInput);

                modal.addComponents(row);

                await interaction.showModal(modal);
                return;
            }
            
        }

        if (action === actions.TEMPLATE) {
            if (subaction === 'input') {
                const template = interaction.fields.getTextInputValue('templateInput');
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
            channelConfig.active = true;
        }

        if (action === actions.DISABLE) {
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