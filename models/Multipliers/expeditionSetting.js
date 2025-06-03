const mongoose = require('mongoose');

// Sub-schema for quest objectives
const questObjectiveSchema = new mongoose.Schema({
  description: { type: String, required: true },
  targetCount: { type: Number, required: true },
  currentCount: { type: Number, default: 0 },
  completed: { type: Boolean, default: false },
  itemId: { type: String } // Optional: Used if the objective requires specific items; can be left undefined
}, { _id: false });

// Sub-schema for reward items
const rewardItemSchema = new mongoose.Schema({
  itemId: { type: String, required: true },
  quantity: { type: Number, default: 1 }
}, { _id: false });

// Sub-schema for quest rewards
const questRewardSchema = new mongoose.Schema({
  gold: { type: Number, default: 0 },
  xp: { type: Number, default: 0 },
  items: [rewardItemSchema],
  reputation: { type: Number, default: 0 } // Optional reputation gains
}, { _id: false });

// Sub-schema for quests (used in active, completed, and failed quests)
const questSchema = new mongoose.Schema({
  questId: { type: String, required: true }, // Reference to quest template
  QuestAuthor: { type: String, required: true }, // Author of the quest
  area: String,
  name: { type: String, required: true },
  description: { type: String, default: 'No description available.' },
  startedAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
  status: { 
    type: String, 
    enum: ['In Progress', 'Completed', 'Failed', 'Abandoned'],
    default: 'In Progress'
  },
  objectives: [questObjectiveSchema],
  rewards: questRewardSchema,
  difficulty: { 
    type: String, 
    enum: ['Easy', 'Medium', 'Hard', 'Epic'], 
    default: 'Medium' 
  },
  duration: { type: String, default: 'Varies' }, // Estimated duration
  realm: { type: String, default: 'verdant' } // Realm where quest was taken
}, { _id: false });

// Main schema
const expeditionSettingSchema = new mongoose.Schema({
  userId: { 
    type: String, 
    required: true, 
    unique: true, 
  },
  
  // Existing expedition fields
  autosell: { type: Boolean, default: false },
  expeditions: { type: Number, default: 0 },
  longestWinStreak: { type: Number, default: 0 },
  misfortunes: { type: Number, default: 0 },
  sellMultiplier: { type: Number, default: 1.0 },
  traderXP: { type: Number, default: 0 },
  winStreak: { type: Number, default: 0 },
  realm: { type: String, default: 'verdant' },
  realmTier: { type: Number, default: 0 },
  
  // Enhanced quest tracking
  activeQuests: [questSchema],
  completedQuests: [questSchema],
  failedQuests: [questSchema],
  abandonedQuests: [questSchema],
  
  // Quest limits and stats
  maxActiveQuests: { 
    type: Number, 
    default: 3,
    min: 1,
    max: 10 
  },
  questStats: {
    totalCompleted: { type: Number, default: 0 },
    totalFailed: { type: Number, default: 0 },
    totalAbandoned: { type: Number, default: 0 },
    totalXPEarned: { type: Number, default: 0 },
    totalGoldEarned: { type: Number, default: 0 }
  },  
  // Quest cooldowns
  lastQuestCompletedAt: { type: Date },
  dailyQuestReset: { type: Date }, // For daily quest tracking
  
  // Daily and Weekly Challenge System
  challenges: {
    daily: {
      expeditionsToday: { type: Number, default: 0 },
      expeditionGoal: { type: Number, default: 5 }, // Daily expedition goal
      lastDailyReset: { type: Date, default: Date.now },
      dailyRewardClaimed: { type: Boolean, default: false },
      dailyStreak: { type: Number, default: 0 }, // Consecutive days of completing daily goals
      longestDailyStreak: { type: Number, default: 0 }
    },
    weekly: {
      expeditionsThisWeek: { type: Number, default: 0 },
      expeditionGoal: { type: Number, default: 30 }, // Weekly expedition goal
      lastWeeklyReset: { type: Date, default: Date.now },
      weeklyRewardClaimed: { type: Boolean, default: false },
      weeklyStreak: { type: Number, default: 0 }, // Consecutive weeks of completing weekly goals
      longestWeeklyStreak: { type: Number, default: 0 }
    },
    bonusRewards: {
      totalBonusXP: { type: Number, default: 0 },
      totalBonusGold: { type: Number, default: 0 },
      totalLootMultiplierBonus: { type: Number, default: 0 },
      streakBonusActive: { type: Boolean, default: false },
      streakMultiplier: { type: Number, default: 1.0 } // Additional multiplier for streaks
    }
  },
  
  // Monster slaying log
  monsterSlayingLog: {
    totalMonstersSlain: { type: Number, default: 0 },
    slainByRealm: {
      verdant: { type: Number, default: 0 },
      moon: { type: Number, default: 0 },
      crimson: { type: Number, default: 0 },
      abyssal: { type: Number, default: 0 },
      chains: { type: Number, default: 0 },
      hells: { type: Number, default: 0 },
      summit: { type: Number, default: 0 }
    },
    slainByMonster: [{
      monsterId: { type: String, required: true },
      monsterName: { type: String, required: true },
      realm: { type: String, required: true },
      level: { type: Number, required: true },
      element: { type: String },
      killCount: { type: Number, default: 1 },
      firstSlainAt: { type: Date, default: Date.now },
      lastSlainAt: { type: Date, default: Date.now },
      totalXpGained: { type: Number, default: 0 },
      totalCoinsGained: { type: Number, default: 0 },
      itemsObtained: [{
        itemName: { type: String },
        quantity: { type: Number, default: 1 },
        obtainedAt: { type: Date, default: Date.now }
      }]
    }],
    achievements: [{
      name: { type: String },
      description: { type: String },
      unlockedAt: { type: Date, default: Date.now },
      category: { type: String } // e.g., 'kill_count', 'realm_mastery', 'legendary_slayer'
    }],
    statistics: {
      longestKillStreak: { type: Number, default: 0 },
      currentKillStreak: { type: Number, default: 0 },
      favoriteRealm: { type: String, default: 'verdant' },
      strongestMonsterSlain: {
        monsterId: { type: String },
        monsterName: { type: String },
        level: { type: Number },
        slainAt: { type: Date }
      },
      weeklyKills: { type: Number, default: 0 },
      weeklyResetDate: { type: Date, default: Date.now }
    }
  }
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

// Indexes for better performance
// expeditionSettingSchema.index({ userId: 1 });
// Removed index on 'activeQuests.status' due to potential inefficiency with large arrays.
// Consider using $elemMatch in queries for better performance if needed.
// expeditionSettingSchema.index({ 'completedQuests.completedAt': 1 });

// The ExpeditionSettings model represents user-specific expedition settings and quest tracking data.
// It includes fields for tracking active, completed, failed, and abandoned quests, as well as user stats and cooldowns.
const ExpeditionSettings = mongoose.model('ExpeditionSettings', expeditionSettingSchema);
module.exports = ExpeditionSettings;