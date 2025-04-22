const express = require('express');
const session = require('express-session');
const passport = require('passport');
const path = require('path');
const config = require('./config.json');
const { Client, GatewayIntentBits, Partials } = require('discord.js');

// Discord client yapılandırması
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

// Express uygulaması oluştur
const app = express();

// EJS görünüm motorunu yapılandır
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(session({
  secret: config.sessionSecret || 'secret-session-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 // 1 gün
  }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Client'ı uygulama kapsamında paylaş
app.set('client', client);

// Rotaları dahil et
const indexRouter = require('./routes/index');
const apiRouter = require('./routes/api');

app.use('/', indexRouter);
app.use('/api', apiRouter);

// 404 sayfası
app.use((req, res) => {
  res.status(404).render('error', {
    title: '404 - Sayfa Bulunamadı',
    error: 'Aradığınız sayfa bulunamadı.',
    user: req.user,
    config: config
  });
});

// Discord bot login ve sunucu başlatma
const PORT = process.env.PORT || 3000;

client.login(config.token).then(() => {
  console.log(`Bot ${client.user.tag} olarak giriş yaptı!`);
  app.listen(PORT, () => {
    console.log(`Web sunucusu port ${PORT} üzerinde çalışıyor!`);
  });
}).catch(err => {
  console.error('Bot giriş yaparken hata oluştu:', err);
});

// Hata yakalama
process.on('unhandledRejection', error => {
  console.error('Beklenmeyen hata:', error);
}); 