const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const ExpeditionSettings = require('../../models/Multipliers/expeditionSetting.js');
const { calculateDailyReward, calculateWeeklyReward } = require('../../utils/workhelpers/handlers/challengeHandler.js');
const createBaseEmbed = require('../../utils/embed.js');
const {emojis} = require('../../data/emojis.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('challenges')
    .setDescription('View your daily/weekly expedition challenges and progress')
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('View your current challenge progress and streak bonuses')
    ),

  async execute(interaction) {
    const userId = interaction.user.id;
    const subcommand = interaction.options.getSubcommand();

    try {
      await interaction.deferReply();

      // Get user's expedition settings
      const settings = await ExpeditionSettings.findOne({ userId });
      if (!settings) {
        return interaction.editReply({
          content: '❌ You need to start your cultivation journey first! Use `/work` to begin.',
          ephemeral: true
        });
      }

      // Initialize challenges if they don't exist
      if (!settings.challenges) {
        settings.challenges = {
          daily: {
            expeditionsToday: 0,
            expeditionGoal: 5,
            lastDailyReset: new Date(),
            dailyRewardClaimed: false,
            dailyStreak: 0,
            longestDailyStreak: 0
          },
          weekly: {
            expeditionsThisWeek: 0,
            expeditionGoal: 30,
            lastWeeklyReset: new Date(),
            weeklyRewardClaimed: false,
            weeklyStreak: 0,
            longestWeeklyStreak: 0
          },
          bonusRewards: {
            totalBonusXP: 0,
            totalBonusGold: 0,
            totalLootMultiplierBonus: 0,
            streakBonusActive: false,
            streakMultiplier: 1.0
          }
        };
        await settings.save();
      }      if (subcommand === 'view') {
        await handleViewChallenges(interaction, settings);
      }

    } catch (error) {
      console.error('Challenges command error:', error);
      await interaction.editReply({
        content: `❌ An error occurred: ${error.message}`,
        ephemeral: true
      });
    }
  },

  stage: 'beta'
};

async function handleViewChallenges(interaction, settings) {
  const { challenges } = settings;
  const daily = challenges.daily;
  const weekly = challenges.weekly;
  const bonusRewards = challenges.bonusRewards;

  // Calculate progress percentages
  const dailyPercent = Math.min(100, Math.floor((daily.expeditionsToday / daily.expeditionGoal) * 100));
  const weeklyPercent = Math.min(100, Math.floor((weekly.expeditionsThisWeek / weekly.expeditionGoal) * 100));

  // Create progress bars
  const dailyBar = createProgressBar(dailyPercent);
  const weeklyBar = createProgressBar(weeklyPercent);

  // Calculate potential rewards
  const dailyReward = calculateDailyReward(settings);
  const weeklyReward = calculateWeeklyReward(settings);
  // Create status indicators
  const dailyStatus = daily.expeditionsToday >= daily.expeditionGoal 
    ? '✅ **Auto-Claimed**'
    : '⏳ **In Progress**';
    
  const weeklyStatus = weekly.expeditionsThisWeek >= weekly.expeditionGoal 
    ? '✅ **Auto-Claimed**'
    : '⏳ **In Progress**';

  // Streak bonus information
  const streakInfo = bonusRewards.streakBonusActive 
    ? `🔥 **Active Streak Bonus**: ${bonusRewards.streakMultiplier.toFixed(2)}x multiplier`
    : '💤 **No Active Streak Bonus**';
  const embed = createBaseEmbed({
    interaction,
    title: '🏆 Expedition Challenges',
    description: [
      '*Complete daily and weekly expeditions to earn rewards automatically!*',
      '',
      '🎁 **Rewards are automatically claimed when goals are completed**',
      '',
      streakInfo
    ].join('\n'),
    color: 0x7c3aed,
    fields: [
      {
        name: '📅 Daily Challenge',
        value: [
          `${dailyBar} ${dailyPercent}%`,
          `**Progress**: ${daily.expeditionsToday}/${daily.expeditionGoal} expeditions`,
          `**Status**: ${dailyStatus}`,
          `**Current Streak**: ${daily.dailyStreak} days`,
          `**Longest Streak**: ${daily.longestDailyStreak} days`,
          '**Reward Preview**:',
          `☯ ${dailyReward.xp} XP | ${emojis.heavenlyorbs} ${dailyReward.gold} Karmic Jades | 🎯 ${(dailyReward.lootMultiplier * 100).toFixed(1)}% Loot Bonus`
        ].join('\n'),
        inline: true
      },
      {
        name: '📊 Weekly Challenge',
        value: [
          `${weeklyBar} ${weeklyPercent}%`,
          `**Progress**: ${weekly.expeditionsThisWeek}/${weekly.expeditionGoal} expeditions`,
          `**Status**: ${weeklyStatus}`,
          `**Current Streak**: ${weekly.weeklyStreak} weeks`,
          `**Longest Streak**: ${weekly.longestWeeklyStreak} weeks`,
          '**Reward Preview**:',
          `☯ ${weeklyReward.xp} XP | ${emojis.heavenlyorbs} ${weeklyReward.gold} Karmic Jades | 🎯 ${(weeklyReward.lootMultiplier * 100).toFixed(1)}% Loot Bonus`
        ].join('\n'),
        inline: true
      },
      {
        name: '🎖️ Total Bonus Rewards Claimed',
        value: [
          `☯ **Total Bonus XP**: ${bonusRewards.totalBonusXP.toLocaleString()}`,
          `${emojis.heavenlyorbs} **Total Bonus KarmicJades**: ${bonusRewards.totalBonusGold.toLocaleString()}`,
          `🎯 **Total Loot Bonus**: ${(bonusRewards.totalLootMultiplierBonus * 100).toFixed(1)}%`
        ].join('\n'),
        inline: false
      }
    ],    footer: {
      text: 'Rewards are automatically claimed when you complete goals! • Streak bonuses apply to all expeditions while active',
      iconURL: interaction.guild?.iconURL({ dynamic: true }) || null
    }
  });

  // No need for claim buttons since rewards are auto-claimed
  await interaction.editReply({
    embeds: [embed]
  });
}

function createProgressBar(percentage, length = 20) {
  const filled = Math.floor((percentage / 100) * length);
  const empty = length - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  return `\`${bar}\``;
}
