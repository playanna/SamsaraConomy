// commands/rod-theme-select.js
const { SlashCommandBuilder } = require('discord.js');
const SectRod = require('../models/Equipment/sectrod');
const { rodThemes } = require('../utils/Equipments/rodthemes');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rod-theme')
    .setDescription('🎨 Select your ASCII rod theme')
    .addStringOption(option =>
      option.setName('theme')
        .setDescription('Choose a theme')
        .setRequired(true)
        .addChoices(
          ...Object.keys(rodThemes).map(theme => ({ name: theme, value: theme }))
        )
    ),

  async execute(interaction) {
    const userId = interaction.user.id;
    let rod = await SectRod.findOne({ userId });

    if (!rod) {
      rod = await SectRod.create({ userId }); // lazy create
    }

    const chosenTheme = interaction.options.getString('theme');
    rod.cosmetics = rod.cosmetics || {};
    rod.cosmetics.asciiTheme = chosenTheme;
    await rod.save();

    await interaction.reply({
      content: `🎣 Your rod theme has been set to **${chosenTheme}**!`,
      ephemeral: true
    });
  }
};
