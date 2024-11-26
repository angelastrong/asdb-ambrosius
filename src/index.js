require('dotenv').config();
const { Client, IntentsBitField } = require('discord.js');
const { CommandHandler } = require('djs-commander');
const mongoose = require('mongoose');
const path = require('path');

const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
    ]
});

new CommandHandler({
  client, // Discord.js client object | Required by default
  commandsPath: path.join(__dirname, 'commands'), // The commands directory
  eventsPath: path.join(__dirname, 'events'), // The events directory
  validationsPath: path.join(__dirname, 'validations'), // Only works if commandsPath is provided
  //testServer: '1167990465136697344', // To register guild-based commands (if it's not provided commands will be registered globally)
});

(async () => {
    try {
      mongoose.set('strictQuery', false);
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('Connected to DB.');

      client.login(process.env.TOKEN);

    } catch (error) {
      console.log(`Error: ${error}`);
    }
  })();






// client.on('ready', () => {
//     console.log('The bot is ready')

//     new CH({
//         client,
//         mongoUri: process.env.MONGO_URI,
//         commandsDir: path.join(__dirname, 'commands'),
//         testServers: ['1167990465136697344'],
//         botOwners: ['572164742815416331']
//     })
// })

