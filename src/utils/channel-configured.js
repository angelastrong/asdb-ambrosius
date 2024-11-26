function channelConfigured(channel) {
    return channel.template 
        && (channel.dailyPostTime || channel.cron)
        && channel.postIntervalDays
}

module.exports = channelConfigured;