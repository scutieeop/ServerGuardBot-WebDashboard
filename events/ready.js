const { Events } = require('discord.js');
const { joinVoiceChannel } = require('@discordjs/voice');
const config = require('../config.json');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`[INFO] Logged in as ${client.user.tag}!`);
    console.log(`[INFO] Serving ${client.guilds.cache.size} guilds with ${client.users.cache.size} users`);
    
    // Set bot status
    client.user.setPresence({
      activities: [{ name: 'Sunucu Koruması', type: 4 }],
      status: 'online',
    });
    
    // Join voice channel in all guilds if enabled
    if (config.serverGuard.enabled && config.serverGuard.voiceChannelId) {
      client.guilds.cache.forEach(guild => {
        try {
          const voiceChannel = guild.channels.cache.get(config.serverGuard.voiceChannelId);
          if (!voiceChannel) {
            console.log(`[WARNING] Voice channel with ID ${config.serverGuard.voiceChannelId} not found in guild ${guild.name}.`);
            return;
          }
          
          joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
          });
          
          console.log(`[INFO] Joined voice channel "${voiceChannel.name}" in guild "${guild.name}"`);
        } catch (error) {
          console.error(`[ERROR] Failed to join voice channel in guild ${guild.name}:`, error);
        }
      });
    }
  },
}; 