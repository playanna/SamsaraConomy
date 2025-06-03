const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const ExpeditionSettings = require('../../models/Multipliers/expeditionSetting.js');
const createBaseEmbed = require('../../utils/embed.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('monsterstats')
    .setDescription('📊 View your monster slaying statistics and achievements'),
    stage: 'beta',

  async execute(interaction) {
    const userId = interaction.user.id;
    
    try {
      await interaction.deferReply();

      // Get user's expedition settings
      let expeditionSettings = await ExpeditionSettings.findOne({ userId });
      if (!expeditionSettings || !expeditionSettings.monsterSlayingLog) {
        return interaction.editReply({
          content: '📊 No monster slaying data found. Start fighting monsters to build your statistics!',
        });
      }

      const log = expeditionSettings.monsterSlayingLog;
      const stats = log.statistics || {};

      // Create main statistics embed
      const mainEmbed = createBaseEmbed({
        interaction,
        title: '🗡️ Monster Slaying Chronicle',
        description: `${interaction.user.username}'s legendary deeds in the spiritual realms`,
        color: 0x8B0000
      });

      // Add general statistics
      mainEmbed.addFields(
        {
          name: '📈 **General Statistics**',
          value: [
            `🔪 Total Monsters Slain: **${log.totalMonstersSlain || 0}**`,
            `🔥 Current Kill Streak: **${stats.currentKillStreak || 0}**`,
            `⚡ Longest Kill Streak: **${stats.longestKillStreak || 0}**`,
            `📅 Weekly Kills: **${stats.weeklyKills || 0}**`,
            `🏠 Favorite Realm: **${stats.favoriteRealm || 'None'}**`
          ].join('\n'),
          inline: false
        }
      );

      // Add realm breakdown
      if (log.slainByRealm) {
        const realmStats = Object.entries(log.slainByRealm)
          .filter(([_, kills]) => kills > 0)
          .sort(([_, a], [__, b]) => b - a)
          .map(([realm, kills]) => `${getRealmEmoji(realm)} ${capitalize(realm)}: **${kills}**`)
          .join('\n') || 'No kills recorded';

        mainEmbed.addFields({
          name: '🌍 **Kills by Realm**',
          value: realmStats,
          inline: true
        });
      }

      // Add strongest monster info
      if (stats.strongestMonsterSlain && stats.strongestMonsterSlain.monsterName) {
        const strongest = stats.strongestMonsterSlain;
        mainEmbed.addFields({
          name: '👑 **Strongest Monster Slain**',
          value: [
            `**${strongest.monsterName}**`,
            `Level: **${strongest.level}**`,
            `Slain: <t:${Math.floor(new Date(strongest.slainAt).getTime() / 1000)}:R>`
          ].join('\n'),
          inline: true
        });
      }

      // Add achievements
      if (log.achievements && log.achievements.length > 0) {
        const recentAchievements = log.achievements
          .sort((a, b) => new Date(b.unlockedAt) - new Date(a.unlockedAt))
          .slice(0, 5)
          .map(achievement => `🏆 **${achievement.name}** - ${achievement.description}`)
          .join('\n');

        mainEmbed.addFields({
          name: `🏆 **Recent Achievements** (${log.achievements.length} total)`,
          value: recentAchievements,
          inline: false
        });
      }

      // Create top monsters embed
      const topMonstersEmbed = new EmbedBuilder()
        .setTitle('🎯 Top Monster Kills')
        .setColor(0x4B0082);

      if (log.slainByMonster && log.slainByMonster.length > 0) {
        const topMonsters = log.slainByMonster
          .sort((a, b) => (b.killCount || 0) - (a.killCount || 0))
          .slice(0, 10);

        let description = '';
        topMonsters.forEach((monster, index) => {
          const rank = index + 1;
          const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
          description += `${medal} **${monster.monsterName}** (Lv.${monster.level})\n`;
          description += `   ${getRealmEmoji(monster.realm)} ${capitalize(monster.realm)} Realm - **${monster.killCount || 1}** kills\n`;
          description += `   💰 ${monster.totalCoinsGained || 0} coins | ⭐ ${monster.totalXpGained || 0} XP\n\n`;
        });

        topMonstersEmbed.setDescription(description || 'No monster data available');
      } else {
        topMonstersEmbed.setDescription('No monsters slain yet. Start your hunting career!');
      }

      await interaction.editReply({
        embeds: [mainEmbed, topMonstersEmbed]
      });

    } catch (error) {
      console.error('Monster stats error:', error);
      await interaction.editReply({
        content: '❌ An error occurred while retrieving your monster statistics.'
      });
    }
  }
};

function getRealmEmoji(realm) {
  const emojis = {
    verdant: '🌿',
    moon: '🌙',
    crimson: '🔥',
    abyssal: '🌊',
    chains: '⛓️',
    hells: '👹',
    summit: '⛰️'
  };
  return emojis[realm] || '❓';
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
