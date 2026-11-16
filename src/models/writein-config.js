const { Schema, model } = require('mongoose');

const WriteinConfig = new Schema({
    channelConfigId: { type: Schema.Types.ObjectId, ref: 'channelConfig' },
    active: Boolean,
    writeinDay: String,
    writeinTime: String,
    writeinTimezone: String,
    // writeinHost: String,       // commented out for future
    writeinEmoji: String,          // resolved emoji for reactions
    writeinEmojiText: String,      // :emoji: text format for templates and display
    // Custom text injected into channel-level template via <CUSTOM> variable
    firstReminderCustom: String,
    secondReminderCustom: String,
    thirdReminderCustom: String,
    // Optional overrides — if null/empty, falls back to ChannelConfig defaults
    firstReminderTime: String,
    secondReminderTime: String,
    thirdReminderTime: String,
});

module.exports = model('writeinConfig', WriteinConfig);
