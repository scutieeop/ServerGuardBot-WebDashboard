const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('temizle')
    .setDescription('Belirtilen sayıda mesajı siler.')
    .addIntegerOption(option => 
      option.setName('sayı')
        .setDescription('Silinecek mesaj sayısı (1-100)')
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true)
    )
    .addUserOption(option => 
      option.setName('kullanıcı')
        .setDescription('Sadece belirli bir kullanıcının mesajlarını sil')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  
  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });
      
      const amount = interaction.options.getInteger('sayı');
      const targetUser = interaction.options.getUser('kullanıcı');
      const channel = interaction.channel;
      
      // Fetch messages
      const messages = await channel.messages.fetch({ limit: 100 });
      
      let messagesToDelete = messages;
      
      // Filter messages by user if specified
      if (targetUser) {
        messagesToDelete = messages.filter(m => m.author.id === targetUser.id);
      }
      
      // Limit to the specified amount
      messagesToDelete = [...messagesToDelete.values()].slice(0, amount);
      
      // Filter out messages older than 14 days (Discord API limitation)
      const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
      const recentMessages = messagesToDelete.filter(m => m.createdTimestamp > twoWeeksAgo);
      
      if (recentMessages.length === 0) {
        return interaction.editReply({
          content: 'Silinecek uygun mesaj bulunamadı. Mesajlar 14 günden eski olabilir.',
          ephemeral: true
        });
      }
      
      // Delete messages
      let deletedCount = 0;
      
      // Bulk delete if possible (messages newer than 14 days)
      if (recentMessages.length > 1) {
        await channel.bulkDelete(recentMessages, true)
          .then(deleted => {
            deletedCount += deleted.size;
          })
          .catch(error => {
            console.error(`[ERROR] Error bulk deleting messages:`, error);
          });
      } else if (recentMessages.length === 1) {
        // Delete single message
        await recentMessages[0].delete()
          .then(() => {
            deletedCount += 1;
          })
          .catch(error => {
            console.error(`[ERROR] Error deleting single message:`, error);
          });
      }
      
      // Create success embed
      const successEmbed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('🧹 Mesajlar Temizlendi')
        .setDescription(`Toplam **${deletedCount}** mesaj silindi${targetUser ? ` (<@${targetUser.id}> kullanıcısına ait)` : ''}.`)
        .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
      
      await interaction.editReply({ embeds: [successEmbed], ephemeral: true });
      
      // Send a temporary public confirmation
      const tempConfirm = await channel.send({ 
        content: `✅ **${deletedCount}** mesaj ${interaction.user} tarafından silindi.` 
      });
      
      // Delete confirmation after 5 seconds
      setTimeout(() => {
        tempConfirm.delete().catch(() => {});
      }, 5000);
      
    } catch (error) {
      console.error(`[ERROR] Error in clear command:`, error);
      return interaction.editReply({
        content: `Mesajlar silinirken bir hata oluştu: ${error.message}`,
        ephemeral: true
      });
    }
  },
}; 