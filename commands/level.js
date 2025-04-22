const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage, registerFont } = require('canvas');
const path = require('path');
const fs = require('fs');

// Level system data (in a real implementation, this would be stored in a database)
const userLevels = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('seviye')
    .setDescription('Seviye sistemi komutları.')
    .addSubcommand(subcommand =>
      subcommand
        .setName('göster')
        .setDescription('Seviye kartınızı gösterir.')
        .addUserOption(option =>
          option.setName('kullanıcı')
            .setDescription('Seviyesini görmek istediğiniz kullanıcı')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('sıralama')
        .setDescription('Sunucudaki seviye sıralamasını gösterir.')
    ),
  
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    
    switch (subcommand) {
      case 'göster':
        await handleLevelCard(interaction);
        break;
      case 'sıralama':
        await handleLeaderboard(interaction);
        break;
    }
  },
};

// Helper function to get level data for a user
function getUserData(userId, guildId) {
  const key = `${guildId}-${userId}`;
  
  if (!userLevels.has(key)) {
    // Initialize a new user
    userLevels.set(key, {
      userId,
      guildId,
      xp: Math.floor(Math.random() * 500), // Random initial XP for demonstration
      level: 1,
      messages: Math.floor(Math.random() * 100), // Random message count for demonstration
      lastMessage: Date.now()
    });
  }
  
  return userLevels.get(key);
}

// Calculate level based on XP
function calculateLevel(xp) {
  return Math.floor(0.1 * Math.sqrt(xp));
}

// Get required XP for next level
function getRequiredXP(level) {
  return Math.pow((level + 1) * 10, 2);
}

// Handle level card command
async function handleLevelCard(interaction) {
  await interaction.deferReply();
  
  const user = interaction.options.getUser('kullanıcı') || interaction.user;
  const userData = getUserData(user.id, interaction.guild.id);
  
  // Calculate current level and XP
  userData.level = calculateLevel(userData.xp);
  const currentLevelXP = Math.pow(userData.level * 10, 2);
  const nextLevelXP = getRequiredXP(userData.level);
  const xpNeeded = nextLevelXP - currentLevelXP;
  const xpProgress = userData.xp - currentLevelXP;
  const progressPercent = (xpProgress / xpNeeded) * 100;
  
  // Create canvas for level card
  const canvas = createCanvas(800, 300);
  const ctx = canvas.getContext('2d');
  
  // Background
  ctx.fillStyle = '#23272A';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Create a gradient for the card
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
  gradient.addColorStop(0, '#9B59B6');
  gradient.addColorStop(1, '#3498DB');
  
  // Draw gradient border
  ctx.strokeStyle = gradient;
  ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
  
  // Get user avatar
  const avatarURL = user.displayAvatarURL({ extension: 'png', size: 256 });
  const avatar = await loadImage(avatarURL);
  
  // Draw circle for avatar
  ctx.save();
  ctx.beginPath();
  ctx.arc(150, 150, 80, 0, Math.PI * 2, true);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(avatar, 70, 70, 160, 160);
  ctx.restore();
  
  // Draw username
  ctx.font = 'bold 38px Arial';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(user.username, 280, 100);
  
  // Draw level information
  ctx.font = 'bold 32px Arial';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(`Seviye: ${userData.level}`, 280, 150);
  ctx.fillText(`XP: ${userData.xp} / ${nextLevelXP}`, 280, 190);
  ctx.fillText(`Mesaj: ${userData.messages}`, 280, 230);
  
  // Draw progress bar background
  ctx.fillStyle = '#2C2F33';
  ctx.fillRect(280, 250, 450, 30);
  
  // Draw progress bar
  ctx.fillStyle = gradient;
  ctx.fillRect(280, 250, 450 * (progressPercent / 100), 30);
  
  // Create attachment from canvas
  const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'level-card.png' });
  
  // Create embed
  const embed = new EmbedBuilder()
    .setColor('#9B59B6')
    .setTitle(`${user.username} Seviye Kartı`)
    .setImage('attachment://level-card.png')
    .setFooter({ text: 'Seviye kartı' })
    .setTimestamp();
  
  await interaction.editReply({ embeds: [embed], files: [attachment] });
}

// Handle leaderboard command
async function handleLeaderboard(interaction) {
  await interaction.deferReply();
  
  // Get guild users from level data
  const guildUsersData = [...userLevels.entries()]
    .filter(([key]) => key.startsWith(interaction.guild.id))
    .map(([_, userData]) => userData)
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 10);
  
  // If no data available, add some random demo data
  if (guildUsersData.length === 0) {
    // Add random data for example purposes
    const members = await interaction.guild.members.fetch({ limit: 10 });
    
    members.forEach(member => {
      if (!member.user.bot) {
        getUserData(member.id, interaction.guild.id); // This will create the user data
      }
    });
    
    // Re-fetch the data
    guildUsersData.push(...[...userLevels.entries()]
      .filter(([key]) => key.startsWith(interaction.guild.id))
      .map(([_, userData]) => userData)
      .sort((a, b) => b.xp - a.xp)
      .slice(0, 10));
  }
  
  // Create leaderboard embed
  const embed = new EmbedBuilder()
    .setColor('#3498DB')
    .setTitle('📊 Seviye Sıralaması')
    .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
    .setDescription('Sunucudaki en aktif üyelerin sıralaması:')
    .setFooter({ text: `${interaction.guild.name} | Toplam Veri: ${guildUsersData.length}`, iconURL: interaction.guild.iconURL() })
    .setTimestamp();
  
  // Add fields for top users
  for (let i = 0; i < guildUsersData.length; i++) {
    const userData = guildUsersData[i];
    const member = await interaction.guild.members.fetch(userData.userId).catch(() => null);
    
    if (member) {
      embed.addFields({
        name: `${i + 1}. ${member.user.username}`,
        value: `Seviye: **${calculateLevel(userData.xp)}** | XP: **${userData.xp}** | Mesaj: **${userData.messages}**`,
        inline: false
      });
    }
  }
  
  await interaction.editReply({ embeds: [embed] });
}

// Function to add XP when users send messages (this would be called from messageCreate event)
function addXP(userId, guildId, xpToAdd = 10) {
  const userData = getUserData(userId, guildId);
  const oldLevel = calculateLevel(userData.xp);
  
  userData.xp += xpToAdd;
  userData.messages += 1;
  userData.lastMessage = Date.now();
  
  const newLevel = calculateLevel(userData.xp);
  
  return {
    leveledUp: newLevel > oldLevel,
    newLevel,
    userData
  };
} 