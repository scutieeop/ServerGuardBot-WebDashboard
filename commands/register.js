const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('register')
    .setDescription('Registers a user to the server.')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user to register')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('name')
        .setDescription('User\'s name')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('age')
        .setDescription('User\'s age')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
  
  async execute(interaction) {
    // Check if registration system is enabled
    if (!config.welcomeSystem.registrationEnabled) {
      return interaction.reply({
        content: 'Kayıt sistemi aktif değil!',
        ephemeral: true
      });
    }
    
    try {
      // Get member role
      const memberRole = interaction.guild.roles.cache.get(config.welcomeSystem.memberRoleId);
      if (!memberRole) {
        return interaction.reply({
          content: `Üye rolü bulunamadı! Lütfen config dosyasındaki memberRoleId ayarını kontrol edin.`,
          ephemeral: true
        });
      }
      
      // Get user, name and age from options
      const targetUser = interaction.options.getUser('user');
      const targetMember = await interaction.guild.members.fetch(targetUser.id);
      const name = interaction.options.getString('name');
      const age = interaction.options.getString('age');
      
      // Check if target user is already registered
      if (targetMember.roles.cache.has(memberRole.id)) {
        return interaction.reply({
          content: `${targetUser} zaten kayıt edilmiş!`,
          ephemeral: true
        });
      }
      
      // Change nickname and add role
      try {
        await targetMember.setNickname(`${name} | ${age}`);
        await targetMember.roles.add(memberRole);
        
        // Create success embed
        const successEmbed = new EmbedBuilder()
          .setColor('#00FF00')
          .setTitle('Kayıt Başarılı')
          .setDescription(`${targetUser} başarıyla kayıt edildi!`)
          .addFields(
            { name: 'Kullanıcı', value: `${targetUser}`, inline: true },
            { name: 'Yetkili', value: `${interaction.user}`, inline: true },
            { name: 'Kayıt Bilgileri', value: `İsim: ${name}\nYaş: ${age}`, inline: false }
          )
          .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
          .setTimestamp();
        
        // Send success message
        await interaction.reply({ embeds: [successEmbed] });
        
        // Send DM to registered user
        try {
          const dmEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle(`${interaction.guild.name} - Kayıt Başarılı`)
            .setDescription(`${interaction.guild.name} sunucusunda başarıyla kayıt oldun!\n\nİsim: ${name}\nYaş: ${age}\nKayıt Eden: ${interaction.user.tag}`)
            .setTimestamp();
          
          await targetUser.send({ embeds: [dmEmbed] }).catch(() => {
            console.log(`[WARNING] Could not send DM to ${targetUser.tag}. They might have DMs disabled.`);
          });
        } catch (dmError) {
          console.error(`[ERROR] Failed to send registration confirmation DM:`, dmError);
        }
        
      } catch (registerError) {
        console.error(`[ERROR] Failed to register user:`, registerError);
        return interaction.reply({
          content: `Kayıt işlemi sırasında bir hata oluştu: ${registerError.message}`,
          ephemeral: true
        });
      }
    } catch (error) {
      console.error(`[ERROR] Error in register command:`, error);
      return interaction.reply({
        content: 'Komut çalıştırılırken bir hata oluştu!',
        ephemeral: true
      });
    }
  },
}; 