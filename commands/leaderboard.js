const { SlashCommandBuilder } = require('discord.js');
const Bank = require('../models/balance/bank');
const Hand = require('../models/balance/hand');
const Clanpoints = require('../models/Clan/clanpoints');
const Loss = require('../models/balance/loss');
const createBaseEmbed = require('../utils/embed');
const { cacheManager } = require('../utils/cache/cacheManager');
const {emojis} = require('../data/emojis');
const getUsername = require('../utils/usernamesCache');


const leaderboardCategories = {
  hand: { model: Hand, field: 'balance', label: 'Karmic Stones' },
  clanpoints: { model: Clanpoints, field: 'balance', label: 'Karmic Jades' },
  loss: { model: Loss, field: 'totalLoss', label: 'Gambling Losses' },
};

async function loadCache() {
  for (const [key, { model, field }] of Object.entries(leaderboardCategories)) {
    for (const order of ['asc', 'desc']) {
      const sortOrder = order === 'asc' ? 1 : -1;
      const topEntries = await model.find({})
        .sort({ [field]: sortOrder })
        .limit(10)
        .lean();
      const cacheKey = `${key}:${order}`;
      cacheManager.set('LEADERBOARD', cacheKey, { topEntries, timestamp: Date.now() });
    }
  }
}

// Preload once
loadCache();

async function handleLeaderboard({ categoryKey, order = 'desc', interaction, message }) {
  const { model: Model, field: sortField, label } = leaderboardCategories[categoryKey] || {};
  const userId = interaction?.user?.id || message?.author?.id;
  const guild = interaction?.guild || message?.guild;
  const client = interaction?.client || message?.client;

  if (!Model) {
    const reply = '❌ Invalid category selected.';
    return interaction ? interaction.reply({ content: reply, ephemeral: true }) : message.reply(reply);
  }
  try {
    if (interaction) await interaction.deferReply();
    const cacheKey = `${categoryKey}:${order}`;
    const cachedData = cacheManager.get('LEADERBOARD', cacheKey);
    let userRank;

    if (!cachedData || !cachedData.topEntries) {
      const failMsg = `❌ Leaderboard is being prepared. Please try again shortly.`;
      return interaction
        ? interaction.editReply(failMsg)
        : message.reply(failMsg);
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
        const name = await getUsername(client, guild, entry.userId);
        const value = (entry[sortField] || 0).toFixed(2);
        const currencySymbol = categoryKey === 'hand' ? emojis.spiritstone : emojis.heavenlyorbs;
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
        icon: guild.iconURL(),
      },
    });

    if (interaction) {
      await interaction.editReply({ embeds: [embed] });
    } else {
      await message.reply({ embeds: [embed] });
    }

  } catch (err) {
    console.error('Leaderboard Error:', err);
    const failMsg = '❌ Failed to load leaderboard.';
    return interaction
      ? interaction.editReply({ content: failMsg, ephemeral: true })
      : message.reply(failMsg);
  }
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

  aliases: ['mlb'], // Text command trigger: -mlb
  usage: '-mlb -kj | -ks | -loss',
  stage: 'beta',

  async execute(interaction) {
    const categoryKey = interaction.options.getString('category');
    const order = interaction.options.getString('order') || 'desc';
    await handleLeaderboard({ categoryKey, order, interaction });
  },

  async trigger(message) {
    const content = message.content.trim().toLowerCase();
    if (!content.startsWith('-mlb')) return;

    // Simple guide/help
    if (content === '-mlb') {
      const helpEmbed = createBaseEmbed({
        title: '**Mortal Leaderboard Help**',
        description: `
Use the following commands:
- \`-mlb -kj\` → Karmic Jades leaderboard
- \`-mlb -ks\` → Karmic Stones leaderboard
- \`-mlb -loss\` → Gambling Losses leaderboard

Or use the slash command \`/leaderboard\` for more options.
        `,
        footer: { text: 'Leaderboard System' },
      });
      return message.reply({ embeds: [helpEmbed] });
    }

    if (content.includes('-kj')) return handleLeaderboard({ categoryKey: 'clanpoints', order: 'desc', message });
    if (content.includes('-ks')) return handleLeaderboard({ categoryKey: 'hand', order: 'desc', message });
    if (content.includes('-loss')) return handleLeaderboard({ categoryKey: 'loss', order: 'desc', message });

    return message.reply('❌ Invalid leaderboard option. Use `-mlb` for help.');
  },
};
