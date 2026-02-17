const schedule = require('node-schedule')
const Reminder = require('../models/reminder')
const postReminder = require('./post-reminder')

const DAY_MAP = {
    'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
    'Thursday': 4, 'Friday': 5, 'Saturday': 6
};

const MINUTES_IN_WEEK = 7 * 24 * 60;
const MINUTES_IN_DAY = 24 * 60;

function computeReminderSchedule(writeinDay, writeinTime, reminderMinutes) {
    const dayNumber = DAY_MAP[writeinDay];
    const [hour, minute] = writeinTime.split(':').map(Number);

    const writeinTotalMinutes = dayNumber * MINUTES_IN_DAY + hour * 60 + minute;
    const reminderTotalMinutes = ((writeinTotalMinutes - reminderMinutes) % MINUTES_IN_WEEK + MINUTES_IN_WEEK) % MINUTES_IN_WEEK;

    const reminderDay = Math.floor(reminderTotalMinutes / MINUTES_IN_DAY);
    const remainingMinutes = reminderTotalMinutes % MINUTES_IN_DAY;
    const reminderHour = Math.floor(remainingMinutes / 60);
    const reminderMinute = remainingMinutes % 60;

    return { dayOfWeek: reminderDay, hour: reminderHour, minute: reminderMinute };
}

async function scheduleReminder(client, writeinConfig, channelConfig, reminderType, reminderMinutes) {
    const { guildId, channelId } = channelConfig;
    const { writeinDay, writeinTime, writeinTimezone } = writeinConfig;
    const jobId = `${guildId}${channelId}_${writeinConfig._id}_${reminderType}`;

    const { dayOfWeek, hour, minute } = computeReminderSchedule(writeinDay, writeinTime, Number(reminderMinutes));

    const rule = new schedule.RecurrenceRule();
    rule.dayOfWeek = dayOfWeek;
    rule.hour = hour;
    rule.minute = minute;
    rule.tz = writeinTimezone;

    schedule.scheduleJob(jobId, rule, () => {
        postReminder(writeinConfig._id, reminderType, client);
    });

    await Reminder.findOneAndUpdate(
        { writeinConfigId: writeinConfig._id, reminderType: reminderType },
        { writeinConfigId: writeinConfig._id, reminderType: reminderType, scheduleId: jobId },
        { upsert: true }
    );

    console.log(`Scheduled ${reminderType} reminder for guild: ${guildId} channel: ${channelId} (${Object.keys(DAY_MAP).find(k => DAY_MAP[k] === dayOfWeek)} ${hour}:${String(minute).padStart(2, '0')} ${writeinTimezone})`);
}

async function startWriteinSchedule(client, writeinConfig, channelConfig) {
    // Resolve effective first reminder time: write-in override or channel default
    const effectiveFirstTime = writeinConfig.firstReminderTime || channelConfig.firstReminderTime;
    if (effectiveFirstTime) {
        await scheduleReminder(client, writeinConfig, channelConfig, 'first', effectiveFirstTime);
    }

    // Schedule second reminder
    const effectiveSecondTime = writeinConfig.secondReminderTime || channelConfig.secondReminderTime;
    if (effectiveSecondTime) {
        await scheduleReminder(client, writeinConfig, channelConfig, 'second', effectiveSecondTime);
    }

    // Schedule third reminder (optional)
    const effectiveThirdTime = writeinConfig.thirdReminderTime || channelConfig.thirdReminderTime;
    if (effectiveThirdTime && channelConfig.thirdReminderTemplate) {
        await scheduleReminder(client, writeinConfig, channelConfig, 'third', effectiveThirdTime);
    }

    console.log(`Write-in schedule started for guild: ${channelConfig.guildId} channel: ${channelConfig.channelId}`);
}

module.exports = startWriteinSchedule
