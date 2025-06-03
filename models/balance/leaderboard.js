// models/balance/leaderboard.js
const mongoose = require('mongoose');

const leaderboardSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  username: { type: String }, // Optional: cache username for display
  blackjackWins: { type: Number, default: 0 },
  totalWinnings: { type: Number, default: 0 },
  biggestWin: { type: Number, default: 0 },
  handsPlayed: { type: Number, default: 0 }
});

module.exports = mongoose.model('Leaderboard', leaderboardSchema);