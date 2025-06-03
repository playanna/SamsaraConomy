const { EmbedBuilder } = require('discord.js');
const { generateNormalTexts, generateJackpotTexts } = require('./embedhandlers/embedhelpers.js');
const { REALMS } = require('../../data/realms');

const DEFAULT_REALM = {
  name: 'Mortal Plains (凡尘)',
  image: 'https://i.ibb.co/mnT2LZF/WANEELLA-pixel-art.gif',
  danger: 'Mortal Grade',
};

const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

module.exports = async function runExtraSuccessLogic({ userId, successData, isJackpot, inventory, settings }) {
  const debt = inventory.totalKarmicDebt || 0;
  const realmData = REALMS[settings.realm] || DEFAULT_REALM;

  // Skip unnecessary processing if no embed will be returned
  if (!isJackpot && Math.random() > 0.20) return null;

  const flavorTexts = isJackpot
    ? generateJackpotTexts(realmData.name)
    : generateNormalTexts(realmData.name);

  const selectedText = getRandom(flavorTexts).replace(/\{realm\}/g, realmData.name);

  return new EmbedBuilder()
    .setDescription(`⚠ **Karmic Debt**: \`${debt}\`\n\n${selectedText}`)
    .setColor(0x880808);
};
