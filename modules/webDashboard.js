const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const path = require('path');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('../config.json');
const UAParser = require('ua-parser-js');
const mongoose = require('mongoose');
const moment = require('moment');
moment.locale('tr');
const { Client, GatewayIntentBits } = require('discord.js');

// Kullanıcı şema ve modeli
const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  discriminator: { type: String },
  avatar: { type: String },
  registeredAt: { type: Date, default: Date.now },
  registrarId: { type: String },
  nickname: { type: String },
  originalName: { type: String },
  age: { type: Number },
  gender: { type: String, enum: ['male', 'female', 'unspecified'] },
  device: {
    browser: { type: String },
    os: { type: String },
    device: { type: String }
  },
  roles: [{ type: String }],
  guildID: { type: String, required: true }
});

// Web kontrol paneli sınıfı
class WebDashboard {
  constructor(client, config) {
    this.client = client;
    this.config = config;
    this.app = express();
    this.server = null;
    
    // Mongoose modeli
    if (!mongoose.models.User) {
      this.User = mongoose.model('User', userSchema);
    } else {
      this.User = mongoose.models.User;
    }
    
    // Express ayarları
    this.setupExpress();
    
    // Passport ve Discord authentication
    this.setupAuth();
    
    // API rotaları
    this.setupRoutes();

    // Express uygulamasını başlat
    this.start();
    
    console.log('[INFO] Web paneli başlatıldı. Port:', config.webDashboard.port);
  }
  
