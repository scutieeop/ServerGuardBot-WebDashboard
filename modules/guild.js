const { EmbedBuilder, AuditLogEvent, PermissionsBitField } = require('discord.js');
const config = require('../config.json');
const { checkProfanity } = require('../utils/profanityFilter');

// Ana sunucu koruma ve yönetim modülü
class GuildManager {
  constructor(client) {
    this.client = client;
    this.antiSpamCache = new Map();
    this.antiRaidCache = new Map();
    this.joinedAt = new Map();
    this.userWarnings = new Map();
    this.backupRoles = new Map();
    this.inviteCache = new Map();
    
    // Log mesajları
    this.logMessages = {
      memberJoin: (member) => `👋 **${member.user.tag}** sunucuya katıldı. (${member.id})`,
      memberLeave: (member) => `🚶 **${member.user.tag}** sunucudan ayrıldı. (${member.id})`,
      messageDelete: (message) => `🗑️ **${message.author.tag}** tarafından gönderilen mesaj silindi: ${message.content}`,
      messageEdit: (oldMsg, newMsg) => `✏️ **${oldMsg.author.tag}** bir mesajı düzenledi.\nÖnceki: ${oldMsg.content}\nSonraki: ${newMsg.content}`,
      memberBan: (user, reason) => `🔨 **${user.tag}** sunucudan yasaklandı. Sebep: ${reason || 'Belirtilmedi'}`,
      memberUnban: (user) => `🔓 **${user.tag}** kullanıcısının yasağı kaldırıldı.`,
      memberKick: (user, reason) => `👢 **${user.tag}** sunucudan atıldı. Sebep: ${reason || 'Belirtilmedi'}`,
      channelCreate: (channel) => `📝 **${channel.name}** kanalı oluşturuldu.`,
      channelDelete: (channel) => `🗑️ **${channel.name}** kanalı silindi.`,
      roleCreate: (role) => `✨ **${role.name}** rolü oluşturuldu.`,
      roleDelete: (role) => `🗑️ **${role.name}** rolü silindi.`,
      roleUpdate: (oldRole, newRole) => `✏️ **${oldRole.name}** rolü güncellendi. Yeni isim: **${newRole.name}**`
    };
    
    // Event dinleyicilerini kaydet
    this.registerEvents();
  }

  // Event dinleyicilerini kaydet
  registerEvents() {
    const client = this.client;
    
    // Kullanıcı sunucuya katıldığında
    client.on('guildMemberAdd', member => this.handleMemberAdd(member));
    
    // Kullanıcı sunucudan ayrıldığında
    client.on('guildMemberRemove', member => this.handleMemberRemove(member));
    
    // Mesaj gönderildiğinde
    client.on('messageCreate', message => this.handleMessage(message));
    
    // Mesaj düzenlendiğinde
    client.on('messageUpdate', (oldMessage, newMessage) => this.handleMessageUpdate(oldMessage, newMessage));
    
    // Mesaj silindiğinde
    client.on('messageDelete', message => this.handleMessageDelete(message));
    
    // Yasaklama işlemi yapıldığında
    client.on('guildBanAdd', ban => this.handleBanAdd(ban));
    
    // Yasaklama kaldırıldığında
    client.on('guildBanRemove', ban => this.handleBanRemove(ban));
    
    // Kanal oluşturulduğunda
    client.on('channelCreate', channel => this.handleChannelCreate(channel));
    
    // Kanal silindiğinde
    client.on('channelDelete', channel => this.handleChannelDelete(channel));
    
    // Rol oluşturulduğunda
    client.on('roleCreate', role => this.handleRoleCreate(role));
    
    // Rol silindiğinde
    client.on('roleDelete', role => this.handleRoleDelete(role));
    
    // Rol güncellendiğinde
    client.on('roleUpdate', (oldRole, newRole) => this.handleRoleUpdate(oldRole, newRole));
    
    console.log('[INFO] GuildManager: Tüm event dinleyicileri başarıyla kaydedildi.');
  }
  
  // ======================== EVENT İŞLEYİCİLER ========================
  
