const { channelConfigured, writeinConfigured, writeinChannelConfigured } = require('../../utils/channel-configured');
const config = require('../../models/config')
const ChannelConfig = config.ChannelConfig
const WriteinConfig = require('../../models/writein-config')
const startSchedule = require('../../utils/start-schedule')
const startWriteinSchedule = require('../../utils/start-writein-schedule')

module.exports = async (argument, client, handler) => {
  try {
    // Schedule active daily channels
    const dailyChannels = await ChannelConfig.find({ active: true, type: { $ne: 'writein' } });
    for (const channel of dailyChannels) {
      if (channelConfigured(channel)) {
        await startSchedule(client, channel);
      }
    }

    // Schedule active write-in configs
    const activeWriteins = await WriteinConfig.find({ active: true });
    for (const writein of activeWriteins) {
      if (writeinConfigured(writein)) {
        const channelConfig = await ChannelConfig.findById(writein.channelConfigId);
        if (channelConfig && writeinChannelConfigured(channelConfig)) {
          await startWriteinSchedule(client, writein, channelConfig);
        }
      }
    }
  } catch (error) {
    console.log('There was an error initializing scheduler')
  }
    console.log('Scheduler initialized');
  };
