const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sunucu')
    .setDescription('Sunucu yönetim komutları.')
    .addSubcommand(subcommand =>
      subcommand
        .setName('bilgi')
        .setDescription('Sunucu hakkında detaylı bilgi verir.')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('güvenlik')
        .setDescription('Sunucunun güvenlik analizi sonuçlarını gösterir.')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('kilitle')
        .setDescription('Tüm kanalları kilitler (acil durum için).')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('aç')
        .setDescription('Tüm kanalların kilidini açar.')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('uyarılar')
        .setDescription('Bir kullanıcının uyarılarını gösterir.')
        .addUserOption(option =>
          option.setName('kullanıcı')
            .setDescription('Uyarıları görüntülenecek kullanıcı')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('uyarı-temizle')
        .setDescription('Bir kullanıcının tüm uyarılarını temizler.')
        .addUserOption(option =>
          option.setName('kullanıcı')
            .setDescription('Uyarıları temizlenecek kullanıcı')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('istatistik')
        .setDescription('Sunucu etkinlik istatistiklerini gösterir.')
    ),
  
  async execute(interaction) {
    // Kullanıcının gerekli izinlere sahip olup olmadığını kontrol et
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild) && 
        !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        content: '❌ Bu komutu kullanmak için yeterli izne sahip değilsiniz!',
        ephemeral: true
      });
    }
    
    const subcommand = interaction.options.getSubcommand();
    const client = interaction.client;
    
    // GuildManager'a erişim
    const guildManager = client.guildManager;
    if (!guildManager) {
      return interaction.reply({
        content: '❌ Sistem hazır değil. Lütfen daha sonra tekrar deneyin.',
        ephemeral: true
      });
    }
    
    switch (subcommand) {
      case 'bilgi':
        await handleServerInfo(interaction);
        break;
      
      case 'güvenlik':
        await handleSecurityAnalysis(interaction, guildManager);
        break;
      
      case 'kilitle':
        await handleLockdown(interaction, guildManager, true);
        break;
      
      case 'aç':
        await handleLockdown(interaction, guildManager, false);
        break;
      
      case 'uyarılar':
        await handleWarnings(interaction, guildManager);
        break;
      
      case 'uyarı-temizle':
        await handleClearWarnings(interaction, guildManager);
        break;
      
      case 'istatistik':
        await handleServerStats(interaction, guildManager);
        break;
    }
  },
};

// Sunucu bilgilerini gösterme
async function handleServerInfo(interaction) {
  await interaction.deferReply();
  
  const guild = interaction.guild;
  
  // Emoji sayacı
  const emojis = {
    regular: guild.emojis.cache.filter(emoji => !emoji.animated).size,
    animated: guild.emojis.cache.filter(emoji => emoji.animated).size,
    total: guild.emojis.cache.size
  };
  
  // Kanal sayacı
  const channels = {
    text: guild.channels.cache.filter(c => c.type === 0).size,
    voice: guild.channels.cache.filter(c => c.type === 2).size,
    category: guild.channels.cache.filter(c => c.type === 4).size,
    total: guild.channels.cache.size
  };
  
  // Üye sayacı
  const members = {
    human: guild.members.cache.filter(member => !member.user.bot).size,
    bot: guild.members.cache.filter(member => member.user.bot).size,
    total: guild.memberCount
  };
  
  // Rol sayacı
  const roles = {
    total: guild.roles.cache.size - 1 // @everyone rolünü çıkar
  };
  
  // Sunucu oluşturulma zamanı
  const creationDate = Math.floor(guild.createdTimestamp / 1000);
  
  // Doğrulama seviyesi
  const verificationLevel = {
    NONE: 'Yok',
    LOW: 'Düşük',
    MEDIUM: 'Orta',
    HIGH: 'Yüksek',
    VERY_HIGH: 'En Yüksek'
  }[guild.verificationLevel] || 'Bilinmiyor';
  
  // Embed oluştur
  const embed = new EmbedBuilder()
    .setColor('#5865F2')
    .setTitle(`📊 ${guild.name} | Sunucu Bilgileri`)
    .setThumbnail(guild.iconURL({ dynamic: true }))
    .addFields(
      { name: '🆔 Sunucu ID', value: guild.id, inline: true },
      { name: '👑 Sahip', value: `<@${guild.ownerId}>`, inline: true },
      { name: '📅 Oluşturulma Tarihi', value: `<t:${creationDate}:F>\n(<t:${creationDate}:R>)`, inline: false },
      { name: '👤 Üyeler', value: `Toplam: ${members.total}\nİnsan: ${members.human}\nBot: ${members.bot}`, inline: true },
      { name: '📝 Kanallar', value: `Toplam: ${channels.total}\nYazı: ${channels.text}\nSes: ${channels.voice}\nKategori: ${channels.category}`, inline: true },
      { name: '🏷️ Roller', value: `${roles.total}`, inline: true },
      { name: '😀 Emojiler', value: `Toplam: ${emojis.total}\nHareketsiz: ${emojis.regular}\nHareketli: ${emojis.animated}`, inline: true },
      { name: '🔒 Doğrulama Seviyesi', value: verificationLevel, inline: true },
      { name: '🚀 Boost Seviyesi', value: `Level ${guild.premiumTier} (${guild.premiumSubscriptionCount} boost)`, inline: true }
    )
    .setFooter({ text: `${interaction.user.tag} tarafından istendi`, iconURL: interaction.user.displayAvatarURL() })
    .setTimestamp();
  
  await interaction.editReply({ embeds: [embed] });
}

