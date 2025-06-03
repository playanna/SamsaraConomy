// Button router for qi technique view interactions
const UserQiTechniques = require('../../models/QiTechniques/userQiTechniques.js');
const { getTechniqueById, calculateTechniqueCost } = require('../../data/qiTechniques.js');
const { getTechniqueWithMastery } = require('../../utils/workhelpers/handlers/qiTechniqueManager.js');
const { calculateUserStats } = require('../../utils/workhelpers/handlers/combatCalculator.js');
const createBaseEmbed = require('../../utils/embed.js');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Helper function to calculate and format technique damage exactly like in combat
async function formatTechniqueDamage(userId, technique) {
  try {
    // Get stored final stats that include all bonuses
    const UserStats = require('../../models/Combat/userStats');
    const userStats = await UserStats.findOne({ userId });
    
    let finalAttack = 20; // Default fallback
    if (userStats) {
      // Use the stored final attack value that includes all bonuses
      finalAttack = userStats.attack;
    } else {
      // Fallback to calculating if no stored stats exist
      const userData = { userId: userId };
      const calculatedStats = await calculateUserStats(userData);
      finalAttack = calculatedStats.attack || 20;
    }
    
    const techniqueDamageMin = technique.damage?.min || 0;
    const techniqueDamageMax = technique.damage?.max || 0;

    // Calculate damage ranges exactly like in combat (combatActions.js processQiTechnique)
    // Total damage = final attack (with all bonuses) + technique damage
    const totalBaseDamageMin = finalAttack + techniqueDamageMin;
    const totalBaseDamageMax = finalAttack + techniqueDamageMax;
    
    // Apply the same calculateDamage logic as in combat (with defense = 0 for qi techniques)
    const baseDamageMin = Math.max(1, totalBaseDamageMin);
    const baseDamageMax = Math.max(1, totalBaseDamageMax);
    
    // Add ±20% variance like in calculateDamage function
    const varianceMin = Math.floor(baseDamageMin * 0.2);
    const varianceMax = Math.floor(baseDamageMax * 0.2);
    
    // Calculate damage range without randomness (show the possible range)
    const minDamageWithVariance = baseDamageMin - varianceMin;
    const maxDamageWithVariance = baseDamageMax + varianceMax;
    
    // Account for critical hit possibility (1.5x damage)
    const maxDamageWithCrit = Math.floor(maxDamageWithVariance * 1.5);
    
    // Ensure minimum damage of 1
    const finalMinDamage = Math.max(1, minDamageWithVariance);
    const finalMaxDamage = Math.max(1, maxDamageWithCrit);

    return `⚔️ **Damage:** ${finalMinDamage}-${finalMaxDamage} (ignores defense)`;
  } catch (error) {
    console.error('Error calculating technique damage:', error);
    // Fallback to raw technique damage if calculation fails
    const techniqueDamageMin = technique.damage?.min || 0;
    const techniqueDamageMax = technique.damage?.max || 0;
    return `⚔️ **Damage:** ${techniqueDamageMin}-${techniqueDamageMax}`;
  }
}

