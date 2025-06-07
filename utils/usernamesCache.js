// utils/usernamesCache.js

// Updated to use unified cache manager
const { cacheManager } = require('./cache/cacheManager');

async function getUsername(client, guild, userId) {
  // Check cache first using the USERNAMES category
  const cached = cacheManager.get('USERNAMES', userId);
  if (cached) return cached;

  try {
    const user = await client.users.fetch(userId);
    let name = user.username;
    try {
      const member = await guild.members.fetch(userId);
      name = member.nickname || user.globalName || user.username;
    } catch {
      name = user.globalName || user.username;
    }

    // Cache the username using the unified cache manager
    cacheManager.set('USERNAMES', userId, name);
    return name;
  } catch {
    return 'Unknown User';
  }
}

module.exports = getUsername;
