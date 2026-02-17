function channelConfigured(channel) {
    // Daily type validation (default)
    return channel.template
        && (channel.dailyPostTime || channel.cron)
        && channel.postIntervalDays;
}

function writeinChannelConfigured(channelConfig) {
    // Channel-level write-in defaults must be set
    return !!channelConfig.firstReminderTemplate
        && !!channelConfig.firstReminderTime
        && !!channelConfig.secondReminderTemplate
        && !!channelConfig.secondReminderTime;
}

function writeinConfigured(writeinConfig) {
    // Write-in specific fields only (template/time come from channel level)
    return !!writeinConfig.writeinDay
        && !!writeinConfig.writeinTime
        && !!writeinConfig.writeinTimezone;
}

module.exports = { channelConfigured, writeinConfigured, writeinChannelConfigured };
