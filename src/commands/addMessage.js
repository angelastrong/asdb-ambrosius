const { SlashCommandBuilder, ChannelType, ChatInputCommandInteraction, SlashCommandRoleOption } = require('discord.js');
const MessageSchema = require('../models/message');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const csv=require('csvtojson');
const scheduledMessageExists = require('../utils/scheduled-message-exists');
const formatScheduleDate = require('../utils/format-schedule-date')

module.exports = {
    /**
     * @param {Object} param0
     * @param {ChatInputCommandInteraction} interaction
     */
  data: new SlashCommandBuilder()
          .setName('add-message')
          .setDescription('Adds message to collection for channel')
          .addSubcommand(subcommand =>
            subcommand
                .setName('here')
                .setDescription('Add message here directly in the command')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('The channel you want to add the message')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                  )
                .addStringOption(option => option.setName('message').setDescription('Message to add to collection').setRequired(true))
                .addStringOption(option => option.setName('schedule-date').setDescription('Optional schedule date in format YYYY-MM-DD')),
          )
          .addSubcommand(subcommand =>
            subcommand
                .setName('file')
                .setDescription('Add message(s) via csv file')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('The channel you want to add the message')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                  )
                .addAttachmentOption(option => 
                    option
                        .setName('file')
                        .setDescription('The csv file with messages to add')
                        .setRequired(true))
          ),
          
          
  run: async ({ interaction, client, handler }) => {
    const { options } = interaction;
    const subcommand = options.getSubcommand();
    const channel = interaction.options.getChannel('channel');

    if (subcommand === 'here') {
        const scheduledDateString = options.getString('schedule-date');
        const scheduleDate = Date.parse(scheduledDateString);
    
        if (scheduledDateString && isNaN(scheduleDate)) {
            await interaction.reply({
                content:'Schedule date is not a valid date format',
                ephemeral: true
            });
        } else {
            try {
                    const message = options.getString('message');

                    await MessageSchema.updateOne(
                        {
                            guildId: interaction.guildId,
                            channelId: channel.id,
                            message: message,
                        },
                        {
                            guildId: interaction.guildId,
                            channelId: channel.id,
                            message: message,
                            scheduledDate: scheduledDateString ? scheduledDateString : null
                        },
                        { upsert: true }
                    )
                await interaction.reply({
                    content: 'Message has been added!',
                    ephemeral: true
                });
            } catch (error) {
                await interaction.reply({
                    content: 'There was an error',
                    ephemeral: true
                });
                console.log(`Error: ${error}`);
            }
        }
    } else if (subcommand === 'file') {
        await interaction.deferReply({
            fetchReply: true
        });
        const file = options.getAttachment('file');
        if (!file) {
            await interaction.editReply({
                content: 'Please supply a file',
                ephemeral: true
            });
        }
        fetch(file.url)
            .then(result => result.text())
            .then(dataString => {
                csv()
                    .fromString(dataString)
                    .then(async data => {
                        try {
                            data = data.sort((a,b) => {
                                var aDate = new Date(a.Last_Posted).getTime() || 0;
                                var bDate = new Date(b.Last_Posted).getTime() || 0;
                                return aDate - bDate;
                            });
                            const writeOps = [];
                            const errors = [];
                            for (const entry of data) {
                                if (entry.Scheduled_Date) {
                                    var entryScheduledDate = formatScheduleDate(entry.Scheduled_Date);
                                    if (await scheduledMessageExists(interaction.guildId, channel.id, entryScheduledDate)) {
                                        //schedulingErrors.push({ scheduledDate: entryScheduledDate, message: entry.Message });
                                        errors.push(`Scheduled date unavailable: ${entryScheduledDate} (${entry.Message})`);
                                        continue;
                                    }
                                }
                                if (entry.Recurring.toLowerCase() === "true" && !entry.Scheduled_Date) {
                                    errors.push(`Recurring messages require a schedule: (${entry.Message})`)
                                }
                                const msg = {
                                    guildId: interaction.guildId,
                                    channelId: channel.id,
                                    message: entry.Message,
                                    lastPostedDate: entry.Last_Posted ? new Date(entry.Last_Posted) : null,
                                    scheduledDate: entry.Scheduled_Date ? entryScheduledDate : null,
                                    recurring: entry.Recurring?.toLowerCase() === "true",
                                    deleted: false
                                }
                                writeOps.push({
                                    'updateOne': {
                                        'filter': { 
                                            guildId: interaction.guildId,
                                            channelId: channel.id,
                                            message: entry.Message },
                                        'update': { $set: msg },
                                        'upsert': true
                                    }
                                })
                            }
                            MessageSchema.bulkWrite(writeOps);
                            let content = 'File received and processed';
                            if (errors.length) {
                                content += ' but the following messages had errors and were not added: ';
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
            })
    } else {
        await interaction.editReply({
            content: 'There was an error',
            ephemeral: true
        });
    }

    
  },
};