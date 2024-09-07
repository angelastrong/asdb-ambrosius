const config = require('../models/config')
const ServerConfig = config.ServerConfig

async function createConfig(guildId) {
    const result = await ServerConfig.find({ guildId: guildId}).exec()
    if (result.length) {
        return false;
    } else {
        try {
            ServerConfig.create({
                guildId: guildId
            })
            return true
        } catch (error) {
            console.log(error)
            return false;
        }
    }
}

module.exports = createConfig