const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');
const SectRod = require('../../models/Equipment/sectrod');
const Multipliers = require('../../models/Multipliers/multipliers');
const Clanpoints = require('../../models/Clan/clanpoints');

// Enhanced upgrade data with descriptions and benefits
const MAST_UPGRADE_DATA = [
  { 
    name: 'Bamboo', 
    cost: 0,
    description: 'Flexible spiritual bamboo, suitable for novices',
    benefit: 'Basic cultivation speed'
  },
  { 
    name: 'Ironwood', 
    cost: 500,
    description: 'Hardened wood infused with earthly qi',
    benefit: '+15% cultivation speed'
  },
  { 
    name: 'Obsidian', 
    cost: 1500,
    description: 'Dark volcanic glass channeling yin energy',
    benefit: '+35% cultivation speed'
  },
  { 
    name: 'Dragonbone', 
    cost: 3000,
    description: 'Forged from remains of an ancient dragon',
    benefit: '+60% cultivation speed'
  },
  { 
    name: 'Livingwood', 
    cost: 5000,
    description: 'Sentient mast grown from the World Tree',
    benefit: '+100% cultivation speed'
  }
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mastupgrades')
    .setDescription('Seek enlightenment through mast upgrades'),

  async execute(interaction) {
    const userId = interaction.user.id;

    // Fetch data
    let rod = await SectRod.findOne({ userId });
    if (!rod) return interaction.reply({ content: 'You have not yet forged your cultivation rod.', ephemeral: true });

    let multipliers = await Multipliers.findOne({ userId });
    if (!multipliers) return interaction.reply({ content: 'Your spiritual foundations are not yet established.', ephemeral: true });

    let clanpoints = await Clanpoints.findOne({ userId });
    if (!clanpoints) return interaction.reply({ content: 'You have not yet joined a sect to accumulate contribution points.', ephemeral: true });

    const currentMastIndex = MAST_UPGRADE_DATA.findIndex(m => m.name === rod.components.mast);
    const currentMastData = MAST_UPGRADE_DATA[currentMastIndex];

    // Generate mast tier display
    // ... (previous code remains the same until mastTiers)

    // Create grid layout for mast tiers
    const createMastField = (mast, index) => {
        let status = '';
        if (index === currentMastIndex) {
          status = '≡ Currently Equipped ≡';
        } else if (index < currentMastIndex) {
          status = '◈ Previously Mastered ◈';
        } else if (index === currentMastIndex + 1) {
          status = '★ Next Upgrade ★';
        } else if (index > currentMastIndex) {
          status = '◇ Future Ascension ◇';
        }
  
        return `**${mast.name} Mast** (${mast.cost} pts)
  ${mast.description}
  *${mast.benefit}*
  ${status ? `\n*${status}*` : ''}`;
      };
  
      // Split into two rows (3 top, 2 bottom)
      const topRow = MAST_UPGRADE_DATA.slice(0, 3)
        .map((mast, index) => createMastField(mast, index))
        .join('\n\n⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯\n');
  
      const bottomRow = MAST_UPGRADE_DATA.slice(3)
        .map((mast, index) => createMastField(mast, index + 3))
        .join('\n\n⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯\n');
  
      const availableUpgrades = MAST_UPGRADE_DATA
        .filter((_, index) => index > currentMastIndex);
  
      if (availableUpgrades.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('《 Mast Ascension 》')
          .setDescription('『 You have reached the pinnacle of mast refinement 』')
          .addFields(
            { name: '⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯', value: topRow, inline: true },
            { name: '\u200B', value: '\u200B', inline: true }, // Spacer
            { name: '\u200B', value: '\u200B', inline: true }, // Spacer
            { name: '⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯', value: bottomRow, inline: true }
          )
          .setColor('#5e2a7e')
          .setFooter({ text: 'The path of cultivation knows no bounds' });
  
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
  
      // Create detailed embed with grid layout
      const embed = new EmbedBuilder()
        .setTitle('《 Mast Ascension Path 》')
        .setDescription('『 The mast channels heavenly energy to enhance your cultivation 』')
        .addFields(
          { name: '⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯', value: topRow, inline: true },
          { name: '\u200B', value: '\u200B', inline: true }, // Spacer
          { name: '\u200B', value: '\u200B', inline: true }, // Spacer
          { name: '⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯', value: bottomRow, inline: true },
          { name: '\u200B', value: '≪ Select your next breakthrough below ≫', inline: false }
        )
        .setColor('#3a4a7a')
        .setFooter({ text: 'Each ascension requires sect contribution points' });
  
  // ... (rest of the code remains the same)

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('mast_upgrade_select')
      .setPlaceholder('Choose your next mast ascension...')
      .addOptions(
        availableUpgrades.map(upgrade => ({
          label: `${upgrade.name} Mast`,
          description: `${upgrade.cost} pts | ${upgrade.benefit}`,
          value: String(MAST_UPGRADE_DATA.indexOf(upgrade)),
        }))
      );

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await interaction.reply({ embeds: [embed], components: [row]});

    // Wait for user to pick - FIXED VERSION
    const filter = i => i.user.id === userId && i.customId === 'mast_upgrade_select';
    try {
      const selectInteraction = await interaction.fetchReply()
        .then(msg => msg.awaitMessageComponent({ filter, time: 15000 })) // 15 seconds timeout
        .catch(() => null);

      if (!selectInteraction) {
        return await interaction.editReply({ 
          content: '『 Time Limit Exceeded 』\nYour concentration wavered and the opportunity for ascension passed.', 
          components: [] 
        });
      }

      const selectedIndex = parseInt(selectInteraction.values[0]);
      const newMast = MAST_UPGRADE_DATA[selectedIndex];
      const upgradeCost = newMast.cost;

      // Check if they can afford it
      if (clanpoints.balance < upgradeCost) {
        return await selectInteraction.update({ 
          content: `『 Failed Breakthrough 』\nYou require **${upgradeCost}** sect points but only possess **${clanpoints.balance}**\n\nMeditate and accumulate more resources.`, 
          embeds: [], 
          components: [] 
        });
      }

      // Deduct cost
      clanpoints.balance -= upgradeCost;
      await clanpoints.save();

      // Update mast and multiplier
      rod.components.mast = newMast.name;
      await rod.save();

      multipliers.mastUpgradeLevel = selectedIndex;
      await multipliers.save();

      const successEmbed = new EmbedBuilder()
        .setTitle(`『 ${newMast.name} Mast Attained 』`)
        .setDescription([
          'The heavens tremble as you achieve a new realm of understanding!',
          '',
          `**New Mast:** ${newMast.name}`,
          `**Description:** ${newMast.description}`,
          `**New Benefit:** ${newMast.benefit}`,
          '',
          `≪ ${upgradeCost} sect contribution points were consumed ≫`
        ].join('\n'))
        .setColor('#7a3a8a');

      await selectInteraction.update({ 
        content: '',
        embeds: [successEmbed], 
        components: [] 
      });
    } catch (err) {
      console.error('Mast upgrade error:', err);
      await interaction.editReply({ 
        content: '『 Cultivation Disrupted 』\nAn unexpected disturbance interrupted your ascension.', 
        components: [] 
      });
    }
  },
};