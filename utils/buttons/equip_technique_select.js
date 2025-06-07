// Button handler for qi technique management
const UserQiTechniques = require('../../models/QiTechniques/userQiTechniques.js');
const { getTechniqueById } = require('../../data/qiTechniques.js');
const createBaseEmbed = require('../../utils/embed.js');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');

module.exports = {
  async execute(interaction) {
    // Validate interaction type
    if (!interaction.isStringSelectMenu()) {
      console.warn('equip_technique_select called with non-StringSelectMenu interaction');
      return;
    }

    // Defensive interaction state checks
    if (interaction.replied || interaction.deferred) {
      console.warn('equip_technique_select called on already handled interaction');
      return;
    }

    const userId = interaction.user?.id;
    const selectedValues = interaction.values;
    
    // Input validation
    if (!userId) {
      return safeSendError(interaction, 'Invalid user data');
    }

    if (!selectedValues || selectedValues.length === 0) {
      return safeSendError(interaction, 'No technique selected');
    }

    const techniqueId = selectedValues[0];
    
    if (!techniqueId || typeof techniqueId !== 'string') {
      return safeSendError(interaction, 'Invalid technique selection');
    }    try {
      // Optimized database query with .select() for needed fields only
      const userTechniques = await UserQiTechniques.findOne({ userId })
        .select('userId equippedTechniques learnedTechniques')
        .catch(dbError => {
          console.error('Database error finding user techniques:', dbError);
          throw new Error('Database connection failed');
        });

      const technique = getTechniqueById(techniqueId);
      
      if (!userTechniques) {
        return safeSendError(interaction, 'No technique data found. Try initializing with `/qi view` first.');
      }

      if (!technique) {
        return safeSendError(interaction, 'Selected technique no longer exists or is corrupted.');
      }

      // Validate user technique data integrity
      if (!userTechniques.equippedTechniques) {
        userTechniques.equippedTechniques = [];
      }

      if (!userTechniques.learnedTechniques) {
        userTechniques.learnedTechniques = [];
      }

      // Check if technique is actually learned
      const learnedTech = userTechniques.learnedTechniques.find(l => l && l.techniqueId === techniqueId);
      if (!learnedTech) {
        return safeSendError(interaction, `You haven't learned ${technique.name} yet. Use \`/qi learn\` first.`);
      }

      // Check if technique is already equipped
      const alreadyEquipped = userTechniques.equippedTechniques.find(eq => eq && eq.techniqueId === techniqueId);
      
      if (alreadyEquipped) {
        return safeSendError(interaction, `${technique.name} is already equipped in slot ${alreadyEquipped.slotNumber}!`);
      }

      // Find first available slot
      let targetSlot = 1;
      for (let i = 1; i <= 3; i++) {
        if (!userTechniques.equippedTechniques.find(eq => eq && eq.slotNumber === i)) {
          targetSlot = i;
          break;
        }
      }

      // If all slots full, ask which to replace
      if (userTechniques.equippedTechniques.length >= 3) {
        try {
          const buttons = [];
          
          for (const eq of userTechniques.equippedTechniques) {
            if (!eq || !eq.slotNumber || !eq.techniqueId) {
              console.warn('Skipping invalid equipped technique:', eq);
              continue;
            }

            const oldTech = getTechniqueById(eq.techniqueId);
            const techName = oldTech?.name || 'Unknown';
            
            if (buttons.length < 3) { // Limit to prevent overflow
              buttons.push(new ButtonBuilder()
                .setCustomId(`replace_technique_${eq.slotNumber}_${techniqueId}`)
                .setLabel(`Replace Slot ${eq.slotNumber}: ${techName.substring(0, 20)}`)
                .setStyle(ButtonStyle.Secondary));
            }
          }

          if (buttons.length === 0) {
            return safeSendError(interaction, 'All technique slots appear corrupted. Contact support.');
          }

          const row = new ActionRowBuilder().addComponents(buttons);

          const embed = createBaseEmbed({
            interaction,
            title: '🔄 Replace Technique',
            description: [
              'All technique slots are full!',
              '',
              `Select which technique to replace with **${technique.name}**:`
            ].join('\n'),
            color: 0xFFAA00
          });          return await safeSendReply(interaction, {
            embeds: [embed],
            components: [row],
            flags: [MessageFlags.Ephemeral]
          });
        } catch (replaceMenuError) {
          console.error('Error creating replace menu:', replaceMenuError);
          return safeSendError(interaction, 'Error creating replacement menu. Please try again.');
        }
      }

      // Equip the technique with data validation
      try {
        const newEquippedTechnique = {
          slotNumber: targetSlot,
          techniqueId: techniqueId,
          name: technique.name || 'Unknown',
          description: technique.description || 'No description',
          masteryLevel: learnedTech.masteryLevel || 1,
          uses: 0,
          equippedAt: new Date()
        };

        userTechniques.equippedTechniques.push(newEquippedTechnique);
        userTechniques.lastUpdated = new Date();

        await userTechniques.save().catch(saveError => {
          console.error('Database save error:', saveError);
          throw new Error('Failed to save technique data');
        });

        const embed = createBaseEmbed({
          interaction,
          title: '✅ Technique Equipped Successfully!',
          description: [
            `**${technique.name}** has been equipped to slot ${targetSlot}!`,
            '',
            `*${technique.description || 'No description available'}*`,
            '',
            '🎯 You can now use this technique in combat by clicking "Channel Qi"!'
          ].join('\n'),
          color: 0x00FF00        });

        await safeSendReply(interaction, { embeds: [embed], flags: [MessageFlags.Ephemeral] });

      } catch (equipError) {
        console.error('Error equipping technique:', equipError);
        return safeSendError(interaction, 'Failed to equip technique. Please try again.');
      }

    } catch (error) {
      console.error('Critical error in equip_technique_select:', error);
      return safeSendError(interaction, 'An unexpected error occurred while equipping the technique.');
    }
  }
};

// Utility function for safe error responses
async function safeSendError(interaction, message) {
  const errorResponse = {
    content: `❌ ${message}`,
    ephemeral: true
  };

  try {
    if (interaction.replied) {
      return await interaction.followUp(errorResponse);
    } else if (interaction.deferred) {
      return await interaction.editReply(errorResponse);
    } else {
      return await interaction.reply(errorResponse);
    }
  } catch (replyError) {
    console.error('Failed to send error message:', replyError);
    return null;
  }
}

// Utility function for safe replies
async function safeSendReply(interaction, options) {
  try {
    if (interaction.replied) {
      return await interaction.followUp(options);
    } else if (interaction.deferred) {
      return await interaction.editReply(options);
    } else {
      return await interaction.reply(options);
    }
  } catch (replyError) {
    console.error('Failed to send reply:', replyError);
    return safeSendError(interaction, 'Failed to send response');
  }
}
