// commands/upgrades.js
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const Multipliers = require('../../models/Multipliers/multipliers');
const Clanpoints = require('../../models/Clan/clanpoints');
const {emojis} = require('../../data/emojis.js'); // Assuming you have a file for emojis
const emoji = '<:heavenlyorbs:776075202849013770>'; // Replace with actual emoji ID
const tribemoji = '<a:Lightning_Blue:1369196545949306982>'; // Replace with actual emoji ID

const STATS = [
  { key: 'loot', label: 'Loot Multiplier' },
  { key: 'xp', label: 'XP Multiplier' },
  { key: 'shop', label: 'Shop Bonus' },
  { key: 'clan', label: 'Clan Power' },
  { key: 'discount', label: 'Discount Power' },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('upgrades')
    .setDescription('View and upgrade your stats'),

  async execute(interaction) {
    const userId = interaction.user.id;
    let page = 0;

    const multipliers =
      (await Multipliers.findOne({ userId })) ||
      await Multipliers.create({ userId });

    const clanpoints =
      (await Clanpoints.findOne({ userId })) ||
      await Clanpoints.create({ userId });

      const generateEmbed = async (page) => {
        if (page === 0) {
          return new EmbedBuilder()
            .setTitle('《 Samsara Slave’s Tethic Tome 》')
            .setDescription([
              "> *'What sinks beneath the karmic waves was never meant to surface' — First Jade-Patriarch*",
              "",
              "**Soul Manual:**",
              "• Convert your Karmic Debt into Karmic Jade",
              `• Spend Karmic Jade (${emojis.heavenlyorbs}) (${emojis.tribulation}) to deepen your entanglement with fate`,
              "• Each scripture has 10 abyssal layers of forbidden wisdom",
              "• Deeper layers demand exponentially more drowned souls",
              "",
              "*Beyond the 10th layer lies the Sunken City of Deez - where even the Wheel forgets to turn...*",
              "",
              "**Warning:** Attempting deep trawls without sufficient karmic weight may attract Naraka’s Bailiffs!"
            ].join('\n'))
            .setColor(0x4B0082) // Deep abyssal purple
            .setFooter({ 
              text: "The current pulls you toward the next page →", 
              iconURL: interaction.guild.iconURL()
            });
        }

      const statIndex = page - 1;
      const { key, label } = STATS[statIndex];
      const level = multipliers[`${key}upgradeLevel`];
      const baseCost = 100;
      const multiplier = 100;
      const cost = baseCost + (multiplier * (level ** 6));

      return new EmbedBuilder()
        .setTitle(`${label}`)
        .setDescription(
          `**Level:** ${level}/10\n` +
          `**Upgrade Cost:** ${cost} ${emoji}\n` +
          `**Your Balance:** ${clanpoints.balance} ${emoji}\n`
        )
        .setColor(0x00ae86);
    };

    const generateComponents = (page) => {
      const components = [];

      const navRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`upg_prev_${page}`)
          .setLabel('⬅️')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === 0),

        new ButtonBuilder()
          .setCustomId(`upg_next_${page}`)
          .setLabel('➡️')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === STATS.length)
      );
      components.push(navRow);

      if (page > 0) {
        const stat = STATS[page - 1];
        const level = multipliers[`${stat.key}upgradeLevel`];
        const baseCost = 100;
      const multiplier = 100;
      const cost = baseCost + (multiplier * (level ** 6));
        const canAfford = clanpoints.balance >= cost;
        const notMaxed = level < 10;

        const upgradeRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`upgrade_${stat.key}`)
            .setLabel(`Upgrade ${stat.label}`)
            .setStyle(ButtonStyle.Success)
            .setDisabled(!canAfford || !notMaxed)
        );
        components.push(upgradeRow);
      }

      return components;
    };

    const embed = await generateEmbed(page);
    const components = generateComponents(page);

    await interaction.reply({
      embeds: [embed],
      components,
    });
  },
};
