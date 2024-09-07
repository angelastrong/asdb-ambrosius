const { Schema, model } = require('mongoose');

const ChannelConfig = new Schema({
    guildId: String,
    channelId: String,
    active: Boolean,
    template: String,
    dailyPostTime: String,
    dailyPostHour: Number,
    dailyPostMinute: Number,
    postIntervalDays: Number,
    pinPost: Boolean,
    configureMessageId: String
})

const ServerConfig = new Schema({
    guildId: String
});

module.exports = { 
    ServerConfig: model('config', ServerConfig),
    ChannelConfig: model('channelConfig', ChannelConfig)
}