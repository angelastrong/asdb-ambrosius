const { SlashCommandBuilder, ChannelType, ChatInputCommandInteraction, SlashCommandRoleOption } = require('discord.js');
const MessageSchema = require('../models/message');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const fs = require('node:fs');
let converter = require('json-2-csv');
const csv = converter.json2csv;
const json = converter.csv2json;
const scheduledMessageExists = require('../utils/scheduled-message-exists');
const formatScheduleDate = require('../utils/format-schedule-date');
const { ObjectId } = require('mongodb');

module.exports = {
    /**
     * @param {Object} param0
     * @param {ChatInputCommandInteraction} interaction
     */
  data: new SlashCommandBuilder()
          .setName('edit-message')
          .setDescription('For editing messages in the collection by export/import')
          .addSubcommand(subcommand =>
            subcommand
                .setName('export')
                .setDescription('Get an export of the specified channel\'s messages')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('The channel you want the export from')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                  ),
          )
          .addSubcommand(subcommand =>
            subcommand
                .setName('import')
                .setDescription('Edit message(s) via csv file')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('The channel you want the export from')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                  )
                .addAttachmentOption(option => 
                    option
                        .setName('file')
                        .setDescription('The csv file with messages to edit')
                        .setRequired(true))
          ),
          
          
  run: async ({ interaction, client, handler }) => {
    const { options } = interaction;
    const channel = interaction.options.getChannel('channel');
    const subcommand = options.getSubcommand();
    await interaction.deferReply({
        fetchReply: true
    });

    try {
        if (subcommand === 'export') {
            
            const cursor = MessageSchema.find({
                    guildId: interaction.guildId,
                    channelId: channel.id
                }).cursor();

            const messages = [];
            await cursor.forEach(message => {
                messages.push({
                    Id: message._id.toString(),
                    Message: message.message,
                    Scheduled_Date: message.scheduledDate,
                    Recurring: message.recurring,
                    Deleted: message.deleted,
                    Last_Posted: message.lastPostedDate,
                });
            })
            
            const csvString = csv(messages);

            const filePath = './export.csv';
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }

            fs.writeFileSync(filePath, csvString);

            await interaction.editReply({
                content: `Here is your export for <#${channel.id}>`,
                files: [filePath]
            });

            fs.unlinkSync(filePath);

        } else if (subcommand === 'import') {
            const file = options.getAttachment('file');
            if (!file) {
                await interaction.editReply({
                    content: 'Please supply a file',
                    ephemeral: true
                });
            }
            fetch(file.url)
                .then(result => result.text())
                .then(async dataString => {
                    const data = json(dataString);
                    try {
                        const writeOps = [];
                        const errors = [];
                        for (const entry of data) {
                            if (entry.Scheduled_Date) {
                                var entryScheduledDate = formatScheduleDate(entry.Scheduled_Date);
                                if (await scheduledMessageExists(interaction.guildId, channel.id, entryScheduledDate, entry.Id)) {
                                    //schedulingErrors.push({ scheduledDate: entryScheduledDate, message: entry.Message });
                                    errors.push(`Scheduled date unavailable: ${entryScheduledDate} (${entry.Message})`);
                                    continue;
                                }
                            }
                            if (entry.Recurring.toLowerCase() === "true" && !entry.Scheduled_Date) {
                                errors.push(`Recurring messages require a schedule: (${entry.Message})`)
                            }
                            const msg = {
                                message: entry.Message,
                                scheduledDate: entry.Scheduled_Date ? entryScheduledDate : null,
                                recurring: entry.Recurring?.toLowerCase() === "true",
                                deleted: entry.Deleted?.toLowerCase() === "true"
                            }
                            if (msg.deleted) {
                                msg.scheduledDate = null;
                                msg.recurring = false;
                            }
                            writeOps.push({
                                'updateOne': {
                                    'filter': { 
                                        _id: entry.Id },
                                    'update': { $set: msg }
                                }
                            })
                        }
                        MessageSchema.bulkWrite(writeOps);
                        let content = 'File received and processed';
                        if (errors.length) {
                            content += ' but the following messages had errors and were not edited: ';
                            for (let i = 0; i < errors.length; i++) {
                                content += `\n${errors[i]}`;
                            }
                        } 
                        if (content.length > 2000) {
                            content = content.substring(0,1990) + '\n...';
                        }
                        await interaction.editReply({
                            content: content
                        });
                    } catch (error) {
                        interaction.editReply({
                            content: 'There was an error',
                            ephemeral: true
                        });
                        console.log(`Error: ${error}`);
                    }
                })
            
        } else {
            await interaction.editReply({
                content: 'There was an error',
                ephemeral: true
            });
        }
    } catch (err) {
        await interaction.editReply({
            content: 'There was an error',
            ephemeral: true
        });
    }



    
  },
};