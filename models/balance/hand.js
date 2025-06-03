const mongoose = require('mongoose');

const handSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  balance: { type: Number, default: 0 },
});

// ✅ Index on balance for fast sorting
handSchema.index({ balance: -1 }); //

const Hand = mongoose.models.Hand || mongoose.model('Hand', handSchema);
module.exports = Hand;
