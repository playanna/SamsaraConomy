// utils/cultivationUtils.js

function getProgressBar(percentage) {
    const barFull = '☯';
    const barEmpty = '○';
    const barLength = 10;
    const filledLength = Math.floor((percentage / 100) * barLength);
    return `**[${barFull.repeat(filledLength)}${barEmpty.repeat(barLength - filledLength)}]**`;
  }
  
  function getUpgradeCost(level) {
    const baseCost = 100;
    const multiplier = 100;
    return baseCost + multiplier * level ** 6;
  }

  function getclanUpgradeCost(level) {
    const baseCost = 1000;
    const multiplier = 100;
    return baseCost + multiplier * level ** 7;
  }
  
  function getCultivationRealm(level) {
    const realms = [
      'Mortal Flesh (凡躯)',
      'Qi Perception (感气期)',
      'Meridian Awakening (通脉期)',
      'Golden Core Formation (金丹期)',
      'Nascent Soul (元婴期)',
      'Divine Transformation (化神期)',
      'Void Tribulation (渡劫期)',
      'Half-Step Immortal (半步真仙)',
      'Earth Immortal (地仙)',
      'Heavenly Sovereign (天尊)',
    ];
    return realms[level] || 'Unranked';
  }
  
  function getRandomTrainingGroundsQuote() {
    const quotes = [
      '"The Dao is silent, but your meridians scream."',
      '"Ten thousand steps begin with one breath."',
      '"A butterfly dreams of Qi; a cultivator dreams of eternity."',
      '"To refine the body, first refine the mind."',
    ];
    return quotes[Math.floor(Math.random() * quotes.length)];
  }
  
  function getBreakthroughQuote(level) {
    const quotes = {
      1: 'Your pores open—you sense the Qi of ants crawling three miles away.',
      5: 'Your Golden Core pulses like a newborn sun!',
      9: 'The Void itself whispers secrets into your Nascent Soul...',
      10: 'ASCENSION! The Heavenly Dao acknowledges your supremacy!',
    };
    return quotes[level] || 'A ripple of power surges through your meridians.';
  }
  
  module.exports = {
    getProgressBar,
    getUpgradeCost,
    getclanUpgradeCost,
    getCultivationRealm,
    getRandomTrainingGroundsQuote,
    getBreakthroughQuote,
  };
  