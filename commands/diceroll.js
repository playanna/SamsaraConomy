const { EmbedBuilder } = require('discord.js');
const Clanpoints = require('../models/Clan/clanpoints');
const Treasury = require('../models/balance/treasury');
const Loss = require('../models/balance/loss');

module.exports = {
  name: 'dice',
  aliases: ['roll'],
  description: 'Roll a dice and bet on the outcome (1-6) with 6x payout',

  async execute(message, args) {
    const CURRENCY = 'Karmic Stones';
    const CURRENCY_EMOJI = '<:karmicstone:757981408143868034>';
    const WIN_MULTIPLIER = 6;
    const DICE_FACES = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣'];
    const DICE_VALUES = [1, 2, 3, 4, 5, 6];

    const loadingEmbed = new EmbedBuilder()
      .setTitle('🎲 Preparing the Samsara Dice...')
      .setColor(0xFFFF00)
      .setDescription('Shaking the cosmic dice...')
      .setFooter({ text: 'The wheel of karma turns...' });

    const loadingMessage = await message.channel.send({ embeds: [loadingEmbed] });

    if (args.length !== 2) {
      await loadingMessage.delete();
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('🎲 Samsara Dice - How to Play')
            .setColor(0xFFA500)
            .setDescription(`**Usage:** \`-dice <bet> <guess (1-6)>\`\nExample: \`-dice 100 3\`\n\n**Payout:** ${WIN_MULTIPLIER}x if correct`)
            .addFields(
              { name: 'Bet Shortcuts', value: '`100k` = 100,000\n`1m` = 1,000,000\n`all` = entire balance\n`half` = half balance', inline: true },
              { name: 'Odds', value: '1 in 6 chance\nHouse edge: 16.67%', inline: true }
            )
        ]
      });
    }

    const betInput = args[0].toLowerCase();
    let betAmount = 0;

    let userBalance = await Clanpoints.findOne({ userId: message.author.id });
    if (!userBalance) {
      userBalance = new Clanpoints({ userId: message.author.id });
    }

    try {
      if (betInput === 'all') {
        betAmount = userBalance.balance;
      } else if (betInput === 'half') {
        betAmount = Math.floor(userBalance.balance / 2);
      } else if (/^\d+k$/.test(betInput)) {
        betAmount = parseInt(betInput) * 1000;
      } else if (/^\d+m$/.test(betInput)) {
        betAmount = parseInt(betInput) * 1000000;
      } else if (/^\d+b$/.test(betInput)) {
        betAmount = parseInt(betInput) * 1000000000;
      } else {
        betAmount = parseInt(betInput.replace(/,/g, ''));
      }
    } catch {
      await loadingMessage.delete();
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('Invalid Bet Amount')
            .setDescription('Please use a valid number or one of:\n`all`, `half`, `100k`, `5m`, `1b`')
        ]
      });
    }

    if (isNaN(betAmount) || betAmount < 1) {
      await loadingMessage.delete();
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('Minimum Bet Required')
            .setDescription(`You must bet at least 1 ${CURRENCY}`)
        ]
      });
    }

    if (betAmount > userBalance.balance) {
      await loadingMessage.delete();
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('Insufficient Balance')
            .setDescription(`You only have **${userBalance.balance.toLocaleString()}** ${CURRENCY}`)
        ]
      });
    }

    const guess = parseInt(args[1]);
    if (isNaN(guess)) {
      await loadingMessage.delete();
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('Invalid Guess')
            .setDescription('Your guess must be a number between 1 and 6')
        ]
      });
    }

    if (guess < 1 || guess > 6) {
      await loadingMessage.delete();
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('Guess Out of Range')
            .setDescription('You must guess a number between 1 and 6')
        ]
      });
    }

    // Deduct bet
    userBalance.balance -= betAmount;
    await userBalance.save();

    // Dice animation
    for (let i = 0; i < 5; i++) {
      await new Promise(resolve => setTimeout(resolve, 300 + (i * 100)));
      const randomFace = DICE_FACES[Math.floor(Math.random() * DICE_FACES.length)];
      loadingEmbed.setDescription(`Shaking the cosmic dice...\n\n${randomFace}`);
      await loadingMessage.edit({ embeds: [loadingEmbed] });
    }

    const roll = DICE_VALUES[Math.floor(Math.random() * DICE_VALUES.length)];
    const win = roll === guess;

    if (win) {
      const winnings = betAmount * WIN_MULTIPLIER;
      userBalance.balance += winnings + betAmount;
      await userBalance.save();
    } else {
      await Treasury.findOneAndUpdate(
        { name: 'SECT_TREASURY' },
        { $inc: { balance: betAmount } },
        { upsert: true, new: true }
      );

      await Loss.findOneAndUpdate(
        { userId: message.author.id },
        { $inc: { totalLoss: betAmount } },
        { upsert: true }
      );
    }

    const resultEmbed = new EmbedBuilder()
      .setTitle(`🎲 Samsara Dice - ${win ? 'WINNER!' : 'Better luck next time!'}`)
      .setColor(win ? 0x00FF00 : 0xFF0000)
      .setDescription(
        `**Your guess:** ${DICE_FACES[guess - 1]} (${guess})\n` +
        `**Dice roll:** ${DICE_FACES[roll - 1]} (${roll})\n\n` +
        `${win ? 
          `🎉 **You won ${(betAmount * WIN_MULTIPLIER).toLocaleString()} ${CURRENCY}** (${WIN_MULTIPLIER}x)` : 
          `💸 You lost ${betAmount.toLocaleString()} ${CURRENCY}`}`
      )
      .addFields(
        { 
          name: 'New Balance', 
          value: `${userBalance.balance.toLocaleString()} ${CURRENCY} ${CURRENCY_EMOJI}`,
          inline: true 
        },
        { 
          name: 'Stats', 
          value: `Bet: ${betAmount.toLocaleString()}\nPayout: ${WIN_MULTIPLIER}x`,
          inline: true 
        }
      )
      .setFooter({ 
        text: `Dice rolled by ${message.author.globalName}`, 
        iconURL: message.author.displayAvatarURL() 
      });

    if (!win) {
      resultEmbed.addFields({
        name: 'You Were Close!',
        value: `You were ${Math.abs(guess - roll)} number${Math.abs(guess - roll) === 1 ? '' : 's'} away`,
        inline: false
      });
    }

    await loadingMessage.edit({ embeds: [resultEmbed] });

    try {
      if (win) {
        await loadingMessage.react('🎉');
        await loadingMessage.react('💰');
      } else {
        await loadingMessage.react('😢');
        await loadingMessage.react('🎲');
      }
    } catch (error) {
      console.error('Failed to add reactions:', error);
    }
  }
};
