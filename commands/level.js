const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');
const db = require('../modules/database');
const config = require('../config.json');

// Progress bar creator function
function createProgressBar(percent, size = 20, filledChar = '▰', emptyChar = '▱') {
  const filled = Math.round(size * (percent / 100));
  const empty = size - filled;
  return filledChar.repeat(filled) + emptyChar.repeat(empty);
}

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
    // Check if level system is enabled
    if (!config.levelSystem.enabled) {
      return interaction.reply({
        content: 'Seviye sistemi şu anda devre dışı.',
        ephemeral: true
      });
    }
    
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
  const userData = await db.getUserData(user.id, interaction.guild.id);
  
  // Calculate current level and XP
  const level = userData.level || 0;
  const currentLevelXP = Math.pow(level * 10, 2);
  const nextLevelXP = getRequiredXP(level);
  const xpNeeded = nextLevelXP - currentLevelXP;
  const xpProgress = userData.xp - currentLevelXP;
  const progressPercent = Math.min(Math.max(Math.floor((xpProgress / xpNeeded) * 100), 0), 100);
  
  // Get member information for roles/nickname
  const member = await interaction.guild.members.fetch(user.id).catch(() => null);
  const nickname = member ? member.nickname || user.username : user.username;
  
  // Create a progress bar
  const progressBar = createProgressBar(progressPercent, 15);
  
  // Create the embed
  const embed = new EmbedBuilder()
    .setColor(member?.displayHexColor || '#3498DB')
    .setTitle(`${nickname} · Seviye Kartı`)
    .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 512 }))
    .addFields(
      { name: '👤 Kullanıcı', value: `<@${user.id}>`, inline: true },
      { name: '✨ Seviye', value: `${level}`, inline: true },
      { name: '📊 Toplam XP', value: `${userData.xp || 0} XP`, inline: true },
      { name: '💬 Mesaj Sayısı', value: `${userData.messageCount || 0}`, inline: true },
      { name: '📈 Sonraki Seviye', value: `${xpProgress}/${xpNeeded} XP`, inline: true },
      { name: '⏱️ Son Aktivite', value: userData.lastMessageAt ? `<t:${Math.floor(new Date(userData.lastMessageAt).getTime() / 1000)}:R>` : 'Hiç', inline: true },
      { name: `İlerleme · %${progressPercent}`, value: progressBar }
    )
    .setFooter({ text: `ID: ${user.id}` })
    .setTimestamp();
  
  await interaction.editReply({ embeds: [embed] });
}

// Handle leaderboard command
async function handleLeaderboard(interaction) {
  await interaction.deferReply();
  
  // Get the leaderboard data
  const leaderboard = await db.getLeaderboard(interaction.guild.id, 10);
  
  if (!leaderboard || leaderboard.length === 0) {
    return interaction.editReply('Henüz seviye sıralamasında veri bulunmuyor!');
  }
  
  // Create medal emojis for top 3
  const medals = ['🥇', '🥈', '🥉'];
  
  // Build the leaderboard description
  let description = '__**🏆 Sunucu Sıralaması**__\n\n';
  
  for (let i = 0; i < leaderboard.length; i++) {
    const data = leaderboard[i];
    const rank = i + 1;
    const medal = rank <= 3 ? medals[i] : `${rank}.`;
    
    // Try to get member data
    const member = await interaction.guild.members.fetch(data.id || data.userId).catch(() => null);
    const name = member ? member.displayName : `Kullanıcı#${data.id || data.userId}`;
    
    description += `${medal} **${name}** · Seviye ${data.level || 0} · ${data.xp || 0} XP · ${data.messageCount || 0} mesaj\n`;
  }
  
  // Create the embed
  const embed = new EmbedBuilder()
    .setColor('#FFC83D')
    .setTitle(`📊 ${interaction.guild.name} Seviye Sıralaması`)
    .setDescription(description)
    .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
    .setFooter({ text: `${interaction.guild.name} · Toplam ${leaderboard.length} kullanıcı` })
    .setTimestamp();
  
  await interaction.editReply({ embeds: [embed] });
}

// Function to add XP when users send messages (this would be called from messageCreate event)
function addXP(userId, guildId, xpToAdd = 10) {
  return db.addXP(userId, guildId, xpToAdd);
} 