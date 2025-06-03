// Handle qi technique learning selection
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const UserQiTechniques = require('../../models/QiTechniques/userQiTechniques.js');
const { getTechniqueById } = require('../../data/qiTechniques.js');
const createBaseEmbed = require('../../utils/embed.js');

module.exports = {
  name: 'qi_learn_technique',
  
  async execute(interaction) {
    // Validate interaction type
    if (!interaction.isStringSelectMenu()) {
      console.warn('qi_learn_technique called with non-StringSelectMenu interaction');
      return;
    }

    // Defensive interaction state checks
    if (interaction.replied || interaction.deferred) {
      console.warn('qi_learn_technique called on already handled interaction');
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

    const selectedValue = selectedValues[0];
    
    if (!selectedValue || typeof selectedValue !== 'string' || !selectedValue.startsWith('learn_')) {
      return safeSendError(interaction, 'Invalid technique selection format');
    }

    const techniqueId = selectedValue.replace('learn_', '');
    
    if (!techniqueId) {
      return safeSendError(interaction, 'Invalid technique ID');
    }

    try {
      // Database query with error handling
      const userTechniques = await UserQiTechniques.findOne({ userId }).catch(dbError => {
        console.error('Database error finding user techniques:', dbError);
        throw new Error('Database connection failed');
      });
      
      if (!userTechniques) {
        return safeSendError(interaction, 'No technique data found. Please engage in combat first.');
      }

      // Get technique data with validation
      const technique = getTechniqueById(techniqueId);
      if (!technique) {
        return safeSendError(interaction, 'Invalid technique selected or technique data corrupted.');
      }

      // Validate technique data integrity
      if (!technique.name) {
        console.warn(`Technique ${techniqueId} missing name`);
        technique.name = 'Unknown Technique';
      }

      if (!technique.description) {
        console.warn(`Technique ${techniqueId} missing description`);
        technique.description = 'No description available';
      }

      // Initialize arrays if missing
      if (!userTechniques.learnedTechniques) {
        userTechniques.learnedTechniques = [];
      }

      if (!userTechniques.equippedTechniques) {
        userTechniques.equippedTechniques = [];
      }      // Check if already learned
      const alreadyLearned = userTechniques.learnedTechniques.find(t => t && t.techniqueId === techniqueId);
      if (alreadyLearned) {
        return safeSendError(interaction, 'You have already learned this technique.');
      }      // Check cultivation level requirement
      const { getStageIndexByRealm, getMinimumDebtForRealm } = require('../../utils/cultivationStages.js');
      const Inventory = require('../../models/Multipliers/inventory.js');
      let inventory = await Inventory.findOne({ userId });
      if (!inventory) {
        inventory = new Inventory({ userId, totalKarmicDebt: 0 });
        await inventory.save();
      }

      const currentStageName = inventory.karmicRealms || 'Karma-Bhāra';
      const userCultivationLevel = getStageIndexByRealm(currentStageName) + 1; // Convert to 1-based level

      if (technique.requiredCultivation && userCultivationLevel < technique.requiredCultivation) {
        const embed = createBaseEmbed({
          interaction,
          title: '❌ Cultivation Insufficient',
          description: [
            `**${technique.name}** requires a higher cultivation level!`,
            '',
            `**Required Cultivation Level:** ${technique.requiredCultivation}`,
            `**Your Cultivation Level:** ${userCultivationLevel} (${currentStageName})`,
            `**Needed:** ${technique.requiredCultivation - userCultivationLevel} more levels`,
            '',
            '*Advance your cultivation through meditation and combat to unlock more powerful techniques.*'
          ].join('\n'),
          color: 0xFF0000
        });
          return safeSendReply(interaction, { embeds: [embed], ephemeral: true });
      }

      // Calculate technique cost using logarithmic scaling
      const { calculateTechniqueCost } = require('../../data/qiTechniques.js');
      const cost = calculateTechniqueCost(technique);
      
      // Get user's inventory to check karmic debt (already retrieved above for cultivation check)
      const currentKarmicDebt = inventory.totalKarmicDebt || 0;
        if (currentKarmicDebt < cost) {
        const embed = createBaseEmbed({
          interaction,
          title: '❌ Insufficient Karmic Debt',
          description: [
            `**${technique.name}** requires **${cost} karmic debt**.`,
            '',
            `**Your Karmic Debt:** ${currentKarmicDebt}`,
            `**Required:** ${cost}`,
            `**Needed:** ${cost - currentKarmicDebt}`,
            '',
            '*Earn karmic debt by winning combat encounters and gathering cursed items.*'
          ].join('\n'),
          color: 0xFF0000
        });
        
        return safeSendReply(interaction, { embeds: [embed], ephemeral: true });
      }        try {
        // Safety check: Ensure user won't drop below minimum debt for their current realm
        const minimumDebtForRealm = getMinimumDebtForRealm(currentStageName);
        const debtAfterPurchase = currentKarmicDebt - cost;
        
        if (debtAfterPurchase < minimumDebtForRealm) {
          const embed = createBaseEmbed({
            interaction,
            title: '❌ Cannot Purchase Technique',
            description: [
              `Learning **${technique.name}** would drop your karmic debt below the minimum required for your current realm!`,
              '',
              `**Current Karmic Debt:** ${currentKarmicDebt}`,
              `**Technique Cost:** ${cost}`,
              `**Debt After Purchase:** ${debtAfterPurchase}`,
              `**Minimum Required for ${currentStageName}:** ${minimumDebtForRealm}`,
              `**Additional Debt Needed:** ${minimumDebtForRealm - debtAfterPurchase}`,
              '',
              '*You cannot learn this technique without risking a cultivation realm downgrade. Earn more karmic debt first.*'
            ].join('\n'),
            color: 0xFF0000
          });
          
          return safeSendReply(interaction, { embeds: [embed], ephemeral: true });
        }
        
        // Learn the technique with data validation
        inventory.totalKarmicDebt = Math.max(0, currentKarmicDebt - cost);
        await inventory.save();
        
        const newLearnedTechnique = {
          techniqueId: techniqueId,
          name: technique.name,
          description: technique.description,
          masteryLevel: 1,
          totalUses: 0,
          learnedAt: new Date()
        };

        userTechniques.learnedTechniques.push(newLearnedTechnique);
        
        // Auto-equip if there's an empty slot
        const emptySlot = [1, 2, 3].find(slotNum => 
          !userTechniques.equippedTechniques.find(slot => slot && slot.slotNumber === slotNum)
        );
        
        let equipMessage = '';
        if (emptySlot) {
          try {
            const newEquippedTechnique = {
              slotNumber: emptySlot,
              techniqueId: techniqueId,
              name: technique.name,
              description: technique.description,
              masteryLevel: 1,
              uses: 0,
              equippedAt: new Date()
            };

            userTechniques.equippedTechniques.push(newEquippedTechnique);
            equipMessage = `\n\n✅ **Auto-equipped to slot ${emptySlot}!**`;
          } catch (autoEquipError) {
            console.error('Error auto-equipping technique:', autoEquipError);
            equipMessage = '\n\n⚠️ *Auto-equip failed. Use `/qi equip` to equip this technique.*';
          }
        } else {
          equipMessage = '\n\n💡 *Use `/qi equip` to equip this technique.*';
        }
        
        userTechniques.lastUpdated = new Date();
        
        await userTechniques.save().catch(saveError => {
          console.error('Database save error:', saveError);
          throw new Error('Failed to save technique data');
        });
        
        const embed = createBaseEmbed({
          interaction,
          title: '📚 ✅ Technique Learned Successfully!',
          description: [
            `**${technique.name}** has been added to your repertoire!`,
            '',
            `*${technique.description}*`,
            '',            `**Cost:** ${cost} karmic debt`,
            `**Remaining Karmic Debt:** ${inventory.totalKarmicDebt}`,
            equipMessage
          ].join('\n'),
          color: 0x00FF00
        });
        
        await safeSendReply(interaction, { embeds: [embed], ephemeral: true });

      } catch (learnError) {
        console.error('Error learning technique:', learnError);
        return safeSendError(interaction, 'Failed to learn technique. Please try again.');
      }
      
    } catch (error) {
      console.error('Critical error in qi_learn_technique:', error);
      return safeSendError(interaction, 'An unexpected error occurred while learning the technique.');
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
