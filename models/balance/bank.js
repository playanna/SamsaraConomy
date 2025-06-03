// models/Bank.js
const mongoose = require('mongoose');

const bankSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  balance: { type: Number, default: 0 }, // User's bank balance
});

const Bank = mongoose.model('Bank', bankSchema);

module.exports = Bank;
