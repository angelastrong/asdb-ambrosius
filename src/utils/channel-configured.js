function channelConfigured(channel) {
    return channel.template 
        && channel.dailyPostTime 
        && channel.postIntervalDays
}

module.exports = channelConfigured;