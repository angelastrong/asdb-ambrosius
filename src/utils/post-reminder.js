const { ChannelConfig } = require('../models/config')
const WriteinConfig = require('../models/writein-config')
const Reminder = require('../models/reminder')
const { writeinConfigured, writeinChannelConfigured } = require('./channel-configured')
const { toDiscordTimestamp, FORMATS } = require('./disclock')
const atDiscordUser = require('./at-discord-user')

function getNextWriteinDate(writeinDay, writeinTime, writeinTimezone) {
    if (!writeinDay || !writeinTime || !writeinTimezone) return null;

    const [targetHour, targetMinute] = writeinTime.split(':').map(Number);

    for (let daysAhead = 0; daysAhead <= 7; daysAhead++) {
        const probe = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
        const localWeekday = new Intl.DateTimeFormat('en-US', {
            timeZone: writeinTimezone,
            weekday: 'long'
        }).format(probe);

        if (localWeekday !== writeinDay) continue;

        // Get the calendar date in the target timezone
        const localDate = new Intl.DateTimeFormat('en-CA', {
            timeZone: writeinTimezone,
            year: 'numeric', month: '2-digit', day: '2-digit'
        }).format(probe);
        const [year, month, day] = localDate.split('-').map(Number);

        // Naive UTC: treat the target local time as if it were UTC
        const naiveUTC = Date.UTC(year, month - 1, day, targetHour, targetMinute, 0);

        // Find what hour:minute naiveUTC actually is in the target timezone
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: writeinTimezone,
            hour: 'numeric', minute: 'numeric', hour12: false
        }).formatToParts(new Date(naiveUTC));
        const partMap = Object.fromEntries(parts.map(p => [p.type, p.value]));

        // Compute the difference and correct naiveUTC to get true UTC
        const actualMins = (parseInt(partMap.hour) % 24) * 60 + parseInt(partMap.minute);
        const expectedMins = targetHour * 60 + targetMinute;
        let offsetMins = actualMins - expectedMins;
        if (offsetMins > 720) offsetMins -= 1440;
        if (offsetMins < -720) offsetMins += 1440;

        return new Date(naiveUTC - offsetMins * 60 * 1000);
    }

    return null;
}

async function postReminder(writeinConfigId, reminderType, client) {
    const writeinConfig = await WriteinConfig.findById(writeinConfigId).exec()
    if (!writeinConfig || !writeinConfigured(writeinConfig)) {
        console.log(`WriteinConfig ${writeinConfigId} not configured`)
        return -1;
    }

    const channelConfig = await ChannelConfig.findById(writeinConfig.channelConfigId).exec()
    if (!channelConfig) {
        console.log(`ChannelConfig not found for writeinConfig ${writeinConfigId}`)
        return -1;
    }

    if (!writeinChannelConfigured(channelConfig)) {
        console.log(`ChannelConfig ${channelConfig._id} missing reminder template/time defaults`)
        return -1;
    }

    const { guildId, channelId } = channelConfig;

    try {
        // Template comes from channelConfig
        const templateMap = {
            first: channelConfig.firstReminderTemplate,
            second: channelConfig.secondReminderTemplate,
            third: channelConfig.thirdReminderTemplate,
        };
        const template = templateMap[reminderType];

        if (!template) {
            console.log(`No ${reminderType} reminder template on channelConfig for writeinConfig ${writeinConfigId}`)
            return -1;
        }

        // Time: write-in override, then channel default
        const timeMap = {
            first: writeinConfig.firstReminderTime || channelConfig.firstReminderTime,
            second: writeinConfig.secondReminderTime || channelConfig.secondReminderTime,
            third: writeinConfig.thirdReminderTime || channelConfig.thirdReminderTime,
        };
        const writeinDate = getNextWriteinDate(writeinConfig.writeinDay, writeinConfig.writeinTime, writeinConfig.writeinTimezone)
            || new Date(Date.now() + Number(timeMap[reminderType]) * 60 * 1000);
        const discordTime = toDiscordTimestamp(writeinDate, FORMATS.SHORT_TIME);

        // Custom text from writeinConfig
        const customMap = {
            first: writeinConfig.firstReminderCustom,
            second: writeinConfig.secondReminderCustom,
            third: writeinConfig.thirdReminderCustom,
        };
        const customText = customMap[reminderType] || '';

        // Build ping list for second/third reminder from first reminder's interested users
        let pings = '';
        if (reminderType === 'second' || reminderType === 'third') {
            const firstReminder = await Reminder.findOne({
                writeinConfigId: writeinConfig._id, reminderType: 'first'
            });
            const interestedUsers = firstReminder?.interestedUsers || [];
            pings = interestedUsers.map(userId => atDiscordUser(userId)).join(' ');
        }

        const message = template
            .replace(/<TIME>/g, discordTime)
            .replace(/<EMOJI>/g, writeinConfig.writeinEmojiText || '')
            .replace(/<PING>/g, pings)
            .replace(/<CUSTOM>/g, customText)
            .replace(/<DAY>/g, writeinConfig.writeinDay || '');
            // .replace(/<HOST>/g, writeinConfig.writeinHost || '');

        const channel = await client.channels.fetch(channelId);
        const posted = await channel.send(message);

        // First reminder: react with emoji and store message ID for reaction tracking
        if (reminderType === 'first' && writeinConfig.writeinEmoji) {
            await posted.react(writeinConfig.writeinEmoji);
            await Reminder.findOneAndUpdate(
                { writeinConfigId: writeinConfig._id, reminderType: 'first' },
                { messageId: posted.id, interestedUsers: [] }
            );
        }

        // Clear interested users and message ID from first reminder after the last reminder
        const hasThirdReminder = !!(channelConfig.thirdReminderTemplate
            && (writeinConfig.thirdReminderTime || channelConfig.thirdReminderTime));
        const isLastReminder = reminderType === 'third' || (reminderType === 'second' && !hasThirdReminder);
        if (isLastReminder) {
            await Reminder.findOneAndUpdate(
                { writeinConfigId: writeinConfig._id, reminderType: 'first' },
                { messageId: null, interestedUsers: [] }
            );
        }

        console.log(`Posted ${reminderType} reminder for guild: ${guildId} channel: ${channelId}`)
        return posted.id;

    } catch (error) {
        console.log(`Error posting ${reminderType} reminder for channel ${channelId}`)
        console.log(error)
        return -1;
    }
}

module.exports = postReminder
