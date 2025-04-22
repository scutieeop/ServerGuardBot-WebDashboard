const { Events, EmbedBuilder } = require('discord.js');
const config = require('../config.json');
const { checkProfanity, censorProfanity } = require('../utils/profanityFilter');

module.exports = {
  name: Events.MessageCreate,
  once: false,
  async execute(message) {
    // Skip if profanity filter is disabled or message is from a bot or in DM
    if (!config.profanityFilter.enabled || message.author.bot || !message.guild) return;
    
    try {
      // Check if message contains profanity
      if (checkProfanity(message.content)) {
        // Log to the console
        console.log(`[INFO] Profanity detected from ${message.author.tag} in #${message.channel.name}: ${message.content}`);
        
        // Delete message if punishment is set to delete
        if (config.profanityFilter.punishment === 'delete') {
          try {
            await message.delete();
            console.log(`[INFO] Deleted message with profanity from ${message.author.tag}`);
          } catch (deleteError) {
            console.error(`[ERROR] Failed to delete message with profanity:`, deleteError);
          }
        }
        
        // Warn user if enabled
        if (config.profanityFilter.warnUser) {
          try {
            const warnMessage = await message.channel.send({
              content: `<@${message.author.id}>, küfür kullanımı bu sunucuda yasaktır!`,
              ephemeral: true,
            });
            
            // Auto-delete warning after 5 seconds
            setTimeout(() => {
              warnMessage.delete().catch(() => {});
            }, 5000);
          } catch (warnError) {
            console.error(`[ERROR] Failed to send warning message:`, warnError);
          }
        }
        
        // Log to log channel if configured
        if (config.serverGuard.logChannelId) {
          const logChannel = message.guild.channels.cache.get(config.serverGuard.logChannelId);
          if (logChannel) {
            try {
              const logEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('Küfür Tespit Edildi')
                .setDescription(`**Kullanıcı:** <@${message.author.id}> (${message.author.tag})\n**Kanal:** <#${message.channel.id}>\n**Mesaj:** ||${censorProfanity(message.content)}||`)
                .setTimestamp()
                .setFooter({ text: `Kullanıcı ID: ${message.author.id}` });
              
              await logChannel.send({ embeds: [logEmbed] });
            } catch (logError) {
              console.error(`[ERROR] Failed to send log message:`, logError);
            }
          }
        }
      }
    } catch (error) {
      console.error(`[ERROR] Error processing message for profanity:`, error);
    }
  },
}; 