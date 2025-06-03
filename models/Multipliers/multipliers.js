const mongoose = require('mongoose');

// Define the schema for multipliers
const multipliersSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true }, // User's Discord ID
  cooldownReduction: { type: Number, default: 1.0 }, // Cooldown reduction (e.g., 0.8 means 20% faster)
  jackpotBoost: { type: Number, default: 0 }, // Jackpot boost (percentage increase, e.g., 20 means 20%)
  lootMultiplier: { type: Number, default: 1.0 }, // Loot multiplier (e.g., 2 means double loot)
  lossProtection: { type: Number, default: 1.0 }, // Loss protection (e.g., 1 means no protection, 0.5 means 50% protection)
  xpMultiplier: { type: Number, default: 1.0 }, // XP multiplier (e.g., 1.12 means 12% increase in XP)
  lootupgradeLevel: { type: Number, default: 0 }, // Starts at 0, can go up to 10
  xpupgradeLevel: { type: Number, default: 0 }, // Starts at 0, can go up to 10
  shopupgradeLevel: { type: Number, default: 0 }, // Starts at 0, can go up to 10
  clanupgradeLevel: { type: Number, default: 0 }, // Starts at 0, can go up to 10
  discountupgradeLevel: { type: Number, default: 0 }, // Starts at 0, can go up to 10
  mastUpgradeLevel: { type: Number, default: 0 }, // Starts at 0, can go up to 5
  reelUpgradeLevel: { type: Number, default: 0 }, // Starts at 0, can go up to 5
  lineUpgradeLevel: { type: Number, default: 0 }, // Starts at 0, can go up to 5
  gripUpgradeLevel: { type: Number, default: 0 }, // Starts at 0, can go up to 5
});

// Create and export the model
const Multipliers = mongoose.model('Multipliers', multipliersSchema);
module.exports = Multipliers;
