const { Events, EmbedBuilder } = require('discord.js');
const config = require('../config.json');
const { checkProfanity, censorProfanity } = require('../utils/profanityFilter');
const db = require('../modules/database');

// XP cooldown cache to prevent spamming
const xpCooldowns = new Map();

module.exports = {
  name: Events.MessageCreate,
  once: false,
  async execute(message) {
    // Skip if message is from a bot or in DM
    if (message.author.bot || !message.guild) return;

    // Handle profanity filter
    if (config.profanityFilter.enabled) {
      try {
        // Skip whitelisted channels
        if (config.profanityFilter.allowedChannels && 
            config.profanityFilter.allowedChannels.includes(message.channel.id)) {
          console.log(`[INFO] Skipping profanity check in whitelisted channel: ${message.channel.name}`);
        } else if (checkProfanity(message.content)) {
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
          if (config.profanityFilter.logChannel) {
            const logChannel = message.guild.channels.cache.get(config.profanityFilter.logChannel);
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
    }

    // Handle XP for level system
    if (config.levelSystem.enabled) {
      try {
        const userId = message.author.id;
        const guildId = message.guild.id;
        
        // Check cooldown
        const now = Date.now();
        const cooldownSeconds = config.levelSystem.cooldownSeconds || 60;
        const cooldownKey = `${guildId}-${userId}`;
        const expirationTime = xpCooldowns.get(cooldownKey) || 0;
        
        if (now < expirationTime) {
          // User is on cooldown, skip XP
          return;
        }
        
        // Set cooldown
        xpCooldowns.set(cooldownKey, now + (cooldownSeconds * 1000));
        
        // Calculate random XP amount
        const minXp = config.levelSystem.minXpPerMessage || 5;
        const maxXp = config.levelSystem.maxXpPerMessage || 15;
        const xpToAdd = Math.floor(Math.random() * (maxXp - minXp + 1)) + minXp;
        
        // Add XP to user
        const result = await db.addXP(userId, guildId, xpToAdd);
        
        // Check if user leveled up
        if (result.leveledUp) {
          // Format level up message
          const levelUpMessage = (config.levelSystem.levelUpMessage || '{user} seviye atladı! Yeni seviye: {level}')
            .replace('{user}', `<@${userId}>`)
            .replace('{level}', result.newLevel);
          
          // Send level up message
          try {
            const levelUpEmbed = new EmbedBuilder()
              .setColor('#00FF00')
              .setTitle('🎉 Seviye Atlama!')
              .setDescription(levelUpMessage)
              .setThumbnail(message.author.displayAvatarURL({ dynamic: true }));
            
            // Send to the same channel
            const levelUpMsg = await message.channel.send({ embeds: [levelUpEmbed] });
            
            // Auto-delete after 10 seconds to avoid chat clutter
            setTimeout(() => {
              levelUpMsg.delete().catch(() => {});
            }, 10000);
            
            // Check if there's a role reward for this level
            if (config.levelSystem.roles && config.levelSystem.roles[result.newLevel]) {
              const roleId = config.levelSystem.roles[result.newLevel];
              const role = message.guild.roles.cache.get(roleId);
              
              if (role) {
                const member = await message.guild.members.fetch(userId);
                await member.roles.add(role);
                
                // Send role reward message
                const roleRewardEmbed = new EmbedBuilder()
                  .setColor(role.color || '#00FF00')
                  .setDescription(`🎖️ <@${userId}> yeni bir rol kazandı: **${role.name}**`);
                
                const roleMsg = await message.channel.send({ embeds: [roleRewardEmbed] });
                
                // Auto-delete after 10 seconds
                setTimeout(() => {
                  roleMsg.delete().catch(() => {});
                }, 10000);
              }
            }
          } catch (levelUpError) {
            console.error(`[ERROR] Failed to send level up message:`, levelUpError);
          }
        }
      } catch (xpError) {
        console.error(`[ERROR] Error adding XP for level system:`, xpError);
      }
    }
  },
}; 