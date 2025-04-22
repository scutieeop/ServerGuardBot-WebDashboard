const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Bot gecikme süresini gösterir.'),
  
  async execute(interaction) {
    const sent = await interaction.deferReply({ ephemeral: false, fetchReply: true });
    
    const pingEmbed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('🏓 Pong!')
      .addFields(
        { name: 'Bot Gecikmesi', value: `${sent.createdTimestamp - interaction.createdTimestamp}ms`, inline: true },
        { name: 'API Gecikmesi', value: `${Math.round(interaction.client.ws.ping)}ms`, inline: true }
      )
      .setTimestamp();
    
    await interaction.editReply({ embeds: [pingEmbed] });
  },
}; 