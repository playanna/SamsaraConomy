// utils/buttons/upgrades/upgrade_router.js
const Multipliers = require('../../../models/Multipliers/multipliers');
const Clanpoints = require('../../../models/Clan/clanpoints');
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const emoji = '<:heavenlyorbs:776075202849013770>'; // Replace with actual emoji ID

const STATS = {
  loot: 'Loot Multiplier',
  xp: 'XP Multiplier',
  shop: 'Shop Bonus',
  clan: 'Clan Power',
  discount: 'Discount Power',
};

module.exports = {
  async execute(interaction) {
    const userId = interaction.user.id;
    const statKey = interaction.customId.split('_')[1]; // From "upgrade_loot", extract "loot"

    if (!STATS[statKey]) {
      return interaction.reply({
        content: '❌ Unknown stat type.',
        ephemeral: true,
      });
    }

    const multipliers =
      (await Multipliers.findOne({ userId })) ||
      await Multipliers.create({ userId });
    const clanpoints =
      (await Clanpoints.findOne({ userId })) ||
      await Clanpoints.create({ userId });

    const statField = `${statKey}upgradeLevel`;
    const currentLevel = multipliers[statField];
    console.log(`Current Level: ${currentLevel}`);
    console.log(`Stat Field: ${statField}`);
    const baseCost = 100;
    const multiplier = 100;
    const cost = baseCost + multiplier * currentLevel ** 6;

    if (currentLevel >= 10) {
      return interaction.reply({
        content: `❌ ${STATS[statKey]} is already maxed out.`,
        ephemeral: true,
      });
    }

    if (clanpoints.balance < cost) {
      return interaction.reply({
        content: `❌ You need ${cost} ${emoji} to upgrade ${STATS[statKey]}, but you only have ${clanpoints.balance} ${emoji}.`,
        ephemeral: true,
      });
    }

    // Proceed with upgrade
    multipliers[statField] += 1;
    clanpoints.balance -= cost;
    await multipliers.save();
    await clanpoints.save();

    const newLevel = multipliers[statField];
    const newCost = baseCost + multiplier * newLevel ** 6;

    const embed = new EmbedBuilder()
      .setTitle(`✅ ${STATS[statKey]} Upgraded!`)
      .setDescription(
        `**New Level:** ${newLevel}/10\n` +
        `**Remaining Karmic Jade Balance:** ${clanpoints.balance} ${emoji}\n` +
        (newLevel < 10
          ? `**Next Upgrade Cost:** ${newCost} ${emoji}`
          : `🛑 You've reached the maximum level.`)
      )
      .setColor(0x00ae86);

    const components = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`upgrade_${statKey}`)
        .setLabel(`Upgrade ${STATS[statKey]} again?`)
        .setStyle(ButtonStyle.Success)
        .setDisabled(newLevel >= 10 || clanpoints.balance < newCost)
    );

    await interaction.reply({
      embeds: [embed],
      components: [components],
    });
    },
  };
