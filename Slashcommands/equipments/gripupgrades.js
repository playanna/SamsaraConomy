const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');
const SectRod = require('../../models/Equipment/sectrod');
const Multipliers = require('../../models/Multipliers/multipliers');
const Clanpoints = require('../../models/Clan/clanpoints');

// Grip upgrade data with descriptions and benefits
const GRIP_UPGRADE_DATA = [
  { 
    name: 'Leather', 
    cost: 0,
    description: 'Simple leather wrapping for basic handling',
    benefit: 'Standard fishing control'
  },
  { 
    name: 'Crystal', 
    cost: 650,
    description: 'Faceted crystals that enhance energy flow',
    benefit: '+18% fishing control'
  },
  { 
    name: 'Bone', 
    cost: 1750,
    description: 'Carved from the bones of sea beasts',
    benefit: '+40% fishing control'
  },
  { 
    name: 'Eldritch', 
    cost: 3750,
    description: 'Living material that pulses with alien energy',
    benefit: '+75% fishing control'
  },
  { 
    name: 'Divine', 
    cost: 6500,
    description: 'Forged from the feathers of celestial beings',
    benefit: '+125% fishing control'
  }
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gripupgrades')
    .setDescription('Refine your connection to the rod through grip upgrades'),

  async execute(interaction) {
    const userId = interaction.user.id;

    // Fetch data
    let rod = await SectRod.findOne({ userId });
    if (!rod) return interaction.reply({ content: 'You have not yet forged your cultivation rod.', ephemeral: true });

    let multipliers = await Multipliers.findOne({ userId });
    if (!multipliers) return interaction.reply({ content: 'Your spiritual foundations are not yet established.', ephemeral: true });

    let clanpoints = await Clanpoints.findOne({ userId });
    if (!clanpoints) return interaction.reply({ content: 'You have not yet joined a sect to accumulate contribution points.', ephemeral: true });

    const currentGripIndex = GRIP_UPGRADE_DATA.findIndex(g => g.name === rod.components.grip);
    const currentGripData = GRIP_UPGRADE_DATA[currentGripIndex];

    // Create grid layout for grip tiers
    const createGripField = (grip, index) => {
      let status = '';
      if (index === currentGripIndex) {
        status = '≡ Currently Wielding ≡';
      } else if (index < currentGripIndex) {
        status = '◈ Previously Mastered ◈';
      } else if (index === currentGripIndex + 1) {
        status = '★ Next Upgrade ★';
      } else if (index > currentGripIndex) {
        status = '◇ Future Ascension ◇';
      }

      return `**${grip.name} Grip** (${grip.cost} pts)
${grip.description}
*${grip.benefit}*
${status ? `\n*${status}*` : ''}`;
    };

    // Split into two rows (3 top, 2 bottom)
    const topRow = GRIP_UPGRADE_DATA.slice(0, 3)
      .map((grip, index) => createGripField(grip, index))
      .join('\n\n⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯\n');

    const bottomRow = GRIP_UPGRADE_DATA.slice(3)
      .map((grip, index) => createGripField(grip, index + 3))
      .join('\n\n⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯\n');

    const availableUpgrades = GRIP_UPGRADE_DATA
      .filter((_, index) => index > currentGripIndex);

    if (availableUpgrades.length === 0) {
      const embed = new EmbedBuilder()
        .setTitle('《 Grip Perfection 》')
        .setDescription('『 Your connection to the rod is now flawless 』')
        .addFields(
          { name: '⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯', value: topRow, inline: true },
          { name: '\u200B', value: '\u200B', inline: true }, // Spacer
          { name: '\u200B', value: '\u200B', inline: true }, // Spacer
          { name: '⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯', value: bottomRow, inline: true }
        )
        .setColor('#5e7e2a')
        .setFooter({ text: 'No force can break your perfect hold' });

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // Create detailed embed with grid layout
    const embed = new EmbedBuilder()
      .setTitle('《 Grip Advancement Path 》')
      .setDescription('『 The grip determines your mastery over the rod 』')
      .addFields(
        { name: '⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯', value: topRow, inline: true },
        { name: '\u200B', value: '\u200B', inline: true }, // Spacer
        { name: '\u200B', value: '\u200B', inline: true }, // Spacer
        { name: '⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯', value: bottomRow, inline: true },
        { name: '\u200B', value: '≪ Select your next grip refinement below ≫', inline: false }
      )
      .setColor('#7a4a3a')
      .setFooter({ text: 'Each refinement requires sect contribution points' });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('grip_upgrade_select')
      .setPlaceholder('Choose your next grip refinement...')
      .addOptions(
        availableUpgrades.map(upgrade => ({
          label: `${upgrade.name} Grip`,
          description: `${upgrade.cost} pts | ${upgrade.benefit}`,
          value: String(GRIP_UPGRADE_DATA.indexOf(upgrade)),
        }))
      );

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await interaction.reply({ embeds: [embed], components: [row] });

    // Wait for user to pick
    const filter = i => i.user.id === userId && i.customId === 'grip_upgrade_select';
    try {
      const selectInteraction = await interaction.fetchReply()
        .then(msg => msg.awaitMessageComponent({ filter, time: 15000 })) // 15 seconds timeout
        .catch(() => null);

      if (!selectInteraction) {
        return await interaction.editReply({ 
          content: '『 Time Limit Exceeded 』\nYour focus slipped and the opportunity for refinement passed.', 
          components: [] 
        });
      }

      const selectedIndex = parseInt(selectInteraction.values[0]);
      const newGrip = GRIP_UPGRADE_DATA[selectedIndex];
      const upgradeCost = newGrip.cost;

      // Check if they can afford it
      if (clanpoints.balance < upgradeCost) {
        return await selectInteraction.update({ 
          content: `『 Failed Refinement 』\nYou require **${upgradeCost}** sect points but only possess **${clanpoints.balance}**\n\nPerform more sect duties to gather resources.`, 
          embeds: [], 
          components: [] 
        });
      }

      // Deduct cost
      clanpoints.balance -= upgradeCost;
      await clanpoints.save();

      // Update grip and multiplier
      rod.components.grip = newGrip.name;
      await rod.save();

      multipliers.gripUpgradeLevel = selectedIndex;
      await multipliers.save();

      const successEmbed = new EmbedBuilder()
        .setTitle(`『 ${newGrip.name} Grip Attained 』`)
        .setDescription([
          'The rod becomes an extension of your very being!',
          '',
          `**New Grip:** ${newGrip.name}`,
          `**Description:** ${newGrip.description}`,
          `**New Benefit:** ${newGrip.benefit}`,
          '',
          `≪ ${upgradeCost} sect contribution points were consumed ≫`
        ].join('\n'))
        .setColor('#8a7a3a');

      await selectInteraction.update({ 
        content: '',
        embeds: [successEmbed], 
        components: [] 
      });
    } catch (err) {
      console.error('Grip upgrade error:', err);
      await interaction.editReply({ 
        content: '『 Refinement Disrupted 』\nAn unexpected disturbance interrupted your enhancement process.', 
        components: [] 
      });
    }
  },
};