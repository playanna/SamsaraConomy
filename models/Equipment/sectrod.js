// File: models/Equipment/sectrod.js
// Description: Mongoose model for the SectRod, including its schema and methods.

const mongoose = require('mongoose');
const { ELEMENTS, COMPONENTS } = require('../../utils/Equipments/constants');
const methods = require('../../utils/Equipments/methods');

const AugmentSlotSchema = new mongoose.Schema({
  slotType: { type: String, enum: ['element', 'reel', 'line', 'handle', 'misc', 'sigil', 'focus'], required: true },
  augmentId: { type: String },
  augmentData: mongoose.Schema.Types.Mixed,
  installedAt: { type: Date, default: Date.now },
  durability: { type: Number, min: 0, max: 100, default: 100 }
});

const SectRodSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  baseElement: { type: String, enum: ELEMENTS, default: 'None' },
  currentElement: { type: String, enum: ELEMENTS, default: function () { return this.baseElement; } },
  tier: { type: Number, default: 1, min: 1, max: 10 },
  xp: { type: Number, default: 0 },

  components: {
    mast: { type: String, enum: COMPONENTS.mast, default: 'Bamboo' }, // affects xp rate and durability
    line: { type: String, enum: COMPONENTS.line, default: 'Hemp' },  // affects catch rate and cooldown
    reel: { type: String, enum: COMPONENTS.reel, default: 'Basic' }, // affects cooldown and precision
    grip: { type: String, enum: COMPONENTS.grip, default: 'Leather' } // affects luck and resonance
  },

  augments: [AugmentSlotSchema],
  augmentCapacity: { type: Number, default: 3, min: 1, max: 8 },

  stats: {
    catchRate: { type: Number, default: 1.0 }, // Catch rate multiplier
    cooldown: { type: Number, default: 60 }, // Cooldown in seconds
    durability: { type: Number, default: 100 }, // Durability percentage
    precision: { type: Number, default: 0 },  // material catch percentage
    luck: { type: Number, default: 0 },   // jackpotboost
    resonance: { type: Number, default: 0 }  // soul catch percentage
  },

  specializations: {
    path: { type: String, enum: ['None', 'Angler', 'Hunter', 'Scholar', 'Explorer', 'Mystic'], default: 'None' },
    xp: { type: Number, default: 0 },
    perks: [String]
  },

  unlockedRealms: [String],
  cosmetics: {
    colorScheme: String,
    asciiTheme: { type: String, default: 'ClassicDOS' },
    engravings: [String],
    glowIntensity: { type: Number, default: 0, min: 0, max: 10 }
  },
  milestones: {
    catches: { type: Number, default: 0 },
    rareCatches: { type: Number, default: 0 },
    realmsDiscovered: { type: Number, default: 0 },
    uniqueAugmentsUsed: { type: Number, default: 0 }
  },
  achievements: [{
    name: String,
    unlockedAt: { type: Date, default: Date.now },
    rewardClaimed: { type: Boolean, default: false }
  }],
  settings: {
    autoRepair: { type: Boolean, default: false },
    elementDisplayMode: { type: String, enum: ['full', 'simple', 'icon'], default: 'full' },
    dangerWarnings: { type: Boolean, default: true }
  },
  favorites: {
    augments: [String],
    realms: [String]
  },
  upgradeHistory: [{
    action: String,
    changedFrom: mongoose.Schema.Types.Mixed,
    changedTo: mongoose.Schema.Types.Mixed,
    timestamp: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now },
  lastRepaired: Date,
  lastUpgraded: Date
});

// Attach methods
Object.entries(methods).forEach(([name, fn]) => {
  SectRodSchema.method(name, fn);
});

module.exports = mongoose.model('SectRod', SectRodSchema);

