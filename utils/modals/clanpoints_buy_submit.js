const Hand = require('../../models/balance/hand');
const Clanpoints = require('../../models/Clan/clanpoints');
const createBaseEmbed = require('../../utils/embed');

module.exports = {
  async execute(interaction) {
    const userId = interaction.user.id;
    const amount = parseInt(interaction.fields.getTextInputValue('buy_amount'));

    if (isNaN(amount) || amount <= 0) {
      return interaction.reply({ content: '❌ Invalid amount. Please enter a number greater than 0.', ephemeral: true });
    }

    const cost = amount * 10;

    let handData = await Hand.findOne({ userId });
    if (!handData) {
      handData = new Hand({ userId });
      await handData.save();
    }

    if (handData.balance < cost) {
      return interaction.reply({
        content: `❌ You need $${cost.toFixed(2)} in hand to buy ${amount} clanpoints. You only have $${handData.balance.toFixed(2)}.`,
        ephemeral: true
      });
    }

    handData.balance -= cost;
    await handData.save();

    let clanpoints = await Clanpoints.findOne({ userId });
    if (!clanpoints) {
      clanpoints = new Clanpoints({ userId });
    }
    clanpoints.balance += amount;
    await clanpoints.save();

    const emoji = '<:heavenlyorbs:776075202849013770>';
    const embed = createBaseEmbed({
      interaction,
      title: '✅ Clan Points Purchased',
      description: `You successfully bought **${amount} clanpoints** for **$${cost.toFixed(2)}**.`,
      fields: [
        { name: 'New Clanpoints Balance', value: `${clanpoints.balance} ${emoji}`, inline: true },
        { name: 'New Hand Balance', value: `$${handData.balance.toFixed(2)}`, inline: true },
      ]
    });

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
