const { Events, EmbedBuilder } = require('discord.js');
const config = require('../config.json');

module.exports = {
  name: Events.GuildMemberAdd,
  once: false,
  async execute(member) {
    // Skip if welcome system is disabled
    if (!config.welcomeSystem.enabled) return;
    
    try {
      // Get welcome channel
      const welcomeChannel = member.guild.channels.cache.get(config.welcomeSystem.welcomeChannelId);
      if (!welcomeChannel) {
        return console.log(`[WARNING] Welcome channel with ID ${config.welcomeSystem.welcomeChannelId} not found in guild ${member.guild.name}.`);
      }
      
      // Create welcome embed
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
      
      // Send welcome message
      await welcomeChannel.send({ embeds: [welcomeEmbed] });
      
      // Log to console
      console.log(`[INFO] Welcome message sent for new member ${member.user.tag} in guild ${member.guild.name}`);
      
      // If registration system is enabled, send DM to user
      if (config.welcomeSystem.registrationEnabled) {
        try {
          const registrationChannel = member.guild.channels.cache.get(config.welcomeSystem.registrationChannelId);
          if (registrationChannel) {
            const registrationEmbed = new EmbedBuilder()
              .setColor(config.welcomeSystem.welcomeColor)
              .setTitle('Kayıt Bilgilendirmesi')
              .setDescription(`Merhaba <@${member.id}>, sunucumuza hoş geldin! Kayıt olmak için <#${registrationChannel.id}> kanalına giderek kayıt işlemlerini tamamlayabilirsin.`)
              .setTimestamp();
            
            await member.send({ embeds: [registrationEmbed] }).catch(() => {
              console.log(`[WARNING] Could not send DM to ${member.user.tag}. They might have DMs disabled.`);
            });
          }
        } catch (dmError) {
          console.error(`[ERROR] Failed to send registration DM to ${member.user.tag}:`, dmError);
        }
      }
    } catch (error) {
      console.error(`[ERROR] Failed to process guildMemberAdd event for ${member.user.tag}:`, error);
    }
  },
}; 