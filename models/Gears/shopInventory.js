const mongoose = require('mongoose');

const gearItemSchema = new mongoose.Schema({ // Reusable schema for gear items
  name: { type: String, required: true },
  slot: { type: String, required: true },
  rarity: { type: String, required: true },
  price: { type: Number, required: true },
  set: { type: String },
  bonuses: { type: mongoose.Schema.Types.Mixed } // Use Mixed for flexible bonus structure
});

const shopInventorySchema = new mongoose.Schema({
  shopId: { type: String, required: true, unique: true, default: 'global_shop' }, // Unique ID for the global shop
  items: [gearItemSchema], // Array of gear items in the shop
  lastUpdated: { type: Date, default: Date.now } // Optional: Track last update time
});

const ShopInventory = mongoose.model('ShopInventory', shopInventorySchema);
module.exports = ShopInventory;