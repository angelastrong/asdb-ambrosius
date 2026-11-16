const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder } = require('discord.js');
const { channelConfigured, writeinConfigured, writeinChannelConfigured } = require('../utils/channel-configured');
const actions = require('../constants/actions')
const constants = require('../constants/default')

/**
 * Build the config UI for a channel.
 * @param {Object} channelConfig - The ChannelConfig document
 * @param {Object} [writeinConfig] - The selected WriteinConfig (if editing a write-in)
 * @param {Array} [writeinConfigs] - All WriteinConfigs for this channel
 */
function channelConfigInteraction(channelConfig, writeinConfig, writeinConfigs = []) {
    const channelId = channelConfig.channelId;
    const isWriteIn = channelConfig.type === 'writein';

    let channelConfigEmbed = new EmbedBuilder()
        .setTitle(`Configuration for <#${channelId}>`);

    // Build combined selector options
    const selectorOptions = [
        {
            label: 'Daily Posts',
            description: 'Schedule recurring daily message posts',
            value: 'type_daily',
            default: !isWriteIn
        },
        {
            label: 'Write-In Settings',
            description: 'Channel-level reminder templates and defaults',
            value: 'type_writein',
            default: isWriteIn && !writeinConfig
        },
    ];

    // Add existing write-in configs to selector
    for (const wi of writeinConfigs) {
        const label = [wi.writeinDay, wi.writeinTime].filter(Boolean).join(' ') || 'New Write-In';
        selectorOptions.push({
            label: `${label}${wi.active ? ' ✅' : ''}`,
            description: wi.writeinTimezone || 'Not fully configured',
            value: `wi_${wi._id}`,
            default: !!(isWriteIn && writeinConfig && wi._id.toString() === writeinConfig._id.toString())
        });
    }

    // Add "Create New Write-In" option (max 25 options in a select menu)
    if (selectorOptions.length < 25) {
        selectorOptions.push({
            label: '➕ Create New Write-In',
            description: 'Add a new write-in event for this channel',
            value: 'create_writein'
        });
    }

    const combinedSelector = new StringSelectMenuBuilder()
        .setCustomId(`config.${channelId}.${actions.CONFIG_SELECT}`)
        .setPlaceholder('Select configuration type')
        .addOptions(selectorOptions);

    const selectorRow = new ActionRowBuilder().addComponents(combinedSelector);

    let rows;

    if (isWriteIn && writeinConfig) {
        // A specific write-in is selected — show its settings
        const effectiveFirstTime = writeinConfig.firstReminderTime || channelConfig.firstReminderTime;
        const effectiveSecondTime = writeinConfig.secondReminderTime || channelConfig.secondReminderTime;
        const effectiveThirdTime = writeinConfig.thirdReminderTime || channelConfig.thirdReminderTime;
        const firstTimeIsDefault = !writeinConfig.firstReminderTime && !!channelConfig.firstReminderTime;
        const secondTimeIsDefault = !writeinConfig.secondReminderTime && !!channelConfig.secondReminderTime;
        const thirdTimeIsDefault = !writeinConfig.thirdReminderTime && !!channelConfig.thirdReminderTime;

        channelConfigEmbed.addFields(
            { name: 'Type', value: 'Write-In Reminders' },
            { name: 'Day', value: writeinConfig.writeinDay || 'not configured' },
            { name: 'Time', value: writeinConfig.writeinTime || 'not configured' },
            { name: 'Timezone', value: writeinConfig.writeinTimezone || 'not configured' },
            // { name: 'Host', value: writeinConfig.writeinHost || 'not configured (optional)' },
            { name: 'Emoji', value: writeinConfig.writeinEmojiText || 'not configured (optional)' },
            { name: '1st Reminder Custom', value: writeinConfig.firstReminderCustom || 'not configured (optional)' },
            { name: '1st Reminder Time', value: effectiveFirstTime ? `${effectiveFirstTime} minutes before${firstTimeIsDefault ? ' (default)' : ''}` : 'not configured (set channel default)' },
            { name: '2nd Reminder Custom', value: writeinConfig.secondReminderCustom || 'not configured (optional)' },
            { name: '2nd Reminder Time', value: effectiveSecondTime ? `${effectiveSecondTime} minutes before${secondTimeIsDefault ? ' (default)' : ''}` : 'not configured (set channel default)' },
            { name: '3rd Reminder Custom', value: writeinConfig.thirdReminderCustom || 'not configured (optional)' },
            { name: '3rd Reminder Time', value: effectiveThirdTime ? `${effectiveThirdTime} minutes before${thirdTimeIsDefault ? ' (default)' : ''}` : 'not configured (optional)' },
            { name: 'Scheduler', value: writeinConfig.active ? 'ENABLED' : 'DISABLED' },
            { name: 'Instruction', value: 'Use menu and buttons below to edit settings.' }
        );

        const wiPrefix = `config.${channelId}.wi_${writeinConfig._id}`;

        // Row 1: Event Settings
        const dayButton = new ButtonBuilder()
            .setCustomId(`${wiPrefix}.${actions.WRITEIN_DAY}`)
            .setLabel('Day')
            .setStyle(ButtonStyle.Primary);
        const timeButton = new ButtonBuilder()
            .setCustomId(`${wiPrefix}.${actions.WRITEIN_TIME}`)
            .setLabel('Time')
            .setStyle(ButtonStyle.Primary);
        const timezoneButton = new ButtonBuilder()
            .setCustomId(`${wiPrefix}.${actions.WRITEIN_TIMEZONE}`)
            .setLabel('Timezone')
            .setStyle(ButtonStyle.Primary);
        const emojiButton = new ButtonBuilder()
            .setCustomId(`${wiPrefix}.${actions.WRITEIN_EMOJI}`)
            .setLabel('Emoji')
            .setStyle(ButtonStyle.Primary);

        const eventRow = new ActionRowBuilder().addComponents(dayButton, timeButton, timezoneButton, emojiButton);

        // Row 2: Reminder custom text buttons
        const firstCustomButton = new ButtonBuilder()
            .setCustomId(`${wiPrefix}.${actions.FIRST_REMINDER_CUSTOM}`)
            .setLabel('1st Custom')
            .setStyle(ButtonStyle.Primary);
        const secondCustomButton = new ButtonBuilder()
            .setCustomId(`${wiPrefix}.${actions.SECOND_REMINDER_CUSTOM}`)
            .setLabel('2nd Custom')
            .setStyle(ButtonStyle.Primary);
        const thirdCustomButton = new ButtonBuilder()
            .setCustomId(`${wiPrefix}.${actions.THIRD_REMINDER_CUSTOM}`)
            .setLabel('3rd Custom')
            .setStyle(ButtonStyle.Primary);

        const customRow = new ActionRowBuilder().addComponents(firstCustomButton, secondCustomButton, thirdCustomButton);

        // Row 3: Reminder time override buttons
        const firstTimeButton = new ButtonBuilder()
            .setCustomId(`${wiPrefix}.${actions.FIRST_REMINDER_TIME}`)
            .setLabel('1st Time Override')
            .setStyle(ButtonStyle.Primary);
        const secondTimeButton = new ButtonBuilder()
            .setCustomId(`${wiPrefix}.${actions.SECOND_REMINDER_TIME}`)
            .setLabel('2nd Time Override')
            .setStyle(ButtonStyle.Primary);
        const thirdTimeButton = new ButtonBuilder()
            .setCustomId(`${wiPrefix}.${actions.THIRD_REMINDER_TIME}`)
            .setLabel('3rd Time Override')
            .setStyle(ButtonStyle.Primary);

        const timeRow = new ActionRowBuilder().addComponents(firstTimeButton, secondTimeButton, thirdTimeButton);

        // Row 4: Enable/Disable, Delete, Exit
        const canEnable = writeinConfigured(writeinConfig) && writeinChannelConfigured(channelConfig);
        const enableButton = new ButtonBuilder()
            .setCustomId(`${wiPrefix}.${actions.ENABLE}`)
            .setLabel('Enable')
            .setStyle(ButtonStyle.Success)
            .setDisabled(!canEnable);
        const disableButton = new ButtonBuilder()
            .setCustomId(`${wiPrefix}.${actions.DISABLE}`)
            .setLabel('Disable')
            .setStyle(ButtonStyle.Danger);
        const changeStatusButton = writeinConfig.active ? disableButton : enableButton;

        const deleteButton = new ButtonBuilder()
            .setCustomId(`${wiPrefix}.${actions.DELETE_WRITEIN}`)
            .setLabel('Delete')
            .setStyle(ButtonStyle.Danger);
        const exitButton = new ButtonBuilder()
            .setCustomId(`config.${channelId}.${actions.EXIT}`)
            .setLabel('Exit')
            .setStyle(ButtonStyle.Secondary);

        if (!canEnable && !writeinConfig.active) {
            let enableMsg = 'All required fields must be configured before scheduler can be enabled.';
            if (!writeinChannelConfigured(channelConfig)) {
                enableMsg += ' Set channel-level reminder template and time first (go back to the write-in overview).';
            }
            channelConfigEmbed.addFields({ name: 'To Enable', value: enableMsg });
        }

        const statusRow = new ActionRowBuilder().addComponents(changeStatusButton, deleteButton, exitButton);

        rows = [selectorRow, eventRow, customRow, timeRow, statusRow];

    } else if (isWriteIn && !writeinConfig) {
        // Write-in type but no specific write-in selected — show channel-level defaults + summary
        channelConfigEmbed.addFields(
            { name: 'Type', value: 'Write-In Reminders' },
            { name: '1st Reminder Template', value: channelConfig.firstReminderTemplate || 'not configured' },
            { name: '1st Reminder Time (default)', value: channelConfig.firstReminderTime ? `${channelConfig.firstReminderTime} minutes before` : 'not configured' },
            { name: '2nd Reminder Template', value: channelConfig.secondReminderTemplate || 'not configured' },
            { name: '2nd Reminder Time (default)', value: channelConfig.secondReminderTime ? `${channelConfig.secondReminderTime} minutes before` : 'not configured' },
            { name: '3rd Reminder Template', value: channelConfig.thirdReminderTemplate || 'not configured (optional)' },
            { name: '3rd Reminder Time (default)', value: channelConfig.thirdReminderTime ? `${channelConfig.thirdReminderTime} minutes before` : 'not configured (optional)' },
        );

        if (writeinConfigs.length === 0) {
            channelConfigEmbed.addFields(
                { name: 'Write-Ins', value: 'No write-ins configured yet. Use the dropdown to create one.' }
            );
        } else {
            for (const wi of writeinConfigs) {
                const label = [wi.writeinDay, wi.writeinTime, wi.writeinTimezone].filter(Boolean).join(' ') || 'Not configured';
                channelConfigEmbed.addFields(
                    { name: `${wi.active ? '✅' : '⬛'} ${wi.writeinDay || 'New Write-In'}`, value: label }
                );
            }
        }

        channelConfigEmbed.addFields(
            { name: 'Instruction', value: 'Configure channel-level templates below. Select a write-in from the dropdown to edit it, or create a new one.' }
        );

        // Row 1: Channel-level first reminder
        const firstTemplateBtn = new ButtonBuilder()
            .setCustomId(`config.${channelId}.${actions.FIRST_REMINDER_TEMPLATE}`)
            .setLabel('1st Reminder Template')
            .setStyle(ButtonStyle.Primary);
        const firstTimeBtn = new ButtonBuilder()
            .setCustomId(`config.${channelId}.${actions.FIRST_REMINDER_TIME}`)
            .setLabel('1st Reminder Time')
            .setStyle(ButtonStyle.Primary);

        const channelReminderRow1 = new ActionRowBuilder().addComponents(firstTemplateBtn, firstTimeBtn);

        // Row 2: Channel-level second reminder
        const secondTemplateBtn = new ButtonBuilder()
            .setCustomId(`config.${channelId}.${actions.SECOND_REMINDER_TEMPLATE}`)
            .setLabel('2nd Reminder Template')
            .setStyle(ButtonStyle.Primary);
        const secondTimeBtn = new ButtonBuilder()
            .setCustomId(`config.${channelId}.${actions.SECOND_REMINDER_TIME}`)
            .setLabel('2nd Reminder Time')
            .setStyle(ButtonStyle.Primary);

        const channelReminderRow2 = new ActionRowBuilder().addComponents(secondTemplateBtn, secondTimeBtn);

        // Row 3: Channel-level third reminder (optional)
        const thirdTemplateBtn = new ButtonBuilder()
            .setCustomId(`config.${channelId}.${actions.THIRD_REMINDER_TEMPLATE}`)
            .setLabel('3rd Reminder Template')
            .setStyle(ButtonStyle.Primary);
        const thirdTimeBtn = new ButtonBuilder()
            .setCustomId(`config.${channelId}.${actions.THIRD_REMINDER_TIME}`)
            .setLabel('3rd Reminder Time')
            .setStyle(ButtonStyle.Primary);
        const exitButton = new ButtonBuilder()
            .setCustomId(`config.${channelId}.${actions.EXIT}`)
            .setLabel('Exit')
            .setStyle(ButtonStyle.Secondary);

        const channelReminderRow3 = new ActionRowBuilder().addComponents(thirdTemplateBtn, thirdTimeBtn, exitButton);

        rows = [selectorRow, channelReminderRow1, channelReminderRow2, channelReminderRow3];

    } else {
        // Daily post view (existing behavior)
        let schedule;
        if (channelConfig.cron) {
            schedule = `Cron: \`${channelConfig.cron}\``;
        } else if (channelConfig.dailyPostTime) {
            schedule = `Daily Post Time: \`${channelConfig.dailyPostTime}\``;
        }

        channelConfigEmbed.addFields(
            { name: 'Type', value: 'Daily Posts' },
            { name: 'Schedule', value: schedule || 'not configured' },
            { name: 'Message Template', value: channelConfig.template || 'not configured' },
            { name: 'Repeat Post Min Time Interval', value: channelConfig.postIntervalDays ? `${channelConfig.postIntervalDays} days` : 'not configured' },
            { name: 'Pin Post', value: channelConfig.pinPost ? 'TRUE: Message will be pinned after posting' : 'FALSE: Message will not be pinned after posting.' },
            { name: 'Max Number of Pinned Posts', value: `${channelConfig.pinnedPostsNumMax || constants.MAX_PINNED_POSTS}` },
            { name: 'Scheduler', value: channelConfig.active ? 'ENABLED' : 'DISABLED' },
            { name: 'Instruction', value: 'Use menu and buttons below to edit settings.' }
        );

        if (!channelConfigured(channelConfig)) {
            channelConfigEmbed.addFields(
                { name: 'To Enable', value: 'All required fields must be configured before scheduler can be enabled for this channel.' }
            );
        }

        // Daily buttons - Row 1
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

        const menuRow1 = new ActionRowBuilder().addComponents(dailyPostTimeButton, templateButton, postIntervalButton);

        // Daily buttons - Row 2
        const pinMessageButton = new ButtonBuilder()
            .setCustomId(`config.${channelId}.${actions.PIN_POST}.${channelConfig.pinPost ? 'false' : 'true'}`)
            .setLabel(`Pin Post Set ${channelConfig.pinPost ? 'False' : 'True'}`)
            .setStyle(ButtonStyle.Primary);
        const pinMaxNumButton = new ButtonBuilder()
            .setCustomId(`config.${channelId}.${actions.PIN_MAX_NUM}`)
            .setLabel('Max Number Pinned Posts')
            .setStyle(ButtonStyle.Primary);

        const menuRow2 = new ActionRowBuilder().addComponents(pinMessageButton, pinMaxNumButton);

        // Status row
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

        const statusRow = new ActionRowBuilder().addComponents(changeStatusButton, exitButton);

        rows = [selectorRow, menuRow1, menuRow2, statusRow];
    }

    return {
        embeds: [channelConfigEmbed],
        components: rows
    }
}

module.exports = channelConfigInteraction
