const Reminder = require('../../models/reminder')
const WriteinConfig = require('../../models/writein-config')

module.exports = async (reaction, user, client, handler) => {
    // Ignore bot's own reactions
    if (user.bot) return;

    // Handle partial reactions (messages not in cache)
    if (reaction.partial) {
        try {
            await reaction.fetch();
        } catch (error) {
            console.log('Failed to fetch reaction:', error);
            return;
        }
    }

    // Look up if this message is a first reminder we're tracking
    const reminder = await Reminder.findOne({
        messageId: reaction.message.id,
        reminderType: 'first'
    });

    if (!reminder) return;

    // Get the write-in config to check the emoji
    const writeinConfig = await WriteinConfig.findById(reminder.writeinConfigId);
    if (!writeinConfig || !writeinConfig.writeinEmoji) return;

    // Match the reaction emoji against the configured emoji
    const reactionEmoji = reaction.emoji.toString();
    const isMatch = reactionEmoji === writeinConfig.writeinEmoji
        || reaction.emoji.name === writeinConfig.writeinEmoji;

    if (!isMatch) return;

    // Remove user from interested list
    await Reminder.findByIdAndUpdate(reminder._id, {
        $pull: { interestedUsers: user.id }
    });

    console.log(`User ${user.id} removed interest in write-in ${writeinConfig._id}`);
};
