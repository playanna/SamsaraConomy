const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ComponentType, MessageFlags } = require('discord.js');
const UserQiTechniques = require('../../models/QiTechniques/userQiTechniques.js'); // Mongoose Model
const qiTechniquesData = require('../../data/qiTechniques.js'); // Main data source { techniques: {}, getTechniqueById(), ... }
const { getTechniqueById, calculateTechniqueCost } = qiTechniquesData; // Assuming this is the efficient way to get by ID from qiTechniquesData.techniques
const { initializeUserTechniques, getTechniqueWithMastery } = require('../../utils/workhelpers/handlers/qiTechniqueManager.js');
const { calculateUserStats } = require('../../utils/workhelpers/handlers/combatCalculator.js');
const createBaseEmbed = require('../../utils/embed.js');

// Constants
const MAX_EQUIPPED_TECHNIQUES = 3;
const MAX_SELECT_MENU_OPTIONS = 25; // Discord limit for select menu options and embed fields
const INTERACTION_TIMEOUT_MS = 300000; // 5 minutes

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
  data: new SlashCommandBuilder()
    .setName('qi')
    .setDescription('Manage your qi techniques - view, equip, and learn new cultivation arts')
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('View your currently equipped qi techniques')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('equip')
        .setDescription('Equip a learned qi technique to one of your slots')
    )    .addSubcommand(subcommand =>
      subcommand
        .setName('learn')
        .setDescription('Learn a new qi technique (costs karmic debt)')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('mastery')
        .setDescription('View mastery levels of your techniques')
    ),
  async execute(interaction) {
    const userId = interaction.user.id;
    const subcommand = interaction.options.getSubcommand();

    try {
      // Interaction state checks
      if (!interaction.user?.id) { // Should be rare with slash commands
        console.error('Qi command: Critical - Interaction received without user ID.');
        return; // Cannot reliably reply if interaction object itself is compromised.
      }

      if (interaction.replied || interaction.deferred) {
        console.warn(`Qi command (${subcommand}) for user ${userId}: Interaction already replied/deferred. Aborting.`);
        return;
      }

      let userTechniques; // This will be a Mongoose document

      // Step 1: Fetch or initialize user techniques data.
      // initializeUserTechniques should handle findOne, or create + save if not found, and return the Mongoose doc.
      try {
        userTechniques = await initializeUserTechniques(userId);
        if (!userTechniques) { // Should not happen if initializeUserTechniques is robust
            throw new Error('initializeUserTechniques returned null/undefined, indicating a failure to fetch or create user data.');
        }
      } catch (initError) {
        console.error(`Qi command (${subcommand}) for user ${userId}: Failed to initialize user techniques:`, initError);
        const initEmbed = createBaseEmbed({
          interaction,
          title: '🌌 Path Unclear, Cultivator',
          description: "Your connection to the flow of Qi seems new or disturbed. We couldn't establish your technique scrolls.\n\nPlease try again. If the issue persists, the spiritual pathways may need time to settle.",
          color: 0x4A90E2
        });
        return safeSendReply(interaction, { embeds: [initEmbed], flags: [MessageFlags.Ephemeral] });
      }
      
      // Step 2: Validate and potentially clean the data.
      // validationResult.data will be the userTechniques Mongoose document, possibly modified.
      let validationResult = await validateUserTechniquesData(userTechniques, userId);

      if (!validationResult.valid) {
        console.warn(`Qi command (${subcommand}) for user ${userId}: Invalid user technique data (${validationResult.error}). Attempting recovery.`);
        try {
            // recoverCorruptedTechniqueData re-runs initializeUserTechniques or resets the document based on its internal logic.
            // It should return a SAVED, valid Mongoose document or throw.
            userTechniques = await recoverCorruptedTechniqueData(userId); 
            if (!userTechniques) throw new Error('Recovery process yielded no user techniques data.');
            
            // Re-validate after recovery.
            validationResult = await validateUserTechniquesData(userTechniques, userId);
            if (!validationResult.valid) {
                throw new Error(`Critical error: User techniques data for ${userId} corrupted beyond recovery or recovery failed re-validation (${validationResult.error}).`);
            }
            console.log(`Qi command (${subcommand}) for user ${userId}: User techniques data recovered.`);
            // If recovery itself, or the subsequent validation, modified the document, save it.
            if (validationResult.modified) {
                 await userTechniques.save();
                 console.log(`Qi command (${subcommand}) for user ${userId}: Recovered and re-validated data saved.`);
            }
        } catch (recoveryError) {
            console.error(`Qi command (${subcommand}) for user ${userId}: Critical error during data recovery:`, recoveryError);
            throw recoveryError; // Propagate to main error handler
        }
      } else if (validationResult.modified) {
        // Data was valid but got cleaned up/modified by validateUserTechniquesData
        await userTechniques.save();
        console.log(`Qi command (${subcommand}) for user ${userId}: User techniques data validated and modifications saved.`);
      }
      // At this point, userTechniques is a valid, Mongoose document, 
      // and its state in memory matches the database (or will after a successful save).

      // Step 3: Execute subcommand handler
      const handlers = {
        'view': handleViewTechniques,
        'equip': handleEquipTechniques,
        'learn': handleLearnTechniques,
        'mastery': handleMasteryView,
      };

      if (handlers[subcommand]) {
        await handlers[subcommand](interaction, userTechniques);
      } else {
        throw new Error(`Unknown subcommand: ${subcommand}`);
      }

    } catch (error) {
      console.error(`Error in qi command (${subcommand}) for user ${userId}:`, error);
      const errorEmbed = createBaseEmbed({
        interaction,
        title: '🌪️ Spiritual Turbulence!',
        description: "A tremor in the spiritual energies has disrupted your connection. The Sect's elders are investigating.\nPlease try again. *The path of cultivation is fraught with unexpected trials...*",
        color: 0xFF0000
      });
      await safeSendReply(interaction, { embeds: [errorEmbed], flags: [MessageFlags.Ephemeral] });
    }
  },

  stage: 'beta'
};

