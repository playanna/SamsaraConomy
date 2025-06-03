const Clan = require('../../models/Clan/clan');
const ExpeditionSettings = require('../../models/Multipliers/expeditionSetting');

function isValidTag(tag) {
  return /^[A-Z0-9]{3,5}$/.test(tag);
}

const clanService = {
  async createClan(userId, name, tag) {
    if (!name || !tag) {
      return { success: false, message: 'Both name and tag are required.' };
    }

    tag = tag.toUpperCase().trim();

    if (!isValidTag(tag)) {
      return {
        success: false,
        message: 'Clan tag must be 3–5 uppercase alphanumeric characters (A-Z, 0-9).',
      };
    }

    const existingClan = await Clan.findOne({
      $or: [{ name }, { tag }]
    });

    if (existingClan) {
      return {
        success: false,
        message: 'A clan with that name or tag already exists.',
      };
    }

    const alreadyInClan = await Clan.findOne({ 'members.userId': userId });
    if (alreadyInClan) {
      return {
        success: false,
        message: 'You are already a member of a clan. Leave it before creating a new one.',
      };
    }

    const clan = new Clan({
      name,
      tag,
      leaderId: userId,
      ownerId: userId,
      members: [{ userId, role: 'leader'}],
    });

    await clan.save();

    await ExpeditionSettings.updateOne(
      { userId },
      { clanTag: tag },
      { upsert: true }
    );

    return { success: true, clan };
  },

  async joinClan(userId, clanTag) {
    const clan = await Clan.findOne({ tag: clanTag.toUpperCase().trim() });
    if (!clan) throw new Error('Clan not found.');
  
    const isAlreadyMember = clan.isMember(userId);
    if (isAlreadyMember) throw new Error('You are already in this clan.');
  
    if (clan.members.length >= clan.upgrades.maxMembers) {
      throw new Error('Clan is full.');
    }
  
    let joinType = 'joined'; // default to direct join
  
    // Invite-only logic
    if (clan.settings?.inviteOnly && !clan.settings.autoAccept) {
      // Check if already requested
      if (clan.settings.joinRequests.includes(userId)) {
        throw new Error('You have already requested to join this clan.');
      }
      clan.addJoinRequest(userId);
      joinType = 'requested';
    } else {
      clan.addMember(userId, 'member');
      joinType = 'joined';
    }
  
    await clan.save();  
    return { clan, joinType };
  }
,  
  
  async leaveClan(userId) {
    const clan = await Clan.findOne({ 'members.userId': userId }).select('name tag leaderId members');
    if (!clan) throw new Error('You are not in a clan.');
  
    const { name, tag, _id } = clan;
    const isLeader = clan.leaderId === userId;
  
    // Remove the user from members list first
    clan.members = clan.members.filter(m => m.userId !== userId);
  
    if (clan.members.length === 0) {
      // After removal, no one is left — disband
      await Clan.deleteOne({ _id });
      return {
        success: true,
        message: 'Clan disbanded as no members remained.',
        disbanded: true,
        name,
        tag,
      };
    }
  
    if (isLeader) {
      // Promote a new leader
      const newLeader = clan.members.find(m => m.role === 'officer') || clan.members[0];
      if (!newLeader) {
        throw new Error('No suitable member found to promote as the new leader.');
      }
      newLeader.role = 'leader';
      clan.leaderId = newLeader.userId;
    }
  
    await clan.save();
  
    return {
      success: true,
      message: isLeader
        ? 'You have left the clan. A new leader has been promoted.'
        : 'You have left the clan.',
      disbanded: false,
      name,
      tag,
    };
  }
,  
  
  

  // clanService.js
async getClanByUser(userId) {
    const clan = await Clan.findOne({ 'members.userId': userId });

    if (!clan) {
      return {
        success: false,
        message: 'User is not in a clan.',
      };
    }
  
    return {
      success: true,
      clan,
    };
  },
  
};

module.exports = clanService;