// Güvenlik analizi
async function handleSecurityAnalysis(interaction, guildManager) {
  await interaction.deferReply();
  
  const guild = interaction.guild;
  
  try {
    // Güvenlik analizi yap
    const securityReport = await guildManager.analyzeServerSecurity(guild);
    
    if (!securityReport) {
      return interaction.editReply('⚠️ Güvenlik raporu oluşturulamadı.');
    }
    
    // Güvenlik puanına göre renk belirle
    let color;
    if (securityReport.score >= 80) {
      color = '#00FF00'; // Yeşil
    } else if (securityReport.score >= 50) {
      color = '#FFFF00'; // Sarı
    } else {
      color = '#FF0000'; // Kırmızı
    }
    
    // Güvenlik sorunlarını formatlı hale getir
    const issuesList = securityReport.issues.length > 0
      ? securityReport.issues.map(issue => `• ${issue}`).join('\n')
      : 'Tespit edilen güvenlik sorunu yok. Harika!';
    
    // Embed oluştur
    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle('🛡️ Sunucu Güvenlik Analizi')
      .setThumbnail(guild.iconURL({ dynamic: true }))
      .addFields(
        { name: '📊 Güvenlik Puanı', value: `${securityReport.score}/100`, inline: false },
        { name: '⚠️ Tespit Edilen Sorunlar', value: issuesList, inline: false },
        { name: '📝 Tavsiyeler', value: securityReport.score < 100 
            ? 'Güvenlik puanınızı artırmak için tespit edilen sorunları giderin.'
            : 'Sunucunuz tam güvenli durumda!', inline: false }
      )
      .setFooter({ text: `${interaction.user.tag} tarafından istendi`, iconURL: interaction.user.displayAvatarURL() })
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Güvenlik analizi sırasında hata:', error);
    await interaction.editReply('❌ Güvenlik analizi yapılırken bir hata oluştu.');
  }
}

// Sunucu kilitleme/açma
async function handleLockdown(interaction, guildManager, lock) {
  await interaction.deferReply();
  
  const guild = interaction.guild;
  
  try {
    // Sunucuyu kilitle/aç
    await guildManager.lockdownServer(guild, lock);
    
    // Başarı mesajı
    await interaction.editReply({
      content: lock 
        ? '🔒 Sunucu başarıyla kilitlendi! Tüm kanallarda mesaj gönderme devre dışı bırakıldı.'
        : '🔓 Sunucu kilidi başarıyla açıldı! Tüm kanallarda mesaj gönderme tekrar aktif.'
    });
  } catch (error) {
    console.error('Sunucu kilitleme/açma sırasında hata:', error);
    await interaction.editReply('❌ İşlem sırasında bir hata oluştu.');
  }
}

// Kullanıcı uyarılarını görüntüleme
async function handleWarnings(interaction, guildManager) {
  const targetUser = interaction.options.getUser('kullanıcı');
  const guild = interaction.guild;
  
  // Kullanıcının uyarılarını getir
  const warnings = guildManager.getUserWarnings(targetUser.id, guild.id);
  
  if (!warnings || warnings.length === 0) {
    return interaction.reply({
      content: `⚠️ **${targetUser.tag}** adlı kullanıcının herhangi bir uyarısı bulunmuyor.`,
      ephemeral: true
    });
  }
  
  // Uyarıları formatlı şekilde göster
  const warningsFormatted = warnings.map((warning, index) => {
    const date = new Date(warning.timestamp);
    return `**${index + 1}.** <t:${Math.floor(date.getTime() / 1000)}:R> - ${warning.reason}`;
  }).join('\n');
  
  // Embed oluştur
  const embed = new EmbedBuilder()
    .setColor('#FFA500')
    .setTitle(`⚠️ ${targetUser.tag} için Uyarılar`)
    .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
    .setDescription(warningsFormatted)
    .setFooter({ text: `Toplam Uyarı: ${warnings.length}`, iconURL: interaction.user.displayAvatarURL() })
    .setTimestamp();
  
  await interaction.reply({ embeds: [embed] });
}

// Kullanıcı uyarılarını temizleme
async function handleClearWarnings(interaction, guildManager) {
  const targetUser = interaction.options.getUser('kullanıcı');
  const guild = interaction.guild;
  
  // Uyarıları temizle
  guildManager.clearWarnings(targetUser.id, guild.id);
  
  // Başarı mesajı
  await interaction.reply({
    content: `✅ **${targetUser.tag}** adlı kullanıcının tüm uyarıları temizlendi.`,
    ephemeral: true
  });
}

// Sunucu istatistiklerini görüntüleme
async function handleServerStats(interaction, guildManager) {
  await interaction.deferReply();
  
  const guild = interaction.guild;
  
  try {
    // Sunucu istatistiklerini getir
    const stats = await guildManager.analyzeServerActivity(guild);
    
    if (!stats) {
      return interaction.editReply('⚠️ İstatistikler oluşturulamadı.');
    }
    
    // Embed oluştur
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('📊 Sunucu Etkinlik İstatistikleri')
      .setThumbnail(guild.iconURL({ dynamic: true }))
      .addFields(
        { name: '📝 Bugünkü Mesajlar', value: `${stats.messagesToday}`, inline: true },
        { name: '👤 Yeni Üyeler', value: `${stats.newMembers}`, inline: true },
        { name: '🔊 Aktif Üyeler', value: `${stats.activeMembers}`, inline: true },
        { name: '🏆 En Aktif Kanal', value: `#${stats.mostActiveChannel}`, inline: true }
      )
      .setFooter({ text: `${interaction.user.tag} tarafından istendi`, iconURL: interaction.user.displayAvatarURL() })
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('İstatistikler alınırken hata:', error);
    await interaction.editReply('❌ İstatistikler alınırken bir hata oluştu.');
  }
} 