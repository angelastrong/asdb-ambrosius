const MessageSchema = require('../models/message')

async function scheduledMessageExists(guildId, channelId, scheduledDate, id = null) {
    const sameSchedule = await MessageSchema.findOne({
        guildId: guildId,
        channelId: channelId,
        scheduledDate: scheduledDate,
        deleted: false
    });
    
    if (sameSchedule && sameSchedule._id.toString() !== id) {
        return true;
    }
    return false;
}

module.exports = scheduledMessageExists