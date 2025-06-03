const ExpeditionSettings = require('../../../models/Multipliers/expeditionSetting.js');
const QuestContainer = require('../../../models/Clan/quests.js');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const {emojis} = require('../../../data/emojis.js');

// Constants for consistent styling
const COLORS = {
  INFO: '#FFAA00',
  SUCCESS: '#00FFAA',
  ERROR: '#FF5555',
  WARNING: '#FFCC00',
  DIFFICULTY: {
    Easy: '#4CAF50',
    Medium: '#FFC107',
    Hard: '#F44336',
    Epic: '#9C27B0'
  }
};

const BUTTON_STYLES = {
  PRIMARY: ButtonStyle.Primary,
  SUCCESS: ButtonStyle.Success,
  DANGER: ButtonStyle.Danger,
  SECONDARY: ButtonStyle.Secondary
};

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
      console.error('Button Handler Error:', error);
      await interaction.reply({
        content: '❌ An unexpected error occurred while processing your request.',
        ephemeral: true
      });
    }
  },

  // Handler mapping function
  getHandler(id) {
    const handlers = {
      'viewQuest_': this.handleViewQuest,
      'acceptQuest_': this.handleAcceptQuest,
      'activeQuest_': this.handleActiveQuest,
      'completeQuest_': this.handleCompleteQuest,
      'cancelQuest_': this.handleCancelQuest,
      'myquests_page_': this.handlePageChange // Added for pagination
    };

    return Object.entries(handlers).find(([prefix]) => 
      id.startsWith(prefix)
    )?.[1];
  },

  // Unknown button handler
  async handleUnknownButton(interaction) {
    await interaction.reply({
      content: '⚠️ This button is no longer active or recognized.',
      ephemeral: true
    });
  },

  // VIEW QUEST DETAILS handler
  async handleViewQuest(interaction) {
    const questIndex = parseInt(interaction.customId.split('_')[1]);
    const userSettings = await ExpeditionSettings.findOne({ userId: interaction.user.id });
    const userRealm = userSettings?.realm || 'Default';
  
    const questContainer = await QuestContainer.findById('global_quest_list');
    if (!questContainer) {
      return this.sendErrorResponse(interaction, 'Quest data is currently unavailable.');
    }
  
    const realmQuests = questContainer.quests.filter(q => q.area === userRealm);
  
    if (!realmQuests[questIndex]) {
      return this.sendErrorResponse(interaction, 'Quest not found.');
    }
  
    const questTemplate = realmQuests[questIndex];
    const isAlreadyAccepted = userSettings?.activeQuests?.some(q => q.questId === questTemplate.id);
  
    const embed = this.createQuestEmbed(questTemplate, false);
  
    const actionRow = new ActionRowBuilder();
  
    if (!isAlreadyAccepted) {
      actionRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`acceptQuest_${questIndex}`)
          .setLabel('Accept Quest')
          .setStyle(BUTTON_STYLES.SUCCESS)
      );
    } else {
      const activeIndex = userSettings.activeQuests.findIndex(q => q.questId === questTemplate.id);
      actionRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`activeQuest_${activeIndex}`)
          .setLabel('View Active Quest')
          .setStyle(BUTTON_STYLES.PRIMARY)
      );
    }
  
    await interaction.reply({
      embeds: [embed],
      components: [actionRow],
      ephemeral: true
    });
  },
  

  // ACCEPT QUEST handler
  async handleAcceptQuest(interaction) {
    const questIndex = parseInt(interaction.customId.split('_')[1]);
    const userSettings = await ExpeditionSettings.findOne({ userId: interaction.user.id });
  
    if (!userSettings) {
      return this.sendErrorResponse(interaction, "You don't have an expedition profile.");
    }
  
    const userRealm = userSettings.realm || 'Default';
  
    const questContainer = await QuestContainer.findById('global_quest_list');
    if (!questContainer) {
      return this.sendErrorResponse(interaction, 'Quest data is currently unavailable.');
    }
  
    const realmQuests = questContainer.quests.filter(q => q.area === userRealm);
  
    if (!realmQuests[questIndex]) {
      return this.sendErrorResponse(interaction, 'Quest not found.');
    }
  
    const questTemplate = realmQuests[questIndex];
  
    const activeQuestsCount = userSettings.activeQuests?.length || 0;
    const maxActiveQuests = userSettings.maxActiveQuests || 3;
  
    if (activeQuestsCount >= maxActiveQuests) {
      return this.sendErrorResponse(
        interaction,
        `You can only have ${maxActiveQuests} active quests at a time. Complete or cancel some first.`
      );
    }
  
    const alreadyAccepted = userSettings.activeQuests?.some(q => q.questId === questTemplate.id);
    if (alreadyAccepted) {
      return this.sendWarningResponse(interaction, 'You already accepted this quest!');
    }
  
    if (!userSettings.activeQuests) {
      userSettings.activeQuests = [];
    }
  
    const newQuest = {
      questId: questTemplate.id,
      QuestAuthor: questTemplate.QuestAuthor || 'System',
      area: questTemplate.area || 'Unknown',
      name: questTemplate.name,
      description: questTemplate.description || 'No description available.',
      startedAt: new Date(),
      status: 'In Progress',
      objectives: questTemplate.objectives?.map(obj => ({
        description: obj.description,
        targetCount: obj.targetCount || 1,
        currentCount: 0,
        completed: false,
        itemId: obj.itemId
      })) || [],
      rewards: questTemplate.rewards || {},
      difficulty: questTemplate.difficulty || 'Medium',
      duration: questTemplate.duration || 'Varies',
      realm: userRealm
    };
  
    userSettings.activeQuests.push(newQuest);
    await userSettings.save();
  
    const objectivesText = newQuest.objectives.map(obj =>
      `- ${obj.description} (${obj.currentCount}/${obj.targetCount})`
    ).join('\n');
  
    await interaction.reply({
      content: `✅ You accepted **${newQuest.name}**!\n\n**Objectives:**\n${objectivesText || 'None'}`,
      ephemeral: true
    });
  },
  

  // VIEW ACTIVE QUEST handler
  async handleActiveQuest(interaction) {
    const questIndex = parseInt(interaction.customId.split('_')[1]);
    const settings = await ExpeditionSettings.findOne({ userId: interaction.user.id });

    if (!settings || !settings.activeQuests || !settings.activeQuests[questIndex]) {
      return this.sendErrorResponse(interaction, 'Quest not found.');
    }

    const quest = settings.activeQuests[questIndex];
    const embed = this.createQuestEmbed(quest, true);

    const actionRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`completeQuest_${questIndex}`)
        .setLabel('Complete Quest')
        .setStyle(BUTTON_STYLES.SUCCESS),
      new ButtonBuilder()
        .setCustomId(`cancelQuest_${questIndex}`)
        .setLabel('Cancel Quest')
        .setStyle(BUTTON_STYLES.DANGER)
    );

    await interaction.reply({ 
      embeds: [embed], 
      components: [actionRow], 
    });
  },

  // COMPLETE QUEST handler
  async handleCompleteQuest(interaction) {
    const questIndex = parseInt(interaction.customId.split('_')[1]);
    const settings = await ExpeditionSettings.findOne({ userId: interaction.user.id });

    if (!settings || !settings.activeQuests || !settings.activeQuests[questIndex]) {
      return this.sendErrorResponse(interaction, 'Quest not found.');
    }

    const quest = settings.activeQuests[questIndex];
    
    // Validate quest completion
    const incompleteObjectives = quest.objectives?.filter(obj => 
      !obj.completed && (obj.currentCount < obj.targetCount)
    );

    if (incompleteObjectives?.length > 0) {
      return this.sendErrorResponse(
        interaction,
        `You haven't completed all objectives for this quest!\n\n` +
        `Remaining: ${incompleteObjectives.map(obj => 
          `${obj.description} (${obj.currentCount}/${obj.targetCount})`
        ).join('\n')}`
      );
    }

    // Remove from active quests
    const completedQuest = settings.activeQuests.splice(questIndex, 1)[0];
    completedQuest.completedAt = new Date();
    completedQuest.status = 'Completed';

    // Add to completed quests
    if (!settings.completedQuests) settings.completedQuests = [];
        settings.completedQuests.push({
        questId: completedQuest.id,
        QuestAuthor: completedQuest.QuestAuthor || 'System',
        area: completedQuest.area || 'Unknown',
        name: completedQuest.name,
        questId: completedQuest.questId,
        description: completedQuest.description,
        objectives: completedQuest.objectives || [],
        rewards: completedQuest.rewards || {},
        completedAt: new Date(),
        status: 'Completed'
    });

    // Update quest stats
    if (!settings.questStats) settings.questStats = {
      totalCompleted: 0,
      totalFailed: 0,
      totalAbandoned: 0,
      totalXPEarned: 0,
      totalGoldEarned: 0
    };

    settings.questStats.totalCompleted += 1;
    if (completedQuest.rewards?.xp) {
      settings.questStats.totalXPEarned += completedQuest.rewards.xp;
    }
    if (completedQuest.rewards?.gold) {
      settings.questStats.totalGoldEarned += completedQuest.rewards.gold;
    }

    await settings.save();

    // Give rewards
    const Xp = require('../../../models/XP/xp.js');
    const Clanpoints = require('../../../models/Clan/clanpoints.js');

    let xpDoc = await Xp.findOne({ userId: interaction.user.id });
    if (!xpDoc) xpDoc = new Xp({ userId: interaction.user.id });

    const xpEarned = completedQuest.rewards?.xp || 0;
    xpDoc.xp += xpEarned;
    xpDoc.lastUpdated = new Date();
    await xpDoc.save();

    let clanpointsDoc = await Clanpoints.findOne({ userId: interaction.user.id });
    if (!clanpointsDoc) clanpointsDoc = new Clanpoints({ userId: interaction.user.id });

    const goldEarned = completedQuest.rewards?.gold || 0;
    clanpointsDoc.balance += goldEarned;
    await clanpointsDoc.save();

    // Send reward message
    let rewardMessage = 'No rewards';
    if (completedQuest.rewards) {
    const rewards = [];
    if (goldEarned) rewards.push(`${goldEarned}${emojis.heavenlyorbs} Karmic Jade`);
    if (xpEarned) rewards.push(`${xpEarned} XP`);
    rewardMessage = rewards.join(', ') || 'No rewards';
    }

    await interaction.reply({ 
    content: `🏆 You have completed **${completedQuest.name}**!\n\nRewards: ${rewardMessage}`,
    ephemeral: true 
    });
  },

  // CANCEL QUEST handler
  async handleCancelQuest(interaction) {
    const questIndex = parseInt(interaction.customId.split('_')[1]);
    const settings = await ExpeditionSettings.findOne({ userId: interaction.user.id });
  
    if (!settings || !settings.activeQuests || !settings.activeQuests[questIndex]) {
      return this.sendErrorResponse(interaction, 'Quest not found.');
    }
  
    const quest = settings.activeQuests[questIndex];
    
    // Move to abandoned quests with required fields only
    if (!settings.abandonedQuests) settings.abandonedQuests = [];
    settings.abandonedQuests.push({
      questId: quest.id,
      QuestAuthor: quest.QuestAuthor || 'System',
      area: quest.area || 'Unknown',
      name: quest.name,
      questId: quest.questId,
      description: quest.description,
      objectives: quest.objectives || [],
      rewards: quest.rewards || {},
      abandonedAt: new Date(),
      status: 'Abandoned'
    });
  
    // Remove from active
    settings.activeQuests.splice(questIndex, 1);
  
    // Update stats
    if (!settings.questStats) {
      settings.questStats = {
        totalCompleted: 0,
        totalFailed: 0,
        totalAbandoned: 0,
        totalXPEarned: 0,
        totalGoldEarned: 0
      };
    }
    settings.questStats.totalAbandoned += 1;
  
    await settings.save();
  
    await interaction.reply({ 
      content: `❌ You have abandoned the quest **${quest.name}**.`,
      ephemeral: true 
    });
  },
  

  // PAGINATION HANDLER (for myquests command)
  async handlePageChange(interaction) {
    // This would integrate with your myquests command
    // Implementation depends on how you want to handle pagination
    await interaction.deferUpdate();
    // ... pagination logic here
  },

  // QUEST EMBED GENERATOR (shared between view and active)
  createQuestEmbed(quest, isActive) {
    const embed = new EmbedBuilder()
      .setTitle(`${isActive ? 'Active Quest: ' : 'Quest: '}${quest.name}`)
      .setColor(isActive ? COLORS.SUCCESS : COLORS.DIFFICULTY[quest.difficulty] || COLORS.INFO)
      .setDescription(quest.description || '*No description available*');

    // Status and time for active quests
    if (isActive) {
      embed.addFields({
        name: 'Status',
        value: `**${quest.status}**\nStarted: <t:${Math.floor(quest.startedAt.getTime() / 1000)}:R>`,
        inline: true
      });
    }

    // Difficulty and duration
    embed.addFields({
      name: 'Details',
      value: [
        `**Area:** ${quest.area || 'Unknown'}`,
        `**Quest Owner:** ${quest.QuestAuthor || 'Unknown'}`,
        `**Difficulty:** ${quest.difficulty || 'Medium'}`,
        `**Duration:** ${quest.duration || 'Varies'}`
      ].join('\n'),
      inline: true
    });

    // Objectives
    const objectivesText = quest.objectives?.length
      ? quest.objectives.map(obj => {
          const progress = isActive 
            ? `(${obj.currentCount}/${obj.targetCount})` 
            : `(target: ${obj.targetCount})`;
          return `- ${obj.description} ${progress}`;
        }).join('\n')
      : 'No specific objectives';

    embed.addFields({
      name: 'Objectives',
      value: objectivesText,
      inline: false
    });

    // Rewards
    const rewardsText = this.formatRewards(quest.rewards);
    embed.addFields({
      name: 'Rewards',
      value: rewardsText || 'None',
      inline: false
    });

    // Footer based on state
    embed.setFooter({ 
      text: isActive 
        ? 'Complete the objectives to finish this quest!' 
        : 'Click Accept to start this quest.' 
    });

    return embed;
  },

  // IMPROVED REWARD FORMATTER
  formatRewards(rewards) {
    if (!rewards || Object.keys(rewards).length === 0) return null;
    
    const parts = [];
    if (rewards.gold) parts.push(` ${rewards.gold}${emojis.heavenlyorbs} Karmic Jade `);
    if (rewards.xp) parts.push(`${rewards.xp} XP`);
    if (rewards.reputation) parts.push(`🏅 ${rewards.reputation} reputation`);
    if (rewards.items?.length > 0) {
      parts.push(...rewards.items.map(item => 
        `📦 ${item.quantity}x ${item.itemId}`
      ));
    }
    
    return parts.join('\n');
  },

  // Utility functions
  sendErrorResponse(interaction, message) {
    return interaction.reply({
      content: `❌ ${message}`,
      ephemeral: true
    });
  },

  sendWarningResponse(interaction, message) {
    return interaction.reply({
      content: `⚠️ ${message}`,
      ephemeral: true
    });
  },

  sendSuccessResponse(interaction, message) {
    return interaction.reply({
      content: `✅ ${message}`,
      ephemeral: true
    });
  }
};