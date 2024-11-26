const config = require('../models/config')
const ChannelConfig = config.ChannelConfig
const schedule = require('node-schedule')

/**
 * @param {ChannelConfig} channelConfig
 */
function stopSchedule (channelConfig) {
    schedule.scheduledJobs[`${channelConfig.guildId}${channelConfig.channelId}`].cancel();
    console.log(`Schedule stopped for guild: ${channelConfig.guildId} channel:${channelConfig.channelId}`);
}

module.exports = stopSchedule