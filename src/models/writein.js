const { Schema, model } = require('mongoose');
const { ObjectId } = require('mongodb');

let writein = new Schema({
    _id: ObjectId,
    guildId: String,
    channelId: String,
    timezone: String,
    message: String,
    day: String,
    time: String,
    emoji: String,
    host: String,
    tags: [String],
    participants: [String],
    deleted: Boolean
});

module.exports = model('writeins', writein)