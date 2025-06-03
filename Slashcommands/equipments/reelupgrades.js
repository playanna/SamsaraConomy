const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');
const SectRod = require('../../models/Equipment/sectrod');
const Multipliers = require('../../models/Multipliers/multipliers');
const Clanpoints = require('../../models/Clan/clanpoints');

// Reel upgrade data with descriptions and benefits
const REEL_UPGRADE_DATA = [
  { 
    name: 'Basic', 
    cost: 0,
    description: 'Simple fishing reel for beginners',
    benefit: 'Standard fishing efficiency'
  },
  { 
    name: 'Precision', 
    cost: 750,
    description: 'Engineered with exacting tolerances for smooth operation',
    benefit: '+20% fishing efficiency'
  },
  { 
    name: 'Vortex', 
    cost: 2000,
    description: 'Creates swirling currents to attract rare fish',
    benefit: '+45% fishing efficiency'
  },
  { 
    name: 'Temporal', 
    cost: 4000,
    description: 'Bends time to reduce fishing cooldowns',
    benefit: '+75% fishing efficiency'
  },
  { 
    name: 'Singularity', 
    cost: 7000,
    description: 'Contains a micro black hole that warps fish directly to you',
    benefit: '+120% fishing efficiency'
  }
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reelupgrades')
    .setDescription('Enhance your fishing capabilities through reel upgrades'),

  async execute(interaction) {
    const userId = interaction.user.id;

    // Fetch data
    let rod = await SectRod.findOne({ userId });
    if (!rod) return interaction.reply({ content: 'You have not yet forged your cultivation rod.', ephemeral: true });

    let multipliers = await Multipliers.findOne({ userId });
    if (!multipliers) return interaction.reply({ content: 'Your spiritual foundations are not yet established.', ephemeral: true });

    let clanpoints = await Clanpoints.findOne({ userId });
    if (!clanpoints) return interaction.reply({ content: 'You have not yet joined a sect to accumulate contribution points.', ephemeral: true });

    const currentReelIndex = REEL_UPGRADE_DATA.findIndex(r => r.name === rod.components.reel);
    const currentReelData = REEL_UPGRADE_DATA[currentReelIndex];

    // Create grid layout for reel tiers
    const createReelField = (reel, index) => {
      let status = '';
      if (index === currentReelIndex) {
        status = '≡ Currently Equipped ≡';
      } else if (index < currentReelIndex) {
        status = '◈ Previously Mastered ◈';
      } else if (index === currentReelIndex + 1) {
        status = '★ Next Upgrade ★';
      } else if (index > currentReelIndex) {
        status = '◇ Future Ascension ◇';
      }

      return `**${reel.name} Reel** (${reel.cost} pts)
${reel.description}
*${reel.benefit}*
${status ? `\n*${status}*` : ''}`;
    };

    // Split into two rows (3 top, 2 bottom)
    const topRow = REEL_UPGRADE_DATA.slice(0, 3)
      .map((reel, index) => createReelField(reel, index))
      .join('\n\n⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯\n');

    const bottomRow = REEL_UPGRADE_DATA.slice(3)
      .map((reel, index) => createReelField(reel, index + 3))
      .join('\n\n⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯\n');

    const availableUpgrades = REEL_UPGRADE_DATA
      .filter((_, index) => index > currentReelIndex);

    if (availableUpgrades.length === 0) {
      const embed = new EmbedBuilder()
        .setTitle('《 Reel Perfection 》')
        .setDescription('『 You have reached the pinnacle of reel refinement 』')
        .addFields(
          { name: '⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯', value: topRow, inline: true },
          { name: '\u200B', value: '\u200B', inline: true }, // Spacer
          { name: '\u200B', value: '\u200B', inline: true }, // Spacer
          { name: '⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯', value: bottomRow, inline: true }
        )
        .setColor('#2a7e5e')
        .setFooter({ text: 'The waters hold no more secrets for you' });

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // Create detailed embed with grid layout
    const embed = new EmbedBuilder()
      .setTitle('《 Reel Advancement Path 》')
      .setDescription('『 The reel determines your ability to harvest the waters\' bounty 』')
      .addFields(
        { name: '⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯', value: topRow, inline: true },
        { name: '\u200B', value: '\u200B', inline: true }, // Spacer
        { name: '\u200B', value: '\u200B', inline: true }, // Spacer
        { name: '⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯', value: bottomRow, inline: true },
        { name: '\u200B', value: '≪ Select your next refinement below ≫', inline: false }
      )
      .setColor('#3a7a4a')
      .setFooter({ text: 'Each improvement requires sect contribution points' });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('reel_upgrade_select')
      .setPlaceholder('Choose your next reel refinement...')
      .addOptions(
        availableUpgrades.map(upgrade => ({
          label: `${upgrade.name} Reel`,
          description: `${upgrade.cost} pts | ${upgrade.benefit}`,
          value: String(REEL_UPGRADE_DATA.indexOf(upgrade)),
        }))
      );

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await interaction.reply({ embeds: [embed], components: [row] });

    // Wait for user to pick
    const filter = i => i.user.id === userId && i.customId === 'reel_upgrade_select';
    try {
      const selectInteraction = await interaction.fetchReply()
        .then(msg => msg.awaitMessageComponent({ filter, time: 15000 })) // 15 seconds timeout
        .catch(() => null);

      if (!selectInteraction) {
        return await interaction.editReply({ 
          content: '『 Time Limit Exceeded 』\nYour focus wavered and the opportunity for refinement passed.', 
          components: [] 
        });
      }

      const selectedIndex = parseInt(selectInteraction.values[0]);
      const newReel = REEL_UPGRADE_DATA[selectedIndex];
      const upgradeCost = newReel.cost;

      // Check if they can afford it
      if (clanpoints.balance < upgradeCost) {
        return await selectInteraction.update({ 
          content: `『 Failed Refinement 』\nYou require **${upgradeCost}** sect points but only possess **${clanpoints.balance}**\n\nGather more resources from your sect duties.`, 
          embeds: [], 
          components: [] 
        });
      }

      // Deduct cost
      clanpoints.balance -= upgradeCost;
      await clanpoints.save();

      // Update reel and multiplier
      rod.components.reel = newReel.name;
      await rod.save();

      multipliers.reelUpgradeLevel = selectedIndex;
      await multipliers.save();

      const successEmbed = new EmbedBuilder()
        .setTitle(`『 ${newReel.name} Reel Attained 』`)
        .setDescription([
          'The waters shimmer as your fishing capabilities reach new heights!',
          '',
          `**New Reel:** ${newReel.name}`,
          `**Description:** ${newReel.description}`,
          `**New Benefit:** ${newReel.benefit}`,
          '',
          `≪ ${upgradeCost} sect contribution points were consumed ≫`
        ].join('\n'))
        .setColor('#3a8a7a');

      await selectInteraction.update({ 
        content: '',
        embeds: [successEmbed], 
        components: [] 
      });
    } catch (err) {
      console.error('Reel upgrade error:', err);
      await interaction.editReply({ 
        content: '『 Refinement Disrupted 』\nAn unexpected disturbance interrupted your enhancement process.', 
        components: [] 
      });
    }
  },
};