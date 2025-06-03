// Button handler for replacing equipped qi techniques
const UserQiTechniques = require('../../models/QiTechniques/userQiTechniques.js');
const { getTechniqueById } = require('../../data/qiTechniques.js');
const createBaseEmbed = require('../../utils/embed.js');

module.exports = {
  async execute(interaction) {
    try {
      // Validate interaction type and state
      if (!interaction || !interaction.isButton || !interaction.isButton()) {
        console.error('Invalid interaction type for replace technique router');
        return;
      }

      // Check if interaction is already replied or deferred
      if (interaction.replied || interaction.deferred) {
        console.warn('Replace technique router called on already handled interaction');
        return;
      }

      // Validate user data
      const userId = interaction?.user?.id;
      if (!userId) {
        return await safeErrorResponse(interaction, 'Invalid user data. Please try again.');
      }

      const customId = interaction.customId;
      if (!customId || typeof customId !== 'string') {
        return await safeErrorResponse(interaction, 'Invalid interaction data. Please try again.');
      }
    
      // Parse: replace_technique_<slotNumber>_<newTechniqueId>
      const parts = customId.split('_');
      if (parts.length !== 4 || parts[0] !== 'replace' || parts[1] !== 'technique') {
        return await safeErrorResponse(interaction, 'Invalid button format. Please use the qi command menu.');
      }
    
      const slotNumber = parseInt(parts[2]);
      const newTechniqueId = parts[3];

      // Validate parsed data
      if (isNaN(slotNumber) || slotNumber < 1 || slotNumber > 3) {
        return await safeErrorResponse(interaction, 'Invalid slot number. Must be 1, 2, or 3.');
      }

      if (!newTechniqueId || typeof newTechniqueId !== 'string' || newTechniqueId.trim() === '') {
        return await safeErrorResponse(interaction, 'Invalid technique ID. Please try again.');
      }    
      try {
        // Database operation with error handling
        const userTechniques = await UserQiTechniques.findOne({ userId });
        
        if (!userTechniques) {
          return await safeErrorResponse(interaction, 'No technique data found. Please initialize your qi system first.');
        }

        // Validate user techniques data structure
        if (!userTechniques.equippedTechniques || !Array.isArray(userTechniques.equippedTechniques)) {
          console.error('Invalid equippedTechniques data structure for user:', userId);
          return await safeErrorResponse(interaction, 'Corrupted technique data. Please contact support.');
        }

        if (!userTechniques.learnedTechniques || !Array.isArray(userTechniques.learnedTechniques)) {
          console.error('Invalid learnedTechniques data structure for user:', userId);
          return await safeErrorResponse(interaction, 'Corrupted learned techniques data. Please contact support.');
        }

        // Validate new technique exists
        const newTechnique = getTechniqueById(newTechniqueId);
        if (!newTechnique) {
          return await safeErrorResponse(interaction, `Technique '${newTechniqueId}' not found. It may have been removed or renamed.`);
        }

        // Validate technique data integrity
        if (!newTechnique.name || typeof newTechnique.name !== 'string') {
          console.error('Invalid technique data for:', newTechniqueId);
          return await safeErrorResponse(interaction, 'Invalid technique data. Please try a different technique.');
        }

        // Find the technique to replace
        const existingTechIndex = userTechniques.equippedTechniques.findIndex(eq => 
          eq && eq.slotNumber === slotNumber
        );
      
        if (existingTechIndex === -1) {
          return await safeErrorResponse(interaction, `No technique found in slot ${slotNumber}. Please refresh and try again.`);
        }

        // Validate existing technique data
        const existingTech = userTechniques.equippedTechniques[existingTechIndex];
        if (!existingTech || !existingTech.techniqueId) {
          return await safeErrorResponse(interaction, `Corrupted data in slot ${slotNumber}. Please use /qi equip to fix this.`);
        }

        // Get old technique name for confirmation (with fallback)
        const oldTechnique = getTechniqueById(existingTech.techniqueId);
        const oldTechniqueName = oldTechnique?.name || `Unknown (${existingTech.techniqueId})`;

        // Check if new technique is learned with data validation
        const learnedTech = userTechniques.learnedTechniques.find(l => 
          l && l.techniqueId === newTechniqueId
        );
        
        if (!learnedTech) {
          return await safeErrorResponse(interaction, `You must learn ${newTechnique.name} before equipping it. Use /qi learn first.`);
        }

        // Validate learned technique data
        if (!learnedTech.masteryLevel || typeof learnedTech.masteryLevel !== 'number') {
          console.warn('Invalid mastery level for learned technique:', learnedTech);
          learnedTech.masteryLevel = 1; // Set default
        }

        // Check if new technique is already equipped in another slot
        const alreadyEquipped = userTechniques.equippedTechniques.find(eq => 
          eq && eq.techniqueId === newTechniqueId && eq.slotNumber !== slotNumber
        );
      
        if (alreadyEquipped) {
          return await safeErrorResponse(interaction, `${newTechnique.name} is already equipped in slot ${alreadyEquipped.slotNumber}. Each technique can only be equipped once.`);
        }

        // Prepare replacement data with validation
        const replacementTechnique = {
          slotNumber: slotNumber,
          techniqueId: newTechniqueId,
          name: newTechnique.name,
          description: newTechnique.description || 'No description available',
          masteryLevel: learnedTech.masteryLevel,
          uses: 0,
          equippedAt: new Date()
        };

        // Validate replacement data
        if (!replacementTechnique.name || !replacementTechnique.techniqueId) {
          throw new Error('Failed to create valid replacement technique data');
        }

        // Replace the technique
        userTechniques.equippedTechniques[existingTechIndex] = replacementTechnique;
        userTechniques.lastUpdated = new Date();

        // Save with error handling
        try {
          await userTechniques.save();
        } catch (saveError) {
          console.error('Failed to save technique replacement:', saveError);
          return await safeErrorResponse(interaction, 'Failed to save technique changes. Please try again.');
        }

        // Create success response
        const embed = createBaseEmbed({
          interaction,
          title: '🔄 ✅ Technique Replaced Successfully!',
          description: [
            `**Slot ${slotNumber}:** ${oldTechniqueName} → **${newTechnique.name}**`,
            '',
            `*${newTechnique.description || 'No description available'}*`,
            '',
            `**Mastery Level:** ${learnedTech.masteryLevel}`,
            `**Technique Type:** ${newTechnique.type || 'Unknown'}`,
            '',
            '🎯 You can now use this technique in combat by clicking "Channel Qi"!'
          ].join('\n'),
          color: 0x00FF00
        });

        await safeReply(interaction, { embeds: [embed], ephemeral: true });

      } catch (dbError) {
        console.error('Database error in replace technique router:', dbError);
        return await safeErrorResponse(interaction, 'Database error occurred. Please try again later.');
      }
    } catch (error) {
      console.error('Error in replace technique router:', error);
      await safeErrorResponse(interaction, 'An unexpected error occurred. Please try again.');
    }
  }
};

