const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    /**
     * @param {Object} param0
     * @param {ChatInputCommandInteraction} param0.interaction
     */
  data: new SlashCommandBuilder()
          .setName('help')
          .setDescription('Get more details about commands or headers')
          .addSubcommand(subcommand => 
            subcommand
                .setName('commands')
                .setDescription('Get more details about commands')
          )
          .addSubcommand(subcommand => 
            subcommand
                .setName('headers')
                .setDescription('Get more details about supported headers')
          ),
          
  run: async ({ interaction, client, handler }) => {
    const { options } = interaction;
    const subcommand = options.getSubcommand();
    let content = '';

    if (subcommand === 'commands') {
        content = `
            \`\`\`Ambrosius commands (v1.3.0)

/add-message here (channel)* (message)* (schedule-date)
    Ad-hoc way to add a single message to a channel's message queue.

/add-message file (channel)* (file)*
    Add messages via a csv file. Duplicate messages will not be added, and instead will just update the Last_Posted if applicable.
    Supported headers: Message, Last_Posted, Scheduled_Date, Recurring (use \'/help headers\' for more details)

/configure-channel (channel)*
    Use this to set up the schedule and other configurations for a channel. This is also where you would enable/disable the schedule.

/edit-message export (channel)*
    Will export all messages for specified channel from the database.
    Headers: Id, Message, Scheduled_Date, Recurring, Deleted, Last_Posted (use \'/help headers\' for more details)

/edit-message import (channel)* (file)*
    Will update the messages by id in the file. Recommended to only include messages to update instead of just re-importing the full export. Include the full row or else any empty values will overwrite the value in the database.
    Supported headers: Id, Message, Scheduled_Date, Recurring, Deleted (use \'/help headers\' for more details)

/edit-message id (id)* (message) (schedule-date)
    Edit message and/or schedule date by id. Use /get-message-id to get id by message content.

/edit-message recent-pinned (channel)* (message)*
    Updates most recently pinned post with edited message and also updates the message in the database.
    Most recently pinned message must also be the most recently posted message.

/get-message-id (channel)* (message)*
    Get message id by channel and message content. Only include the message, not any of the template.

/post (channel)
    Post the next message in the channel. If channel option not provided, will use the channel the command is used in.
\`\`\`
`
    }

    if (subcommand === 'headers') {
        content = `
            \`\`\`Ambrosius supported headers (v1.1.0)

Id
    Id of the message in the database.
            
Message
    Message content. /add-message will check for duplicates but /edit-message will not.
            
Scheduled_Date
    Use the format MM-DD-YYYY. Currently uses UTC. Only supported for once daily posts.
            
Recurring
    If TRUE, after message is posted, will be scheduled again for next year on the same day. If FALSE, will not be posted again. (DO NOT schedule anything recurring on 2/29 plz)

Last_Posted
    Datetime of the last time the message was posted in the channel. This can be included in /add-message but /edit-message does not support updating this.
            
Deleted
    Marks message as deleted and will not be posted again. Eventually there will be a job that will clean out deleted messages.
\`\`\`
`
    }
    

    await interaction.reply({content: content});

    
  },
};