  // Express ayarları
  setupExpress() {
    // Middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net", "code.jquery.com"],
          styleSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net", "fonts.googleapis.com"],
          fontSrc: ["'self'", "fonts.googleapis.com", "fonts.gstatic.com"],
          imgSrc: ["'self'", "cdn.discordapp.com", "i.imgur.com", "*.discord.com", "data:"]
        }
      }
    }));
    this.app.use(morgan('dev'));
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: false }));
    
    // Session
    this.app.use(session({
      secret: this.config.webDashboard.sessionSecret || 'discord-bot-secret',
      resave: false,
      saveUninitialized: false,
      cookie: { maxAge: 86400000 } // 1 gün
    }));
    
    // Passport middleware
    this.app.use(passport.initialize());
    this.app.use(passport.session());
    
    // View engine
    this.app.set('views', path.join(__dirname, '../views'));
    this.app.set('view engine', 'ejs');
    
    // Statik dosyalar
    this.app.use(express.static(path.join(__dirname, '../public')));
  }
  
  // Passport ve Discord authentication
  setupAuth() {
    // Discord stratejisi
    passport.use(new DiscordStrategy({
      clientID: this.client.user.id,
      clientSecret: this.config.clientSecret,
      callbackURL: this.config.webDashboard.callbackURL,
      scope: ['identify', 'guilds']
    }, (accessToken, refreshToken, profile, done) => {
      // Kullanıcı giriş yaptığında burası çalışır
      return done(null, profile);
    }));
    
    // Serialize ve deserialize kullanıcı
    passport.serializeUser((user, done) => {
      done(null, user);
    });
    
    passport.deserializeUser((obj, done) => {
      done(null, obj);
    });
  }
  
  // Rotaları tanımla
  setupRoutes() {
    // Ana sayfa
    this.app.get('/', (req, res) => {
      res.render('index', { 
        user: req.user,
        config: this.config,
        client: this.client
      });
    });
    
    // Discord login
    this.app.get('/login', passport.authenticate('discord'));
    
    // Discord callback
    this.app.get('/callback', 
      passport.authenticate('discord', { 
        failureRedirect: '/' 
      }), 
      (req, res) => {
        res.redirect('/dashboard');
      }
    );
    
    // Logout
    this.app.get('/logout', (req, res) => {
      req.logout(err => {
        if (err) return res.status(500).send(err);
        res.redirect('/');
      });
    });
    
    // Dashboard middleware - auth kontrolü
    const checkAuth = (req, res, next) => {
      if (req.isAuthenticated()) {
        return next();
      }
      res.redirect('/login');
    };
    
    // Dashboard
    this.app.get('/dashboard', checkAuth, (req, res) => {
      // Kullanıcının bulunduğu sunucuları kontrol ederiz
      const guild = this.client.guilds.cache.get(this.config.webDashboard.guildID);
      
      if (!guild) {
        return res.status(404).render('error', { 
          error: 'Sunucu bulunamadı',
          user: req.user,
          config: this.config
        });
      }
      
      res.render('dashboard', {
        user: req.user,
        guild: guild,
        config: this.config,
        client: this.client
      });
    });
    
    // Kayıtlı kullanıcılar sayfası
    this.app.get('/dashboard/users', checkAuth, async (req, res) => {
      try {
        const guild = this.client.guilds.cache.get(this.config.webDashboard.guildID);
        
        if (!guild) {
          return res.status(404).render('error', { 
            error: 'Sunucu bulunamadı',
            user: req.user,
            config: this.config
          });
        }
        
        // Veritabanından kayıtlı kullanıcıları çek
        const registeredUsers = await this.User.find({
          guildID: this.config.webDashboard.guildID
        }).sort({ registrationDate: -1 });
        
        res.render('users', {
          user: req.user,
          guild: guild,
          registeredUsers: registeredUsers,
          config: this.config,
          client: this.client
        });
      } catch (error) {
        console.error('Kullanıcılar sayfası yüklenirken hata:', error);
        res.status(500).render('error', {
          error: 'Kayıtlı kullanıcılar yüklenirken bir hata oluştu',
          user: req.user,
          config: this.config
        });
      }
    });
    
    // Cihaz istatistikleri sayfası
    this.app.get('/dashboard/devices', checkAuth, async (req, res) => {
      try {
        const guild = this.client.guilds.cache.get(this.config.webDashboard.guildID);
        
        if (!guild) {
          return res.status(404).render('error', { 
            error: 'Sunucu bulunamadı',
            user: req.user,
            config: this.config
          });
        }
        
        // Veritabanından kullanıcıları çek
        const registeredUsers = await this.User.find({
          guildID: this.config.webDashboard.guildID
        });
        
        // Cihaz istatistiklerini hesapla
        const deviceStats = {
          desktop: registeredUsers.filter(u => u.device && u.device.includes('desktop')).length,
          mobile: registeredUsers.filter(u => u.device && u.device.includes('mobile')).length,
          web: registeredUsers.filter(u => u.device && u.device.includes('web')).length,
          unknown: registeredUsers.filter(u => !u.device).length
        };
        
        res.render('devices', {
          user: req.user,
          guild: guild,
          registeredUsers: registeredUsers,
          deviceStats: deviceStats,
          config: this.config,
          client: this.client
        });
      } catch (error) {
        console.error('Cihazlar sayfası yüklenirken hata:', error);
        res.status(500).render('error', {
          error: 'Cihaz istatistikleri yüklenirken bir hata oluştu',
          user: req.user,
          config: this.config
        });
      }
    });
    
    // API rotası - Kullanıcı detayları
    this.app.get('/api/users/:userId', checkAuth, async (req, res) => {
      try {
        const userId = req.params.userId;
        
        // Veritabanından kullanıcıyı bul
        const userRecord = await this.User.findOne({
          userID: userId,
          guildID: this.config.webDashboard.guildID
        });
        
        if (!userRecord) {
          return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
        }
        
        res.json(userRecord);
      } catch (error) {
        console.error('API kullanıcı bilgisi alınırken hata:', error);
        res.status(500).json({ error: 'Kullanıcı bilgileri alınamadı' });
      }
    });
    
    // Hata durumunda 404 sayfası
    this.app.use((req, res) => {
      res.status(404).render('error', {
        error: 'Sayfa bulunamadı',
        user: req.user,
        config: this.config
      });
    });
  }
  
  // Web sunucusunu başlat
  start() {
    const port = this.config.webDashboard.port || 3000;
    this.server = this.app.listen(port, () => {
      console.log(`Web dashboard ${port} portunda çalışıyor.`);
    });
  }
  
  // Web sunucusunu durdur
  stop() {
    if (this.server) {
      this.server.close();
      console.log('Web dashboard durduruldu.');
    }
  }
  
  // Cihaz bilgisini analiz et
  parseUserAgent(uaString) {
    const parser = new UAParser(uaString);
    const result = parser.getResult();
    
    return {
      browser: result.browser.name || 'Bilinmiyor',
      os: result.os.name || 'Bilinmiyor',
      device: result.device.type ? 
        (result.device.vendor ? `${result.device.vendor} ${result.device.model}` : result.device.type) : 
        'Desktop'
    };
  }
  
  // Kullanıcı kaydet/güncelle
  async registerUser(userId, registrarId, userData, userAgent) {
    try {
      // Cihaz bilgisi analiz et
      const deviceInfo = this.parseUserAgent(userAgent);
      
      // Kullanıcı bilgilerini hazırla
      const userInfo = {
        userId: userId,
        username: userData.username,
        discriminator: userData.discriminator || '0',
        avatar: userData.avatar,
        nickname: userData.nickname,
        originalName: userData.originalName,
        age: userData.age,
        gender: userData.gender || 'unspecified',
        registrarId: registrarId,
        device: deviceInfo,
        guildID: this.config.webDashboard.guildID
      };
      
      // Kullanıcı var mı diye kontrol et
      let user = await this.User.findOne({ userId: userId });
      
      if (user) {
        // Kullanıcı varsa güncelle
        Object.assign(user, userInfo);
        await user.save();
        return user;
      } else {
        // Kullanıcı yoksa oluştur
        const newUser = new this.User(userInfo);
        await newUser.save();
        return newUser;
      }
    } catch (error) {
      console.error('[ERROR] Kullanıcı kaydedilirken hata:', error);
      throw error;
    }
  }
  
  // Kullanıcı bilgilerini getir
  async getUser(userId) {
    try {
      return await this.User.findOne({ userId: userId });
    } catch (error) {
      console.error('[ERROR] Kullanıcı bilgisi alınırken hata:', error);
      return null;
    }
  }
  
  // Tüm kayıtlı kullanıcıları getir
  async getAllUsers() {
    try {
      return await this.User.find({}).sort({ registeredAt: -1 });
    } catch (error) {
      console.error('[ERROR] Tüm kullanıcılar alınırken hata:', error);
      return [];
    }
  }
}

module.exports = WebDashboard; 
module.exports = WebDashboard; 