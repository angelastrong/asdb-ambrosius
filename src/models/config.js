const { Schema, model } = require('mongoose');

const ChannelConfig = new Schema({
    guildId: String,
    channelId: String,
    active: Boolean,
    cron: String,
    dailyPostTime: String,
    dailyPostHour: Number,
    dailyPostMinute: Number,
    configureMessageId: String,
    type: { type: String, default: 'daily' }, // 'daily' or 'writein'
    // Daily scheduler fields
    template: String,
    postIntervalDays: Number,
    pinPost: Boolean,
    pinnedPostsNumMax: Number,
    pinnedPosts: [String],
    // Write-in channel-level defaults
    firstReminderTemplate: String,
    secondReminderTemplate: String,
    thirdReminderTemplate: String,   // optional
    firstReminderTime: String,
    secondReminderTime: String,
    thirdReminderTime: String,       // optional
})

const ServerConfig = new Schema({
    guildId: String
});

module.exports = {
    ServerConfig: model('config', ServerConfig),
    ChannelConfig: model('channelConfig', ChannelConfig)
}
