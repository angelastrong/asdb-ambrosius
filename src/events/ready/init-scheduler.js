const channelConfigured = require('../../utils/channel-configured');
const config = require('../../models/config')
const ChannelConfig = config.ChannelConfig
const startSchedule = require('../../utils/start-schedule')

module.exports = async (argument, client, handler) => {
  try {
    const channels = await ChannelConfig.find({ active: true });

    channels.forEach(async channel => {
      if (channelConfigured(channel)) {
        await startSchedule(client, channel);
      }
    })
  } catch (error) {
    console.log('There was an error initializing scheduler')
  }
    console.log('Scheduler initialized');
  };