const express = require('express');
const router = express.Router();
const passport = require('passport');
const { isAuthenticated } = require('../middleware/auth');
const DiscordOAuth2Strategy = require('passport-discord').Strategy;
const config = require('../config.json');

// Discord Passport stratejisini yapılandır
passport.use(new DiscordOAuth2Strategy({
    clientID: config.clientId,
    clientSecret: config.clientSecret,
    callbackURL: config.webDashboard.callbackURL,
    scope: ['identify', 'guilds']
}, (accessToken, refreshToken, profile, done) => {
    // Kullanıcı profilini oturuma kaydediyoruz
    process.nextTick(() => {
        return done(null, profile);
    });
}));

// Passport serileştirme ve deserileştirme ayarları
passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((obj, done) => {
    done(null, obj);
});

// Ana sayfa rotası
router.get('/', (req, res) => {
    res.render('index', {
        title: `${config.botName || 'Discord Bot'} - Ana Sayfa`,
        user: req.user,
        client: req.app.get('client'),
        config: config
    });
});

// Discord ile giriş rotası
router.get('/auth/discord', passport.authenticate('discord'));

// Discord callback rotası
router.get('/auth/discord/callback',
    passport.authenticate('discord', {
        failureRedirect: '/'
    }),
    (req, res) => {
        res.redirect('/dashboard');
    }
);

// Dashboard ana sayfası
router.get('/dashboard', isAuthenticated, (req, res) => {
    const client = req.app.get('client');
    // Kullanıcının erişim yetkisi olan sunucuları filtrele
    const guilds = req.user.guilds.filter(guild => {
        // Sunucu yöneticisi veya bot eklenmiş sunucular
        return (guild.permissions & 0x8) === 0x8 || 
               client.guilds.cache.has(guild.id);
    });
    
    res.render('dashboard/index', {
        title: `${config.botName || 'Discord Bot'} - Kontrol Paneli`,
        user: req.user,
        guilds: guilds,
        client: client,
        config: config
    });
});

// Cihaz istatistikleri sayfası
router.get('/dashboard/devices', isAuthenticated, async (req, res) => {
    const client = req.app.get('client');
    
    try {
        // Verileri doğrudan burada hesaplayalım - gerçek verilere göre düzenlenecek
        const deviceStats = {
            desktop: 8,
            mobile: 5,
            web: 12,
            unknown: 3
        };
        
        // Basit kayıtlı kullanıcı listesi
        const registeredUsers = [
            {
                userId: req.user.id,
                username: req.user.username,
                nickname: req.user.username,
                avatar: req.user.avatar,
                registeredAt: new Date().toISOString(),
                device: {
                    device: 'Desktop',
                    os: 'Windows',
                    browser: 'Chrome'
                }
            }
        ];
        
        res.render('devices', {
            title: 'Cihaz İstatistikleri',
            user: req.user,
            client: client,
            config: config,
            deviceStats: deviceStats,
            registeredUsers: registeredUsers
        });
    } catch (error) {
        console.error('Cihaz istatistikleri sayfası yüklenirken hata:', error);
        res.status(500).render('error', {
            title: 'Hata',
            error: 'Cihaz istatistikleri yüklenirken bir hata oluştu.',
            user: req.user,
            config: config
        });
    }
});

// Sunucu yönetim sayfası
router.get('/dashboard/:guildId', isAuthenticated, (req, res) => {
    const client = req.app.get('client');
    const guildId = req.params.guildId;
    
    // Kullanıcının bu sunucuya erişim yetkisi var mı kontrol et
    const guild = req.user.guilds.find(g => g.id === guildId);
    if (!guild || ((guild.permissions & 0x8) !== 0x8 && !client.guilds.cache.has(guildId))) {
        return res.redirect('/dashboard');
    }
    
    // Bot sunucuda var mı kontrol et
    const botGuild = client.guilds.cache.get(guildId);
    if (!botGuild) {
        // Bot sunucuda değilse, davet linki ile yönlendir
        return res.render('dashboard/add-bot', {
            title: `${config.botName || 'Discord Bot'} - Botu Ekle`,
            user: req.user,
            guild: guild,
            inviteUrl: `https://discord.com/api/oauth2/authorize?client_id=${config.clientId}&permissions=8&scope=bot%20applications.commands&guild_id=${guildId}`,
            config: config
        });
    }
    
    // Sunucu ayarlarını ver
    res.render('dashboard/guild', {
        title: `${guild.name} - Yönetim`,
        user: req.user,
        guild: guild,
        botGuild: botGuild,
        client: client,
        config: config
    });
});

// Modül ayarları sayfası (örn: level, moderasyon, kayıt)
router.get('/dashboard/:guildId/:module', isAuthenticated, (req, res) => {
    const client = req.app.get('client');
    const guildId = req.params.guildId;
    const moduleName = req.params.module;
    
    // Kullanıcının bu sunucuya erişim yetkisi var mı kontrol et
    const guild = req.user.guilds.find(g => g.id === guildId);
    if (!guild || ((guild.permissions & 0x8) !== 0x8 && !client.guilds.cache.has(guildId))) {
        return res.redirect('/dashboard');
    }
    
    // Bot sunucuda var mı kontrol et
    const botGuild = client.guilds.cache.get(guildId);
    if (!botGuild) {
        return res.redirect(`/dashboard/${guildId}`);
    }
    
    // Modül sayfasını render et
    const modules = {
        'level': 'dashboard/modules/level',
        'moderasyon': 'dashboard/modules/moderation',
        'kayit': 'dashboard/modules/register',
        'hosgeldin': 'dashboard/modules/welcome',
        'guard': 'dashboard/modules/guard'
    };
    
    const moduleTemplate = modules[moduleName];
    if (!moduleTemplate) {
        return res.redirect(`/dashboard/${guildId}`);
    }
    
    res.render(moduleTemplate, {
        title: `${guild.name} - ${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}`,
        user: req.user,
        guild: guild,
        botGuild: botGuild,
        client: client,
        config: config
    });
});

// Çıkış rotası
router.get('/logout', (req, res) => {
    req.session.destroy(() => {
        req.logout(() => {
            res.redirect('/');
        });
    });
});

module.exports = router; 