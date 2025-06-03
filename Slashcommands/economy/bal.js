// Slashcommands/economy/bal.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Bank = require('../../models/balance/bank');
const Hand = require('../../models/balance/hand');
const Clanpoints = require('../../models/Clan/clanpoints');
const createBaseEmbed = require('../../utils/embed');
const {emojis} = require('../../data/emojis');

const spiritStoneSymbol = emojis.spiritstone || '💎';
const clanpointssymbol = emojis.heavenlyorbs || '🌟';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Check your wealth and merit'),
  stage: 'beta',

  async execute(interaction) {
    const userId = interaction.user.id;
    const member = interaction.member;
    const userName = member.nickname || interaction.user.globalName || interaction.user.username;

    try {
      let [bankData, handData, clanpointsData] = await Promise.all([
        Bank.findOneAndUpdate({ userId }, {}, { upsert: true, new: true, setDefaultsOnInsert: true }),
        Hand.findOneAndUpdate({ userId }, {}, { upsert: true, new: true, setDefaultsOnInsert: true }),
        Clanpoints.findOneAndUpdate({ userId }, {}, { upsert: true, new: true, setDefaultsOnInsert: true })
      ]);
      
      const bankBalance = (bankData?.balance || 0);
      const handBalance = (handData?.balance || 0);
      const clanPoints = (clanpointsData?.balance || 0);

      // Main embed
      const mainEmbed = createBaseEmbed({ 
        interaction,
        description: `◈ ${userName}'s Spirit Pouch ◈ \n-# An overview of your current holdings:,`,
        fields: [
          {
            name: 'Karmic Jades',
            value: `${clanpointssymbol} **${clanPoints}**`,
            inline: true
          },
          {
            name: 'Karmic Stones',
            value: `${spiritStoneSymbol} **${handBalance}**`,
            inline: true
          }
        ],
        color: 0x0099FF,
        thumbnail: 'https://cdn.discordapp.com/emojis/757981556043153499.webp?size=128'
      });

      // Tips embed based on -# comments
      //await interaction.reply({ embeds: [mainEmbed] });
      await interaction.reply({
      embeds: [mainEmbed],  
      content: [
        '-# **Spirit Pouch Guide:**',
        `-# ${clanpointssymbol} **Karmic Jades** are useful for most Sect activities and purchases, like upgrading your sutras.`,
        `-# ${spiritStoneSymbol} **Karmic Stones** are used for mortal affairs, such as buying from the wandering merchant.`
      ].join('\n'),
      });

    } catch (error) {
      console.error(`Error executing /bal for ${userId}:`, error);
      await interaction.reply({
        content: ' Hmmm... The spirits seem unable to recall your balances right now. Please try again later.',
        ephemeral: true
      });
    }
  },
};
