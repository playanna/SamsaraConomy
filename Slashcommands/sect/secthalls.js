const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const createBaseEmbed = require('../../utils/embed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sect-halls')
    .setDescription('Enter the sacred halls of your cultivation sect'),

  async execute(interaction) {
    // Create the immersive embed
    const embed = createBaseEmbed({
      interaction,
      title: null,
      description: [
        `> *The scent of sandalwood fills the air as your footsteps echo through the vaulted halls.*`,
        `You stand in the heart of the **Samsara Sect**, where:`,
        `- **Jade pillars** hum with ancient formations`,
        `- **Floating lanterns** drift like fireflies`,
        `- **Elders' portraits** gaze down with knowing eyes`,
        `\n*"Where shall your Dao lead you today, disciple?"*`
      ].join('\n'),
      color: 0x5e35b1,
      image: 'https://github.com/playanna/Samsara-bot/blob/8e7afabadfc058ef1813cc000cb62e797100b6bf/images/realms/secthall/secthall.jpeg?raw=true',
      footer: {
        text: '「轮回无终，大道永恒」\n"Samsara is endless, yet the Great Dao is eternal."',
        iconURL: interaction.guild?.iconURL({ dynamic: true }) || null, // Reuse emblem
      },
    });    // Create navigation buttons
    const row = new ActionRowBuilder()
      .addComponents(
      new ButtonBuilder()
        .setCustomId('sect_view_profile')
        .setLabel('🧘 Meditation Chamber')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🀄'),
      new ButtonBuilder()
        .setCustomId('mission_board')
        .setLabel('Mission Board')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('⚔️'),
      new ButtonBuilder()
        .setCustomId('sect_healer')
        .setLabel('Divine Healer')
        .setStyle(ButtonStyle.Success)
        .setEmoji('💚'),
      // new ButtonBuilder()
      //     .setCustomId('sect_treasury')
      //     .setLabel('Sect Treasury')
      //     .setStyle(ButtonStyle.Success)
      //     .setEmoji('🏛️'),
       new ButtonBuilder()
         .setCustomId('sect_training')
         .setLabel('Training Grounds')
         .setStyle(ButtonStyle.Danger)
         .setEmoji('🎯')
      );

    // Second row for additional options
     const row2 = new ActionRowBuilder()
       .addComponents(
         //new ButtonBuilder()
         //  .setCustomId('sect_gear_shop')
         //  .setLabel('Divine Armory')
         //  .setStyle(ButtonStyle.Primary),
         new ButtonBuilder()
           .setCustomId('sect_elder')
           .setLabel('Elder\'s Guidance')
           .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId('sect_welcome').setLabel('Back to Sect Entrance').setStyle(ButtonStyle.Secondary),
       );

    await interaction.reply({
      embeds: [embed],
      components: [row, row2],
    });
  }
};