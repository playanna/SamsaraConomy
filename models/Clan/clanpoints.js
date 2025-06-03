const mongoose = require('mongoose');

const clanpointsSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    balance: { type: Number, default: 0 },
    blackjackStreak: { type: Number, default: 0 }, // NEW - tracks consecutive wins
    lastPlayed: { type: Date, default: Date.now } // NEW - for cooldowns if needed
});

// ✅ Check if the model already exists before defining it
const Clanpoints = mongoose.models.Clanpoints || mongoose.model('Clanpoints', clanpointsSchema);

module.exports = Clanpoints;
