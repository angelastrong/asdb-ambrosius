const { Schema, model } = require('mongoose');

const Reminder = new Schema({
    writeinConfigId: { type: Schema.Types.ObjectId, ref: 'writeinConfig' },
    reminderType: String, // 'first' or 'second'
    scheduleId: String,
    messageId: String,           // Discord message ID of the posted reminder
    interestedUsers: [String],   // User IDs who reacted with the emoji
});

module.exports = model('reminders', Reminder);
