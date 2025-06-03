const mongoose = require('mongoose');

const treasurySchema = new mongoose.Schema({
name: { type: String, required: true, unique: true },
balance: { type: Number, default: 0 },
GamblingGod: { type: String, default: '0' },
GamblingGodLastupdate: { type: Date, default: Date.now },
});

const Treasury = mongoose.models.Treasury || mongoose.model('Treasury', treasurySchema);
module.exports = Treasury;