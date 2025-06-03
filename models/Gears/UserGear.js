const mongoose = require('mongoose');

// Reuse the same gear item structure
const gearItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slot: { type: String, required: true },
  rarity: { type: String, required: true },
  price: { type: Number, required: true },
  set: { type: String },
  bonuses: { type: mongoose.Schema.Types.Mixed },
  acquiredAt: { type: Date, default: Date.now } // Track when user obtained it
});

// Stores gear items for each user
const userGearSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true }, // Discord user ID
  gear: [gearItemSchema], // All items user owns
  lastModified: { type: Date, default: Date.now }
});

const UserGear = mongoose.model('UserGear', userGearSchema);
module.exports = UserGear;
