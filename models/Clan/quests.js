const mongoose = require('mongoose');

const questItemSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  QuestAuthor: { type: String, required: true },
  area: String,
  name: String,
  description: String,
  difficulty: String,
  duration: String,
  objectives: [
    {
      description: String,
      targetCount: Number,
      itemId: String
    }
  ],
  rewards: {
    gold: Number,
    xp: Number
  }
}, { _id: false }); // Prevent auto _id generation for subdocs

const questContainerSchema = new mongoose.Schema({
  _id: { type: String, default: 'global_quest_list' }, // fixed ID for global access
  quests: [questItemSchema],
  lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('QuestContainer', questContainerSchema);
