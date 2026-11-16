const schedule = require('node-schedule')
const Reminder = require('../models/reminder')

async function stopWriteinSchedule(writeinConfig, channelConfig) {
    const { guildId, channelId } = channelConfig;
    const writeinId = writeinConfig._id;

    // Cancel all possible jobs (second/third may not exist)
    const firstJobId = `${guildId}${channelId}_${writeinId}_first`;
    const secondJobId = `${guildId}${channelId}_${writeinId}_second`;
    const thirdJobId = `${guildId}${channelId}_${writeinId}_third`;

    schedule.scheduledJobs[firstJobId]?.cancel();
    schedule.scheduledJobs[secondJobId]?.cancel();
    schedule.scheduledJobs[thirdJobId]?.cancel();

    // Clean up reminder docs
    await Reminder.deleteMany({ writeinConfigId: writeinId });

    console.log(`Write-in schedule stopped for guild: ${guildId} channel: ${channelId}`);
}

module.exports = stopWriteinSchedule