module.exports = {
  async execute(interaction) {
    try {
      const id = interaction.customId;
      const handler = this.getHandler(id);
      
      if (!handler) {
        return this.handleUnknownButton(interaction);
      }

      await handler.call(this, interaction);
    } catch (error) {
      console.error('Qi Button Handler Error:', error);
      await this.safeErrorResponse(interaction, 'An unexpected error occurred while processing your request.');
    }
  },
  // Handler mapping function
  getHandler(id) {
    const handlers = {
      'qi_view_prev_': this.handleViewPrevious,
      'qi_view_next_': this.handleViewNext,
      'qi_equip_from_view_': this.handleEquipFromView,
      'qi_learn_prev_': this.handleLearnPrevious,
      'qi_learn_next_': this.handleLearnNext,
      'qi_learn_technique_': this.handleLearnTechnique
    };

    return Object.entries(handlers).find(([prefix]) => 
      id.startsWith(prefix)
    )?.[1];
  },

  // Unknown button handler
  async handleUnknownButton(interaction) {
    await this.safeErrorResponse(interaction, 'This button is no longer active or recognized.');
  },

  // Handle previous page navigation
  async handleViewPrevious(interaction) {
    const currentPage = parseInt(interaction.customId.split('_')[3]) || 0;
    const newPage = Math.max(0, currentPage - 1);
    
    await this.updateViewPage(interaction, newPage);
  },

  // Handle next page navigation  
  async handleViewNext(interaction) {
    const currentPage = parseInt(interaction.customId.split('_')[3]) || 0;
    const newPage = currentPage + 1;
    
    await this.updateViewPage(interaction, newPage);
  },

  // Handle equip/unequip from view
  async handleEquipFromView(interaction) {
    const techniqueId = interaction.customId.replace('qi_equip_from_view_', '');
    const userId = interaction.user.id;

    try {
      const userTechniques = await UserQiTechniques.findOne({ userId });
      
      if (!userTechniques) {
        return this.safeErrorResponse(interaction, 'No technique data found. Please try using `/qi view` again.');
      }

      const technique = getTechniqueById(techniqueId);
      if (!technique) {
        return this.safeErrorResponse(interaction, 'Technique not found or has been removed.');
      }

      // Check if technique is learned
      const learnedTech = userTechniques.learnedTechniques?.find(lt => lt?.techniqueId === techniqueId);
      if (!learnedTech) {
        return this.safeErrorResponse(interaction, 'You must learn this technique before equipping it.');
      }

      // Check if currently equipped
      const isEquipped = userTechniques.equippedTechniques?.some(eq => eq?.techniqueId === techniqueId);
      
      if (isEquipped) {
        // Unequip the technique
        await this.unequipTechnique(interaction, userTechniques, techniqueId, technique);
      } else {
        // Equip the technique
        await this.equipTechnique(interaction, userTechniques, techniqueId, technique, learnedTech);
      }

    } catch (error) {
      console.error('Error in handleEquipFromView:', error);
      await this.safeErrorResponse(interaction, 'Failed to process equip/unequip request. Please try again.');
    }
  },

  // Update the view page with new embed and components
  async updateViewPage(interaction, newPage) {
    try {
      const userId = interaction.user.id;
      const userTechniques = await UserQiTechniques.findOne({ userId });
      
      if (!userTechniques) {
        return this.safeErrorResponse(interaction, 'No technique data found. Please try using `/qi view` again.');
      }

      // Get user's inventory for karmic debt display
      const Inventory = require('../../models/Multipliers/inventory.js');
      let inventory = await Inventory.findOne({ userId });
      if (!inventory) {
        inventory = new Inventory({ userId, totalKarmicDebt: 0 });
        await inventory.save();
      }

      const learnedTechniques = userTechniques.learnedTechniques || [];
      
      // Validate page bounds
      const maxPage = learnedTechniques.length + 1;
      if (newPage < 0 || newPage > maxPage) {
        return this.safeErrorResponse(interaction, 'Invalid page navigation.');
      }

      const embed = await this.generateEmbed(newPage, learnedTechniques, userTechniques, inventory);
      const components = this.generateComponents(newPage, learnedTechniques, userTechniques);

      await interaction.update({
        embeds: [embed],
        components
      });

    } catch (error) {
      console.error('Error updating view page:', error);
      await this.safeErrorResponse(interaction, 'Failed to update page. Please try again.');
    }
  },

  // Generate embed for specific page
  async generateEmbed(page, learnedTechniques, userTechniques, inventory) {
    if (page === 0) {
      return new EmbedBuilder()
        .setTitle('《 Karmic Tethic Tome: Forbidden Scrolls 》')
        .setDescription([
          "> *'The karmic threads weave through all - steal them to grow stronger' — First Jade-Patriarch*",
          "",
          "**Scroll Archive:**",
          "• Navigate through your mastered Qi techniques",
          "• Each scroll contains forbidden wisdom bought with Karmic Debt",
          "• Study the depths of each art you've comprehended",
          "• Some techniques may be equipped for battle resonance",
          "",
          "*Your journey through suffering has unlocked these stolen arts...*",
          "",
          `**Current Karmic Debt:** ${inventory.totalKarmicDebt || 0}`,
          `**Techniques Mastered:** ${learnedTechniques.length}`,
          "",
          "**Warning:** These are arts of karmic theft - use with caution!"
        ].join('\n'))
        .setColor(0x4B0082)
        .setFooter({ 
          text: "Navigate to the next page to view your mastered techniques →"
        });
    }

    const techniqueIndex = page - 1;
    if (techniqueIndex >= learnedTechniques.length) {
      return new EmbedBuilder()
        .setTitle('📜 End of Scroll Archive')
        .setDescription('You have reached the end of your mastered techniques.\n\nUse `/qi learn` to discover new forbidden arts!')
        .setColor(0x808080);
    }

    const learnedTech = learnedTechniques[techniqueIndex];
    const technique = getTechniqueById(learnedTech.techniqueId);
    
    if (!technique) {
      return new EmbedBuilder()
        .setTitle('❓ Faded Scroll')
        .setDescription(`This technique (ID: ${learnedTech.techniqueId}) has been lost to time.\n\nThe knowledge may have been corrupted or removed.`)
        .setColor(0xFF5555);
    }

    const techniqueDetails = getTechniqueWithMastery(learnedTech.techniqueId, learnedTech.masteryLevel || 1);
    const masteryLevel = learnedTech.masteryLevel || 1;
    const totalUses = learnedTech.totalUses || 0;
    const isEquipped = userTechniques.equippedTechniques?.some(eq => eq?.techniqueId === learnedTech.techniqueId);

    const typeEmojis = {
      'offensive': '⚔️',
      'defensive': '🛡️',
      'healing': '💚',
      'utility': '🔧',
      'enhancement': '✨',
      'ultimate': '👑'
    };

    const elementEmojis = {
      'karma': '☯️',
      'shadow': '🌙',
      'suffering': '💀',
      'hell': '🔥',
      'time': '⏳',
      'blasphemy': '👹',
      'agony': '😱',
      'illusion': '🌫️',
      'torment': '⚡',
      'judgment': '⚖️',
      'theft': '💰',
      'entropy': '🌀',
      'corruption': '🟣'
    };

    return new EmbedBuilder()
      .setTitle(`${typeEmojis[technique.type] || '📜'} ${technique.name}`)
      .setDescription([
        `*${technique.description || 'An ancient art of forbidden power.'}*`,
        "",
        `**Element:** ${elementEmojis[technique.element] || '❓'} ${technique.element || 'Unknown'}`,
        `**Type:** ${technique.type || 'Unknown'}`,
        `**Required Cultivation:** Stage ${technique.requiredCultivation || '?'}`,
        "",
        `**Your Mastery:** Level ${masteryLevel}/10`,
        `**Total Uses:** ${totalUses}`,
        `**Status:** ${isEquipped ? '🔥 Currently Equipped' : '✨ Available to Equip'}`,
        "",        "**Combat Stats:**",
        techniqueDetails.damage && techniqueDetails.damage.max > 0 ? 
          await formatTechniqueDamage(userTechniques.userId, techniqueDetails) : 
          '🛡️ **Non-Damage Technique**',
        techniqueDetails.healing ? 
          `💚 **Healing:** ${techniqueDetails.healing.min}-${techniqueDetails.healing.max}` : '',
        `⚡ **Qi Cost:** ${techniqueDetails.qiCost || 0}`,
        `🎯 **Accuracy:** ${techniqueDetails.accuracy || 0}%`,
        technique.cooldown ? `⏱️ **Cooldown:** ${technique.cooldown} rounds` : '',
        "",
        techniqueDetails.effects?.length ? 
          `✨ **Effects:** ${techniqueDetails.effects.join(', ')}` : 
          '*No special effects*',
        "",
        technique.flavor ? `*"${technique.flavor}"*` : ''
      ].filter(Boolean).join('\n'))
      .setColor(0x9932CC)
      .setFooter({
        text: `Technique ${techniqueIndex + 1} of ${learnedTechniques.length} | Page ${page} | ${isEquipped ? 'Equipped' : 'Not Equipped'}`
      });
  },

  // Generate components for specific page
  generateComponents(page, learnedTechniques, userTechniques) {
    const components = [];

    const navRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`qi_view_prev_${page}`)
        .setLabel('⬅️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === 0),

      new ButtonBuilder()
        .setCustomId(`qi_view_next_${page}`)
        .setLabel('➡️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === learnedTechniques.length + 1)
    );
    components.push(navRow);

    if (page > 0 && page <= learnedTechniques.length) {
      const techniqueIndex = page - 1;
      const learnedTech = learnedTechniques[techniqueIndex];
      const technique = getTechniqueById(learnedTech.techniqueId);
      const isEquipped = userTechniques.equippedTechniques?.some(eq => eq?.techniqueId === learnedTech.techniqueId);
      
      if (technique) {
        const actionRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`qi_equip_from_view_${learnedTech.techniqueId}`)
            .setLabel(isEquipped ? 'Unequip Technique' : 'Equip Technique')
            .setStyle(isEquipped ? ButtonStyle.Danger : ButtonStyle.Success)
            .setDisabled(false)
        );
        components.push(actionRow);
      }
    }

    return components;
  },

  // Equip a technique
  async equipTechnique(interaction, userTechniques, techniqueId, technique, learnedTech) {
    // Initialize arrays if missing
    if (!userTechniques.equippedTechniques) {
      userTechniques.equippedTechniques = [];
    }

    // Check if all slots are full
    const maxSlots = 3;
    if (userTechniques.equippedTechniques.length >= maxSlots) {
      // Show replacement options
      const buttons = [];
      
      for (let i = 0; i < Math.min(userTechniques.equippedTechniques.length, 3); i++) {
        const eq = userTechniques.equippedTechniques[i];
        if (eq && eq.techniqueId) {
          const oldTech = getTechniqueById(eq.techniqueId);
          const techName = oldTech?.name || 'Unknown';
          
          buttons.push(new ButtonBuilder()
            .setCustomId(`replace_technique_${eq.slotNumber}_${techniqueId}`)
            .setLabel(`Replace Slot ${eq.slotNumber}: ${techName.substring(0, 20)}`)
            .setStyle(ButtonStyle.Secondary));
        }
      }

      if (buttons.length === 0) {
        return this.safeErrorResponse(interaction, 'All technique slots appear corrupted. Contact support.');
      }

      const row = new ActionRowBuilder().addComponents(buttons);
      const embed = createBaseEmbed({
        interaction,
        title: '🔄 Replace Equipped Technique',
        description: [
          `**${technique.name}** is ready to be equipped!`,
          '',
          'All your technique slots are currently occupied. Choose which technique to replace:',
          '',
          '💡 *Click a button below to replace that slot with your new technique.*'
        ].join('\n'),
        color: 0xFFAA00
      });

      await interaction.update({ embeds: [embed], components: [row] });
      return;
    }

    // Find next available slot
    const usedSlots = userTechniques.equippedTechniques.map(eq => eq.slotNumber);
    const nextSlot = [1, 2, 3].find(slot => !usedSlots.includes(slot)) || userTechniques.equippedTechniques.length + 1;

    // Add to equipped techniques
    const newEquippedTechnique = {
      slotNumber: nextSlot,
      techniqueId: techniqueId,
      name: technique.name,
      description: technique.description,
      masteryLevel: learnedTech.masteryLevel || 1,
      uses: 0,
      equippedAt: new Date()
    };

    userTechniques.equippedTechniques.push(newEquippedTechnique);
    userTechniques.lastUpdated = new Date();    try {
      await userTechniques.save();
      
      const embed = createBaseEmbed({
        interaction,
        title: '✅ Technique Equipped Successfully!',
        description: [
          `**${technique.name}** has been equipped to slot ${nextSlot}!`,
          '',
          `*${technique.description || 'No description available'}*`,
          '',
          `**Mastery Level:** ${learnedTech.masteryLevel || 1}`,
          `**Technique Type:** ${technique.type || 'Unknown'}`,
          '',
          '🎯 You can now use this technique in combat by clicking "Channel Qi"!'
        ].join('\n'),
        color: 0x00FF00
      });

      await interaction.update({ embeds: [embed], components: [] });

    } catch (error) {
      console.error('Error saving equipped technique:', error);
      await this.safeErrorResponse(interaction, 'Failed to save technique. Please try again.');
    }
  },

  // Unequip a technique
  async unequipTechnique(interaction, userTechniques, techniqueId, technique) {
    // Find and remove the equipped technique
    const initialLength = userTechniques.equippedTechniques.length;
    userTechniques.equippedTechniques = userTechniques.equippedTechniques.filter(
      eq => eq.techniqueId !== techniqueId
    );

    if (userTechniques.equippedTechniques.length === initialLength) {
      return this.safeErrorResponse(interaction, 'Technique was not found in equipped slots.');
    }

    userTechniques.lastUpdated = new Date();    try {
      await userTechniques.save();
      
      const embed = createBaseEmbed({
        interaction,
        title: '❌ Technique Unequipped',
        description: [
          `**${technique.name}** has been unequipped and is no longer available in combat.`,
          '',
          '💡 *You can re-equip it anytime using `/qi equip` or from this view.*'
        ].join('\n'),
        color: 0xFF9900
      });

      await interaction.update({ embeds: [embed], components: [] });

    } catch (error) {
      console.error('Error saving unequipped technique:', error);
      await this.safeErrorResponse(interaction, 'Failed to save changes. Please try again.');
    }  },

  // Handle learn page previous navigation
  async handleLearnPrevious(interaction) {
    const currentPage = parseInt(interaction.customId.split('_')[3]) || 0;
    const newPage = Math.max(0, currentPage - 1);
    
    await this.updateLearnPage(interaction, newPage);
  },

  // Handle learn page next navigation
  async handleLearnNext(interaction) {
    const currentPage = parseInt(interaction.customId.split('_')[3]) || 0;
    const newPage = currentPage + 1;
    
    await this.updateLearnPage(interaction, newPage);
  },
  // Handle technique learning
  async handleLearnTechnique(interaction) {
    const techniqueId = interaction.customId.replace('qi_learn_technique_', '');
    const userId = interaction.user.id;

    try {
      // Get user techniques
      const userTechniques = await UserQiTechniques.findOne({ userId });
      if (!userTechniques) {
        return this.safeErrorResponse(interaction, 'No technique data found. Please try using `/qi learn` again.');
      }

      // Get technique details
      const qiTechniquesData = require('../../data/qiTechniques.js');
      const allTechniques = Object.values(qiTechniquesData).filter(t => typeof t === 'object' && t.id);
      const technique = allTechniques.find(t => t.id === techniqueId);
      
      if (!technique) {
        return this.safeErrorResponse(interaction, 'Technique not found or has been removed.');
      }

      // Check if already learned
      const isLearned = userTechniques.learnedTechniques?.some(lt => lt?.techniqueId === techniqueId);
      if (isLearned) {
        return this.safeErrorResponse(interaction, 'You have already mastered this technique.');
      }

      // Get user's inventory
      const Inventory = require('../../models/Multipliers/inventory.js');
      let inventory = await Inventory.findOne({ userId });
      if (!inventory) {
        inventory = new Inventory({ userId, totalKarmicDebt: 0 });
        await inventory.save();
      }      // Check cultivation level requirement
      const { getStageIndexByRealm, getMinimumDebtForRealm } = require('../../utils/cultivationStages.js');
      const currentStageName = inventory.karmicRealms || 'Karma-Bhāra';      const userCultivationLevel = getStageIndexByRealm(currentStageName) + 1; // Convert to 1-based level
      
      if (technique.requiredCultivation && userCultivationLevel < technique.requiredCultivation) {
        return this.safeErrorResponse(interaction, 
          `Your cultivation is insufficient! This technique requires cultivation level ${technique.requiredCultivation}, but you are only level ${userCultivationLevel} (${currentStageName}).`);
      }

      // Calculate technique cost using logarithmic scaling
      const cost = calculateTechniqueCost(technique);
      const currentDebt = inventory.totalKarmicDebt || 0;

      // Check if user can afford it
      if (currentDebt < cost) {
        return this.safeErrorResponse(interaction, 
          `Insufficient Karmic Debt! You need ${cost} but only have ${currentDebt}. You need ${cost - currentDebt} more.`);
      }

      // Safety check: Ensure user won't drop below minimum debt required for their current realm
      const minimumDebtRequired = getMinimumDebtForRealm(currentStageName);
      const debtAfterPurchase = currentDebt - cost;
      
      if (debtAfterPurchase < minimumDebtRequired) {
        const shortfall = minimumDebtRequired - debtAfterPurchase;
        return this.safeErrorResponse(interaction, 
          `🚫 **Realm Protection Warning!**\n\nLearning this technique would drop your karmic debt below the threshold required to maintain your current realm (${currentStageName}).\n\n` +
          `**Current Debt:** ${currentDebt}\n` +
          `**Technique Cost:** ${cost}\n` +
          `**Debt After Purchase:** ${debtAfterPurchase}\n` +
          `**Minimum Required for ${currentStageName}:** ${minimumDebtRequired}\n` +
          `**Additional Debt Needed:** ${shortfall}\n\n` +
          `*Gain more karmic debt before learning this technique to avoid losing your cultivation realm.*`);
      }

      // Deduct the cost
      inventory.totalKarmicDebt -= cost;
      await inventory.save();

      // Add technique to learned list
      if (!userTechniques.learnedTechniques) {
        userTechniques.learnedTechniques = [];
      }

      const newLearnedTechnique = {
        techniqueId: techniqueId,
        name: technique.name,
        description: technique.description,
        masteryLevel: 1,
        totalUses: 0,
        learnedAt: new Date()
      };

      userTechniques.learnedTechniques.push(newLearnedTechnique);
      userTechniques.lastUpdated = new Date();
      await userTechniques.save();

      // Success response
      const embed = createBaseEmbed({
        interaction,
        title: '📚 Forbidden Knowledge Absorbed!',
        description: [
          `**${technique.name}** has been successfully learned!`,
          '',
          `*${technique.description || 'Ancient wisdom now flows through your mind.'}*`,
          '',
          `**Karmic Debt Consumed:** ${cost}`,
          `**Remaining Karmic Debt:** ${inventory.totalKarmicDebt}`,
          `**Mastery Level:** 1 (Novice)`,
          '',
          '✨ Use `/qi equip` to attune this technique for combat!',
          '⚔️ Practice in battle to increase mastery and unlock greater power!'
        ].join('\n'),
        color: 0x9932CC
      });

      await interaction.update({ embeds: [embed], components: [] });

    } catch (error) {
      console.error('Error in handleLearnTechnique:', error);
      await this.safeErrorResponse(interaction, 'Failed to learn technique. Please try again.');
    }
  },

  // Update the learn page with new embed and components
  async updateLearnPage(interaction, newPage) {
    try {
      const userId = interaction.user.id;
      const userTechniques = await UserQiTechniques.findOne({ userId });
      
      if (!userTechniques) {
        return this.safeErrorResponse(interaction, 'No technique data found. Please try using `/qi learn` again.');
      }

      // Get user's inventory for karmic debt display
      const Inventory = require('../../models/Multipliers/inventory.js');
      let inventory = await Inventory.findOne({ userId });
      if (!inventory) {
        inventory = new Inventory({ userId, totalKarmicDebt: 0 });
        await inventory.save();
      }      // Get available techniques to learn
      const qiTechniquesData = require('../../data/qiTechniques.js');
      const allTechniques = Object.values(qiTechniquesData).filter(t => typeof t === 'object' && t.id);
        // Get user's cultivation level for technique filtering
      const { getStageIndexByRealm, getMinimumDebtForRealm } = require('../../utils/cultivationStages.js');
      const currentStageName = inventory.karmicRealms || 'Karma-Bhāra';
      const userCultivationLevel = getStageIndexByRealm(currentStageName) + 1; // Convert to 1-based level
      
      const availableToLearn = allTechniques.filter(technique => {
        const isLearned = userTechniques.learnedTechniques?.some(lt => lt?.techniqueId === technique.id);
        if (isLearned) return false;

        // Check cultivation level requirement
        if (technique.requiredCultivation && userCultivationLevel < technique.requiredCultivation) {
          return false;
        }

        return true;
      });
      
      // Validate page bounds
      const maxPage = availableToLearn.length + 1;
      if (newPage < 0 || newPage > maxPage) {
        return this.safeErrorResponse(interaction, 'Invalid page navigation.');
      }

      const embed = await this.generateLearnEmbed(newPage, availableToLearn, userTechniques, inventory);
      const components = this.generateLearnComponents(newPage, availableToLearn, inventory);

      await interaction.update({
        embeds: [embed],
        components
      });

    } catch (error) {
      console.error('Error updating learn page:', error);
      await this.safeErrorResponse(interaction, 'Failed to update page. Please try again.');
    }
  },

  // Generate embed for learn page
  async generateLearnEmbed(page, availableToLearn, userTechniques, inventory) {
    if (page === 0) {
      return new EmbedBuilder()
        .setTitle('《 Forbidden Knowledge Vault: Arts of Acquisition 》')
        .setDescription([
          "> *'Knowledge stolen through suffering becomes wisdom eternal' — Shadow Patriarch*",
          "",
          "**Ancient Scroll Library:**",
          "• Browse through forbidden techniques available for learning",
          "• Each art requires Karmic Debt - payment for stolen knowledge",
          "• Master these techniques to gain power beyond mortal limits", 
          "• Some arts may require higher cultivation to comprehend",
          "",
          "*The vault contains secrets ripped from the memories of the fallen...*",
          "",
          `**Current Karmic Debt:** ${inventory.totalKarmicDebt || 0}`,
          `**Available Techniques:** ${availableToLearn.length}`,
          `**Already Mastered:** ${userTechniques.learnedTechniques?.length || 0}`,
          "",
          "**Warning:** Each technique learned binds your soul deeper to the karmic web!"
        ].join('\n'))
        .setColor(0x8B0000)
        .setFooter({ 
          text: "Navigate to the next page to browse available techniques →"
        });
    }

    const techniqueIndex = page - 1;
    if (techniqueIndex >= availableToLearn.length) {
      return new EmbedBuilder()
        .setTitle('📚 End of Scroll Vault')
        .setDescription('You have browsed all available techniques in the forbidden library.\n\nReturn to previous pages to learn new arts!')
        .setColor(0x808080);
    }    const technique = availableToLearn[techniqueIndex];
    
    if (!technique) {
      return new EmbedBuilder()
        .setTitle('❓ Empty Scroll')
        .setDescription(`This technique slot appears empty.\n\nThe knowledge may have been consumed or is temporarily unavailable.`)
        .setColor(0xFF5555);
    }

    // Calculate technique cost using logarithmic scaling
    const { calculateTechniqueCost } = require('../../data/qiTechniques.js');
    const cost = calculateTechniqueCost(technique);
    const canAfford = (inventory.totalKarmicDebt || 0) >= cost;

    const typeEmojis = {
      'offensive': '⚔️',
      'defensive': '🛡️',
      'healing': '💚',
      'utility': '🔧',
      'enhancement': '✨',
      'ultimate': '👑'
    };

    const elementEmojis = {
      'karma': '☯️',
      'shadow': '🌙',
      'suffering': '💀',
      'hell': '🔥',
      'time': '⏳',
      'blasphemy': '👹',
      'agony': '😱',
      'illusion': '🌫️',
      'torment': '⚡',
      'judgment': '⚖️',
      'theft': '💰',
      'entropy': '🌀',
      'corruption': '🟣'
    };    // Get technique details for preview
    const { getTechniqueWithMastery } = require('../../utils/workhelpers/handlers/qiTechniqueManager.js');
    const techniqueDetails = getTechniqueWithMastery(technique.id, 1);

    // Calculate damage display properly
    const damageDisplay = techniqueDetails.damage && techniqueDetails.damage.max > 0 ? 
      await formatTechniqueDamage(userTechniques.userId, techniqueDetails) : 
      '🛡️ **Non-Damage Technique**';

    return new EmbedBuilder()
      .setTitle(`${typeEmojis[technique.type] || '📜'} ${technique.name}`)
      .setDescription([
        `*${technique.description || 'An ancient art of forbidden power.'}*`,
        "",
        `**Element:** ${elementEmojis[technique.element] || '❓'} ${technique.element || 'Unknown'}`,
        `**Type:** ${technique.type || 'Unknown'}`,
        `**Required Cultivation:** Stage ${technique.requiredCultivation || '?'}`,
        "",
        `**Learning Cost:** ${cost} Karmic Debt`,
        `**Your Karmic Debt:** ${inventory.totalKarmicDebt || 0}`,
        `**Can Afford:** ${canAfford ? '✅ Yes' : '❌ No - Need ' + (cost - (inventory.totalKarmicDebt || 0)) + ' more'}`,
        "",
        "**Technique Preview (Level 1):**",
        damageDisplay,
        techniqueDetails.healing ? 
          `💚 **Healing:** ${techniqueDetails.healing.min}-${techniqueDetails.healing.max}` : '',
        `⚡ **Qi Cost:** ${techniqueDetails.qiCost || 0}`,
        `🎯 **Accuracy:** ${techniqueDetails.accuracy || 0}%`,
        technique.cooldown ? `⏱️ **Cooldown:** ${technique.cooldown} rounds` : '',
        "",
        techniqueDetails.effects?.length ? 
          `✨ **Effects:** ${techniqueDetails.effects.join(', ')}` : 
          '*No special effects*',
        "",
        technique.flavor ? `*"${technique.flavor}"*` : '',
        "",
        "*Note: Stats improve significantly with mastery level!*"
      ].filter(Boolean).join('\n'))
      .setColor(canAfford ? 0x9932CC : 0xFF4444)
      .setFooter({
        text: `Technique ${techniqueIndex + 1} of ${availableToLearn.length} | Page ${page} | ${canAfford ? 'Affordable' : 'Too Expensive'}`
      });
  },

  // Generate components for learn page
  generateLearnComponents(page, availableToLearn, inventory) {
    const components = [];

    const navRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`qi_learn_prev_${page}`)
        .setLabel('⬅️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === 0),

      new ButtonBuilder()
        .setCustomId(`qi_learn_next_${page}`)
        .setLabel('➡️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === availableToLearn.length + 1)
    );
    components.push(navRow);    if (page > 0 && page <= availableToLearn.length) {
      const techniqueIndex = page - 1;
      const technique = availableToLearn[techniqueIndex];
      
      // Calculate technique cost using logarithmic scaling
      const { calculateTechniqueCost } = require('../../data/qiTechniques.js');
      const cost = calculateTechniqueCost(technique);
      const canAfford = (inventory.totalKarmicDebt || 0) >= cost;
      
      if (technique) {
        const actionRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`qi_learn_technique_${technique.id}`)
            .setLabel(`Learn Technique (${cost} Karmic Debt)`)
            .setStyle(canAfford ? ButtonStyle.Success : ButtonStyle.Danger)
            .setDisabled(!canAfford)
        );
        components.push(actionRow);
      }
    }

    return components;
  },

  // Utility function for safe error responses
  async safeErrorResponse(interaction, message) {
    const errorContent = { content: `❌ ${message}`, ephemeral: true };
    
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorContent);
      } else {
        await interaction.reply(errorContent);
      }
    } catch (error) {
      console.error('Error sending error response:', error);
    }
  }
};
