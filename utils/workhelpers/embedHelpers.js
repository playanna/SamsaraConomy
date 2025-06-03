const createBaseEmbed = require('../embed.js');
const { generateKarmaBar2 } = require('../../data/stages.js');
const { generateNormalTexts, generateJackpotTexts } = require('./embedhandlers/embedhelpers.js');
const { createEmojiMaps } = require('../../data/emojis.js');
const {emojis} = require('../../data/emojis.js');
const { REALMS, getRandomRealmImage } = require('../../data/realms');


const getRealmData = (key) => {
  const realm = REALMS[key];

  if (!realm) {
    return {
      name: 'Mortal Plains (凡尘)',
      image: 'https://i.ibb.co/mnT2LZF/WANEELLA-pixel-art.gif',
      danger: 'Mortal Grade'
    };
  }

  const { name, danger, images } = realm;
  const image = Array.isArray(images)
    ? images[Math.floor(Math.random() * images.length)] // pick one randomly
    : images; // fallback if it's already a single string

  return { name, danger, image };
};



// General emoji maps by type
const emojiMaps = createEmojiMaps();

const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];

function formatLootText(loots = {}) {
  const result = [];

  for (const [type, items] of Object.entries(loots)) {
    if (!items.length) continue;
    const group = new Map();

    for (let i = 0; i < items.length; i++) {
      const { baseName, rarity = 'common', quantity = 1, emoji = '🔮' } = items[i];
      const key = `${baseName}|||${emoji}`; // Use emoji instead of rarity for grouping
      group.set(key, (group.get(key) || 0) + quantity);
    }

    for (const [key, qty] of group) {
      const [name, emoji] = key.split('|||');
      result.push(`◈ +**${qty}** ${emoji} **${name}**`);
    }
  }

  return result.length ? result.join('\n') : 'No items obtained this time';
}


function createLossEmbed(interaction, { lostXp, lossCoins }, settings, outcome) {
  const realm = getRealmData(outcome.realm);
  const stories = [
    `While seeking enlightenment in ${realm.name}, you offended a wandering immortal and were struck down by their casual palm strike.`,
    `The ${realm.danger}-level beasts of ${realm.name} proved too much for your current cultivation.`,
    `A sudden qi deviation left you vulnerable to the dangers of ${realm.name}.`,
    `You triggered an ancient formation in ${realm.name} and were teleported to safety – barely alive.`,
  ];
  const story = stories[Math.floor(Math.random() * stories.length)];

  return createBaseEmbed({
    interaction,
    title: '☯️ Cultivation Setback',
    description: [
      story,
      '\n💢 **Karmic Consequences**:',
      `- **Lost ${lossCoins} Spirit Stones** (medical elixirs)`,
      `- **-${lostXp} Dao Comprehension** (meridians damaged)`,
      `- **Qi Deviation Count**: ${settings.misfortuneCount}`,
      '\n*"Even immortals face setbacks. Meditate and try again when your qi stabilizes."*'
    ].join('\n'),
    color: 0x8B0000,
    footer: {
      text: '「失败乃成功之母」\n"Failure is the mother of success"',
      iconURL: interaction.guild?.iconURL({ dynamic: true }) || null
    }
  });
}