// Utility function for safe error responses
async function safeErrorResponse(interaction, message) {
  try {
    const errorContent = {
      content: `❌ ${message}`,
      ephemeral: true
    };

    if (interaction.replied || interaction.deferred) {
      if (interaction.followUp) {
        return await interaction.followUp(errorContent);
      } else {
        console.warn('Cannot send error follow-up - interaction state issue');
        return null;
      }
    } else {
      return await interaction.reply(errorContent);
    }
  } catch (replyError) {
    console.error('Failed to send error response:', replyError);
    return null;
  }
}

// Utility function for safe replies with state management
async function safeReply(interaction, options) {
  try {
    if (!interaction || !options) {
      throw new Error('Invalid interaction or options for reply');
    }

    if (interaction.replied) {
      if (interaction.followUp) {
        return await interaction.followUp(options);
      } else {
        console.warn('Cannot send follow-up - interaction already replied');
        return null;
      }
    } else if (interaction.deferred) {
      return await interaction.editReply(options);
    } else {
      return await interaction.reply(options);
    }
  } catch (replyError) {
    console.error('Failed to send safe reply:', replyError);
    
    // Last resort error message
    try {
      if (!interaction.replied && !interaction.deferred) {
        return await interaction.reply({
          content: '❌ An error occurred while processing your request.',
          ephemeral: true
        });
      }
    } catch (lastResortError) {
      console.error('Last resort reply also failed:', lastResortError);
    }
    
    return null;
  }
}
