const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../modules/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kayit')
    .setDescription('Bir kullanıcıyı sunucuya kayıt eder.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addUserOption(option => 
      option.setName('kullanici')
        .setDescription('Kayıt edilecek kullanıcı')
        .setRequired(true)
    )
    .addStringOption(option => 
      option.setName('isim')
        .setDescription('Kullanıcının gerçek ismi')
        .setRequired(true)
    )
    .addIntegerOption(option => 
      option.setName('yas')
        .setDescription('Kullanıcının yaşı')
        .setRequired(true)
        .setMinValue(13)
        .setMaxValue(80)
    )
    .addStringOption(option => 
      option.setName('cinsiyet')
        .setDescription('Kullanıcının cinsiyeti')
        .setRequired(true)
        .addChoices(
          { name: 'Erkek', value: 'erkek' },
          { name: 'Kadın', value: 'kadin' }
        )),

  async execute(interaction) {
    await interaction.deferReply();
    
    // Hedef kullanıcıyı ve seçenekleri al
    const targetUser = interaction.options.getUser('kullanici');
    const targetMember = interaction.guild.members.cache.get(targetUser.id);
    const name = interaction.options.getString('isim');
    const age = interaction.options.getInteger('yas');
    const gender = interaction.options.getString('cinsiyet');
    
    // Kullanıcı kayıt edilebilir mi kontrol et
    if (!targetMember) {
      return interaction.editReply('Bu kullanıcı sunucuda bulunamadı.');
    }
    
    if (targetUser.bot) {
      return interaction.editReply('Bot hesaplarını kayıt edemezsiniz.');
    }
    
    // Yetkiyi kontrol et
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return interaction.editReply('Bu komutu kullanmak için gerekli yetkiye sahip değilsiniz.');
    }
    
    // Yaş kontrolü
    if (age < 13 || age > 80) {
      return interaction.editReply('Geçersiz yaş bilgisi. Yaş 13-80 arasında olmalıdır.');
    }
    
    try {
      // Sunucu ayarlarını kontrol et
      const guildSettings = db.getGuildSettings(interaction.guild.id);
      
      // Rol ayarlarını kontrol et
      const maleRole = guildSettings?.roles?.male 
        ? interaction.guild.roles.cache.get(guildSettings.roles.male) 
        : null;
        
      const femaleRole = guildSettings?.roles?.female 
        ? interaction.guild.roles.cache.get(guildSettings.roles.female) 
        : null;
        
      const memberRole = guildSettings?.roles?.member 
        ? interaction.guild.roles.cache.get(guildSettings.roles.member) 
        : null;
        
      const unregisteredRole = guildSettings?.roles?.unregistered 
        ? interaction.guild.roles.cache.get(guildSettings.roles.unregistered) 
        : null;
      
      // Roller tanımlanmamışsa uyarı ver
      if (!maleRole || !femaleRole || !memberRole) {
        return interaction.editReply({
          content: 'Kayıt rolleri doğru yapılandırılmamış. Lütfen bir yetkili ile iletişime geçin.',
          ephemeral: true
        });
      }
      
      // Kullanıcı verilerini oluştur
      const userData = {
        userID: targetUser.id,
        guildID: interaction.guild.id,
        username: targetUser.username,
        nickname: `${name} | ${age}`,
        originalName: name,
        age: age,
        gender: gender,
        device: targetMember.presence?.clientStatus ? Object.keys(targetMember.presence.clientStatus).join(', ') : 'Bilinmiyor',
        registrarID: interaction.user.id,
        registrationDate: new Date().toISOString()
      };
      
      // Veritabanına kaydet
      db.saveUser(userData);
      
      // Kullanıcının ismini değiştir
      try {
        await targetMember.setNickname(`${name} | ${age}`);
      } catch (error) {
        console.error('İsim değiştirme hatası:', error);
        // İsim değiştirme başarısız olsa bile kayıta devam et
      }
      
      // Kullanıcıya rolleri ver
      try {
        // Eğer kayıtsız rolü varsa kaldır
        if (unregisteredRole && targetMember.roles.cache.has(unregisteredRole.id)) {
          await targetMember.roles.remove(unregisteredRole);
        }
        
        // Cinsiyet rolünü ver
        if (gender === 'erkek' && maleRole) {
          await targetMember.roles.add(maleRole);
        } else if (gender === 'kadin' && femaleRole) {
          await targetMember.roles.add(femaleRole);
        }
        
        // Üye rolünü ver
        if (memberRole) {
          await targetMember.roles.add(memberRole);
        }
      } catch (error) {
        console.error('Rol verme hatası:', error);
        return interaction.editReply('Kullanıcıya roller verilirken bir hata oluştu. Lütfen yetkileri kontrol edin.');
      }
      
      // Başarılı mesajı gönder
      const successEmbed = new EmbedBuilder()
        .setTitle('✅ Kayıt Başarılı')
        .setDescription(`<@${targetUser.id}> kullanıcısı başarıyla kayıt edildi.`)
        .addFields(
          { name: 'Kullanıcı', value: `<@${targetUser.id}>`, inline: true },
          { name: 'Yetkili', value: `<@${interaction.user.id}>`, inline: true },
          { name: 'İsim | Yaş', value: `${name} | ${age}`, inline: true },
          { name: 'Cinsiyet', value: gender === 'erkek' ? 'Erkek' : 'Kadın', inline: true }
        )
        .setColor(gender === 'erkek' ? 0x3498db : 0xe91e63)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .setTimestamp();
      
      return interaction.editReply({ embeds: [successEmbed] });
    } catch (error) {
      console.error('Kayıt hatası:', error);
      return interaction.editReply('Kayıt işlemi sırasında bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    }
  }
}; 