const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  role: { type: String, enum: ['leader', 'officer', 'member'], default: 'member' },
  joinedAt: { type: Date, default: Date.now },
});

const clanSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  tag: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    minlength: 3,
    maxlength: 5,
    match: /^[A-Z0-9]+$/,
  },
  description: { type: String, default: '' },
  realm: { type: String, default: 'mortal' },

  ownerId: { type: String, required: true }, 
  leaderId: { type: String, required: false},  // Renamed to leaderId
  members: { type: [memberSchema], default: [] },

  clanXP: { type: Number, default: 0 },
  coins: { type: Number, default: 0 },
  level: { type: Number, default: 1 },

  upgrades: {
    jackpotchance: { type: Number, default: 0 }, //upgrade level for jackpot chance
    loot: { type: Number, default: 0 }, //upgrade level for loot
    xpBoost: { type: Number, default: 0 },
    sellBoost: { type: Number, default: 0}, 
    maxMembers: { type: Number, default: 10 }, // Default max members
  },

  permissions: {
    invite: { type: [String], default: ['leader', 'officer'] },
    kick: { type: [String], default: ['leader', 'officer'] },
    promote: { type: [String], default: ['leader'] },
    manageSettings: { type: [String], default: ['leader'] },
  },

  allies: { type: [String], default: [] }, // Clan IDs
  enemies: { type: [String], default: [] },

  logs: {
    type: [{
      type: { type: String },
      userId: String,
      timestamp: { type: Date, default: Date.now },
      detail: mongoose.Schema.Types.Mixed,
    }],
    default: []
  },

  settings: {
    inviteOnly: { type: Boolean, default: true },
    autoAccept: { type: Boolean, default: false },
    joinRequests: { type: [String], default: [] },
  },

  createdAt: { type: Date, default: Date.now },
});

// Instance methods for Clan model
clanSchema.methods = {
  // Check if the user is a member of the clan
  isMember(userId) {
    return this.members.some(member => member.userId === userId);
  },

  // Add a member to the clan
  addMember(userId, role = 'member') {
    if (!this.isMember(userId)) {
      this.members.push({ userId, role });
      // If the user is a leader, update leaderId as well
      if (role === 'leader') {
        this.leaderId = userId;
      }
    }
  },

  // Promote a member
  promoteMember(userId) {
    const member = this.members.find(m => m.userId === userId);
    if (member) {
      if (member.role === 'member') member.role = 'officer';
      else if (member.role === 'officer') member.role = 'leader';

      // If the promoted member is a leader, update leaderId
      if (member.role === 'leader') {
        this.leaderId = userId;
      }
      return true;
    }
    return false;
  },

  // Demote a member
  demoteMember(userId) {
    const member = this.members.find(m => m.userId === userId);
    if (member && member.role !== 'member') {
      member.role = 'member';
      // If the demoted member was the leader, reset the leaderId
      if (this.leaderId === userId) {
        // Promote another member to leader if available
        const newLeader = this.members.find(m => m.role === 'officer');
        if (newLeader) {
          this.leaderId = newLeader.userId;
          newLeader.role = 'leader';
        } else {
          // If no officer exists, set leaderId to null (or set the first member as leader)
          this.leaderId = this.members.length > 0 ? this.members[0].userId : null;
        }
      }
      return true;
    }
    return false;
  },

  // Kick a member from the clan
  kickMember(userId) {
    const memberIndex = this.members.findIndex(m => m.userId === userId);
    if (memberIndex !== -1) {
      this.members.splice(memberIndex, 1);
      // If the kicked member was the leader, reset the leaderId
      if (this.leaderId === userId) {
        const newLeader = this.members.find(m => m.role === 'officer');
        if (newLeader) {
          this.leaderId = newLeader.userId;
          newLeader.role = 'leader';
        } else {
          // If no officer exists, set leaderId to null (or set the first member as leader)
          this.leaderId = this.members.length > 0 ? this.members[0].userId : null;
        }
      }
      return true;
    }
    return false;
  },

  // Add a join request for the clan
  addJoinRequest(userId) {
    if (!this.settings.joinRequests.includes(userId)) {
      this.settings.joinRequests.push(userId);
    }
  },

  // Accept a join request and add the user to the clan
  acceptJoinRequest(userId) {
    if (this.settings.joinRequests.includes(userId)) {
      this.settings.joinRequests = this.settings.joinRequests.filter(id => id !== userId);
      this.addMember(userId, 'member');
      return true;
    }
    return false;
  },

  // Reject a join request
  rejectJoinRequest(userId) {
    if (this.settings.joinRequests.includes(userId)) {
      this.settings.joinRequests = this.settings.joinRequests.filter(id => id !== userId);
      return true;
    }
    return false;
  },

  // Add an ally
  addAlly(clanId) {
    if (!this.allies.includes(clanId)) {
      this.allies.push(clanId);
    }
  },

  // Remove an ally
  removeAlly(clanId) {
    this.allies = this.allies.filter(id => id !== clanId);
  },

  // Add an enemy
  addEnemy(clanId) {
    if (!this.enemies.includes(clanId)) {
      this.enemies.push(clanId);
    }
  },

  // Remove an enemy
  removeEnemy(clanId) {
    this.enemies = this.enemies.filter(id => id !== clanId);
  },
};

module.exports = mongoose.model('Clan', clanSchema);
