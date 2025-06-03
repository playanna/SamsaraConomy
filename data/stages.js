// Dynamic XP calculation function — adjust as needed for your game's curve
function calculateXp(stageIndex) {
    return Math.floor(1000 * Math.pow(4, stageIndex)); // exponential growth
  }
  
  // Generate dynamic tribulation rate based on index
  function calculateTribulationRate(index) {
    const baseRate = 0.95;
    const rateStep = 0.06;
    return Math.max(0.001, parseFloat((baseRate - (index * rateStep)).toFixed(3)));
  }
  
  // Stage names in order
  const stageNames = [
    "Karma-Bhāra", "Yīn Chán", "Preta-Gati", "Māyā-Jāla", "Durgati-Parivarta",
    "Naraka-Dvāra", "Kālāgni", "Adharma-Avatāra", "Asamkhya-Duḥkha", "Māra-Rājya",
    "Avīci-Cakra", "Yama-Dharma", "Tathāgata-Droha", "Samsara-Bhūmi",
    "Moksha-Vimokṣa", "Ananta-Agati"
  ];
  
  // Dynamically generate the stage data
  const stageData = stageNames.map((name, index) => ({
    name,
    xpRequired: calculateXp(index),
    tribulationRate: calculateTribulationRate(index)
  }));
  
  const tribulationFlavors = {
    success: [
      "The heavens tremble as you shatter your karmic chains!",
      "Your dao heart withstands the celestial judgment!",
      "A golden lotus blooms beneath your feet as you ascend!"
    ],
    failure: [
      "Karmic backlash ravages your meridians!",
      "The underworld pulls at your soul, denying your ascent!",
      "Heavenly lightning scorches your cultivation base!"
    ]
  };
  
  function attemptBreakthrough(currentRealm, userXP, totalBoost) {
    const currentIndex = stageData.findIndex(s => s.name === currentRealm);
  
    if (currentIndex === -1) {
      return {
        allowed: false,
        error: true,
        reason: `The current realm "${currentRealm}" is invalid or corrupted.`
      };
    }
  
    if (currentIndex === stageData.length - 1) {
      return {
        allowed: false,
        error: true,
        reason: "You are already at the highest realm. No further ascension is possible."
      };
    }
  
    if (typeof userXP !== 'number' || userXP < 0 || !Number.isFinite(userXP)) {
      return {
        allowed: false,
        error: true,
        reason: "Invalid XP value detected. Please contact an administrator."
      };
    }
  
    const nextStage = stageData[currentIndex + 1];
    const currentStage = stageData[currentIndex];
  
    if (userXP < currentStage.xpRequired) {
      return {
        allowed: false,
        error: false,
        reason: `You need ${currentStage.xpRequired - userXP} more XP to attempt this tribulation.`
      };
    }
  
    let tribulationSuccessRate = Math.min(100, totalBoost + currentStage.tribulationRate);
    tribulationSuccessRate = Math.max(0, tribulationSuccessRate);
  
    const success = Math.random() < tribulationSuccessRate;
    const xpLost = success ? 0 : Math.floor((userXP - currentStage.xpRequired) * 0.5);
  
    return {
      allowed: true,
      success,
      error: false,
      nextStage: success ? nextStage.name : currentRealm,
      message: success
        ? tribulationFlavors.success[Math.floor(Math.random() * tribulationFlavors.success.length)]
        : tribulationFlavors.failure[Math.floor(Math.random() * tribulationFlavors.failure.length)],
      xpLost
    };
  }
  
  function generateKarmaBar(currentRealm, xp, emoji = '☯', emoji2 = '○') {
    const idx = stageData.findIndex(s => s.name === currentRealm);
    const currentStage = stageData[idx];
    const nextStage = stageData[idx + 1];
  
    if (idx === -1 || !currentStage) {
      return `**[Unknown Realm]**\n⚠ Realm not found.\n**${xp} Karma**`;
    }
  
    if (!nextStage) {
      return `**[${currentStage.name}]**\n` +
             `${emoji.repeat(15)} 100%\n` +
             `**${xp}/${currentStage.xpRequired}** Karma Weight`;
    }
  
    const minXP = idx === 0 ? 0 : stageData[idx - 1].xpRequired;
    const maxXP = currentStage.xpRequired;
  
    const stageProgress = Math.max(0, xp - minXP);
    const stageMax = maxXP - minXP;
    const percentage = Math.min(100, (stageProgress / stageMax) * 100);
    const percentageForShow = ((xp / currentStage.xpRequired) * 100).toFixed(2);
  
    if (percentageForShow > 100) {
      return `**[${currentStage.name}] → [${nextStage.name}]**\n` +
             `${emoji.repeat(15)} ${percentageForShow}%\nBreakthrough Imminent! **\`/breakthrough\`**\n` +
             `**${xp}/${currentStage.xpRequired}** Karma Weight`;
    }
  
    const filledUnits = Math.round((percentage / 100) * 15);
    const bar = emoji.repeat(filledUnits) + emoji2.repeat(15 - filledUnits);
  
    return `${bar}\n` +//`Stage: **[${currentStage.name}] → [${nextStage.name}]**\n` +
           `**${stageProgress}/${stageMax}** [${percentage.toFixed(1)}]%`;
           
  }

  function generateKarmaBar2(currentRealm, xp, emoji = '☯', emoji2 = '○') {
    const idx = stageData.findIndex(s => s.name === currentRealm);
    const currentStage = stageData[idx];
    const nextStage = stageData[idx + 1];
  
    if (idx === -1 || !currentStage) {
      return `**[Unknown Realm]**\n⚠ Realm not found.\n**${xp} Karma**`;
    }
  
    if (!nextStage) {
      return `**[${currentStage.name}]**\n` +
             `${emoji.repeat(15)} 100%\n` +
             `**${xp}/${currentStage.xpRequired}** Karma Weight`;
    }
  
    const minXP = idx === 0 ? 0 : stageData[idx - 1].xpRequired;
    const maxXP = currentStage.xpRequired;
  
    const stageProgress = Math.max(0, xp - minXP);
    const stageMax = maxXP - minXP;
    const percentage = Math.min(100, (stageProgress / stageMax) * 100);
    const percentageForShow = ((xp / currentStage.xpRequired) * 100).toFixed(2);
  
    if (percentageForShow > 100) {
      return `**[${currentStage.name}] → [${nextStage.name}]**\n` +
             `${emoji.repeat(15)} ${percentageForShow}%\nBreakthrough Imminent! **\`/breakthrough\`**\n` +
             `**${xp}/${currentStage.xpRequired}** Karma Weight`;
    }
  
    const filledUnits = Math.round((percentage / 100) * 15);
    const bar = emoji.repeat(filledUnits) + emoji2.repeat(15 - filledUnits);
  
    return `Stage: **[${currentStage.name}] → [${nextStage.name}]**\n` +
           `**${stageProgress}/${stageMax}** ${percentage.toFixed(1)}%`;
  }
  
  
  module.exports = { stageData, attemptBreakthrough, generateKarmaBar, generateKarmaBar2 };
  