  // Kullanıcı sunucuya katıldığında
  async handleMemberAdd(member) {
    if (!member.guild) return;
    
    // Log kanalına bildir
    this.sendLogMessage(member.guild, this.logMessages.memberJoin(member));
    
    // Kullanıcının giriş zamanını kaydet (Anti-Raid için)
    this.joinedAt.set(member.id, Date.now());
    
    // Anti-Raid kontrolü
    await this.checkAntiRaid(member);
    
    // Giriş davet takibi
    await this.trackInvite(member);
    
    // Hoş geldin mesajı
    if (config.welcomeSystem && config.welcomeSystem.enabled) {
      await this.sendWelcomeMessage(member);
    }
  }

  // Kullanıcı sunucudan ayrıldığında
  async handleMemberRemove(member) {
    if (!member.guild) return;
    
    // Log kanalına bildir
    this.sendLogMessage(member.guild, this.logMessages.memberLeave(member));
  }

  // Mesaj gönderildiğinde
  async handleMessage(message) {
    if (!message.guild || message.author.bot) return;
    
    // Anti-Spam kontrolü
    await this.checkAntiSpam(message);
    
    // Küfür kontrolü
    await this.checkProfanity(message);
    
    // Reklam kontrolü
    await this.checkAdvertisement(message);
    
    // Büyük harf kontrolü
    await this.checkCapsLock(message);
  }

  // Mesaj düzenlendiğinde
  async handleMessageUpdate(oldMessage, newMessage) {
    if (!newMessage.guild || newMessage.author?.bot) return;
    
    // Düzenlenen mesajı loglama
    this.sendLogMessage(newMessage.guild, this.logMessages.messageEdit(oldMessage, newMessage));
    
    // Küfür kontrolü (düzenlenen mesajda)
    await this.checkProfanity(newMessage);
    
    // Reklam kontrolü (düzenlenen mesajda)
    await this.checkAdvertisement(newMessage);
  }

  // Mesaj silindiğinde
  async handleMessageDelete(message) {
    if (!message.guild || message.author?.bot) return;
    
    // Silinen mesajı loglama
    this.sendLogMessage(message.guild, this.logMessages.messageDelete(message));
  }

  // Yasaklama işlemi yapıldığında
  async handleBanAdd(ban) {
    const guild = ban.guild;
    const user = ban.user;
    
    // Denetim kaydını kontrol et
    const fetchedLogs = await guild.fetchAuditLogs({
      limit: 1,
      type: AuditLogEvent.MemberBanAdd,
    }).catch(() => null);
    
    const banLog = fetchedLogs?.entries.first();
    const reason = banLog ? banLog.reason : 'Sebep belirtilmedi';
    
    // Yasaklamayı logla
    this.sendLogMessage(guild, this.logMessages.memberBan(user, reason));
  }

  // Yasaklama kaldırıldığında
  async handleBanRemove(ban) {
    const guild = ban.guild;
    const user = ban.user;
    
    // Yasağın kaldırılmasını logla
    this.sendLogMessage(guild, this.logMessages.memberUnban(user));
  }

  // Kanal oluşturulduğunda
  async handleChannelCreate(channel) {
    if (!channel.guild) return;
    
    // Kanal oluşturulmasını logla
    this.sendLogMessage(channel.guild, this.logMessages.channelCreate(channel));
  }

  // Kanal silindiğinde
  async handleChannelDelete(channel) {
    if (!channel.guild) return;
    
    // Kanal silinmesini logla
    this.sendLogMessage(channel.guild, this.logMessages.channelDelete(channel));
  }

  // Rol oluşturulduğunda
  async handleRoleCreate(role) {
    if (!role.guild) return;
    
    // Rol oluşturulmasını logla
    this.sendLogMessage(role.guild, this.logMessages.roleCreate(role));
    
    // Rol yedekleme
    this.backupRole(role);
  }

  // Rol silindiğinde
  async handleRoleDelete(role) {
    if (!role.guild) return;
    
    // Rol silinmesini logla
    this.sendLogMessage(role.guild, this.logMessages.roleDelete(role));
  }

