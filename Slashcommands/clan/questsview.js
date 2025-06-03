const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const ExpeditionSettings = require('../../models/Multipliers/expeditionSetting.js');

// Constants for consistent styling
const EMBED_COLORS = {
  ACTIVE_QUESTS: '#00AAFF',
  QUEST_ITEM: '#4B0082'
};

const MAX_BUTTONS_PER_ROW = 5;
const MAX_QUESTS_PER_PAGE = 10;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('myquests')
    .setDescription('📜 View your active quests and their progress!')
    .addIntegerOption(option =>
      option.setName('page')
        .setDescription('Page number of your quests')
        .setMinValue(1)
    ),
    stage: 'beta',

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const settings = await ExpeditionSettings.findOne({ userId: interaction.user.id });
    const page = interaction.options.getInteger('page') || 1;

    // Handle no quests case
    if (!settings || !settings.activeQuests || settings.activeQuests.length === 0) {
      const emptyEmbed = new EmbedBuilder()
        .setTitle('📜 Your Quest Journal')
        .setColor(EMBED_COLORS.ACTIVE_QUESTS)
        .setDescription('Your quest log is currently empty.\n\nStart new adventures by exploring available quests!')
        .setFooter({ text: 'Check back later for new quest opportunities!' })
        .setTimestamp();

      return interaction.editReply({ embeds: [emptyEmbed] });
    }

    // Pagination logic
    const totalQuests = settings.activeQuests.length;
    const totalPages = Math.ceil(totalQuests / MAX_QUESTS_PER_PAGE);
    const startIdx = (page - 1) * MAX_QUESTS_PER_PAGE;
    const endIdx = Math.min(startIdx + MAX_QUESTS_PER_PAGE, totalQuests);
    const questsToShow = settings.activeQuests.slice(startIdx, endIdx);
    const userId = interaction.user.id;
    const member = await interaction.guild.members.fetch(userId).catch(() => null);
    const rawUsername = member?.nickname || interaction.user?.globalName || interaction.user?.username || 'Unknown User';
    const Username = rawUsername.replace(/[^a-zA-Z0-9\s]/g, '').trim();

    // Create the main embed
    const embed = new EmbedBuilder()
      .setTitle(`📜 ${Username}'s Active Quests`)
      .setColor(EMBED_COLORS.ACTIVE_QUESTS)
      .setDescription(`You have **${totalQuests}** active quest(s)\n\n*Click a quest below to view details*`)
      .setFooter({ 
        text: totalPages > 1 ? `Page ${page} of ${totalPages}` : 'Embark on your adventures!',
        iconURL: interaction.user.displayAvatarURL() 
      })
      .setTimestamp();

    // Add quest fields to the embed
    questsToShow.forEach((quest, idx) => {
      const globalIdx = startIdx + idx;
      const timeElapsed = this.formatTimeElapsed(quest.startedAt);
      
      embed.addFields({
        name: `🔹 ${quest.name}`,
        value: [
          `⏱️ Started: ${timeElapsed} ago`,
          `📌 Status: ${quest.status || 'In Progress'}`,
          `🔘 [View Details] (use button below)`,
          `\u200b` // Empty line for spacing
        ].join('\n'),
        inline: false
      });
    });

    // Create quest buttons
    const buttonRows = this.createQuestButtons(questsToShow, startIdx);

    // Add pagination buttons if needed
    if (totalPages > 1) {
      const paginationRow = this.createPaginationButtons(page, totalPages);
      buttonRows.push(paginationRow);
    }

    await interaction.editReply({ 
      embeds: [embed], 
      components: buttonRows 
    });
  },

  // Utility function to format time elapsed
  formatTimeElapsed(startDate) {
    const now = new Date();
    const diff = now - startDate;
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    
    return parts.join(' ') || 'just now';
  },

  // Create quest buttons in organized rows
  createQuestButtons(quests, startIndex) {
    const rows = [];
    let currentRow = new ActionRowBuilder();

    quests.forEach((quest, idx) => {
      if (currentRow.components.length === MAX_BUTTONS_PER_ROW) {
        rows.push(currentRow);
        currentRow = new ActionRowBuilder();
      }

      currentRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`activeQuest_${startIndex + idx}`)
          .setLabel(quest.name.length > 20 ? `${quest.name.substring(0, 17)}...` : quest.name)
          .setStyle(ButtonStyle.Primary)
      );
    });

    if (currentRow.components.length > 0) {
      rows.push(currentRow);
    }

    return rows;
  },

  // Create pagination buttons
  createPaginationButtons(currentPage, totalPages) {
    const row = new ActionRowBuilder();

    // Previous page button
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`myquests_page_${currentPage - 1}`)
        .setLabel('◀️ Previous')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage <= 1)
    );

    // Page indicator
    row.addComponents(
      new ButtonBuilder()
        .setCustomId('page_indicator')
        .setLabel(`${currentPage}/${totalPages}`)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(true)
    );

    // Next page button
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`myquests_page_${currentPage + 1}`)
        .setLabel('Next ▶️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage >= totalPages)
    );

    return row;
  }
};