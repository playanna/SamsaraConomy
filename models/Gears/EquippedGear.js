const mongoose = require('mongoose');

const equippedItemSchema = new mongoose.Schema({
  slot: { type: String, required: true },
  item: {
    name: String,
    rarity: String,
    set: String,
    price: Number,
    bonuses: mongoose.Schema.Types.Mixed,
    acquiredAt: Date
  }
}, { _id: false });

const equippedGearSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  gear: [equippedItemSchema], // One item per slot
  lastUpdated: { type: Date, default: Date.now }
});

const EquippedGear = mongoose.models.EquippedGear || mongoose.model('EquippedGear', equippedGearSchema);
module.exports = EquippedGear;
