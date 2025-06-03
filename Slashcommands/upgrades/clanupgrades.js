const { SlashCommandBuilder, ActionRowBuilder } = require('discord.js');
const Multipliers = require('../../models/Multipliers/multipliers');
const Clan = require('../../models/Clan/clan');
const Hand = require('../../models/balance/hand');
const {
  createSectHallButton,
  createAllUpgradeButtons,
  buildMeditationEmbed,
  buildBreakthroughEmbed,
} = require('../../utils/clanupgradesUI');
const { getclanUpgradeCost } = require('../../utils/cultivationutils');
const upgradeConfig = require('../../utils/clanupgradeConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clanupgrades')
    .setDescription('Enter the Training Grounds to refine your cultivation'),

  async execute(interaction) {
    const userId = interaction.user.id;

    const multipliers = await Multipliers.findOne({ userId }) || new Multipliers({ userId });
    const clan = await Clan.findOne({ "members.userId": userId });
    if (!clan) {
      return interaction.reply({
        content: '❌ **"You are not a member of any clan."**',
        ephemeral: true,
      });
    }
    const hand = await Hand.findOne({ userId }) || new Hand({ userId });
    const clanupgrades = clan.upgrades || {};

    await multipliers.save();
    await hand.save();

    const embed = buildMeditationEmbed(interaction, multipliers, hand.balance, clanupgrades);
    const upgradeRows = createAllUpgradeButtons(multipliers, hand.balance, clanupgrades);
    const sectHallButton = createSectHallButton();

await interaction.reply({
  embeds: [embed],
  components: [
    ...upgradeRows,
    new ActionRowBuilder().addComponents(sectHallButton),
  ],
});

  },

  async handleButton(interaction) {
    const userId = interaction.user.id;

    // Handle only upgrade buttons
    if (!interaction.customId.startsWith('clanupgrade_')) return;

    const type = interaction.customId.replace('clanupgrade_', '');
    const config = upgradeConfig[type];
    if (!config) return; // Not a valid upgrade type

    const multipliers = await Multipliers.findOne({ userId }) || new Multipliers({ userId });
    const clan = await Clan.findOne({ "members.userId": userId });
    if (!clan) {
      return interaction.reply({
        content: '❌ **"You are not a member of any clan."**',
        ephemeral: true,
      });
    }
    const hand = await Hand.findOne({ userId }) || new Hand({ userId });
    const clanupgrades = clan.upgrades || {};

    const currentLevel = clanupgrades[config.key] || 0;
    const cost = getclanUpgradeCost(currentLevel);

    if (currentLevel >= config.maxLevel) {
      return interaction.reply({
        content: `🪷 **"You have transcended the ${config.label} path."**`,
        ephemeral: true,
      });
    }

    if (hand.balance < cost) {
      return interaction.reply({
        content: `❌ **"Your Spirit Stones are insufficient for upgrading ${config.label}."**\n*(Need: ${cost} | Have: ${hand.balance})*`,
        ephemeral: true,
      });
    }

    // Perform the upgrade
    hand.balance -= cost;
    clan.upgrades[config.key] = currentLevel + 1;
    await clan.save();


    await hand.save();
    
    
    const newLevel = clanupgrades[config.key];
    const embed = buildBreakthroughEmbed(interaction, multipliers, newLevel, hand.balance, clanupgrades);
    const upgradeButtons = createAllUpgradeButtons(multipliers, hand.balance, clanupgrades);
    const sectHallButton = createSectHallButton();

    await interaction.update({
      embeds: [embed],
      components: [
        ...upgradeButtons,
        new ActionRowBuilder().addComponents(sectHallButton),
      ],      
    });
  },
};

function groupButtonsIntoRows(buttons, maxPerRow) {
  const rows = [];
  for (let i = 0; i < buttons.length; i += maxPerRow) {
    const row = new ActionRowBuilder().addComponents(...buttons.slice(i, i + maxPerRow));
    rows.push(row);
  }
  return rows;
}
