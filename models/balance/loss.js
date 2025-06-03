const mongoose = require('mongoose');

const lossSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  totalLoss: { type: Number, default: 0 },
});

// ✅ Index on totalLoss for fast sorting
lossSchema.index({ totalLoss: -1 });

const Loss = mongoose.models.Loss || mongoose.model('Loss', lossSchema);
module.exports = Loss;
