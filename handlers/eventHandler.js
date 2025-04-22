const config = require('../config.json');
const { Events, EmbedBuilder } = require('discord.js');
const { checkProfanity } = require('../utils/profanityFilter');

async function handleEvent(client, event, ...args) {
  switch (event) {
    // Welcome new members with embeds
    case Events.GuildMemberAdd:
      if (config.welcomeSystem.enabled) {
        const member = args[0];
        const welcomeChannel = member.guild.channels.cache.get(config.welcomeSystem.welcomeChannelId);
        
        if (welcomeChannel) {
          const welcomeEmbed = new EmbedBuilder()
            .setColor(config.welcomeSystem.welcomeColor)
            .setTitle(config.welcomeSystem.welcomeTitle)
            .setDescription(config.welcomeSystem.welcomeMessage.replace('{user}', `<@${member.id}>`))
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .addFields(
              { name: 'Üye ID', value: member.id, inline: true },
              { name: 'Toplam Üye', value: `${member.guild.memberCount}`, inline: true },
              { name: 'Hesap Oluşturulma', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true }
            )
            .setImage(config.welcomeSystem.welcomeImage)
            .setFooter({ text: config.welcomeSystem.welcomeFooter })
            .setTimestamp();
          
          await welcomeChannel.send({ embeds: [welcomeEmbed] });
        }
      }
      break;
    
    // Check for profanity in messages
    case Events.MessageCreate:
      if (config.profanityFilter.enabled) {
        const message = args[0];
        
        // Don't check messages from bots or outside of guilds
        if (message.author.bot || !message.guild) return;
        
        // Check if message contains profanity
        if (checkProfanity(message.content)) {
          // Delete message if enabled
          if (config.profanityFilter.punishment === 'delete') {
            await message.delete().catch(error => console.error('[ERROR] Failed to delete message:', error));
          }
          
          // Warn user if enabled
          if (config.profanityFilter.warnUser) {
            await message.channel.send({
              content: `<@${message.author.id}>, küfür kullanımı bu sunucuda yasaktır!`,
              ephemeral: true
            }).catch(error => console.error('[ERROR] Failed to send warning:', error));
          }
          
          // Log to log channel
          const logChannel = message.guild.channels.cache.get(config.serverGuard.logChannelId);
          if (logChannel) {
            const logEmbed = new EmbedBuilder()
              .setColor('#FF0000')
              .setTitle('Küfür Tespit Edildi')
              .setDescription(`Kullanıcı: <@${message.author.id}>\nKanal: <#${message.channel.id}>\nMesaj: ||${message.content}||`)
              .setTimestamp();
            
            await logChannel.send({ embeds: [logEmbed] }).catch(error => console.error('[ERROR] Failed to send log:', error));
          }
        }
      }
      break;
      
    // Anti-spam and raid protection can be added here
    default:
      break;
  }
}

module.exports = { handleEvent }; 