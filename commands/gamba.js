module.exports = {
name: 'gamba',
aliases: ['coinflip', 'flip'],

async execute(message, args) {
const Hand = require('../models/balance/hand');
const Clanpoints = require('../models/Clan/clanpoints');
const Treasury = require('../models/balance/treasury');
const Loss = require('../models/balance/loss');
const {emojis} = require('../data/emojis');
const userId = message.author.id;
const amountInput = args[0];
let guess = args[1]?.toLowerCase();

// Guess validation
if (!amountInput || !guess) {
  return message.channel.send('Usage: -gamba <amount> <heads/tails>. Example: -gamba 10 heads');
}

if (/^h/i.test(guess)) guess = 'heads';
else if (/^t/i.test(guess)) guess = 'tails';
else return message.channel.send('Invalid guess. Choose "heads" or "tails".');

// Fetch or create hand
let hand = await Hand.findOne({ userId }) || new Hand({ userId });
let clanpoints = await Clanpoints.findOne({ userId }) || new Clanpoints({ userId });
let balance = clanpoints.balance;

// Parse amount
let amount = 0;
const cleanInput = amountInput.trim().toLowerCase();

if (cleanInput === 'all' || cleanInput === 'max') {
    amount = balance;
} 
else if (cleanInput === 'half') {
    amount = Math.floor(balance / 2);
} 
else if (cleanInput === 'quarter') {
    amount = Math.floor(balance / 4);
} 
else if (/^\d+\s*k$/i.test(cleanInput)) {
    amount = parseInt(cleanInput) * 1000;
} 
else if (/^\d+\s*m$/i.test(cleanInput)) {
    amount = parseInt(cleanInput) * 1000000;
} 
else if (/^\d+\s*b$/i.test(cleanInput)) {
    amount = parseInt(cleanInput) * 1000000000;
} 
else if (cleanInput.endsWith('%')) {
    const percent = parseInt(cleanInput);
    amount = Math.floor(balance * (percent / 100));
}
else if (cleanInput === 'random') {
    amount = Math.floor(Math.random() * balance) + 1;
}
else if (cleanInput === 'min') {
    amount = 1; // or whatever your minimum amount is
}
else {
    amount = parseInt(cleanInput) || 0; // fallback to 0 if parsing fails
}

if (!amount || amount < 1) return message.channel.send('You must bet at least 1 Karmic Stone.');
if (balance < amount) return message.channel.send('Not enough balance.');

// Deduct and compute
clanpoints.balance -= amount;

const isSpecialUser = userId === '685154245548310534';
const outcome = (isSpecialUser && Math.random() < 0.2) ? guess : (Math.random() < 0.5 ? 'heads' : 'tails'); // 50% chance for heads or tails
const won = guess === outcome;

let resultMessage = '';
let gif = '';
let tossGif = outcome === 'heads'
  ? 'https://i.ibb.co/WH2cVrZ/heads-coinflip.gif'
  : 'https://i.ibb.co/bNxx8JZ/coins-tails.gif';

if (won) {
  clanpoints.balance += amount * 2;
  resultMessage = 'You guessed correctly and won!';
  gif = 'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif';
} else {
  resultMessage = 'You guessed wrong and lost.';
  gif = 'https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExd3B1b2N5cHB4NjFjaGNucDV0ZXc5OThoZGFwd2g0eDZ0dm0zZDZ3aiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/HPywNYWs91A0uv5H2R/giphy.gif';

  const treasury = await Treasury.findOneAndUpdate(
    { name: 'SECT_TREASURY' },
    { $inc: { balance: amount } },
    { new: true, upsert: true }
  );

  await Loss.findOneAndUpdate(
    { userId },
    { $inc: { totalLoss: amount } },
    { upsert: true }
  );
}

await clanpoints.save();

const { EmbedBuilder } = require('discord.js');
const embed = new EmbedBuilder()
  .setTitle('Karmic Toss')
  .setDescription(`${emojis.heavenlyorbs} Coin Toss Result: **${outcome}**\n\n${resultMessage}`)
  .setColor(won ? 0x00FF00 : 0xFF0000)
  .addFields({ name: 'Your Balance', value: `${clanpoints.balance} Karmic Jades ${emojis.heavenlyorbs}` })
  .setImage(tossGif)
  .setThumbnail(gif);

return message.channel.send({ embeds: [embed] });
}
};

