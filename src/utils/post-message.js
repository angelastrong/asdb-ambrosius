const Message = require('../models/message')
const config = require('../models/config')
const ChannelConfig = config.ChannelConfig
const channelConfigured = require('../utils/channel-configured')
const formatScheduleDate = require('../utils/format-schedule-date')
const constants = require('../constants/default')

async function postMessage(guildId, channelId, client) {
    const channelConfig = await ChannelConfig.findOne({ guildId: guildId, channelId: channelId }).exec()
    if (channelConfig.length || !channelConfigured(channelConfig)) {
        console.log(`Channel ${channelId} not configured`)
        return -1;
    } else {
        try {
            //check schedule
            const today = new Date();
            const formatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'short' });
            const todayString = formatter.format(today);
            let messageToPost = 
                await Message.findOne({
                    guildId: guildId,
                    channelId: channelId,
                    scheduledDate: todayString,
                    deleted: {$in: [null, false]}
                });
            
            //or get random message that hasn't been posted yet
            if (!messageToPost) {
                let randomMessage =
                    await Message.aggregate([
                        {$match: {
                            guildId: guildId,
                            channelId: channelId,
                            lastPostedDate: null,
                            scheduledDate: null,
                            deleted: {$in: [null, false]}
                        }},
                        {$sample: {size: 1}}
                    ])
                // or get random message outside of interval range
                if (!randomMessage.length) {
                    let minLastPosted = new Date();
                    minLastPosted.setDate(minLastPosted.getDate() - channelConfig.postIntervalDays);
                    randomMessage =
                        await Message.aggregate([
                            {$match: {
                                guildId: guildId,
                                channelId: channelId,
                                lastPostedDate: {$not: {$gt: minLastPosted}},
                                scheduledDate: null,
                                deleted: {$in: [null, false]}
                            }},
                            {$sample: {size: 1}}
                        ]);
                }
                if (randomMessage.length) {
                    messageToPost = randomMessage[0];
                } else {
                    console.log(`No messages to post for ${channelId}`);
                    return -1;
                }
            }
  
            //post 
            const channel = await client.channels.fetch(channelId);
            const message = await channel.send(channelConfig.template.replace('<MSG>', messageToPost.message));

            if (channelConfig.pinPost) {
                await message.pin();
                if (!channelConfig.pinnedPosts) {
                    channelConfig.pinnedPosts = [];
                }
                channelConfig.pinnedPosts.push(message.id);

                while (channelConfig.pinnedPosts.length > (channelConfig.pinnedPostsNumMax || constants.MAX_PINNED_POSTS)) {
                    const unpinPostId = channelConfig.pinnedPosts.shift();
                    const unpinPost = await channel.messages.fetch(unpinPostId);
                    try {
                        await unpinPost.unpin();
                    } catch (error) {
                        console.log(`Unable to unpin post ${unpinPostId}`);
                        console.log(error);
                    }
                }

                await channelConfig.save();
            }

            const messageToUpdate = { lastPostedDate: message.createdAt }

            if (messageToPost.recurring) {
                messageToUpdate.scheduledDate = formatScheduleDate(messageToPost.scheduledDate,1);
            }
            
            await Message.findByIdAndUpdate(
                messageToPost._id,
                messageToUpdate
            )

            return message.id;

        } catch (error) {
            console.log(error)
            return -1;
        }
    }
}

module.exports = postMessage