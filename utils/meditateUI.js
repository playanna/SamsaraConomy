const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const createBaseEmbed = require('./embed');
const {
  getProgressBar,
  getUpgradeCost,
  getCultivationRealm,
  getRandomTrainingGroundsQuote,
  getBreakthroughQuote,
} = require('./cultivationutils');

const emoji = '<a:flameice:1361606119906344996> ';
const spiritstones = '<:karmicstone:757981408143868034> ';
const upgradeConfig = require('./upgradeConfig');

function createUpgradeButton(type, level, balance) {
  const config = upgradeConfig[type];
  const cost = getUpgradeCost(level);
  const canAfford = balance >= cost;

  return new ButtonBuilder()
    .setCustomId(`upgrade_${type}`)
    .setLabel(
      level >= config.maxLevel
        ? `✅ ${config.label} Mastered`
        : `— ${cost} Spirit Stones`
    )
    .setEmoji(config.emoji)
    .setStyle(canAfford ? ButtonStyle.Success : ButtonStyle.Secondary)
    .setDisabled(!canAfford || level >= config.maxLevel);
}

function createAllUpgradeButtons(multipliers, balance) {
  const buttons = [];

  for (const type in upgradeConfig) {
    const config = upgradeConfig[type];
    const level = multipliers[config.key] || 0;
    const button = createUpgradeButton(type, level, balance);
    buttons.push(button);
  }

  // Split into ActionRows (max 5 buttons each)
  const rows = [];
  for (let i = 0; i < buttons.length; i += 5) {
    rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
  }

  return rows;
}

function createSectHallButton() {
  return new ButtonBuilder()
    .setCustomId('sect_hall')
    .setLabel('Return to Sect Hall')
    .setStyle(ButtonStyle.Primary);
}

function buildMeditationEmbed(interaction, multipliers, balance) {
  const fields = [];
  const upgradeEntries = [];

  for (const type in upgradeConfig) {
    const config = upgradeConfig[type];
    const level = multipliers[config.key] || 0;
    const percent = Math.floor((level / config.maxLevel) * 100);
    const bar = getProgressBar(percent);
    const cost = getUpgradeCost(level);

    const entry = [
      `**${config.emoji} ${config.label}** *(Tier ${level})*`,
      `${config.getMultiplier(level)}`,
      `${bar} ${percent}%`,
      level < config.maxLevel
        ? `Next: ${cost} ${spiritstones}`
        : `🌌 Mastered!`
    ].join('\n');

    upgradeEntries.push(entry);
  }

  // Group two entries per field
  for (let i = 0; i < upgradeEntries.length; i += 2) {
    const left = upgradeEntries[i];
    const right = upgradeEntries[i + 1] || '';
    const value = [left, right].filter(Boolean).join('\n\u2003\u2003\u2003\n'); // spacing between

    fields.push({
      name: '\u200b',
      value,
      inline: true
    });
  }

  // Balance field (separate, full width)
  fields.push({
    name: '\u200b',
    value: `💠 **Available Balance**: ${balance} ${spiritstones}`,
    inline: true
  });

  return createBaseEmbed({
    interaction,
    title: `🪷 **Your Cultivation Path**`,
    description: `> **${getRandomTrainingGroundsQuote()}**`,
    color: 0x5e35b1,
    fields,
    footer: {
      text: '「轮回无终，大道永恒」\n"Samsara is endless, yet the Great Dao is eternal."',
      iconURL: interaction.guild?.iconURL({ dynamic: true }) || null,
    },
  });
}


function buildBreakthroughEmbed(interaction, multipliers, level, balance) {
  const fields = []; 
  const upgradeEntries = [];
  
  for (const type in upgradeConfig) {
    const config = upgradeConfig[type];
    const level = multipliers[config.key] || 0;
    const percent = Math.floor((level / config.maxLevel) * 100);
    const bar = getProgressBar(percent);
    const cost = getUpgradeCost(level);

    const entry = [
      `**${config.emoji} ${config.label}** *(Tier ${level})*`,
      `${config.getMultiplier(level)}`,
      `${bar} ${percent}%`,
      level < config.maxLevel
        ? `Next: ${cost} ${spiritstones}`
        : `🌌 Mastered!`
    ].join('\n');

    upgradeEntries.push(entry);
  }

     // Group two entries per field
  for (let i = 0; i < upgradeEntries.length; i += 2) {
    const left = upgradeEntries[i];
    const right = upgradeEntries[i + 1] || '';
    const value = [left, right].filter(Boolean).join('\n\u2003\u2003\u2003\n'); // spacing between

    fields.push({
      name: '\u200b',
      value,
      inline: true
    });
  }
// Balance field (not inline)
fields.push({
  name: '\u200b',
  value: `💠 **Available Balance**: ${balance} ${spiritstones}`,
  inline: false
});

return createBaseEmbed({
  interaction,
  title: `🪷 **Your Cultivation Path**`,
  description: `> **"${getBreakthroughQuote(level)}"**`,
  color: 0x5e35b1,
  fields,
  footer: {
    text: '「轮回无终，大道永恒」\n"Samsara is endless, yet the Great Dao is eternal."',
    iconURL: interaction.guild?.iconURL({ dynamic: true }) || null,
  },
});
}

module.exports = {
  createUpgradeButton,
  createSectHallButton,
  createAllUpgradeButtons,
  buildMeditationEmbed,
  buildBreakthroughEmbed,
};
