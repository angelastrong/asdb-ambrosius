const config = require('../models/config')
const ChannelConfig = config.ChannelConfig
const schedule = require('node-schedule')
const postMessage = require('./post-message')

/**
 * @param {ChannelConfig} channelConfig
 */
async function startSchedule (client, channelConfig) {
    const cron = channelConfig.cron 
        || `${channelConfig.dailyPostMinute} ${channelConfig.dailyPostHour} * * *`;

    schedule.scheduleJob(`${channelConfig.guildId}${channelConfig.channelId}`, cron, () => {
        postMessage(channelConfig.guildId, channelConfig.channelId, client);
    })
    console.log(`Schedule started for guild: ${channelConfig.guildId} channel:${channelConfig.channelId}`);
}

module.exports = startSchedule