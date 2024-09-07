const { Schema, model } = require('mongoose');

let message = new Schema({
    guildId: String,
    channelId: String,
    message: String,
    scheduledDate: Date,
    lastPostedDate: Date
});

module.exports = model('messages', message)