  // Rol güncellendiğinde
  async handleRoleUpdate(oldRole, newRole) {
    if (!newRole.guild) return;
    
    // Rol güncellenmesini logla
    this.sendLogMessage(newRole.guild, this.logMessages.roleUpdate(oldRole, newRole));
    
    // Rol yedekleme
    this.backupRole(newRole);
  }

  // ======================== KORUMA FONKSİYONLARI ========================
  
  // Anti-Spam kontrolü
  async checkAntiSpam(message) {
    if (!config.serverGuard.antiSpam.enabled) return;
    
    const { maxMessages, interval, punishment } = config.serverGuard.antiSpam;
    const userId = message.author.id;
    
    if (!this.antiSpamCache.has(userId)) {
      this.antiSpamCache.set(userId, {
        messages: [message],
        timer: setTimeout(() => {
          this.antiSpamCache.delete(userId);
        }, interval)
      });
    } else {
      const userData = this.antiSpamCache.get(userId);
      userData.messages.push(message);
      
      if (userData.messages.length >= maxMessages) {
        // Spam tespit edildi
        clearTimeout(userData.timer);
        this.antiSpamCache.delete(userId);
        
        // Kullanıcıyı cezalandır
        await this.punishUser(message.member, punishment, 'Spam tespit edildi');
        
        // Son mesajları sil
        const messagesToDelete = userData.messages.slice(-maxMessages);
        message.channel.bulkDelete(messagesToDelete).catch(() => {});
        
        // Log mesajı gönder
        this.sendLogMessage(message.guild, `⚠️ **${message.author.tag}** spam yaptığı için ${punishment} cezası aldı.`);
      }
    }
  }

  // Anti-Raid kontrolü
  async checkAntiRaid(member) {
    if (!config.serverGuard.antiRaid.enabled) return;
    
    const { maxJoins, interval, punishment } = config.serverGuard.antiRaid;
    const guild = member.guild;
    const now = Date.now();
    
    // Son X sürede katılan kullanıcıları kontrol et
    const recentJoins = [...this.joinedAt.entries()]
      .filter(([_, timestamp]) => now - timestamp < interval)
      .map(([id]) => id);
    
    if (recentJoins.length >= maxJoins) {
      // Raid tespit edildi
      this.sendLogMessage(guild, `🚨 **RAID ALARMI!** Son ${interval / 1000} saniyede ${recentJoins.length} kullanıcı katıldı!`);
      
      // Yeni katılan kullanıcıları cezalandır
      for (const userId of recentJoins) {
        const raidMember = await guild.members.fetch(userId).catch(() => null);
        if (raidMember) {
          await this.punishUser(raidMember, punishment, 'Raid koruması: Hızlı katılım');
        }
      }
      
      // Sunucuyu kitleme (opsiyonel)
      if (punishment === 'lockdown') {
        await this.lockdownServer(guild, true);
      }
    }
  }

  // Küfür kontrolü
  async checkProfanity(message) {
    if (!config.profanityFilter.enabled) return;
    
    // Mesaj içeriğinde küfür var mı kontrol et
    if (checkProfanity(message.content)) {
      const { punishment, warnUser } = config.profanityFilter;
      
      // Kullanıcıyı uyar
      if (warnUser) {
        const warningMsg = await message.channel.send({
          content: `<@${message.author.id}>, küfür içeren mesaj göndermeniz yasaktır!`,
        });
        
        // Uyarı mesajını 5 saniye sonra sil
        setTimeout(() => warningMsg.delete().catch(() => {}), 5000);
      }
      
      // Küfürlü mesajı sil
      if (punishment === 'delete') {
        await message.delete().catch(() => {});
      }
      
      // Kullanıcı uyarılarını kaydet
      this.warnUser(message.author.id, message.guild.id, 'Küfür içeren mesaj');
      
      // Log mesajı gönder
      this.sendLogMessage(message.guild, `🔞 **${message.author.tag}** küfür içeren bir mesaj gönderdi.`);
    }
  }

