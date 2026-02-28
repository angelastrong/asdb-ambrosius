const { Interaction, EmbedBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle
 } = require('discord.js')
const { ChannelConfig } = require('../../models/config')
const WriteinConfig = require('../../models/writein-config')
const actions = require('../../constants/actions')
const channelConfigInteraction = require('../../utils/channel-config-interaction');
const cron = require('cron-validate');
const startSchedule = require('../../utils/start-schedule')
const stopSchedule = require('../../utils/stop-schedule')
const startWriteinSchedule = require('../../utils/start-writein-schedule')
const stopWriteinSchedule = require('../../utils/stop-writein-schedule')
const Reminder = require('../../models/reminder')
const nodeEmoji = require('node-emoji')

/**
 * Helper to load all WriteinConfigs for a channel and build the UI
 */
async function buildUI(channelConfig, writeinConfig) {
    const writeinConfigs = await WriteinConfig.find({ channelConfigId: channelConfig._id });
    return channelConfigInteraction(channelConfig, writeinConfig || null, writeinConfigs);
}

/**
 *
 * @param {Interaction} interaction
 */
module.exports = async (interaction, client, handler) => {
    if (!interaction.customId) return;

    try {
        const parts = interaction.customId.split('.');
        const [type, channelId] = parts;

        if (!type || !channelId) return;
        if (type !== 'config') return;

        // Parse customId: detect wi_ prefix for write-in actions
        let writeinId = null, action, subaction;

        if (parts[2]?.startsWith('wi_')) {
            writeinId = parts[2].substring(3);
            action = parts[3];
            subaction = parts[4];
        } else {
            action = parts[2];
            subaction = parts[3];
        }

        if (!action) return;

        let channelConfig = await ChannelConfig.findOne({ channelId: channelId });
        const configureMessage = await interaction.channel.messages.fetch(channelConfig.configureMessageId);

        // Load writeinConfig if we have a writeinId
        let writeinConfig = null;
        if (writeinId) {
            writeinConfig = await WriteinConfig.findById(writeinId);
        }

        // --- EXIT ---
        if (action === actions.EXIT) {
            const embedUpdate = new EmbedBuilder()
                .setTitle(`You have finished configuring <#${channelId}>`);
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

        // --- COMBINED SELECTOR (configSelect) ---
        if (action === actions.CONFIG_SELECT) {
            const selected = interaction.values[0];

            if (selected === 'type_daily') {
                channelConfig.type = 'daily';
                await channelConfig.save();
                const updatedUI = await buildUI(channelConfig, null);
                await interaction.update(updatedUI);
                return;
            }

            if (selected === 'type_writein') {
                channelConfig.type = 'writein';
                await channelConfig.save();
                const updatedUI = await buildUI(channelConfig, null);
                await interaction.update(updatedUI);
                return;
            }

            if (selected === 'create_writein') {
                channelConfig.type = 'writein';
                await channelConfig.save();
                const newWritein = await WriteinConfig.create({
                    channelConfigId: channelConfig._id
                });
                const updatedUI = await buildUI(channelConfig, newWritein);
                await interaction.update(updatedUI);
                return;
            }

            if (selected.startsWith('wi_')) {
                channelConfig.type = 'writein';
                await channelConfig.save();
                const selectedWritein = await WriteinConfig.findById(selected.substring(3));
                const updatedUI = await buildUI(channelConfig, selectedWritein);
                await interaction.update(updatedUI);
                return;
            }
        }

        // --- DAILY CONFIG ACTIONS (no writeinId) ---

        if (action === actions.PIN_POST) {
            channelConfig.pinPost = subaction === 'true';
        }

        if (action === actions.PIN_MAX_NUM) {
            if (subaction === 'input') {
                const pinMaxNum = interaction.fields.getTextInputValue('pinMaxNumInput');
                if (isNaN(pinMaxNum)) {
                    interaction.reply({ content: 'You did not input a number >:[', ephemeral: true });
                    return;
                }
                if (pinMaxNum < 1 || pinMaxNum > 50) {
                    interaction.reply({ content: 'Number must be between 1 and 50 inclusive!! >:[', ephemeral: true });
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
                        interaction.reply({ content: 'Invalid cron format >:[', ephemeral: true });
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
                        interaction.reply({ content: 'Invalid time format >:[', ephemeral: true });
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
                    interaction.reply({ content: 'The template needs to contain <MSG> >:[', ephemeral: true });
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
                    interaction.reply({ content: 'You did not input a number >:[', ephemeral: true });
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

        // --- DAILY ENABLE/DISABLE (no writeinId) ---
        if (!writeinId && action === actions.ENABLE) {
            await startSchedule(client, channelConfig);
            channelConfig.active = true;
        }

        if (!writeinId && action === actions.DISABLE) {
            stopSchedule(channelConfig);
            channelConfig.active = false;
        }

        // --- WRITE-IN ACTIONS (have writeinId) ---

        if (writeinId && action === actions.ENABLE) {
            await startWriteinSchedule(client, writeinConfig, channelConfig);
            writeinConfig.active = true;
            await writeinConfig.save();
        }

        if (writeinId && action === actions.DISABLE) {
            await stopWriteinSchedule(writeinConfig, channelConfig);
            writeinConfig.active = false;
            await writeinConfig.save();
        }

        if (writeinId && action === actions.DELETE_WRITEIN) {
            if (writeinConfig.active) {
                await stopWriteinSchedule(writeinConfig, channelConfig);
            }
            await Reminder.deleteMany({ writeinConfigId: writeinConfig._id });
            await WriteinConfig.findByIdAndDelete(writeinConfig._id);

            const updatedUI = await buildUI(channelConfig, null);
            await interaction.update(updatedUI);
            return;
        }

        // Handle write-in day
        if (writeinId && action === actions.WRITEIN_DAY) {
            if (subaction === 'input') {
                const day = interaction.fields.getTextInputValue('writeinDayInput');
                const validDays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                const normalizedDay = day.toLowerCase().trim();
                if (!validDays.includes(normalizedDay)) {
                    interaction.reply({ content: 'Invalid day. Please enter a day of the week (e.g., Monday, Tuesday)', ephemeral: true });
                    return;
                }
                writeinConfig.writeinDay = normalizedDay.charAt(0).toUpperCase() + normalizedDay.slice(1);
            } else {
                const wiPrefix = `config.${channelId}.wi_${writeinId}`;
                const modal = new ModalBuilder()
                    .setCustomId(`${wiPrefix}.${actions.WRITEIN_DAY}.input`)
                    .setTitle('Edit Write-In Day');
                const dayInput = new TextInputBuilder()
                    .setCustomId('writeinDayInput')
                    .setLabel('Set the day of the week')
                    .setPlaceholder('e.g., Monday, Tuesday, Wednesday')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);
                const row = new ActionRowBuilder().addComponents(dayInput);
                modal.addComponents(row);
                await interaction.showModal(modal);
                return;
            }
        }

        // Handle write-in time
        if (writeinId && action === actions.WRITEIN_TIME) {
            if (subaction === 'input') {
                const timeString = interaction.fields.getTextInputValue('writeinTimeInput');
                const regex = new RegExp(/^(?:\d|[01]\d|2[0-3]):[0-5]\d$/);
                if (!regex.test(timeString)) {
                    interaction.reply({ content: 'Invalid time format. Please use 24-hour format (e.g., 18:30)', ephemeral: true });
                    return;
                }
                writeinConfig.writeinTime = timeString;
            } else {
                const wiPrefix = `config.${channelId}.wi_${writeinId}`;
                const modal = new ModalBuilder()
                    .setCustomId(`${wiPrefix}.${actions.WRITEIN_TIME}.input`)
                    .setTitle('Edit Write-In Time');
                const timeInput = new TextInputBuilder()
                    .setCustomId('writeinTimeInput')
                    .setLabel('Set the write-in event time')
                    .setPlaceholder('Use 24-hour format (e.g., 18:30)')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);
                const row = new ActionRowBuilder().addComponents(timeInput);
                modal.addComponents(row);
                await interaction.showModal(modal);
                return;
            }
        }

        // Handle write-in timezone
        if (writeinId && action === actions.WRITEIN_TIMEZONE) {
            if (subaction === 'input') {
                const timezone = interaction.fields.getTextInputValue('writeinTimezoneInput');
                writeinConfig.writeinTimezone = timezone;
            } else {
                const wiPrefix = `config.${channelId}.wi_${writeinId}`;
                const modal = new ModalBuilder()
                    .setCustomId(`${wiPrefix}.${actions.WRITEIN_TIMEZONE}.input`)
                    .setTitle('Edit Write-In Timezone');
                const timezoneInput = new TextInputBuilder()
                    .setCustomId('writeinTimezoneInput')
                    .setLabel('Set the timezone')
                    .setPlaceholder('e.g., America/New_York, Europe/London')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);
                const row = new ActionRowBuilder().addComponents(timezoneInput);
                modal.addComponents(row);
                await interaction.showModal(modal);
                return;
            }
        }

        // Handle write-in host (commented out for future update)
        // if (writeinId && action === actions.WRITEIN_HOST) {
        //     if (subaction === 'input') {
        //         const host = interaction.fields.getTextInputValue('writeinHostInput');
        //         writeinConfig.writeinHost = host || null;
        //     } else {
        //         const wiPrefix = `config.${channelId}.wi_${writeinId}`;
        //         const modal = new ModalBuilder()
        //             .setCustomId(`${wiPrefix}.${actions.WRITEIN_HOST}.input`)
        //             .setTitle('Edit Write-In Host');
        //         const hostInput = new TextInputBuilder()
        //             .setCustomId('writeinHostInput')
        //             .setLabel('Set the host (optional)')
        //             .setPlaceholder('Enter host name or leave blank')
        //             .setStyle(TextInputStyle.Short)
        //             .setRequired(false);
        //         const row = new ActionRowBuilder().addComponents(hostInput);
        //         modal.addComponents(row);
        //         await interaction.showModal(modal);
        //         return;
        //     }
        // }

        // Handle write-in emoji
        if (writeinId && action === actions.WRITEIN_EMOJI) {
            if (subaction === 'input') {
                const emojiInput = interaction.fields.getTextInputValue('writeinEmojiInput');
                if (emojiInput) {
                    const emojiText = emojiInput.trim();
                    const colonMatch = emojiText.match(/^:(\w+):$/);
                    if (!colonMatch) {
                        interaction.reply({ content: 'Please use :emoji: format (e.g. :tada:)', ephemeral: true });
                        return;
                    }
                    const emojiName = colonMatch[1];
                    const guildEmoji = interaction.guild.emojis.cache.find(e => e.name === emojiName);
                    let resolvedEmoji;
                    if (guildEmoji) {
                        resolvedEmoji = guildEmoji.toString();
                    } else {
                        const unicodeEmoji = nodeEmoji.get(emojiText);
                        if (unicodeEmoji && unicodeEmoji !== emojiText) {
                            resolvedEmoji = unicodeEmoji;
                        } else {
                            interaction.reply({ content: `Could not find an emoji named "${emojiName}"`, ephemeral: true });
                            return;
                        }
                    }
                    writeinConfig.writeinEmoji = resolvedEmoji;
                    writeinConfig.writeinEmojiText = emojiText;
                } else {
                    writeinConfig.writeinEmoji = null;
                    writeinConfig.writeinEmojiText = null;
                }
            } else {
                const wiPrefix = `config.${channelId}.wi_${writeinId}`;
                const modal = new ModalBuilder()
                    .setCustomId(`${wiPrefix}.${actions.WRITEIN_EMOJI}.input`)
                    .setTitle('Edit Write-In Emoji');
                const emojiInput = new TextInputBuilder()
                    .setCustomId('writeinEmojiInput')
                    .setLabel('Set the emoji (optional)')
                    .setPlaceholder('e.g. :tada:')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false);
                const row = new ActionRowBuilder().addComponents(emojiInput);
                modal.addComponents(row);
                await interaction.showModal(modal);
                return;
            }
        }

        // --- CHANNEL-LEVEL REMINDER TEMPLATE/TIME (no writeinId) ---

        // Channel-level first reminder template
        if (!writeinId && action === actions.FIRST_REMINDER_TEMPLATE) {
            if (subaction === 'input') {
                const template = interaction.fields.getTextInputValue('firstTemplateInput');
                channelConfig.firstReminderTemplate = template;
            } else {
                const modal = new ModalBuilder()
                    .setCustomId(`config.${channelId}.${actions.FIRST_REMINDER_TEMPLATE}.input`)
                    .setTitle('Edit First Reminder Template');
                const templateInput = new TextInputBuilder()
                    .setCustomId('firstTemplateInput')
                    .setLabel('Set the first reminder template')
                    .setPlaceholder('Variables: <TIME>, <EMOJI>, <PING>, <CUSTOM>, <DAY>')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true);
                const row = new ActionRowBuilder().addComponents(templateInput);
                modal.addComponents(row);
                await interaction.showModal(modal);
                return;
            }
        }

        // Channel-level first reminder time
        if (!writeinId && action === actions.FIRST_REMINDER_TIME) {
            if (subaction === 'input') {
                const minutes = interaction.fields.getTextInputValue('firstTimeInput');
                if (isNaN(minutes) || minutes < 0) {
                    interaction.reply({ content: 'Please enter a valid number of minutes (0 or greater)', ephemeral: true });
                    return;
                }
                channelConfig.firstReminderTime = minutes;
            } else {
                const modal = new ModalBuilder()
                    .setCustomId(`config.${channelId}.${actions.FIRST_REMINDER_TIME}.input`)
                    .setTitle('Edit Default First Reminder Time');
                const timeInput = new TextInputBuilder()
                    .setCustomId('firstTimeInput')
                    .setLabel('Default minutes before write-in')
                    .setPlaceholder('e.g., 60 for 1 hour before')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);
                const row = new ActionRowBuilder().addComponents(timeInput);
                modal.addComponents(row);
                await interaction.showModal(modal);
                return;
            }
        }

        // Channel-level second reminder template
        if (!writeinId && action === actions.SECOND_REMINDER_TEMPLATE) {
            if (subaction === 'input') {
                const template = interaction.fields.getTextInputValue('secondTemplateInput');
                channelConfig.secondReminderTemplate = template;
            } else {
                const modal = new ModalBuilder()
                    .setCustomId(`config.${channelId}.${actions.SECOND_REMINDER_TEMPLATE}.input`)
                    .setTitle('Edit Second Reminder Template');
                const templateInput = new TextInputBuilder()
                    .setCustomId('secondTemplateInput')
                    .setLabel('Set the second reminder template')
                    .setPlaceholder('Variables: <TIME>, <EMOJI>, <PING>, <CUSTOM>, <DAY>')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true);
                const row = new ActionRowBuilder().addComponents(templateInput);
                modal.addComponents(row);
                await interaction.showModal(modal);
                return;
            }
        }

        // Channel-level second reminder time
        if (!writeinId && action === actions.SECOND_REMINDER_TIME) {
            if (subaction === 'input') {
                const minutes = interaction.fields.getTextInputValue('secondTimeInput');
                if (isNaN(minutes) || minutes < 0) {
                    interaction.reply({ content: 'Please enter a valid number of minutes (0 or greater)', ephemeral: true });
                    return;
                }
                channelConfig.secondReminderTime = minutes;
            } else {
                const modal = new ModalBuilder()
                    .setCustomId(`config.${channelId}.${actions.SECOND_REMINDER_TIME}.input`)
                    .setTitle('Edit Default Second Reminder Time');
                const timeInput = new TextInputBuilder()
                    .setCustomId('secondTimeInput')
                    .setLabel('Default minutes before write-in')
                    .setPlaceholder('e.g., 30 for 30 minutes before')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);
                const row = new ActionRowBuilder().addComponents(timeInput);
                modal.addComponents(row);
                await interaction.showModal(modal);
                return;
            }
        }

        // Channel-level third reminder template (optional)
        if (!writeinId && action === actions.THIRD_REMINDER_TEMPLATE) {
            if (subaction === 'input') {
                const template = interaction.fields.getTextInputValue('thirdTemplateInput');
                channelConfig.thirdReminderTemplate = template || null;
            } else {
                const modal = new ModalBuilder()
                    .setCustomId(`config.${channelId}.${actions.THIRD_REMINDER_TEMPLATE}.input`)
                    .setTitle('Edit Third Reminder Template');
                const templateInput = new TextInputBuilder()
                    .setCustomId('thirdTemplateInput')
                    .setLabel('Set the third reminder template')
                    .setPlaceholder('Variables: <TIME>, <EMOJI>, <PING>, <CUSTOM>, <DAY>')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(false);
                const row = new ActionRowBuilder().addComponents(templateInput);
                modal.addComponents(row);
                await interaction.showModal(modal);
                return;
            }
        }

        // Channel-level third reminder time (optional)
        if (!writeinId && action === actions.THIRD_REMINDER_TIME) {
            if (subaction === 'input') {
                const minutes = interaction.fields.getTextInputValue('thirdTimeInput');
                if (minutes && (isNaN(minutes) || minutes < 0)) {
                    interaction.reply({ content: 'Please enter a valid number of minutes (0 or greater)', ephemeral: true });
                    return;
                }
                channelConfig.thirdReminderTime = minutes || null;
            } else {
                const modal = new ModalBuilder()
                    .setCustomId(`config.${channelId}.${actions.THIRD_REMINDER_TIME}.input`)
                    .setTitle('Edit Default Third Reminder Time');
                const timeInput = new TextInputBuilder()
                    .setCustomId('thirdTimeInput')
                    .setLabel('Default minutes before write-in')
                    .setPlaceholder('e.g., 5 for 5 minutes before')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false);
                const row = new ActionRowBuilder().addComponents(timeInput);
                modal.addComponents(row);
                await interaction.showModal(modal);
                return;
            }
        }

        // --- WRITE-IN CUSTOM TEXT (with writeinId) ---

        // Handle first reminder custom text
        if (writeinId && action === actions.FIRST_REMINDER_CUSTOM) {
            if (subaction === 'input') {
                const custom = interaction.fields.getTextInputValue('firstCustomInput');
                writeinConfig.firstReminderCustom = custom || null;
            } else {
                const wiPrefix = `config.${channelId}.wi_${writeinId}`;
                const modal = new ModalBuilder()
                    .setCustomId(`${wiPrefix}.${actions.FIRST_REMINDER_CUSTOM}.input`)
                    .setTitle('Edit First Reminder Custom Text');
                const customInput = new TextInputBuilder()
                    .setCustomId('firstCustomInput')
                    .setLabel('Custom text for first reminder (optional)')
                    .setPlaceholder('This replaces <CUSTOM> in the channel template')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(false);
                const row = new ActionRowBuilder().addComponents(customInput);
                modal.addComponents(row);
                await interaction.showModal(modal);
                return;
            }
        }

        // Handle second reminder custom text
        if (writeinId && action === actions.SECOND_REMINDER_CUSTOM) {
            if (subaction === 'input') {
                const custom = interaction.fields.getTextInputValue('secondCustomInput');
                writeinConfig.secondReminderCustom = custom || null;
            } else {
                const wiPrefix = `config.${channelId}.wi_${writeinId}`;
                const modal = new ModalBuilder()
                    .setCustomId(`${wiPrefix}.${actions.SECOND_REMINDER_CUSTOM}.input`)
                    .setTitle('Edit Second Reminder Custom Text');
                const customInput = new TextInputBuilder()
                    .setCustomId('secondCustomInput')
                    .setLabel('Custom text for second reminder (optional)')
                    .setPlaceholder('This replaces <CUSTOM> in the channel template')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(false);
                const row = new ActionRowBuilder().addComponents(customInput);
                modal.addComponents(row);
                await interaction.showModal(modal);
                return;
            }
        }

        // Handle third reminder custom text
        if (writeinId && action === actions.THIRD_REMINDER_CUSTOM) {
            if (subaction === 'input') {
                const custom = interaction.fields.getTextInputValue('thirdCustomInput');
                writeinConfig.thirdReminderCustom = custom || null;
            } else {
                const wiPrefix = `config.${channelId}.wi_${writeinId}`;
                const modal = new ModalBuilder()
                    .setCustomId(`${wiPrefix}.${actions.THIRD_REMINDER_CUSTOM}.input`)
                    .setTitle('Edit Third Reminder Custom Text');
                const customInput = new TextInputBuilder()
                    .setCustomId('thirdCustomInput')
                    .setLabel('Custom text for third reminder (optional)')
                    .setPlaceholder('This replaces <CUSTOM> in the channel template')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(false);
                const row = new ActionRowBuilder().addComponents(customInput);
                modal.addComponents(row);
                await interaction.showModal(modal);
                return;
            }
        }

        // Handle first reminder time override (write-in level, optional)
        if (writeinId && action === actions.FIRST_REMINDER_TIME) {
            if (subaction === 'input') {
                const minutes = interaction.fields.getTextInputValue('firstTimeInput');
                if (minutes && (isNaN(minutes) || minutes < 0)) {
                    interaction.reply({ content: 'Please enter a valid number of minutes (0 or greater), or leave blank for channel default', ephemeral: true });
                    return;
                }
                writeinConfig.firstReminderTime = minutes || null;
            } else {
                const wiPrefix = `config.${channelId}.wi_${writeinId}`;
                const modal = new ModalBuilder()
                    .setCustomId(`${wiPrefix}.${actions.FIRST_REMINDER_TIME}.input`)
                    .setTitle('Override First Reminder Time');
                const timeInput = new TextInputBuilder()
                    .setCustomId('firstTimeInput')
                    .setLabel('Minutes before (blank = default)')
                    .setPlaceholder('e.g., 60 (leave blank to use channel default)')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false);
                const row = new ActionRowBuilder().addComponents(timeInput);
                modal.addComponents(row);
                await interaction.showModal(modal);
                return;
            }
        }

        // Handle second reminder time override (write-in level, optional)
        if (writeinId && action === actions.SECOND_REMINDER_TIME) {
            if (subaction === 'input') {
                const minutes = interaction.fields.getTextInputValue('secondTimeInput');
                if (minutes && (isNaN(minutes) || minutes < 0)) {
                    interaction.reply({ content: 'Please enter a valid number of minutes (0 or greater), or leave blank for channel default', ephemeral: true });
                    return;
                }
                writeinConfig.secondReminderTime = minutes || null;
            } else {
                const wiPrefix = `config.${channelId}.wi_${writeinId}`;
                const modal = new ModalBuilder()
                    .setCustomId(`${wiPrefix}.${actions.SECOND_REMINDER_TIME}.input`)
                    .setTitle('Override Second Reminder Time');
                const timeInput = new TextInputBuilder()
                    .setCustomId('secondTimeInput')
                    .setLabel('Minutes before (blank = default)')
                    .setPlaceholder('e.g., 30 (leave blank to use channel default)')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false);
                const row = new ActionRowBuilder().addComponents(timeInput);
                modal.addComponents(row);
                await interaction.showModal(modal);
                return;
            }
        }

        // Handle third reminder time override (write-in level, optional)
        if (writeinId && action === actions.THIRD_REMINDER_TIME) {
            if (subaction === 'input') {
                const minutes = interaction.fields.getTextInputValue('thirdTimeInput');
                if (minutes && (isNaN(minutes) || minutes < 0)) {
                    interaction.reply({ content: 'Please enter a valid number of minutes (0 or greater), or leave blank for channel default', ephemeral: true });
                    return;
                }
                writeinConfig.thirdReminderTime = minutes || null;
            } else {
                const wiPrefix = `config.${channelId}.wi_${writeinId}`;
                const modal = new ModalBuilder()
                    .setCustomId(`${wiPrefix}.${actions.THIRD_REMINDER_TIME}.input`)
                    .setTitle('Override Third Reminder Time');
                const timeInput = new TextInputBuilder()
                    .setCustomId('thirdTimeInput')
                    .setLabel('Minutes before (blank = default)')
                    .setPlaceholder('e.g., 5 (leave blank to use channel default)')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false);
                const row = new ActionRowBuilder().addComponents(timeInput);
                modal.addComponents(row);
                await interaction.showModal(modal);
                return;
            }
        }

        // Reschedule writein reminders if write-in config fields changed while active
        if (writeinId && writeinConfig) {
            const writeinActions = [
                actions.WRITEIN_DAY, actions.WRITEIN_TIME, actions.WRITEIN_TIMEZONE,
                actions.WRITEIN_EMOJI, actions.FIRST_REMINDER_CUSTOM, actions.FIRST_REMINDER_TIME,
                actions.SECOND_REMINDER_CUSTOM, actions.SECOND_REMINDER_TIME,
                actions.THIRD_REMINDER_CUSTOM, actions.THIRD_REMINDER_TIME
            ];
            if (writeinConfig.active && writeinActions.includes(action)) {
                await stopWriteinSchedule(writeinConfig, channelConfig);
                await startWriteinSchedule(client, writeinConfig, channelConfig);
            }
            await writeinConfig.save();
        }

        // If channel-level reminder settings changed, reschedule all active write-ins
        const channelReminderActions = [
            actions.FIRST_REMINDER_TEMPLATE, actions.FIRST_REMINDER_TIME,
            actions.SECOND_REMINDER_TEMPLATE, actions.SECOND_REMINDER_TIME,
            actions.THIRD_REMINDER_TEMPLATE, actions.THIRD_REMINDER_TIME
        ];
        if (!writeinId && channelReminderActions.includes(action)) {
            const activeWriteins = await WriteinConfig.find({ channelConfigId: channelConfig._id, active: true });
            for (const wi of activeWriteins) {
                await stopWriteinSchedule(wi, channelConfig);
                await startWriteinSchedule(client, wi, channelConfig);
            }
        }

        // Save channelConfig (for daily actions or type changes)
        channelConfig = await channelConfig.save();

        // Update the same message instead of creating a new one
        const updatedUI = await buildUI(channelConfig, writeinConfig);

        if (subaction === 'input') {
            await interaction.deferUpdate();
            await configureMessage.edit(updatedUI);
        } else {
            await interaction.update(updatedUI);
        }

    } catch (error) {
        console.log(`Error in handleConfig.js: ${error}`)
    }

}
