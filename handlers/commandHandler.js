const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../config.json');

async function registerCommands() {
  const commands = [];
  const commandsPath = path.join(__dirname, '../commands');
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    
    if ('data' in command) {
      commands.push(command.data.toJSON());
    } else {
      console.log(`[WARNING] The command at ${filePath} is missing a required "data" property.`);
    }
  }

  const rest = new REST().setToken(config.token);

  try {
    console.log(`[INFO] Started refreshing ${commands.length} application (/) commands.`);

    let data;
    
    if (config.guildId) {
      // Guild commands
      data = await rest.put(
        Routes.applicationGuildCommands(config.clientId, config.guildId),
        { body: commands },
      );
      console.log(`[INFO] Successfully reloaded ${data.length} guild application (/) commands.`);
    } else {
      // Global commands
      data = await rest.put(
        Routes.applicationCommands(config.clientId),
        { body: commands },
      );
      console.log(`[INFO] Successfully reloaded ${data.length} global application (/) commands.`);
    }
  } catch (error) {
    console.error('[ERROR] Failed to reload application commands:', error);
  }
}

module.exports = { registerCommands }; 