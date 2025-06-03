// utils/usernamesCache.js

// In-memory username cache with optional TTL support
const usernameCache = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

function setUsernameCache(userId, name) {
  usernameCache.set(userId, { name, timestamp: Date.now() });
}

function getCachedUsername(userId) {
  const entry = usernameCache.get(userId);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    usernameCache.delete(userId);
    return null;
  }
  return entry.name;
}

async function getUsername(client, guild, userId) {
  const cached = getCachedUsername(userId);
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

    setUsernameCache(userId, name);
    return name;
  } catch {
    return 'Unknown User';
  }
}

module.exports = getUsername;
