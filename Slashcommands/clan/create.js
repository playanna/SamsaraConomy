const { SlashCommandBuilder } = require('discord.js');
const clanService = require('../../utils/clanhelpers/clanhelpers.js');
const createBaseEmbed = require('../../utils/embed.js');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('clan-create')
    .setDescription('Create a new clan')
    .addStringOption(option =>
      option.setName('name')
        .setDescription('Name of your new clan')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('tag')
        .setDescription('A unique 3–5 letter tag (e.g. SAMUR)')
        .setRequired(true)),
  

  async execute(interaction) {
    const userId = interaction.user.id;
    const name = interaction.options.getString('name');
    const tag = interaction.options.getString('tag').toUpperCase().trim();

    const result = await clanService.createClan(userId, name, tag);
    if (!result.success) {
        return interaction.reply({
          flag: 64,
          content: `❌ ${result.message}`,
        });
      }
      
      const embed = createBaseEmbed({
        interaction,
        title: '🏯 Clan Created',
        description: `You successfully created the clan **${result.clan.name}** \`[${result.clan.tag}]\`!\nUse \`/clan-invite\` to bring others in.`,
        thumbnail: interaction.user.displayAvatarURL({ dynamic: true }),
      });
      
      
        await interaction.reply({ embeds: [embed] });
      }
  }

      