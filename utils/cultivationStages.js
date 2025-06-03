// Karmic Cultivation Stages (Flavor-Enhanced)
const cultivationStages = [
  {
    name: "Karma-Bhāra",
    title: "Burdened Mortal",
    level: 1,
    description: "A soul untouched by karmic theft, yet ripe for corruption."
  },
  {
    name: "Yīn Chán",
    title: "Cicada of Stolen Fate",
    level: 2,
    description: "Whispers of borrowed karma cling to your shadow."
  },
  {
    name: "Preta-Gati",
    title: "Hunger Unending",
    level: 3,
    description: "You devour the karmic remnants of the dying."
  },
  {
    name: "Māyā-Jāla",
    title: "Weaver of Ill-Fate",
    level: 4,
    description: "Reality bends as you knot false destinies."
  },
  {
    name: "Durgati-Parivarta",
    title: "Inversion of Suffering",
    level: 5,
    description: "Misfortune becomes your weapon; pain, your currency."
  },
  {
    name: "Naraka-Dvāra",
    title: "Herald of the Damned",
    level: 6,
    description: "The gates of Naraka creak open at your command."
  },
  {
    name: "Kālāgni",
    title: "Time's Pyre",
    level: 7,
    description: "You burn lifetimes—yours and others’—for fleeting power."
  },
  {
    name: "Adharma-Avatāra",
    title: "Avatar of Unrighteousness",
    level: 8,
    description: "The cosmos recoils at your blasphemous existence."
  },
  {
    name: "Asamkhya-Duḥkha",
    title: "Infinite Agony",
    level: 9,
    description: "You are the crucible where all suffering pools."
  },
  {
    name: "Māra-Rājya",
    title: "Usurper of Māra",
    level: 10,
    description: "Even the King of Illusion kneels before your debt."
  },
  {
    name: "Avīci-Cakra",
    title: "Wheel of Avīci",
    level: 11,
    description: "Your soul grinds the damned into karmic fuel."
  },
  {
    name: "Yama-Dharma",
    title: "False Judge of Hell",
    level: 12,
    description: "You decree punishments the heavens themselves fear."
  },
  {
    name: "Tathāgata-Droha",
    title: "Betrayer of Enlightenment",
    level: 13,
    description: "Nirvana was within reach—you spat upon it."
  },
  {
    name: "Samsara-Bhūmi",
    title: "Samsara's Despoiler",
    level: 14,
    description: "The wheel of rebirth cracks under your weight."
  },
  {
    name: "Moksha-Vimokṣa",
    title: "Liberation's Thief",
    level: 15,
    description: "You steal the enlightenment of others to stall your own demise."
  },
  {
    name: "Ananta-Agati",
    title: "Endless Path",
    level: 16,
    description: "You are no longer a cultivator—you are the corruption."
  }
];
exports.cultivationStages = cultivationStages;

function getStageIndexByRealm(currentRealm) {
  return cultivationStages.findIndex(stage => stage.name === currentRealm);
}
exports.getStageIndexByRealm = getStageIndexByRealm;

/**
 * Calculate minimum karmic debt required to maintain a cultivation realm
 * Based on the exponential growth formula: 1000 * Math.pow(4, stageIndex)
 * @param {string} realmName - Name of the cultivation realm
 * @returns {number} Minimum karmic debt required for that realm
 */
function getMinimumDebtForRealm(realmName) {
  const stageIndex = getStageIndexByRealm(realmName);
  if (stageIndex === -1) {
    return 0; // Unknown realm, return 0 as fallback
  }
  
  // Use the same calculation as in stages.js: 1000 * Math.pow(4, stageIndex)
  return Math.floor(1000 * Math.pow(4, stageIndex));
}
exports.getMinimumDebtForRealm = getMinimumDebtForRealm;

