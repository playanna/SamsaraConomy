const { SlashCommandBuilder } = require('discord.js');
const Bank = require('../../models/balance/bank');
const Hand = require('../../models/balance/hand');
const Clanpoints = require('../../models/Clan/clanpoints');
const Loss = require('../../models/balance/loss');
const createBaseEmbed = require('../../utils/embed');
const { cacheManager } = require('../../utils/cache/cacheManager');
const {emojis} = require('../../data/emojis');
const getUsername = require('../../utils/usernamesCache');

const leaderboardCategories = {
  hand: { model: Hand, field: 'balance', label: 'Karmic Stones' },
  clanpoints: { model: Clanpoints, field: 'balance', label: 'Karmic Jades' },
  loss: { model: Loss, field: 'totalLoss', label: 'Gambling Losses' },
};

async function refreshLeaderboardCache(client, label = 'Manual') {
  console.time(`[CACHE] ${label}`);
  const guild = await client.guilds.fetch(process.env.GUILD_ID);

  for (const [key, { model, field }] of Object.entries(leaderboardCategories)) {
    for (const order of ['asc', 'desc']) {
      const sortOrder = order === 'asc' ? 1 : -1;
      const topEntries = await model.find({})
        .sort({ [field]: sortOrder })
        .limit(10)
        .lean();

      for (const entry of topEntries) {
        await getUsername(client, guild, entry.userId);
      }      const cacheKey = `${key}:${order}`;
      cacheManager.set('LEADERBOARD', cacheKey, { topEntries, timestamp: Date.now() });
    }
  }
  console.timeEnd(`[CACHE] ${label}`);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View the top users by a given category')
    .addStringOption(option =>
      option.setName('category')
        .setDescription('Choose which leaderboard to view')
        .setRequired(true)
        .addChoices(
          ...Object.entries(leaderboardCategories).map(([key, val]) => ({
            name: val.label,
            value: key,
          }))
        )
    )
    .addStringOption(option =>
      option.setName('order')
        .setDescription('Sort order: asc (low to high) or desc (high to low)')
        .addChoices(
          { name: 'Descending', value: 'desc' },
          { name: 'Ascending', value: 'asc' }
        )
    ),

  stage: 'beta',

  async execute(interaction) {
    console.time('[CMD] Leaderboard');
    const categoryKey = interaction.options.getString('category');
    const order = interaction.options.getString('order') || 'desc';
    const { model: Model, field: sortField, label } = leaderboardCategories[categoryKey] || {};
    const userId = interaction.user.id;

    if (!Model) {
      return interaction.reply({ content: '❌ Invalid category selected.', ephemeral: true });
    }    try {
      await interaction.deferReply();
      const cacheKey = `${categoryKey}:${order}`;
      const cachedData = cacheManager.get('LEADERBOARD', cacheKey);
      let userRank;

      if (!cachedData?.topEntries) {
        return interaction.editReply(`❌ Leaderboard is currently being prepared. Please try again shortly.`);
      }

      const userEntry = await Model.findOne({ userId }).lean();
      if (userEntry) {
        const betterCount = await Model.countDocuments({
          [sortField]: { [order === 'desc' ? '$gt' : '$lt']: userEntry[sortField] }
        });
        userRank = betterCount + 1;
      }

      const leaderboard = await Promise.all(
        cachedData.topEntries.map(async (entry, i) => {
          const value = (entry[sortField] || 0).toFixed(2);
          const name = await getUsername(interaction.client, interaction.guild, entry.userId);
          const currencySymbol = categoryKey === 'hand' ? `${emojis.spiritstone}` : `${emojis.heavenlyorbs}`;
          return `**${i + 1}.** ${name} — ${currencySymbol}${value}`;
        })
      );

      const embed = createBaseEmbed({
        interaction,
        title: `**___Top 10 ${label}___**`,
        description: leaderboard.join('\n'),
        thumbnail: categoryKey === 'hand'
          ? "https://cdn.discordapp.com/emojis/662377902054047744.png"
          : "https://cdn.discordapp.com/emojis/776075202849013770.png",
        footer: {
          text: userRank
            ? `You are ranked #${userRank} in ${label}.`
            : `You're not ranked in ${label} yet.`,
          icon: interaction.guild.iconURL(),
        },
      });

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('Leaderboard Error:', err);
      await interaction.editReply({ content: '❌ Failed to load leaderboard.', ephemeral: true });
    } finally {
      console.timeEnd('[CMD] Leaderboard');
    }
  },

  refreshLeaderboardCache,
};
