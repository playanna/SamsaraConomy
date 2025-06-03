const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');
const SectRod = require('../../models/Equipment/sectrod');
const Multipliers = require('../../models/Multipliers/multipliers');
const Clanpoints = require('../../models/Clan/clanpoints');

// Line upgrade data with descriptions and benefits
const LINE_UPGRADE_DATA = [
  { 
    name: 'Hemp', 
    cost: 0,
    description: 'Simple braided plant fiber line',
    benefit: 'Basic fishing strength'
  },
  { 
    name: 'Silksteel', 
    cost: 600,
    description: 'Woven from spider silk and tempered steel filaments',
    benefit: '+18% fishing strength'
  },
  { 
    name: 'Voidstrand', 
    cost: 1800,
    description: 'Threads harvested from the fabric between dimensions',
    benefit: '+40% fishing strength'
  },
  { 
    name: 'Dragonhair', 
    cost: 3500,
    description: 'Single strands plucked from an ancient dragon\'s mane',
    benefit: '+70% fishing strength'
  },
  { 
    name: 'CelestialThread', 
    cost: 6000,
    description: 'Material woven from the hair of heavenly maidens',
    benefit: '+110% fishing strength'
  }
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lineupgrades')
    .setDescription('Strengthen your connection to the waters through line upgrades'),

  async execute(interaction) {
    const userId = interaction.user.id;

    // Fetch data
    let rod = await SectRod.findOne({ userId });
    if (!rod) return interaction.reply({ content: 'You have not yet forged your cultivation rod.', ephemeral: true });

    let multipliers = await Multipliers.findOne({ userId });
    if (!multipliers) return interaction.reply({ content: 'Your spiritual foundations are not yet established.', ephemeral: true });

    let clanpoints = await Clanpoints.findOne({ userId });
    if (!clanpoints) return interaction.reply({ content: 'You have not yet joined a sect to accumulate contribution points.', ephemeral: true });

    const currentLineIndex = LINE_UPGRADE_DATA.findIndex(l => l.name === rod.components.line);
    const currentLineData = LINE_UPGRADE_DATA[currentLineIndex];

    // Create grid layout for line tiers
    const createLineField = (line, index) => {
      let status = '';
      if (index === currentLineIndex) {
        status = '≡ Currently Equipped ≡';
      } else if (index < currentLineIndex) {
        status = '◈ Previously Mastered ◈';
      } else if (index === currentLineIndex + 1) {
        status = '★ Next Upgrade ★';
      } else if (index > currentLineIndex) {
        status = '◇ Future Ascension ◇';
      }

      return `**${line.name} Line** (${line.cost} pts)
${line.description}
*${line.benefit}*
${status ? `\n*${status}*` : ''}`;
    };

    // Split into two rows (3 top, 2 bottom)
    const topRow = LINE_UPGRADE_DATA.slice(0, 3)
      .map((line, index) => createLineField(line, index))
      .join('\n\n⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯\n');

    const bottomRow = LINE_UPGRADE_DATA.slice(3)
      .map((line, index) => createLineField(line, index + 3))
      .join('\n\n⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯\n');

    const availableUpgrades = LINE_UPGRADE_DATA
      .filter((_, index) => index > currentLineIndex);

    if (availableUpgrades.length === 0) {
      const embed = new EmbedBuilder()
        .setTitle('《 Line Mastery 》')
        .setDescription('『 You have reached the pinnacle of line refinement 』')
        .addFields(
          { name: '⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯', value: topRow, inline: true },
          { name: '\u200B', value: '\u200B', inline: true }, // Spacer
          { name: '\u200B', value: '\u200B', inline: true }, // Spacer
          { name: '⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯', value: bottomRow, inline: true }
        )
        .setColor('#7e5e2a')
        .setFooter({ text: 'No fish can break your perfect connection' });

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // Create detailed embed with grid layout
    const embed = new EmbedBuilder()
      .setTitle('《 Line Advancement Path 》')
      .setDescription('『 The line connects you to your catch - strengthen this bond 』')
      .addFields(
        { name: '⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯', value: topRow, inline: true },
        { name: '\u200B', value: '\u200B', inline: true }, // Spacer
        { name: '\u200B', value: '\u200B', inline: true }, // Spacer
        { name: '⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯', value: bottomRow, inline: true },
        { name: '\u200B', value: '≪ Select your next line enhancement below ≫', inline: false }
      )
      .setColor('#4a3a7a')
      .setFooter({ text: 'Each improvement requires sect contribution points' });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('line_upgrade_select')
      .setPlaceholder('Choose your next line enhancement...')
      .addOptions(
        availableUpgrades.map(upgrade => ({
          label: `${upgrade.name} Line`,
          description: `${upgrade.cost} pts | ${upgrade.benefit}`,
          value: String(LINE_UPGRADE_DATA.indexOf(upgrade)),
        }))
      );

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await interaction.reply({ embeds: [embed], components: [row] });

    // Wait for user to pick
    const filter = i => i.user.id === userId && i.customId === 'line_upgrade_select';
    try {
      const selectInteraction = await interaction.fetchReply()
        .then(msg => msg.awaitMessageComponent({ filter, time: 15000 })) // 15 seconds timeout
        .catch(() => null);

      if (!selectInteraction) {
        return await interaction.editReply({ 
          content: '『 Time Limit Exceeded 』\nYour attention drifted and the opportunity for enhancement passed.', 
          components: [] 
        });
      }

      const selectedIndex = parseInt(selectInteraction.values[0]);
      const newLine = LINE_UPGRADE_DATA[selectedIndex];
      const upgradeCost = newLine.cost;

      // Check if they can afford it
      if (clanpoints.balance < upgradeCost) {
        return await selectInteraction.update({ 
          content: `『 Failed Enhancement 』\nYou require **${upgradeCost}** sect points but only possess **${clanpoints.balance}**\n\nComplete more sect missions to gather resources.`, 
          embeds: [], 
          components: [] 
        });
      }

      // Deduct cost
      clanpoints.balance -= upgradeCost;
      await clanpoints.save();

      // Update line and multiplier
      rod.components.line = newLine.name;
      await rod.save();

      multipliers.lineUpgradeLevel = selectedIndex;
      await multipliers.save();

      const successEmbed = new EmbedBuilder()
        .setTitle(`『 ${newLine.name} Line Attained 』`)
        .setDescription([
          'The connection between you and the waters grows stronger!',
          '',
          `**New Line:** ${newLine.name}`,
          `**Description:** ${newLine.description}`,
          `**New Benefit:** ${newLine.benefit}`,
          '',
          `≪ ${upgradeCost} sect contribution points were consumed ≫`
        ].join('\n'))
        .setColor('#8a3a7a');

      await selectInteraction.update({ 
        content: '',
        embeds: [successEmbed], 
        components: [] 
      });
    } catch (err) {
      console.error('Line upgrade error:', err);
      await interaction.editReply({ 
        content: '『 Enhancement Disrupted 』\nAn unexpected disturbance interrupted your strengthening process.', 
        components: [] 
      });
    }
  },
};