function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function createSuccessEmbed({
  interaction,
  totalLootValue,
  xp,
  isJackpot,
  autoSell,
  realm
}, loots, settings, multipliers, xpData, sectrod, inventory, challengeInfo = null) {
  const karma = inventory.totalKarmicDebt || 0;
  const karmaBar = generateKarmaBar2(inventory.karmicRealms, karma);
  const realmData = getRealmData(settings.realm);
  const jackpotTexts = generateJackpotTexts(realmData.name);
  const normalTexts = generateNormalTexts(realmData.name);
  const image = await getRandomRealmImage(settings.realm) || realmData.image;

  const texts = isJackpot ? jackpotTexts : normalTexts;
  const flavorText = getRandom(texts).replace(/\{realm\}/g, realmData.name);

  const lootText = formatLootText(loots);
  let xpLine = `◈ +**${xp} Karmic Weight** (after a ×${xpData.totalxpmultiplier.toFixed(2)} multiplier)`;
  
  // Add streak bonus information if active
  if (challengeInfo && challengeInfo.streakBonus.active) {
    xpLine += ` ✨ **[${challengeInfo.streakBonus.multiplier.toFixed(2)}x Streak Bonus]**`;
  }

  const descriptionLines = [
    //`▸ ${flavorText}`,
    `▸ ☯ **Current Karmic Realm**: ${realmData.name} ◈ (${realmData.danger})`,
    '\n**Karmic Bounty**' + (isJackpot ? ' ⛧' : ''),
    xpLine,
    lootText,
    autoSell ? '\n▸ *"The Celestial Bazaar transmuted your findings into spiritual currency."*' : '',
    `\n` +
    karmaBar,
  ].filter(Boolean).join('\n');
  // Add challenge progress information
  let challengeText = '';
  if (challengeInfo) {
    const dailyProg = challengeInfo.dailyProgress;
    const weeklyProg = challengeInfo.weeklyProgress;
    
    // Only show incomplete challenges
    const progressLines = [];
    if (!dailyProg.completed) {
      progressLines.push(`⏳ Daily: ${dailyProg.current}/${dailyProg.goal} expeditions`);
    }
    if (!weeklyProg.completed) {
      progressLines.push(`⏳ Weekly: ${weeklyProg.current}/${weeklyProg.goal} expeditions`);
    }
    
    // Only show challenge progress section if there are incomplete challenges
    if (progressLines.length > 0) {
      challengeText = [
        '\n\n**Challenge Progress**',
        ...progressLines
      ].join('\n');
    }
      // Show streak information if active
    if (challengeInfo.streakBonus.active) {
      challengeText += `\n🔥 **Streak Bonuses**: Daily ${challengeInfo.streakBonus.dailyStreak}d | Weekly ${challengeInfo.streakBonus.weeklyStreak}w`;
    }
    
    // Show auto-claimed rewards notifications
    const autoClaimedNotifications = [];
    if (challengeInfo.autoClaimedRewards.daily) {
      const reward = challengeInfo.autoClaimedRewards.daily.reward;
      autoClaimedNotifications.push(`🎁 **Daily Reward Auto-Claimed!** ☯ ${reward.xp} XP, ${emojis.heavenlyorbs} ${reward.gold} Karmic Jades${reward.streakBonus ? ` (${challengeInfo.autoClaimedRewards.daily.streak}d streak bonus!)` : ''}`);
    }
    if (challengeInfo.autoClaimedRewards.weekly) {
      const reward = challengeInfo.autoClaimedRewards.weekly.reward;
      autoClaimedNotifications.push(`🏆 **Weekly Reward Auto-Claimed!** ☯ ${reward.xp} XP, ${emojis.heavenlyorbs} ${reward.gold} Karmic Jades${reward.streakBonus ? ` (${challengeInfo.autoClaimedRewards.weekly.streak}w streak bonus!)` : ''}`);
    }
    
    if (autoClaimedNotifications.length > 0) {
      challengeText += `\n\n${autoClaimedNotifications.join('\n')}`;
    }
    
    // Show available rewards (this should be empty now with auto-claiming, but kept for safety)
    const availableRewards = [];
    if (dailyProg.rewardAvailable) availableRewards.push('Daily Reward');
    if (weeklyProg.rewardAvailable) availableRewards.push('Weekly Reward');
    
    if (availableRewards.length > 0) {
      challengeText += `\n🎁 **Claimable**: ${availableRewards.join(', ')}`;
    }
  }

  console.log(`Karmic image for realm ${settings.realm}: ${image}`);
  return createBaseEmbed({
    interaction,
    //title: isJackpot ? '业劫大祸 • Karmic Cataclysm' : '◈ KARMIC DESCENT ◈',
    description: descriptionLines + challengeText,
    color: isJackpot ? 0xFFD700 : 0xAD8B73,
    footer: {
      text: isJackpot
        ? '「冤孽缠身」\n"Burdened by Wretched Karma"'
        : `Karmic Tide: ${settings.winStreak} | Record: ${settings.longestWinStreak}`,
      iconURL: interaction.guild?.iconURL({ dynamic: true }) || null
    },
    //thumbnail: realmData.image,
    image: image,
    //timestamp: new Date(),
  }); 
}


function getRealmColor(tier) {
  const colors = [0x2ecc71, 0x3498db, 0xe74c3c, 0x9b59b6, 0x1abc9c, 0xe67e22, 0x2c3e50];
  return colors[tier - 1] || 0x95a5a6;
}

module.exports = {
  createLossEmbed,
  createSuccessEmbed
};
