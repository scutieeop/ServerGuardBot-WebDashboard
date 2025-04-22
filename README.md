# Gelişmiş Discord Server Guard Bot

Bu bot, Discord sunucunuz için gelişmiş koruma, küfür filtreleme, hoş geldin mesajları ve kayıt sistemi sunan çok fonksiyonlu bir Discord botudur.

## Özellikler

- **Sunucu Koruma Sistemi**: Sunucunuzu spam ve raid saldırılarından korur
- **Ses Kanalında Kalma**: Bot belirtilen ses kanalında kalarak her zaman aktif görünür
- **Gelişmiş Küfür Filtresi**: 200'den fazla Türkçe küfür içeren kapsamlı filtreleme sistemi
- **Hoş Geldin Mesajları**: Embed kullanarak özelleştirilebilir hoş geldin mesajları
- **Kayıt Sistemi**: Kullanıcıların isim ve yaş bilgilerini kaydederek rol vermek için kullanılan kayıt sistemi

## Kurulum

1. Repository'yi klonlayın
2. Gerekli paketleri yükleyin:
```bash
npm install
```
3. `config.json` dosyasını kendi bilgilerinizle güncelleyin:
   - Bot token
   - Client ID
   - Guild ID
   - Ses kanalı ID'si
   - Diğer ayarlar

4. Botu başlatın:
```bash
npm start
```

## Komutlar

- `/ping` - Bot gecikme süresini gösterir
- `/kayıt <kullanıcı> <isim> <yaş>` - Kullanıcıyı kaydeder ve rol verir
- `/koruma durum` - Koruma sistemlerinin durumunu gösterir
- `/koruma aç <sistem>` - Belirtilen koruma sistemini etkinleştirir
- `/koruma kapat <sistem>` - Belirtilen koruma sistemini devre dışı bırakır

## Yapılandırma

`config.json` dosyasındaki ayarları değiştirerek botun davranışını özelleştirebilirsiniz:

```json
{
  "token": "BOT_TOKEN",
  "clientId": "CLIENT_ID",
  "guildId": "GUILD_ID",
  
  "serverGuard": {
    "enabled": true,
    "voiceChannelId": "SES_KANAL_ID",
    "logChannelId": "LOG_KANAL_ID",
    "antiSpam": {
      "enabled": true,
      "maxMessages": 5,
      "interval": 5000,
      "punishment": "timeout"
    },
    "antiRaid": {
      "enabled": true,
      "maxJoins": 5,
      "interval": 10000,
      "punishment": "ban"
    }
  },
  
  "welcomeSystem": {
    "enabled": true,
    "welcomeChannelId": "HOŞGELDİN_KANAL_ID",
    "registrationEnabled": true,
    "registrationChannelId": "KAYIT_KANAL_ID",
    "memberRoleId": "ÜYE_ROL_ID",
    "welcomeMessage": "Hoş geldin {user}!",
    "welcomeColor": "#7289DA",
    "welcomeTitle": "Yeni Üye!",
    "welcomeFooter": "Kayıt olmak için kayıt kanalına göz atın.",
    "welcomeImage": "GÖRSEL_URL"
  },
  
  "profanityFilter": {
    "enabled": true,
    "punishment": "delete",
    "warnUser": true
  }
}
```

## Gereksinimler

- Node.js 16.9.0 veya üstü
- Discord.js v14
- npm paket yöneticisi

## Lisans

Bu proje MIT lisansı altında lisanslanmıştır. 