async function handleViewTechniques(interaction, userTechniques) {
  // userTechniques is guaranteed non-null, validated, and saved by execute()
  try {
    // Get user's inventory to display karmic debt
    const Inventory = require('../../models/Multipliers/inventory.js');
    let inventory = await Inventory.findOne({ userId: interaction.user.id });
    if (!inventory) {
      inventory = new Inventory({ userId: interaction.user.id, totalKarmicDebt: 0 });
      await inventory.save();
    }

    const learnedTechniques = userTechniques.learnedTechniques || [];
    let page = 0;

    const generateEmbed = async (page) => {
      if (page === 0) {
        return new EmbedBuilder()
          .setTitle('《 Karmic Tethic Tome: Forbidden Scrolls 》')
          .setDescription([
            "> *'The karmic threads weave through all - steal them to grow stronger' — First Jade-Patriarch*",
            "",
            "**Scroll Archive:**",
            "• Navigate through your mastered Qi techniques",
            `• Each scroll contains forbidden wisdom bought with Karmic Debt`,
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
          .setColor(0x4B0082) // Deep spiritual purple
          .setFooter({ 
            text: "Navigate to the next page to view your mastered techniques →", 
            iconURL: interaction.guild.iconURL()
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
          "",          "**Combat Stats:**",
          techniqueDetails.damage && techniqueDetails.damage.max > 0 ? 
            await formatTechniqueDamage(interaction.user.id, techniqueDetails) : 
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
    };

    const generateComponents = (page) => {
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
    };

    if (learnedTechniques.length === 0) {      const embed = createBaseEmbed({
        interaction,
        title: '📜 Empty Scroll Archive',
        description: "**Your technique collection is currently empty!**\n\nUse `/qi learn` to absorb new knowledge from the ancient scrolls and begin your journey into forbidden arts.\n\n💡 *Start with basic techniques like **Karmic Debt Strike** to build your foundation.*",
        color: 0x9932CC
      });
      return safeSendReply(interaction, { embeds: [embed], flags: [MessageFlags.Ephemeral] });
    }

    const embed = await generateEmbed(page);
    const components = generateComponents(page);    await safeSendReply(interaction, {
      embeds: [embed],
      components,
      flags: [MessageFlags.Ephemeral]
    });
  } catch (error) {
    console.error(`Error in handleViewTechniques for user ${interaction.user.id}:`, error);    const errorEmbed = createBaseEmbed({
      interaction,
      title: '❌ Disturbance in the Aether',
      description: 'A flicker in the spiritual energies prevents viewing your techniques. The elders advise patience and trying again.',
      color: 0xFF0000
    });
    await safeSendReply(interaction, { embeds: [errorEmbed], flags: [MessageFlags.Ephemeral] });
  }
}

async function handleEquipTechniques(interaction, userTechniques) {
  // userTechniques is guaranteed non-null, validated, and saved by execute()
  try {
    if (!userTechniques.learnedTechniques || userTechniques.learnedTechniques.length === 0) {      const embed = createBaseEmbed({
        interaction,
        title: '텅 빈 두루마리 (Empty Scrolls)',
        description: "Your mind is a vessel, yet it holds no learned techniques to equip!\n\nSeek knowledge with `/qi learn` and fill your spirit with ancient arts.",
        color: 0xFF5555
      });
      return safeSendReply(interaction, { embeds: [embed], flags: [MessageFlags.Ephemeral] });
    }

    const options = userTechniques.learnedTechniques
      .map(learnedTech => {
        if (!learnedTech?.techniqueId) {
          console.warn(`Skipping invalid learned technique during equip for user ${interaction.user.id}:`, learnedTech);
          return null;
        }
        const technique = getTechniqueById(learnedTech.techniqueId);
        if (!technique) {
          console.warn(`Technique ID ${learnedTech.techniqueId} not found in data for equip list (user ${interaction.user.id}).`);
          return null;
        }
        const isEquipped = userTechniques.equippedTechniques?.some(eq => eq?.techniqueId === learnedTech.techniqueId);
        return {
          label: `${technique.name} (Mastery ${learnedTech.masteryLevel || 1})`,
          description: (technique.description || 'An art of subtle power.'), // Truncation handled by createTechniqueSelectMenu
          value: learnedTech.techniqueId,
          emoji: isEquipped ? '🔥' : '✨'
        };
      })
      .filter(Boolean);

    if (options.length === 0) {
      const embed = createBaseEmbed({
        interaction,
        title: '🚫 Whispers in the Void',
        description: "No valid techniques found among your learned arts to equip. Perhaps the scrolls are temporarily obscured or an imbalance affects your knowledge.\n\nTry `/qi learn` or check if existing techniques are correctly recorded.",        color: 0xFF5555
      });
      return safeSendReply(interaction, { embeds: [embed], flags: [MessageFlags.Ephemeral] });
    }
    
    const selectMenu = createTechniqueSelectMenu('equip_technique_select', options, 'Select an art to attune...');

    const embedDescription = [
        'Choose a mastered art to channel through your spiritual conduits:',
        '',
        '🔥 = Currently Resonating (Equipped)',
        '✨ = Ready to Channel (Available)',
        '',
        `*You may attune up to ${MAX_EQUIPPED_TECHNIQUES} techniques simultaneously.*`,
        options.length > MAX_SELECT_MENU_OPTIONS ? `\n*Displaying the first ${MAX_SELECT_MENU_OPTIONS} of your ${options.length} known arts in the menu below.*` : '',
      ].filter(Boolean).join('\n');

    const embed = createBaseEmbed({
      interaction,
      title: '🔗 Attune Your Spirit: Equip Qi Technique',
      description: embedDescription,
      color: 0x9932CC
    });    const row = new ActionRowBuilder().addComponents(selectMenu);
    // The actual equipping logic (collector, DB update of userTechniques, userTechniques.save()) 
    // is assumed to be handled by a component interaction handler for 'equip_technique_select'.
    await safeSendReply(interaction, {
      embeds: [embed],
      components: [row],
      flags: [MessageFlags.Ephemeral]
    });
  } catch (error) {
    console.error(`Error in handleEquipTechniques for user ${interaction.user.id}:`, error);    const errorEmbed = createBaseEmbed({
      interaction,
      title: '❌ Energetic Interference',
      description: 'A distortion in the Qi flow prevents accessing the equip menu. The spirits advise waiting a moment before trying again.',
      color: 0xFF0000
    });
    await safeSendReply(interaction, { embeds: [errorEmbed], flags: [MessageFlags.Ephemeral] });
  }
}

async function handleLearnTechniques(interaction, userTechniques) {
  // userTechniques is guaranteed non-null, validated, and saved by execute()
  try {
    // Get user's inventory to check karmic debt
    const Inventory = require('../../models/Multipliers/inventory.js');
    let inventory = await Inventory.findOne({ userId: interaction.user.id });
    if (!inventory) {
      inventory = new Inventory({ userId: interaction.user.id, totalKarmicDebt: 0 });
      await inventory.save();
    }

    // Get all techniques, filtering out helper functions
    const allDefinedTechniques = Object.keys(qiTechniquesData)
      .filter(key => typeof qiTechniquesData[key] === 'object' && qiTechniquesData[key]?.id)
      .reduce((techniques, key) => {
        techniques[key] = qiTechniquesData[key];
        return techniques;
      }, {}); 
      // Get user's cultivation level for technique locking
    const { getStageIndexByRealm } = require('../../utils/cultivationStages.js');
    const currentStageName = inventory.karmicRealms || 'Karma-Bhāra';
    const userCultivationLevel = getStageIndexByRealm(currentStageName) + 1; // Convert to 1-based level

    const availableToLearn = Object.values(allDefinedTechniques)
      .filter(technique => {
        if (typeof technique !== 'object' || !technique?.id) return false;
        const isLearned = userTechniques.learnedTechniques?.some(lt => lt?.techniqueId === technique.id);
        if (isLearned) return false;

        // Check cultivation level requirement
        if (technique.requiredCultivation && userCultivationLevel < technique.requiredCultivation) {
          return false;
        }

        return true;
      });

    let page = 0;

    const generateEmbed = async (page) => {
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
          .setColor(0x8B0000) // Dark red for forbidden knowledge
          .setFooter({ 
            text: "Navigate to the next page to browse available techniques →", 
            iconURL: interaction.guild.iconURL()
          });
      }

      const techniqueIndex = page - 1;
      if (techniqueIndex >= availableToLearn.length) {
        return new EmbedBuilder()
          .setTitle('📚 End of Scroll Vault')
          .setDescription('You have browsed all available techniques in the forbidden library.\n\nReturn to previous pages to learn new arts!')
          .setColor(0x808080);
      }

      const technique = availableToLearn[techniqueIndex];
      
      if (!technique) {
        return new EmbedBuilder()
          .setTitle('❓ Empty Scroll')
          .setDescription(`This technique slot appears empty.\n\nThe knowledge may have been consumed or is temporarily unavailable.`)
          .setColor(0xFF5555);      }

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
      };

      // Get technique details for preview
      const techniqueDetails = getTechniqueWithMastery(technique.id, 1); // Level 1 preview

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
          "",          "**Technique Preview (Level 1):**",
          techniqueDetails.damage && techniqueDetails.damage.max > 0 ? 
            await formatTechniqueDamage(interaction.user.id, techniqueDetails) : 
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
          technique.flavor ? `*"${technique.flavor}"*` : '',
          "",
          "*Note: Stats improve significantly with mastery level!*"
        ].filter(Boolean).join('\n'))
        .setColor(canAfford ? 0x9932CC : 0xFF4444)
        .setFooter({
          text: `Technique ${techniqueIndex + 1} of ${availableToLearn.length} | Page ${page} | ${canAfford ? 'Affordable' : 'Too Expensive'}`
        });
    };

    const generateComponents = (page) => {
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
      components.push(navRow);      if (page > 0 && page <= availableToLearn.length) {
        const techniqueIndex = page - 1;
        const technique = availableToLearn[techniqueIndex];
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
    };

    if (availableToLearn.length === 0) {
      const embed = createBaseEmbed({
        interaction,
        title: '📚 Forbidden Vault Depleted',
        description: `**All forbidden knowledge has been absorbed!**\n\nYou have learned all techniques currently available in the vault, cultivator.\n\n**Current Karmic Debt:** ${inventory.totalKarmicDebt || 0}\n\n*As the realm evolves and new forbidden arts are discovered, the vault may receive new scrolls...*`,
        color: 0x808080
      });      return safeSendReply(interaction, { embeds: [embed], flags: [MessageFlags.Ephemeral] });
    }

    const embed = await generateEmbed(page);
    const components = generateComponents(page);

    await safeSendReply(interaction, {
      embeds: [embed],
      components,
      flags: [MessageFlags.Ephemeral]
    });
  } catch (error) {
    console.error(`Error in handleLearnTechniques for user ${interaction.user.id}:`, error);
    const errorEmbed = createBaseEmbed({
      interaction,
      title: '❌ Obscured Knowledge',      description: 'The ancient scrolls are clouded, preventing new learning at this time. Await clarity and try once more.',
      color: 0xFF0000
    });
    await safeSendReply(interaction, { embeds: [errorEmbed], flags: [MessageFlags.Ephemeral] });
  }
}

async function handleMasteryView(interaction, userTechniques) {
  // userTechniques is guaranteed non-null, validated, and saved by execute()
  try {
    if (!userTechniques.learnedTechniques || userTechniques.learnedTechniques.length === 0) {
      const embed = createBaseEmbed({
        interaction,
        title: '📊 Echoes of Unlearned Arts',
        description: 'You possess no learned techniques to view mastery for. The path to mastery begins with knowledge.\n\n*Use `/qi learn` to acquire your first arts.*',        color: 0x808080
      });
      return safeSendReply(interaction, { embeds: [embed], flags: [MessageFlags.Ephemeral] });
    }

    const MAX_MASTERY_LEVEL = 10; // Define max mastery level
    const BASE_USES_PER_LEVEL_BLOCK = 10; // Example: each "block" of mastery progression takes 10 uses relative to its level factor.

    const masteryFields = userTechniques.learnedTechniques.map(learnedTech => {
      if (!learnedTech?.techniqueId) {
        console.warn(`Skipping invalid learned technique in mastery view for user ${interaction.user.id}:`, learnedTech);
        return null;
      }
      const technique = getTechniqueById(learnedTech.techniqueId);
      if (!technique) {
        console.warn(`Technique ID ${learnedTech.techniqueId} not found for mastery view (user ${interaction.user.id}).`);
        return {
          name: `❓ Faded Art (ID: ${learnedTech.techniqueId}) - Lvl ${learnedTech.masteryLevel || 1}/${MAX_MASTERY_LEVEL}`,
          value: `🚫 **Fragmented Memory:** Data obscured.\n🎯 **Total Echoes (Uses):** ${learnedTech.totalUses || 0}`,
          inline: true
        };
      }
      
      const masteryLevel = learnedTech.masteryLevel || 1;
      const totalUses = learnedTech.totalUses || 0;
      let progressDisplayLines = [];

      if (masteryLevel >= MAX_MASTERY_LEVEL) {
        progressDisplayLines.push('🌟 **Apex of Understanding**');
      } else {
        // Example progression: To advance from Lvl X to Lvl X+1, it requires (X * BASE_USES_PER_LEVEL_BLOCK) additional uses.
        // So, L1->L2 needs 1*10=10 uses. L2->L3 needs 2*10=20 uses (total 30). L3->L4 needs 3*10=30 uses (total 60).
        let usesRequiredForCurrentLevelAdvancement = masteryLevel * BASE_USES_PER_LEVEL_BLOCK;
        if (masteryLevel === 0) usesRequiredForCurrentLevelAdvancement = BASE_USES_PER_LEVEL_BLOCK; // Special case for L0->L1 if applicable, or L1 is starting. Assuming L1 is start.

        let totalUsesForPreviousLevels = 0;
        for (let i = 1; i < masteryLevel; i++) {
            totalUsesForPreviousLevels += i * BASE_USES_PER_LEVEL_BLOCK;
        }
        
        const currentLevelProgressUses = Math.max(0, totalUses - totalUsesForPreviousLevels);
        const usesRemainingForNextLevel = Math.max(0, usesRequiredForCurrentLevelAdvancement - currentLevelProgressUses);

        progressDisplayLines.push(`📈 **Insight:** ${currentLevelProgressUses}/${usesRequiredForCurrentLevelAdvancement} uses towards next illumination`);
        progressDisplayLines.push(`⏳ **Next Threshold:** ${usesRemainingForNextLevel} more invocations`);
      }
      progressDisplayLines.push(`🎯 **Total Invocations:** ${totalUses}`);

      return {
        name: `${technique.name || 'Unnamed Art'} - Mastery ${masteryLevel}/${MAX_MASTERY_LEVEL}`,
        value: progressDisplayLines.join('\n'),
        inline: true
      };
    }).filter(Boolean);

    if (masteryFields.length === 0) { 
      masteryFields.push({
        name: '⚠️ Veil of Ignorance',
        value: 'No valid mastery data could be displayed. All recorded techniques may be corrupted or their mastery unreadable.',
        inline: false
      });
    }

    const embed = createBaseEmbed({
      interaction,
      title: '🏆 Chronicle of Technique Mastery',
      description: [
        '**The path of mastery refines your Qi, unlocking profound depths:**',
        '• Amplified might & diminished spiritual cost.',
        '• Emergence of new ethereal effects & abilities.',
        '• Sharpened focus & hastened recovery of energies.',
        '',
        '*Each invocation in the crucible of combat is a step towards enlightenment!*'
      ].join('\n'),
      color: 0x9932CC,
      fields: masteryFields.slice(0, MAX_SELECT_MENU_OPTIONS)
    });    if (masteryFields.length > MAX_SELECT_MENU_OPTIONS) {
      embed.setFooter({ text: `Displaying first ${MAX_SELECT_MENU_OPTIONS} of ${masteryFields.length} mastered arts.` });
    }
    await safeSendReply(interaction, { embeds: [embed], flags: [MessageFlags.Ephemeral] });
  } catch (error) {
    console.error(`Error in handleMasteryView for user ${interaction.user.id}:`, error);
    const errorEmbed = createBaseEmbed({
      interaction,
      title: '❌ Veil Over Wisdom',
      description: 'A disturbance obscures the records of your mastery. The path to understanding will clear; try again soon.',      color: 0xFF0000
    });
    await safeSendReply(interaction, { embeds: [errorEmbed], flags: [MessageFlags.Ephemeral] });
  }
}

// Centralized reply sender
async function safeSendReply(interaction, options) {
  try {
    if (!interaction || typeof interaction.isCommand !== 'function') {
      console.error('safeSendReply: Invalid interaction object provided.');
      return null;
    }
    if (!options || (typeof options !== 'object')) {
        console.error('safeSendReply: Invalid options provided for interaction ' + interaction.id);
        return null;
    }

    if (options.components && options.embeds?.[0]?.data) {
        const hasSelectMenu = options.components.some(row => 
            row.components?.some(comp => comp.data?.type === ComponentType.StringSelect)
        );
        if (hasSelectMenu) {
            const currentDescription = options.embeds[0].data.description || "";
            const timeoutWarning = `\n\n⏳ *This interactive menu will dissolve into the mists of time in ${INTERACTION_TIMEOUT_MS / 60000} minutes.*`;
            if (!currentDescription.includes('dissolve into the mists')) {
                 options.embeds[0].data.description = currentDescription + timeoutWarning;
            }
        }
    }
    
    if (interaction.replied || interaction.deferred) {
      await interaction.editReply(options);
    } else {
      await interaction.reply(options);
    }
    return interaction;
  } catch (replyError) {
    console.error(`Failed to send or edit reply for interaction ${interaction.id} (user ${interaction.user?.id}):`, replyError);
    try {      const emergencyMessage = { 
        content: '❌ A critical error occurred processing your request. The spirits are unsettled. Please try again later.', 
        embeds: [], // Clear embeds
        components: [], // Clear components
        flags: [MessageFlags.Ephemeral]
      };
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply(emergencyMessage);
      } else {
        await interaction.editReply(emergencyMessage);
      }
    } catch (lastResortError) {
      console.error(`Last resort reply also failed for interaction ${interaction.id} (user ${interaction.user?.id}):`, lastResortError);
    }
    return null;
  }
}

// Centralized select menu creator
function createTechniqueSelectMenu(customId, options, placeholder = 'Choose a technique...') {
  if (!customId || typeof customId !== 'string' || customId.trim() === '') {
    throw new Error('Invalid customId for select menu. Must be a non-empty string.');
  }
  if (!Array.isArray(options)) {
    throw new Error('Invalid options array for select menu. Must be an array.');
  }

  const validOptions = options
    .filter(opt => 
      opt && 
      typeof opt.label === 'string' && opt.label.trim() !== '' &&
      typeof opt.value === 'string' && opt.value.trim() !== ''
    )
    .map(opt => ({
      label: opt.label.substring(0, 100),
      value: opt.value.substring(0, 100),
      description: (typeof opt.description === 'string' ? opt.description : '').substring(0, 100),
      emoji: opt.emoji 
    }));

  if (validOptions.length === 0) {
    throw new Error('No valid options available for select menu after filtering. Ensure techniques provide valid labels and values.');
  }

  return new StringSelectMenuBuilder()
    .setCustomId(customId)
    .setPlaceholder(placeholder.substring(0,150))
    .addOptions(validOptions.slice(0, MAX_SELECT_MENU_OPTIONS));
}

// Data validation and cleaning utility for UserQiTechniques Mongoose document
async function validateUserTechniquesData(userTechniquesDoc, userId) {
  try {
    if (!userTechniquesDoc) return { valid: false, error: `No technique data object provided for user ${userId}.`, data: null, modified: false };
    if (userTechniquesDoc.userId !== userId) return { valid: false, error: `User ID mismatch (doc: ${userTechniquesDoc.userId}, expected: ${userId}).`, data: userTechniquesDoc, modified: false };

    let modified = false;

    // Validate equippedTechniques
    if (!Array.isArray(userTechniquesDoc.equippedTechniques)) {
      console.warn(`User ${userId}: equippedTechniques is not an array. Resetting.`);
      userTechniquesDoc.equippedTechniques = [];
      modified = true;
    } else {
      const originalLength = userTechniquesDoc.equippedTechniques.length;
      userTechniquesDoc.equippedTechniques = userTechniquesDoc.equippedTechniques.filter(eq => {
        if (!eq || typeof eq !== 'object') return false; // Ensure eq is an object
        if (!eq.techniqueId || !getTechniqueById(eq.techniqueId)) return false;
        if (typeof eq.slotNumber !== 'number' || eq.slotNumber < 1 || eq.slotNumber > MAX_EQUIPPED_TECHNIQUES) return false;
        if (typeof eq.masteryLevel !== 'number' || eq.masteryLevel < 1 || isNaN(eq.masteryLevel)) { eq.masteryLevel = 1; modified = true; }
        if (typeof eq.uses !== 'number' || eq.uses < 0 || isNaN(eq.uses)) { eq.uses = 0; modified = true; }
        return true;
      });
      if (userTechniquesDoc.equippedTechniques.length !== originalLength) modified = true;
    }

    // Validate learnedTechniques
    if (!Array.isArray(userTechniquesDoc.learnedTechniques)) {
      console.warn(`User ${userId}: learnedTechniques is not an array. Resetting.`);
      userTechniquesDoc.learnedTechniques = [];
      modified = true;
    } else {
      const originalLength = userTechniquesDoc.learnedTechniques.length;
      userTechniquesDoc.learnedTechniques = userTechniquesDoc.learnedTechniques.filter(lt => {
        if (!lt || typeof lt !== 'object') return false; // Ensure lt is an object
        if (!lt.techniqueId || !getTechniqueById(lt.techniqueId)) return false;
        if (typeof lt.masteryLevel !== 'number' || lt.masteryLevel < 1 || isNaN(lt.masteryLevel)) { lt.masteryLevel = 1; modified = true; }
        if (typeof lt.totalUses !== 'number' || lt.totalUses < 0 || isNaN(lt.totalUses)) { lt.totalUses = 0; modified = true; }
        return true;
      });      if (userTechniquesDoc.learnedTechniques.length !== originalLength) modified = true;
    }

    return { valid: true, data: userTechniquesDoc, modified };
  } catch (validationError) {
    console.error(`Error validating user techniques data for ${userId}:`, validationError);
    return { valid: false, error: 'Internal validation error: ' + validationError.message, data: userTechniquesDoc, modified: false };
  }
}

// Data recovery utility
async function recoverCorruptedTechniqueData(userId) {
  // This function relies on initializeUserTechniques to provide a "clean" document state.
  // This might mean creating a new default document or fetching and ensuring an existing one is pristine.
  try {
    console.warn(`Attempting to recover/re-initialize technique data for user: ${userId} by invoking initializeUserTechniques.`);
    const freshUserTechniques = await initializeUserTechniques(userId); 
    if (!freshUserTechniques) {
      throw new Error(`Failed to obtain fresh user techniques during recovery for user ${userId}. initializeUserTechniques returned null/undefined.`);
    }
    // Assuming initializeUserTechniques saves new documents. If not, a save would be needed here.
    // e.g., if (freshUserTechniques.isNew) await freshUserTechniques.save();
    console.log(`Successfully re-initialized technique data via initializeUserTechniques for user: ${userId}.`);
    return freshUserTechniques; // This should be a Mongoose document.
  } catch (recoveryError) {
    console.error(`Failed to recover corrupted technique data for ${userId} using initializeUserTechniques:`, recoveryError);
    // Re-throw to be caught by the main error handler in execute(), which will send a user-facing message.
    throw recoveryError; 
  }
}