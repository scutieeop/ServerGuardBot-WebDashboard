const { 
  Client, 
  GatewayIntentBits, 
  Collection,
  Events
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config.json');
const { joinVoiceChannel } = require('@discordjs/voice');
const mongoose = require('mongoose');
require('dotenv').config();

// Import handlers
const { registerCommands } = require('./handlers/commandHandler');
const { handleEvent } = require('./handlers/eventHandler');

// Web dashboard ve kayıt modülü
const WebDashboard = require('./modules/webDashboard');
// Guild manager import
const GuildManager = require('./modules/guild');

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences
  ]
});

// Collections for commands and cooldowns
client.commands = new Collection();
client.cooldowns = new Collection();
client.userAgents = new Collection(); // Kullanıcı cihaz bilgisi saklamak için

// MongoDB bağlantısı
async function connectToDatabase() {
  try {
    const dbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/discord-bot';
    await mongoose.connect(dbUri);
    console.log('[INFO] MongoDB bağlantısı başarılı!');
    return true;
  } catch (error) {
    console.error('[ERROR] MongoDB bağlantısı başarısız:', error);
    return false;
  }
}

// Load commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
  }
}

// Load events
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}

// Join voice channel function
async function joinVoice(guild) {
  if (!config.serverGuard.enabled || !config.serverGuard.voiceChannelId) return;
  
  try {
    const channel = guild.channels.cache.get(config.serverGuard.voiceChannelId);
    if (!channel) return console.log(`[ERROR] Voice channel with ID ${config.serverGuard.voiceChannelId} not found.`);
    
    joinVoiceChannel({
      channelId: channel.id,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator,
    });
    
    console.log(`[INFO] Bot joined voice channel: ${channel.name}`);
  } catch (error) {
    console.error('[ERROR] Failed to join voice channel:', error);
  }
}

// Kullanıcı cihaz bilgisini takip et
client.on('messageCreate', message => {
  // Sadece config'de cihaz takibi aktifse ve message.client.userAgents oluşturulmuşsa çalışır
  if (config.registrationSystem.deviceTracking && message.author && !message.author.bot) {
    // User-Agent bilgisini doğrudan alamıyoruz, bu yüzden dolaylı yoldan takip edeceğiz
    // Burada her mesaj gönderen kullanıcının ID'sini saklıyoruz
    // Cihaz bilgisini tahmini olarak kaydedeceğiz (web dashboard kısmında)
    client.userAgents.set(message.author.id, 
      message.author.client ? "Discord Client" : "Bilinmiyor");
  }
});

// Sunucuya yeni katılan üye için kayıtsız rolü ekleme
client.on('guildMemberAdd', async member => {
  if (config.registrationSystem.enabled && config.registrationSystem.unregisteredRoleId) {
    try {
      await member.roles.add(config.registrationSystem.unregisteredRoleId);
      console.log(`[INFO] Kayıtsız rolü ${member.user.tag} kullanıcısına verildi.`);
    } catch (error) {
      console.error(`[ERROR] Kayıtsız rolü verilemedi: ${error.message}`);
    }
  }
});

// Ready event
client.once(Events.ClientReady, async () => {
  console.log(`[INFO] Bot is ready! Logged in as ${client.user.tag}`);
  
  // Register slash commands
  try {
    await registerCommands();
    console.log('[INFO] Slash commands registered successfully!');
  } catch (error) {
    console.error('[ERROR] Failed to register slash commands:', error);
  }
  
  // MongoDB'ye bağlan
  const dbConnected = await connectToDatabase();
  
  // Guild Manager'ı başlat
  client.guildManager = new GuildManager(client);
  console.log('[INFO] Guild Manager initialized.');
  
  // Web panelini başlat (eğer etkinse ve veritabanı bağlantısı başarılıysa)
  if (config.webDashboard.enabled && dbConnected) {
    try {
      client.webDashboard = new WebDashboard(client);
      console.log('[INFO] Web dashboard initialized.');
    } catch (error) {
      console.error('[ERROR] Web dashboard initialization failed:', error);
    }
  } else if (config.webDashboard.enabled && !dbConnected) {
    console.warn('[WARNING] Web dashboard not initialized because MongoDB connection failed.');
  } else {
    console.log('[INFO] Web dashboard is disabled in config.');
  }
  
  // Klasörler oluştur
  const viewsDir = path.join(__dirname, 'views');
  const publicDir = path.join(__dirname, 'public');
  
  if (!fs.existsSync(viewsDir)) {
    fs.mkdirSync(viewsDir, { recursive: true });
    console.log('[INFO] Views directory created.');
  }
  
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
    console.log('[INFO] Public directory created.');
  }
  
  // Join voice channel in all guilds
  client.guilds.cache.forEach(guild => {
    joinVoice(guild);
  });
});

// Reconnect to voice when disconnected
client.on(Events.VoiceStateUpdate, (oldState, newState) => {
  if (oldState.member.id === client.user.id && !newState.channelId) {
    console.log('[INFO] Bot disconnected from voice, attempting to reconnect...');
    setTimeout(() => {
      joinVoice(oldState.guild);
    }, 5000);
  }
});

// Interaction create event
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    const content = { content: 'Komut çalıştırılırken bir hata oluştu!', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(content);
    } else {
      await interaction.reply(content);
    }
  }
});

// Login to Discord with your client's token
client.login(config.token); 