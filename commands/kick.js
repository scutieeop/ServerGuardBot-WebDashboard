const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Bir kullanıcıyı sunucudan atar.')
    .addUserOption(option => 
      option.setName('kullanıcı')
        .setDescription('Atılacak kullanıcı')
        .setRequired(true)
    )
    .addStringOption(option => 
      option.setName('sebep')
        .setDescription('Atılma sebebi')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  
  async execute(interaction) {
    try {
      const targetUser = interaction.options.getUser('kullanıcı');
      const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      const reason = interaction.options.getString('sebep') || 'Sebep belirtilmedi';
      
      // Check if the target member exists
      if (!targetMember) {
        return interaction.reply({
          content: 'Bu kullanıcı sunucuda bulunamadı!',
          ephemeral: true
        });
      }
      
      // Check if user is kickable
      if (!targetMember.kickable) {
        return interaction.reply({
          content: 'Bu kullanıcıyı atamıyorum! Yetkim yetersiz veya bu kullanıcı benden daha yüksek bir role sahip.',
          ephemeral: true
        });
      }
      
      // Check if the user is trying to kick themselves
      if (targetUser.id === interaction.user.id) {
        return interaction.reply({
          content: 'Kendini atamazsın!',
          ephemeral: true
        });
      }
      
      // Check if the user is trying to kick the bot
      if (targetUser.id === interaction.client.user.id) {
        return interaction.reply({
          content: 'Beni atamazsın!',
          ephemeral: true
        });
      }
      
      // Kick the user
      await targetMember.kick(`${interaction.user.tag} tarafından atıldı: ${reason}`);
      
      // Create kick embed
      const kickEmbed = new EmbedBuilder()
        .setColor('#FFA500') // Orange color
        .setTitle('👢 Kullanıcı Atıldı')
        .setDescription(`**${targetUser.tag}** sunucudan atıldı.`)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: 'Kullanıcı ID', value: targetUser.id, inline: true },
          { name: 'Yetkili', value: `<@${interaction.user.id}>`, inline: true },
          { name: 'Sebep', value: reason, inline: false }
        )
        .setTimestamp();
      
      // Send kick confirmation
      await interaction.reply({ embeds: [kickEmbed] });
      
      // Log to log channel if configured
      if (config.serverGuard.logChannelId) {
        const logChannel = interaction.guild.channels.cache.get(config.serverGuard.logChannelId);
        if (logChannel) {
          await logChannel.send({ embeds: [kickEmbed] });
        }
      }
    } catch (error) {
      console.error(`[ERROR] Error in kick command:`, error);
      return interaction.reply({
        content: `Kullanıcı atılırken bir hata oluştu: ${error.message}`,
        ephemeral: true
      });
    }
  },
}; 