const { Schema, model } = require('mongoose');
const { ObjectId } = require('mongodb');

let message = new Schema({
    _id: ObjectId,
    guildId: String,
    channelId: String,
    message: String,
    lastPostedDate: Date,
    scheduledDate: String,
    recurring: Boolean,
    deleted: Boolean
});

module.exports = model('messages', message)