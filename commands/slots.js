const Clanpoints = require('../models/Clan/clanpoints');
const Treasury = require('../models/balance/treasury');
const Loss = require('../models/balance/loss');
const {emojis} = require('../data/emojis');
const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'bet',
  aliases: ['slot', 'gamble', 'slots', 'spin'],
  description: 'Play the Nine Heavens Slot Machine and test your luck!',

  
  async execute(message, args) {
    const userId = message.author.id;
    const slotEmoji = emojis.heavenlyorbs;
    const userDisplayName = message.member?.nickname || message.author.username;

    // Enhanced loading animation with progress bar
    const loadingSteps = [
      "Accessing your spiritual storage...",
      "Consulting the Karmic Records...",
      "Balancing your Chi...",
      "Preparing the Wheel of Fortune..."
    ];
    
    const loadingEmbed = new EmbedBuilder()
      .setTitle(`🎰 ${loadingSteps[0]}`)
      .setColor(0xFFFF00)
      .setDescription(`${createProgressBar(0, 4)}`)
      .setFooter({ text: 'Nine Heavens Slot Machine | Initializing...' });
    
    const loadingMessage = await message.channel.send({ embeds: [loadingEmbed] });

    // Animate the loading process
    for (let i = 1; i <= 3; i++) {
      await new Promise(resolve => setTimeout(resolve, 800));
      loadingEmbed
        .setTitle(`🎰 ${loadingSteps[i]}`)
        .setDescription(`${createProgressBar(i, 4)}`);
      await loadingMessage.edit({ embeds: [loadingEmbed] });
    }

    let clanpoints = await Clanpoints.findOne({ userId }) || new Clanpoints({ userId });
    let balance = clanpoints.balance;

    // Bet input parsing with better validation
    const betInput = args[0];
    if (!betInput) {
      await loadingMessage.delete();
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('Incorrect Usage')
            .setDescription('**Usage:** `-bet <amount>`\n**Examples:**\n`-bet 100` - Bet 100 jades\n`-bet half` - Bet half your balance\n`-bet all` - Go all in!')
            .addFields(
              { name: 'Available Shortcuts', value: '`k` = thousand\n`m` = million\n`b` = billion', inline: true },
              { name: 'Current Balance', value: `${balance} Karmic jades`, inline: true }
            )
        ]
      });
    }

    let bet = 0;
    const cleanInput = betInput.trim().toLowerCase();

    // More robust bet parsing
    try {
      if (cleanInput === 'all') {
        bet = balance;
      } else if (cleanInput === 'half') {
        bet = Math.floor(balance / 2);
      } else if (/^\d+k$/.test(cleanInput)) {
        bet = parseInt(cleanInput.slice(0, -1)) * 1000;
      } else if (/^\d+m$/.test(cleanInput)) {
        bet = parseInt(cleanInput.slice(0, -1)) * 1000000;
      } else if (/^\d+b$/.test(cleanInput)) {
        bet = parseInt(cleanInput.slice(0, -1)) * 1000000000;
      } else {
        bet = parseInt(cleanInput.replace(/,/g, ''));
      }
    } catch (error) {
      await loadingMessage.delete();
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('Invalid Bet Amount')
            .setDescription('Please enter a valid number or one of these options:\n`all`, `half`, `100k`, `5m`, `1b`')
        ]
      });
    }

    if (!bet || isNaN(bet) || bet < 1) {
      await loadingMessage.delete();
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('Minimum Bet Required')
            .setDescription('You must bet at least 1 Karmic Stone to play.')
        ]
      });
    }
    
    if (bet > balance) {
      await loadingMessage.delete();
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('Insufficient Balance')
            .setDescription(`You only have **${balance}** Karmic jades.\nYou cannot bet **${bet}**.`)
            .setFooter({ text: 'Try a smaller amount or earn more through cultivation' })
        ]
      });
    }

    // Deduct bet from user balance immediately
    clanpoints.balance -= bet;
    await clanpoints.save();

    // Slot machine emojis pool with adjusted probabilities
    const slotEmojisPool = [
      { emoji: '🥇', weight: 10 },  // Common
      { emoji: '💎', weight: 8 },   // Uncommon
      { emoji: '💯', weight: 6 },   // Rare
      { emoji: '💵', weight: 4 },   // Epic
      { emoji: '💰', weight: 2 },   // Legendary
      { emoji: '🍀', weight: 1 },   // Mythical (new)
      { emoji: '☯', weight: 1 }    // Divine (new)
    ];

    // Weighted random selection
    function getWeightedRandom() {
      const totalWeight = slotEmojisPool.reduce((sum, item) => sum + item.weight, 0);
      let random = Math.random() * totalWeight;
      
      for (const item of slotEmojisPool) {
        if (random < item.weight) return item.emoji;
        random -= item.weight;
      }
      
      return slotEmojisPool[0].emoji; // fallback
    }

    const choice1 = getWeightedRandom();
    const choice2 = getWeightedRandom();
    const choice3 = getWeightedRandom();

    // Enhanced multiplier system with more combinations
    const combinations = {
      // Basic wins
      '💎💎💎': { multiplier: 5, name: 'Gemstone Trinity', color: 0x00AAFF, sound: '✨', bonus: 0 },
      '💯💯💯': { multiplier: 7, name: 'Perfect Harmony', color: 0xAA00FF, sound: '🌟', bonus: 0 },
      '💵💵💵': { multiplier: 12, name: 'Wealth Incarnate', color: 0xFFD700, sound: '🎇', bonus: 0 },
      '💰💰💰': { multiplier: 20, name: 'Cosmic Fortune', color: 0xFF00FF, sound: '🌈', bonus: 0 },
      '🍀🍀🍀': { multiplier: 25, name: "Destiny's Favor", color: 0x00FF00, sound: '🎊', bonus: 1000 },
      '☯☯☯': { multiplier: 50, name: 'Universal Balance', color: 0xFFFFFF, sound: '🌌', bonus: 5000 },
      
      // Partial wins
      '💎💎X': { multiplier: 2, name: 'Gemstone Pair', color: 0x55FF55, sound: '🔔', bonus: 0 },
      '💯💯X': { multiplier: 3, name: 'Harmonic Pair', color: 0x55FF55, sound: '🔔', bonus: 0 },
      '💵💵X': { multiplier: 4, name: 'Wealthy Pair', color: 0x55FF55, sound: '🔔', bonus: 0 },
      '💰💰X': { multiplier: 5, name: 'Fortune Pair', color: 0x55FF55, sound: '🔔', bonus: 0 },
      
      // Special combinations
      '☯🍀💰': { multiplier: 15, name: 'Spiritual Abundance', color: 0x99FF99, sound: '🎶', bonus: 1000 },
      '🍀☯💎': { multiplier: 15, name: 'Enlightened Path', color: 0x99FF99, sound: '🎶', bonus: 1000 },
      '💎💰💵': { multiplier: 8, name: 'Treasure Trove', color: 0x99FF99, sound: '🎶', bonus: 0 }
    };

    // Check for winning combination
    const spinResult = `${choice1}${choice2}${choice3}`;
    const partialResult = `${choice1}${choice2}X`;
    
    let result = combinations[spinResult] || combinations[partialResult] || null;
    let winMessage = 'You fell into gambling deviation <:kekdoge:738405491687948308>';
    let color = 0xFF0000; // red for lose
    let soundEffect = '💢';
    let multiplier = 1;
    let bonus = 0;

    if (result) {
      multiplier = result.multiplier;
      winMessage = `${result.name}! ${slotEmoji}\nProfit: **${bet * multiplier}** Karmic jades`;
      color = result.color;
      soundEffect = result.sound;
      bonus = result.bonus || 0;
    }

    // If user wins
    if (multiplier > 1) {
      const payout = bet * multiplier + bonus;
      clanpoints.balance += payout + bet; // pay back bet + profit + bonus
      await clanpoints.save();
      
      // Special effect for jackpots
      if (multiplier >= 20) {
        winMessage += `\n\n**BONUS:** ${bonus} Karmic jades for achieving ${result.name}!`;
      }
    } else {
      // Loss goes to treasury and records loss
      await Treasury.findOneAndUpdate(
        { name: 'SECT_TREASURY' },
        { $inc: { balance: bet } },
        { new: true, upsert: true }
      );
      await Loss.findOneAndUpdate(
        { userId },
        { $inc: { totalLoss: bet } },
        { upsert: true }
      );
    }

    // Delete loading message and start animation
    await loadingMessage.delete();

    // Enhanced spinning animation with more steps
    const spinEmojis = ['🥇', '💎', '💯', '💵', '💰', '🍀', '☯'];
    const embed = new EmbedBuilder()
      .setTitle(`🎰 Nine Heavens Slot Machine | ${userDisplayName}`)
      .setColor(0xFFFF00) // Yellow during spin
      .setDescription(createSlotDisplay(['?', '?', '?'], `Spinning the Wheel of Karma...`))
      .setFooter({ text: `Bet: ${formatNumber(bet)} Karmic jades | Balance: ${formatNumber(balance)}` });

    const sentMessage = await message.channel.send({ embeds: [embed] });

    // Dramatic spinning animation with accelerating speed
    const spinDurations = [600, 500, 400, 300, 250, 200, 150];
    for (let i = 0; i < spinDurations.length; i++) {
      await new Promise(resolve => setTimeout(resolve, spinDurations[i]));
      const randomEmojis = Array(3).fill().map(() => spinEmojis[Math.floor(Math.random() * spinEmojis.length)]);
      embed.setDescription(createSlotDisplay(randomEmojis, `Spinning... ${['⏳', '⌛', '⏳'][i % 3]}`));
      await sentMessage.edit({ embeds: [embed] });
    }

    // Reveal emojis one by one with dramatic pauses
    await new Promise(resolve => setTimeout(resolve, 800));
    embed.setDescription(createSlotDisplay([choice1, '?', '?'], 'The first sign reveals itself...'));
    await sentMessage.edit({ embeds: [embed] });

    await new Promise(resolve => setTimeout(resolve, 1200));
    embed.setDescription(createSlotDisplay([choice1, choice2, '?'], 'Destiny takes shape...'));
    await sentMessage.edit({ embeds: [embed] });

    // Final dramatic pause before reveal
    await new Promise(resolve => setTimeout(resolve, 1800));
    
    // Final reveal with enhanced display
    embed
      .setDescription(createSlotDisplay([choice1, choice2, choice3], `${soundEffect} ${winMessage}`))
      .setColor(color)
      .addFields(
        {
          name: 'New Balance',
          value: `${formatNumber(clanpoints.balance)} Karmic jades ${slotEmoji}`,
          inline: true
        },
        {
          name: multiplier > 1 ? 'Winnings' : 'Loss',
          value: multiplier > 1 
            ? `+${formatNumber(bet * multiplier + bonus)}` 
            : `-${formatNumber(bet)}`,
          inline: true
        }
      )
      .setFooter({ 
        text: `Initial Bet: ${formatNumber(bet)} Karmic jades | ${new Date().toLocaleString()}`,
        iconURL: message.author.displayAvatarURL()
      });

    if (bonus > 0) {
      embed.addFields({
        name: '✨ Special Bonus',
        value: `+${formatNumber(bonus)} for rare achievement!`,
        inline: false
      });
    }

    await sentMessage.edit({ embeds: [embed] });

    // Enhanced reaction system
    try {
      if (multiplier >= 20) {
        await sentMessage.react('🌌');
        await sentMessage.react('🎆');
      } else if (multiplier > 1) {
        await sentMessage.react('🎉');
        await sentMessage.react(slotEmoji);
      } else {
        await sentMessage.react('😢');
        await sentMessage.react('💸');
      }
    } catch (error) {
      console.log('Failed to add reactions:', error);
    }
  }
};

// Helper functions
function createProgressBar(progress, total) {
  const filled = '█';
  const empty = '░';
  const ratio = progress / total;
  const filledCount = Math.round(10 * ratio);
  return `${filled.repeat(filledCount)}${empty.repeat(10 - filledCount)} ${Math.round(ratio * 100)}%`;
}

function createSlotDisplay(emojis, message) {
  return `**
╔═════════

 ${emojis[0]}  ║   ${emojis[1]}  ║   ${emojis[2]}  ║

╚═════════
${message}**`;
}

function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}