  // Reklam kontrolü
  async checkAdvertisement(message) {
    if (!config.serverGuard.antiAd?.enabled) return;
    
    // Discord davet bağlantısı veya yaygın URL kalıpları için regex
    const adRegex = /(https?:\/\/)?(www\.)?(discord\.(gg|io|me|li)|discordapp\.com\/invite|discord\.com\/invite)\/[a-zA-Z0-9]+/i;
    
    if (adRegex.test(message.content)) {
      // Yetkili kontrolü
      if (message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;
      
      // Kullanıcı linki silmek için yetkiliyse kontrolü
      const whitelistedChannels = config.serverGuard.antiAd.whitelistedChannels || [];
      if (whitelistedChannels.includes(message.channel.id)) return;
      
      // Reklam tespit edildi, mesajı sil
      await message.delete().catch(() => {});
      
      // Kullanıcıyı uyar
      const warningMsg = await message.channel.send({
        content: `<@${message.author.id}>, reklam içeren mesaj göndermeniz yasaktır!`,
      });
      
      // Uyarı mesajını 5 saniye sonra sil
      setTimeout(() => warningMsg.delete().catch(() => {}), 5000);
      
      // Kullanıcı uyarılarını kaydet
      this.warnUser(message.author.id, message.guild.id, 'Reklam içeren mesaj');
      
      // Log mesajı gönder
      this.sendLogMessage(message.guild, `📢 **${message.author.tag}** reklam içeren bir mesaj gönderdi.`);
    }
  }

  // CapsLock kontrolü
  async checkCapsLock(message) {
    if (!config.serverGuard.antiCaps?.enabled) return;
    
    const { minLength, percentage } = config.serverGuard.antiCaps;
    const content = message.content;
    
    // Minimum uzunluk kontrolü
    if (content.length < minLength) return;
    
    // Büyük harf yüzdesini hesapla
    const upperCaseCount = content.replace(/[^A-ZĞÜŞİÖÇ]/g, '').length;
    const upperCasePercentage = (upperCaseCount / content.length) * 100;
    
    if (upperCasePercentage > percentage) {
      // CapsLock tespit edildi, mesajı sil
      await message.delete().catch(() => {});
      
      // Kullanıcıyı uyar
      const warningMsg = await message.channel.send({
        content: `<@${message.author.id}>, çok fazla büyük harf kullanımı yasaktır!`,
      });
      
      // Uyarı mesajını 5 saniye sonra sil
      setTimeout(() => warningMsg.delete().catch(() => {}), 5000);
      
      // Log mesajı gönder
      this.sendLogMessage(message.guild, `🔠 **${message.author.tag}** çok fazla büyük harf içeren bir mesaj gönderdi.`);
    }
  }

  // ======================== YARDIMCI FONKSİYONLAR ========================
  
  // Log kanalına mesaj gönderme
  async sendLogMessage(guild, message) {
    if (!guild || !config.serverGuard.logChannelId) return;
    
    const logChannel = guild.channels.cache.get(config.serverGuard.logChannelId);
    if (logChannel) {
      const logEmbed = new EmbedBuilder()
        .setColor('#2b2d31')
        .setDescription(message)
        .setTimestamp();
      
      await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
    }
  }

  // Kullanıcıyı cezalandırma
  async punishUser(member, punishment, reason) {
    if (!member || !member.guild) return;
    
    switch (punishment) {
      case 'warn':
        this.warnUser(member.id, member.guild.id, reason);
        break;
      
      case 'kick':
        await member.kick(`[ServerGuard] ${reason}`).catch(() => {});
        break;
      
      case 'ban':
        await member.ban({ reason: `[ServerGuard] ${reason}`, deleteMessageDays: 1 }).catch(() => {});
        break;
      
      case 'timeout':
        const duration = 10 * 60 * 1000; // 10 dakika
        await member.timeout(duration, `[ServerGuard] ${reason}`).catch(() => {});
        break;
      
      case 'mute':
        const muteRole = member.guild.roles.cache.find(r => r.name === 'Muted');
        if (muteRole) {
          await member.roles.add(muteRole, `[ServerGuard] ${reason}`).catch(() => {});
        }
        break;
    }
  }

  // Kullanıcıyı uyarma
  warnUser(userId, guildId, reason) {
    const key = `${guildId}-${userId}`;
    
    if (!this.userWarnings.has(key)) {
      this.userWarnings.set(key, []);
    }
    
    const warnings = this.userWarnings.get(key);
    warnings.push({
      timestamp: Date.now(),
      reason
    });
    
    // Maksimum uyarı kontrolü
    if (warnings.length >= 3) {
      const guild = this.client.guilds.cache.get(guildId);
      if (guild) {
        guild.members.fetch(userId).then(member => {
          if (member) {
            this.punishUser(member, 'timeout', '3 uyarı limitine ulaşıldı');
            this.sendLogMessage(guild, `⚠️ **${member.user.tag}** 3 uyarı limitine ulaştığı için zaman aşımına alındı.`);
          }
        }).catch(() => {});
      }
      
      // Uyarıları sıfırla
      this.userWarnings.set(key, []);
    }
  }

  // Kullanıcı uyarılarını getirme
  getUserWarnings(userId, guildId) {
    const key = `${guildId}-${userId}`;
    return this.userWarnings.get(key) || [];
  }

  // Sunucuyu kilitleme/kilit açma
  async lockdownServer(guild, lock = true) {
    if (!guild) return;
    
    const channels = guild.channels.cache.filter(c => c.type === 0); // Text kanalları
    
    for (const [_, channel] of channels) {
      await channel.permissionOverwrites.edit(guild.roles.everyone, {
        SendMessages: lock ? false : null
      }).catch(() => {});
    }
    
    // Log mesajı gönder
    this.sendLogMessage(guild, lock 
      ? '🔒 **Sunucu kilitleme aktif!** Tüm kanallarda mesaj gönderme devre dışı bırakıldı.'
      : '🔓 **Sunucu kilidi açıldı!** Tüm kanallarda mesaj gönderme tekrar aktif.');
  }

  // Rol yedekleme
  backupRole(role) {
    if (!role || !role.guild) return;
    
    const guildId = role.guild.id;
    
    if (!this.backupRoles.has(guildId)) {
      this.backupRoles.set(guildId, new Map());
    }
    
    const guildRoles = this.backupRoles.get(guildId);
    
    guildRoles.set(role.id, {
      id: role.id,
      name: role.name,
      color: role.color,
      hoist: role.hoist,
      permissions: role.permissions.bitfield,
      mentionable: role.mentionable,
      position: role.position,
      timestamp: Date.now()
    });
  }

  // Giriş davetini takip etme
  async trackInvite(member) {
    const guild = member.guild;
    
    try {
      // Mevcut davetleri getir
      const guildInvites = await guild.invites.fetch();
      
      // Önceki davet listesi ile karşılaştır
      const oldInvites = this.inviteCache.get(guild.id) || new Map();
      
      // Davetin kullanım sayısı artan daveti bul
      let usedInvite = null;
      
      guildInvites.each(invite => {
        const oldInvite = oldInvites.get(invite.code);
        if (oldInvite && invite.uses > oldInvite.uses) {
          usedInvite = invite;
        }
      });
      
      // Yeni davet listesini güncelle
      const newInvites = new Map();
      guildInvites.each(invite => {
        newInvites.set(invite.code, invite);
      });
      this.inviteCache.set(guild.id, newInvites);
      
      // Kullanılan daveti log kanalına bildir
      if (usedInvite) {
        const inviterUser = await this.client.users.fetch(usedInvite.inviterId).catch(() => null);
        const inviterTag = inviterUser ? inviterUser.tag : 'Bilinmeyen Kullanıcı';
        
        this.sendLogMessage(guild, `📥 **${member.user.tag}** sunucuya katıldı. ${inviterTag} tarafından davet edildi. (Kod: ${usedInvite.code}, Kullanım: ${usedInvite.uses})`);
      } else {
        this.sendLogMessage(guild, `📥 **${member.user.tag}** sunucuya katıldı. Davet eden kullanıcı tespit edilemedi.`);
      }
    } catch (error) {
      console.error('Davet takibi sırasında hata:', error);
    }
  }

  // Hoş geldin mesajı gönderme
  async sendWelcomeMessage(member) {
    const welcomeChannelId = config.welcomeSystem.welcomeChannelId;
    if (!welcomeChannelId) return;
    
    const welcomeChannel = member.guild.channels.cache.get(welcomeChannelId);
    if (!welcomeChannel) return;
    
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
    
    await welcomeChannel.send({ embeds: [welcomeEmbed] }).catch(() => {});
  }
  
  // ======================== API FONKSİYONLARI ========================
  
  // Kullanıcı uyarılarını temizleme
  clearWarnings(userId, guildId) {
    const key = `${guildId}-${userId}`;
    this.userWarnings.delete(key);
    return true;
  }
  
  // Sunucu güvenlik durumunu inceleme
  async analyzeServerSecurity(guild) {
    if (!guild) return null;
    
    // Sunucu güvenlik puanını hesapla
    let securityScore = 100;
    const securityIssues = [];
    
    // Sunucu doğrulama seviyesi kontrolü
    if (guild.verificationLevel === 'NONE') {
      securityScore -= 20;
      securityIssues.push('Sunucu doğrulama seviyesi çok düşük.');
    } else if (guild.verificationLevel === 'LOW') {
      securityScore -= 10;
      securityIssues.push('Sunucu doğrulama seviyesi düşük.');
    }
    
    // @everyone rolünün izinleri kontrolü
    const everyoneRole = guild.roles.everyone;
    if (everyoneRole.permissions.has(PermissionsBitField.Flags.Administrator) || 
        everyoneRole.permissions.has(PermissionsBitField.Flags.BanMembers) || 
        everyoneRole.permissions.has(PermissionsBitField.Flags.KickMembers) || 
        everyoneRole.permissions.has(PermissionsBitField.Flags.ManageChannels) || 
        everyoneRole.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      securityScore -= 30;
      securityIssues.push('@everyone rolünde tehlikeli izinler mevcut.');
    }
    
    // Yönetici iznine sahip rollerin sayısı
    const adminRoles = guild.roles.cache.filter(r => r.permissions.has(PermissionsBitField.Flags.Administrator));
    if (adminRoles.size > 3) {
      securityScore -= 15;
      securityIssues.push(`${adminRoles.size} adet yönetici iznine sahip rol var.`);
    }
    
    // 2FA gerektirmiyor mu
    if (!guild.mfaLevel) {
      securityScore -= 10;
      securityIssues.push('Yönetici eylemler için 2FA zorunlu değil.');
    }
    
    // Açık izinlere sahip kanallar
    const publicChannels = guild.channels.cache.filter(c => {
      if (c.type !== 0) return false; // Sadece metin kanalları
      
      const everyonePerms = c.permissionOverwrites.cache.get(guild.id);
      return everyonePerms && everyonePerms.allow.has(PermissionsBitField.Flags.SendMessages);
    });
    
    if (publicChannels.size > guild.channels.cache.filter(c => c.type === 0).size * 0.8) {
      securityScore -= 5;
      securityIssues.push('Çoğu metin kanalı herkese açık.');
    }
    
    // Sonuçları döndür
    return {
      score: Math.max(0, securityScore),
      issues: securityIssues,
      timestamp: Date.now()
    };
  }
  
  // Sunucu etkinliğini analiz etme
  async analyzeServerActivity(guild, days = 7) {
    if (!guild) return null;
    
    // Sunucunun son X gündeki etkinliklerini analiz et
    const startTime = Date.now() - (days * 24 * 60 * 60 * 1000);
    
    // Mesaj sayısı, yeni üyeler vb. istatistikleri toplama işlemleri burada yer alacak
    // Gerçek bir implementasyonda bu veriler bir veritabanından çekilir
    
    return {
      messagesToday: Math.floor(Math.random() * 200), // Örnek veri
      newMembers: Math.floor(Math.random() * 10),
      activeMembers: Math.floor(guild.memberCount * 0.3),
      mostActiveChannel: guild.channels.cache.filter(c => c.type === 0).random()?.name || 'Bilinmiyor',
      timestamp: Date.now()
    };
  }
}

module.exports = GuildManager; 