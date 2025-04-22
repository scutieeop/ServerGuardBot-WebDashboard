const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('koruma')
    .setDescription('Sunucu koruma ayarlarını yönetir.')
    .addSubcommand(subcommand =>
      subcommand
        .setName('durum')
        .setDescription('Sunucu koruma sistemlerinin durumunu gösterir.')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('aç')
        .setDescription('Bir koruma sistemini etkinleştirir.')
        .addStringOption(option =>
          option.setName('sistem')
            .setDescription('Etkinleştirilecek koruma sistemi')
            .setRequired(true)
            .addChoices(
              { name: 'Sunucu Koruma', value: 'serverGuard' },
              { name: 'Küfür Filtresi', value: 'profanityFilter' },
              { name: 'Spam Koruması', value: 'antiSpam' },
              { name: 'Raid Koruması', value: 'antiRaid' }
            )
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('kapat')
        .setDescription('Bir koruma sistemini devre dışı bırakır.')
        .addStringOption(option =>
          option.setName('sistem')
            .setDescription('Devre dışı bırakılacak koruma sistemi')
            .setRequired(true)
            .addChoices(
              { name: 'Sunucu Koruma', value: 'serverGuard' },
              { name: 'Küfür Filtresi', value: 'profanityFilter' },
              { name: 'Spam Koruması', value: 'antiSpam' },
              { name: 'Raid Koruması', value: 'antiRaid' }
            )
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  
  async execute(interaction) {
    try {
      const subcommand = interaction.options.getSubcommand();
      
      switch (subcommand) {
        case 'durum':
          // Show status of all protection systems
          const statusEmbed = new EmbedBuilder()
            .setColor('#0099FF')
            .setTitle('🛡️ Sunucu Koruma Durumu')
            .addFields(
              { name: 'Sunucu Koruma', value: config.serverGuard.enabled ? '✅ Aktif' : '❌ Devre Dışı', inline: true },
              { name: 'Küfür Filtresi', value: config.profanityFilter.enabled ? '✅ Aktif' : '❌ Devre Dışı', inline: true },
              { name: 'Spam Koruması', value: config.serverGuard.antiSpam.enabled ? '✅ Aktif' : '❌ Devre Dışı', inline: true },
              { name: 'Raid Koruması', value: config.serverGuard.antiRaid.enabled ? '✅ Aktif' : '❌ Devre Dışı', inline: true }
            )
            .setTimestamp();
          
          await interaction.reply({ embeds: [statusEmbed] });
          break;
          
        case 'aç':
        case 'kapat':
          const system = interaction.options.getString('sistem');
          const enabled = subcommand === 'aç';
          const configCopy = { ...config };
          
          // Update the specified system's enabled status
          switch (system) {
            case 'serverGuard':
              configCopy.serverGuard.enabled = enabled;
              break;
            case 'profanityFilter':
              configCopy.profanityFilter.enabled = enabled;
              break;
            case 'antiSpam':
              configCopy.serverGuard.antiSpam.enabled = enabled;
              break;
            case 'antiRaid':
              configCopy.serverGuard.antiRaid.enabled = enabled;
              break;
          }
          
          // Save updated config to file
          fs.writeFileSync(
            path.join(__dirname, '../config.json'),
            JSON.stringify(configCopy, null, 2)
          );
          
          // Update the running config
          Object.assign(config, configCopy);
          
          // Send confirmation
          const confirmEmbed = new EmbedBuilder()
            .setColor(enabled ? '#00FF00' : '#FF0000')
            .setTitle(`🛡️ Koruma Sistemi ${enabled ? 'Etkinleştirildi' : 'Devre Dışı Bırakıldı'}`)
            .setDescription(`**${getSystemName(system)}** sistemi ${enabled ? 'etkinleştirildi' : 'devre dışı bırakıldı'}.`)
            .setTimestamp();
          
          await interaction.reply({ embeds: [confirmEmbed] });
          break;
      }
    } catch (error) {
      console.error(`[ERROR] Error in guard command:`, error);
      return interaction.reply({
        content: 'Komut çalıştırılırken bir hata oluştu!',
        ephemeral: true
      });
    }
  },
};

// Helper function to get system name
function getSystemName(system) {
  switch (system) {
    case 'serverGuard': return 'Sunucu Koruma';
    case 'profanityFilter': return 'Küfür Filtresi';
    case 'antiSpam': return 'Spam Koruması';
    case 'antiRaid': return 'Raid Koruması';
    default: return system;
  }
} 