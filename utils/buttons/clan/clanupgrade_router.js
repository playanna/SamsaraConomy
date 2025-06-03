const handler = require('../../../Slashcommands/upgrades/clanupgrades.js');

module.exports = {
  async execute(interaction) {
    await handler.handleButton(interaction);
  },
};
