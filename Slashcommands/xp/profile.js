const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const ExpeditionSettings = require('../../models/Multipliers/expeditionSetting');
const Multipliers = require('../../models/Multipliers/multipliers');
const Inventory = require('../../models/Multipliers/inventory');
const createBaseEmbed = require('../../utils/embed');
const Xp = require('../../models/XP/xp');
const { cultivationStages } = require('../../utils/cultivationStages.js');

const DEFAULT_SETTINGS = {
  expeditions: 0,
  autosell: false,
  sellMultiplier: 1.0,
  traderXP: 0,
  winStreak: 0,
  longestWinStreak: 0,
  misfortunes: 0
};

const DEFAULT_MULTIPLIERS = {
  lootMultiplier: 1.0,
  cooldownReduction: 1.0,
  xpMultiplier: 1.0,
  jackpotBoost: 0,
  lossProtection: 1.0
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('Inspect your cultivation journey and Dao achievements'),

  async execute(interaction) {
    const { user } = interaction;
    const userId = user.id;

    try {
      await interaction.deferReply();

      // Parallel DB fetch
      const [xpData, settingsData, multipliersData, inventoryData] = await Promise.all([
        Xp.findOne({ userId }),
        ExpeditionSettings.findOne({ userId }),
        Multipliers.findOne({ userId }),
        Inventory.findOne({ userId })
      ]);

      const xp = xpData?.xp || 0;
      const settings = settingsData || new ExpeditionSettings({ userId, ...DEFAULT_SETTINGS });
      const multipliers = multipliersData || new Multipliers({ userId, ...DEFAULT_MULTIPLIERS });
      const inventory = inventoryData || {};

      if (!settingsData) await settings.save();
      if (!multipliersData) await multipliers.save();

      // XP Stage Calculation (math optimized)
      const stage = Math.floor(Math.sqrt(xp / 100));
      const cultivationRank = calculateRank(settings.expeditions);
      const emoji = '☸';

      const currentRealm = inventory.karmicRealms || 'Karma-Bhāra';
      const currentStage = cultivationStages.find(stage => stage.name === currentRealm) || cultivationStages[0];

      const embed = createBaseEmbed({
        interaction,
        author: {
          name: `🀄 Here's Your Dao Heart Report, ${user.globalName || user.username}: `,
          iconURL: user.displayAvatarURL({ dynamic: true }),
        },
        thumbnail: user.displayAvatarURL({ dynamic: true }),
        image: 'https://github.com/playanna/Samsara-bot/blob/d6f9b0fbc4f8c88bfe83ee413c4a164569d4a09f/images/realms/secthall/meditationchamber.jpeg?raw=true',
        color: 0x5e35b1,
        description: [
          `> -# *"It rains outside your quiet chamber as you review your cultivation journey..."*`,
        ].join('\n'),
        fields: [
          {
            name: '☯ **Realm Exploration Records**',
            value: [
              `-# ${emoji} **Total Expeditions**: ${settings.expeditions}`,
              `-# ${emoji} **Karmic Tide Streak**: ${settings.winStreak}`,
              `-# ${emoji} **Longest Streak**: ${settings.longestWinStreak}`,
              `-# ${emoji} **Qi Deviations (Failures)**: ${settings.misfortunes}`,
              `-# ${emoji} **Total Karmic Debt**: ${inventory.totalKarmicDebt || 0} Debt`,
            ].join('\n'),
            inline: true
          },
          {
            name: '☯ **Dao Comprehension**',
            value: [
              `-# ${emoji} **Lootrate Upgrade**: ${multipliers.lootupgradeLevel}/10 (x${2 ** multipliers.lootupgradeLevel})`,
              `-# ${emoji} **XPrate Upgrade**: ${multipliers.xpupgradeLevel}/10 (x${2 ** multipliers.xpupgradeLevel})`,
              `-# ${emoji} **Sellprice Upgrade**: ${multipliers.shopupgradeLevel}/10`,
              `-# ${emoji} **Pagoda Upgrade**: ${multipliers.clanupgradeLevel}/10`,
              `-# ${emoji} **Discount Upgrade**: ${multipliers.discountupgradeLevel}/10`,
            ].join('\n'),
            inline: true
          },
        ],
        footer: {
          text: `"${getRandomWisdom()}"`,
          iconURL: interaction.guild?.iconURL({ dynamic: true }) || null,
        }
      });

      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('sect_rank')
          .setLabel('Check Cultivation Rank')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('sect_hall')
          .setLabel('Sect halls')
          .setStyle(ButtonStyle.Primary)
      );

      await interaction.editReply({ embeds: [embed], components: [row2] });

    } catch (err) {
      console.error('❌ Dao Heart inspection failed:', err);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '⚠️ Your spiritual records were lost in a qi deviation...',
          ephemeral: true
        });
      } else {
        await interaction.editReply({
          content: '⚠️ Your spiritual records were lost in a qi deviation...',
          embeds: [],
          components: []
        });
      }
    }
  }
};

// --- Cultivation Helpers ---
function calculateRank(expeditions) {
  const ranks = [
    { name: 'Mortal Flesh (凡躯)', threshold: 0 },
    { name: 'Qi Refining (炼气期)', threshold: 10 },
    { name: 'Foundation Establishment (筑基期)', threshold: 20 },
    { name: 'Golden Core (金丹真人)', threshold: 30 },
    { name: 'Nascent Soul (元婴老祖)', threshold: 40 },
    { name: 'Divine Transformation (化神期)', threshold: 50 }
  ];
  return ranks.slice().reverse().find(r => expeditions >= r.threshold).name;
}

function getRandomWisdom() {
  const wisdoms = [
    "The mountain does not laugh at the river for being small",
    "When drinking water, remember its source",
    "A journey of a thousand miles begins with a single step",
    "The soft overcomes the hard; the weak overcomes the strong",
    "He who knows others is wise; he who knows himself is enlightened",
    "A thousand years of cultivation is worth less than a moment of enlightenment."
  ];
  return wisdoms[Math.floor(Math.random() * wisdoms.length)];
}
