const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'blackjack',
  aliases: ['bj'],
  async execute(message, args) {    const Hand = require('../models/balance/hand');
    const Clanpoints = require('../models/Clan/clanpoints');
    const Treasury = require('../models/balance/treasury');
    const Loss = require('../models/balance/loss');
    const Leaderboard = require('../models/balance/leaderboard');
    const {emojis} = require('../data/emojis');
    const userId = message.author.id;
    const amountInput = args[0];

    if (!amountInput) return message.channel.send('Usage: -blackjack <amount>. Example: -blackjack 500');

    let clanpoints = await Clanpoints.findOne({ userId }) || new Clanpoints({ userId });
    let balance = clanpoints.balance;

    // Card system
    const suits = ['S', 'H', 'D', 'C']; // Spades, Hearts, Diamonds, Clubs
    const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    
    const getCardImage = (card) => {
      return `https://deckofcardsapi.com/static/img/${card.rank}${card.suit}.png`;
    };

    const getCardValue = (rank) => {
      if (['J', 'Q', 'K'].includes(rank)) return 10;
      if (rank === 'A') return 11;
      return parseInt(rank);
    };

    // Initialize and shuffle deck
    let deck = [];
    const initializeDeck = () => {
      deck = [];
      for (let suit of suits) {
        for (let rank of ranks) {
          deck.push({ suit, rank, value: getCardValue(rank) });
        }
      }
      // Shuffle the deck
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
    };

    const drawCard = () => {
      if (deck.length < 10) initializeDeck(); // Reshuffle if running low
      return deck.pop();
    };

    const getTotal = (hand) => {
      let total = hand.reduce((a, b) => a + b.value, 0);
      // Handle aces
      const aces = hand.filter(card => card.rank === 'A').length;
      for (let i = 0; i < aces && total > 21; i++) {
        total -= 10;
      }
      return total;
    };

    const formatHand = (hand) => hand.map(card => `${card.rank}${card.suit}`).join(' ');

    // Game rules and betting
    const minBet = 1;
    const maxBet = Infinity; 
    
    // Parse amount
    let amount = 0;
    const cleanInput = amountInput.trim().toLowerCase();

    if (cleanInput === 'all' || cleanInput === 'max') amount = Math.min(balance, maxBet);
    else if (cleanInput === 'half') amount = Math.floor(Math.min(balance / 2, maxBet));
    else if (cleanInput === 'quarter') amount = Math.floor(Math.min(balance / 4, maxBet));
    else if (/^\d+\s*k$/i.test(cleanInput)) amount = Math.min(parseInt(cleanInput) * 1000, maxBet);
    else if (/^\d+\s*m$/i.test(cleanInput)) amount = Math.min(parseInt(cleanInput) * 1_000_000, maxBet);
    else if (cleanInput.endsWith('%')) amount = Math.floor(Math.min(balance * (parseInt(cleanInput) / 100), maxBet));
    else amount = parseInt(cleanInput) || 0;

    if (!amount || amount < minBet) return message.channel.send(`You must bet at least ${minBet} Karmic Jade.`);
    if (amount > maxBet) return message.channel.send(`Maximum bet is ${maxBet} Karmic Jades.`);
    if (balance < amount) return message.channel.send('Not enough balance.');

    // Initialize game
    initializeDeck();
    let playerHand = [drawCard(), drawCard()];
    let dealerHand = [drawCard(), drawCard()];
    let streak = clanpoints.blackjackStreak || 0;
    let sideBet = null;

    // Game functions
    const isBlackjack = (hand) => hand.length === 2 && getTotal(hand) === 21;
    const isSoftHand = (hand) => hand.some(card => card.rank === 'A') && getTotal(hand) <= 21;

    const getEmbed = (showDealer = false, footer = '', showDealerCard = false) => {
      const embed = new EmbedBuilder()
        .setTitle('🂡 Blackjack')
        .addFields(
          { 
            name: 'Your Hand', 
            value: `${formatHand(playerHand)} = **${getTotal(playerHand)}**`, 
            inline: true 
          },
          { 
            name: "Dealer's Hand", 
            value: showDealer ? 
              `${formatHand(dealerHand)} = **${getTotal(dealerHand)}**` : 
              `${dealerHand[0].rank}${dealerHand[0].suit} + ?`, 
            inline: true 
          }
        )
        .setFooter({ text: footer || `Bet: ${amount} Karmic Jades | Streak: ${streak} wins` })
        .setColor(0x2ECC71);

      if (showDealerCard) {
        embed.setThumbnail(getCardImage(dealerHand[0]));
      } else if (playerHand.length === 2) {
        embed.setThumbnail(getCardImage(playerHand[0]));
      }

      return embed;
    };

    // Check for blackjack right away
    if (isBlackjack(playerHand)) {
      if (!isBlackjack(dealerHand)) {
        // Player has blackjack, dealer doesn't - pay 3:2
        const winnings = Math.floor(amount * 2.5);
        clanpoints.balance += winnings;
        clanpoints.blackjackStreak = (streak + 1) || 1;
        await clanpoints.save();

        await Leaderboard.findOneAndUpdate(
          { userId },
          { $inc: { blackjackWins: 1, totalWinnings: winnings } },
          { upsert: true }
        );

        const blackjackEmbed = new EmbedBuilder()
          .setTitle('★ Blackjack! ★')
          .setDescription(`You got a blackjack and won ${winnings} Karmic Jades!`)
          .addFields(
            { name: 'Your Hand', value: `${formatHand(playerHand)} = **21**`, inline: true },
            { name: "Dealer's Hand", value: `${formatHand(dealerHand)} = **${getTotal(dealerHand)}**`, inline: true },
            { name: 'Your Balance', value: `${clanpoints.balance} Karmic Jades ${emojis.heavenlyorbs}` }
          )
          .setColor(0xFFD700)
          .setThumbnail(getCardImage(playerHand[0]))
          .setImage('https://media.giphy.com/media/l0HlQ7LRalCw5l7Fe/giphy.gif');

        return message.channel.send({ embeds: [blackjackEmbed] });
      } else {
        // Both have blackjack - push
        const pushEmbed = new EmbedBuilder()
          .setTitle('Push - Both have Blackjack!')
          .addFields(
            { name: 'Your Hand', value: `${formatHand(playerHand)} = **21**`, inline: true },
            { name: "Dealer's Hand", value: `${formatHand(dealerHand)} = **21**`, inline: true },
            { name: 'Your Balance', value: `${clanpoints.balance} Karmic Jades ${emojis.heavenlyorbs}` }
          )
          .setColor(0xFFFF00)
          .setThumbnail(getCardImage(playerHand[0]));

        return message.channel.send({ embeds: [pushEmbed] });
      }
    }

    // Check for insurance if dealer shows an Ace
    if (dealerHand[0].rank === 'A' && playerHand.length === 2) {
      const insuranceRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('insurance_yes').setLabel('Take Insurance (½ bet)').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('insurance_no').setLabel('Decline').setStyle(ButtonStyle.Danger)
      );
      
      const insuranceMsg = await message.channel.send({ 
        embeds: [getEmbed(false, 'Dealer shows an Ace. Would you like insurance?', true)
          .setDescription('Insurance pays 2:1 if dealer has blackjack')], 
        components: [insuranceRow] 
      });
      
      const insuranceCollector = insuranceMsg.createMessageComponentCollector({
        time: 15000, // 15 seconds to respond
        filter: i => i.user.id === userId && (i.customId === 'insurance_yes' || i.customId === 'insurance_no')
      });
      
      let insuranceTaken = false;
      
      insuranceCollector.on('collect', async i => {
        if (i.customId === 'insurance_yes') {
          if (clanpoints.balance < Math.floor(amount / 2)) {
            return i.reply({ content: "Not enough balance for insurance!", ephemeral: true });
          }
          insuranceTaken = true;
          sideBet = { type: 'insurance', amount: Math.floor(amount / 2) };
        }
        insuranceCollector.stop();
        await i.update({ components: [] });
      });
      
      insuranceCollector.on('end', async () => {
        if (insuranceTaken) {
          clanpoints.balance -= sideBet.amount;
          await clanpoints.save();
        }
      });
      
      await new Promise(resolve => insuranceCollector.on('end', resolve));
    }

    // Main game buttons
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('hit').setLabel('Hit').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('stand').setLabel('Stand').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('double').setLabel('Double Down').setStyle(ButtonStyle.Success)
        .setDisabled(playerHand.length > 2),
      new ButtonBuilder().setCustomId('split').setLabel('Split').setStyle(ButtonStyle.Danger)
        .setDisabled(playerHand.length > 2 || playerHand[0].rank !== playerHand[1].rank)
    );

    const msg = await message.channel.send({ embeds: [getEmbed()], components: [row] });

    const collector = msg.createMessageComponentCollector({
      time: 60000,
      filter: i => i.user.id === userId
    });

    let finished = false;

    collector.on('collect', async i => {
      if (i.customId === 'hit') {
        playerHand.push(drawCard());

        const total = getTotal(playerHand);
        if (total > 21) {
          finished = true;
          collector.stop('busted');
          return i.update({ 
            embeds: [getEmbed(true, 'You busted!')], 
            components: [] 
          });
        } else {
          // Disable double and split after hitting
          const newRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('hit').setLabel('Hit').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('stand').setLabel('Stand').setStyle(ButtonStyle.Secondary)
          );
          return i.update({ 
            embeds: [getEmbed()], 
            components: [newRow] 
          });
        }
      }

      if (i.customId === 'stand') {
        finished = true;
        collector.stop('stood');
        return i.update({ 
          embeds: [getEmbed(true, 'You stood.')], 
          components: [] 
        });
      }

      if (i.customId === 'double') {
        if (clanpoints.balance < amount * 2) {
          return i.reply({ content: "Not enough balance to double down!", ephemeral: true });
        }
        amount *= 2;
        playerHand.push(drawCard());
        finished = true;
        collector.stop('doubled');
        return i.update({ 
          embeds: [getEmbed(true, `You doubled down! New bet: ${amount}`)], 
          components: [] 
        });
      }

      if (i.customId === 'split') {
        // For simplicity, we'll just disable the button in this implementation
        // Full split implementation would require tracking multiple hands
        return i.reply({ content: "Split functionality coming soon!", ephemeral: true });
      }
    });

    collector.on('end', async (_, reason) => {
      if (!finished && reason !== 'busted' && reason !== 'stood' && reason !== 'doubled') {
        return msg.edit({ 
          components: [], 
          embeds: [getEmbed(true, '⏱️ Time ran out.')] 
        });
      }

      const playerTotal = getTotal(playerHand);
      let dealerTotal = getTotal(dealerHand);

      // Dealer draws according to casino rules (hit soft 17)
      while (dealerTotal < 17 || (dealerTotal === 17 && isSoftHand(dealerHand))) {
        dealerHand.push(drawCard());
        dealerTotal = getTotal(dealerHand);
      }

      let result = '';
      let win = false;
      let push = false;
      let blackjackWin = false;

      // Check insurance first
      if (sideBet?.type === 'insurance' && isBlackjack(dealerHand)) {
        const insuranceWin = sideBet.amount * 3; // 2:1 payout
        clanpoints.balance += insuranceWin;
        result += `Insurance paid out ${insuranceWin} Karmic Jades! `;
      }

      if (playerTotal > 21) {
        result += 'You busted!';
      } else if (dealerTotal > 21) {
        result += 'Dealer busted! You win!';
        win = true;
      } else if (playerTotal > dealerTotal) {
        result += 'You win!';
        win = true;
      } else if (playerTotal === dealerTotal) {
        result += "It's a tie!";
        push = true;
      } else {
        result += 'Dealer wins!';
      }

      // Calculate winnings
      let winnings = 0;
      let outcomeColor = 0xFF0000; // Red for loss

      if (win) {
        winnings = amount;
        // Check for blackjack win (not already handled earlier)
        if (playerHand.length === 2 && playerTotal === 21) {
          winnings = Math.floor(amount * 1.5); // 3:2 payout
          blackjackWin = true;
        }
        clanpoints.balance += winnings;
        streak++;
        clanpoints.blackjackStreak = streak;
        outcomeColor = 0x00FF00; // Green for win
        
        await Leaderboard.findOneAndUpdate(
          { userId },
          { $inc: { blackjackWins: 1, totalWinnings: winnings } },
          { upsert: true }
        );
      } else if (!push) {
        clanpoints.balance -= amount;
        streak = 0;
        clanpoints.blackjackStreak = 0;
        
        await Treasury.findOneAndUpdate(
          { name: 'SECT_TREASURY' },
          { $inc: { balance: amount } },
          { new: true, upsert: true }
        );

        await Loss.findOneAndUpdate(
          { userId },
          { $inc: { totalLoss: amount } },
          { upsert: true }
        );
      } else {
        outcomeColor = 0xFFFF00; // Yellow for push
      }

      await clanpoints.save();

      // Final embed
      const finalEmbed = new EmbedBuilder()
        .setTitle(blackjackWin ? '★ Blackjack! ★' : '🃏 Final Blackjack Result')
        .addFields(
          { name: 'Your Hand', value: `${formatHand(playerHand)} = **${playerTotal}**`, inline: true },
          { name: "Dealer's Hand", value: `${formatHand(dealerHand)} = **${dealerTotal}**`, inline: true },
          { name: 'Result', value: result },
          { name: 'Your Balance', value: `${clanpoints.balance} Karmic Jades ${emojis.heavenlyorbs}` }
        )
        .setColor(outcomeColor);

      if (win) {
        if (streak >= 3) {
          finalEmbed.addFields({ 
            name: 'Streak Bonus', 
            value: `${streak} wins in a row!` 
          });
        }
        finalEmbed
          .setThumbnail(getCardImage(playerHand[0]))
          .setImage('https://media.giphy.com/media/l0HlQ7LRalCw5l7Fe/giphy.gif');
      } else if (!push) {
        finalEmbed
          .setThumbnail(getCardImage(dealerHand[0]))
          .setImage('https://media.giphy.com/media/VbnUQpnihPSIgIXuZv/giphy.gif');
      } else {
        finalEmbed
          .setThumbnail(getCardImage(playerHand[0]))
          .setImage('https://media.giphy.com/media/3o7TKSjRrfIPjeiVyY/giphy.gif');
      }

      await msg.edit({ embeds: [finalEmbed], components: [] });
    });
  }
};