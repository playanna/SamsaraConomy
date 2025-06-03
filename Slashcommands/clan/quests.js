const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const ExpeditionSettings = require('../../models/Multipliers/expeditionSetting.js');
const QuestContainer = require('../../models/Clan/quests.js');

const QUESTS_PER_PAGE = 2;
const EMBED_COLORS = {
  DEFAULT: '#00FFAA',
  DIFFICULTY: {
    Easy: '#4CAF50',
    Medium: '#FFC107',
    Hard: '#F44336',
    Epic: '#9C27B0'
  }
};

async function showQuestPage(interaction, currentPage = 1, isUpdate = false) {
  if (!isUpdate) await interaction.deferReply();

  let userSettings = await ExpeditionSettings.findOne({ userId: interaction.user.id });
  if (!userSettings) {
    userSettings = new ExpeditionSettings({ userId: interaction.user.id });
    await userSettings.save();
  }

  const userRealm = userSettings.realm || 'Default';
  const questDoc = await QuestContainer.findById('global_quest_list');
  const realmQuests = questDoc?.quests?.filter(q => q.area === userRealm) || [];

  const totalPages = Math.ceil(realmQuests.length / QUESTS_PER_PAGE);

  if (realmQuests.length === 0) {
    const embed = new EmbedBuilder()
      .setTitle('📜 Available Quests')
      .setColor(EMBED_COLORS.DEFAULT)
      .setDescription(`No quests currently available in **${userRealm}** realm.`);
    return interaction.editReply({ embeds: [embed] });
  }

  if (currentPage < 1 || currentPage > totalPages) {
    return interaction.editReply({ content: `❌ Invalid page number. There are ${totalPages} pages.` });
  }

  const startIdx = (currentPage - 1) * QUESTS_PER_PAGE;
  const pageQuests = realmQuests.slice(startIdx, startIdx + QUESTS_PER_PAGE);

  const embed = new EmbedBuilder()
    .setTitle(`${userRealm.toUpperCase()} Quests (Page ${currentPage}/${totalPages})`)
    .setColor(EMBED_COLORS.DEFAULT)
    .setFooter({ text: 'Click a quest below to view details' });

  pageQuests.forEach((quest, idx) => {
    const globalIdx = startIdx + idx;
    embed.addFields({
      name: `🔹 ${quest.name}`,
      value: [
        `**Area:** ${quest.area || 'Unknown'}`,
        `**Quest Owner:** ${quest.QuestAuthor || 'Unknown'}`,
        `**Difficulty:** ${quest.difficulty || 'Medium'}`,
        `**Duration:** ${quest.duration || 'Varies'}`,
        `**Description:** ${quest.description || 'No description available'}`,
        `\`[Quest ID: ${quest.id || globalIdx}]\``
      ].join('\n'),
      inline: true
    });
  });

  const buttons = pageQuests.map((quest, idx) =>
    new ButtonBuilder()
      .setCustomId(`viewQuest_${startIdx + idx}`)
      .setLabel(quest.name.length > 20 ? `${quest.name.substring(0, 17)}...` : quest.name)
      .setStyle(ButtonStyle.Primary)
  );

  const actionRows = [];
  let row = new ActionRowBuilder();
  buttons.forEach((btn, i) => {
    if (i > 0 && i % 5 === 0) {
      actionRows.push(row);
      row = new ActionRowBuilder();
    }
    row.addComponents(btn);
  });
  if (row.components.length) actionRows.push(row);

  if (totalPages > 1) {
    const paginationRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`clan_quests_page_${currentPage - 1}`)
        .setLabel('◀ Previous')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage === 1),
      new ButtonBuilder()
        .setCustomId('current_page')
        .setLabel(`Page ${currentPage}/${totalPages}`)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId(`clan_quests_page_${currentPage + 1}`)
        .setLabel('Next ▶')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage === totalPages)
    );
    actionRows.push(paginationRow);
  }

  return interaction.editReply({ embeds: [embed], components: actionRows });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('quests')
    .setDescription('View available quests in your current realm')
    .addIntegerOption(option =>
      option.setName('page')
        .setDescription('Page number')
        .setMinValue(1)
    ),

  async execute(interaction, pageArg = null, isUpdate = false) {
    const page = pageArg || interaction.options.getInteger('page') || 1;
    return showQuestPage(interaction, page, isUpdate);
  },

  async handleQuestsPage(interaction) {
    await interaction.deferUpdate();
    const page = parseInt(interaction.customId.split('_')[3]);
    return showQuestPage(interaction, page, true);
  },
  stage: 'beta',
};
