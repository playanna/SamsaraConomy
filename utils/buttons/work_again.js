const workCommand = require('../../Slashcommands/work/work'); // Move to top

module.exports = {
    data: {
        customId: 'work_again',
        label: '✨ Work Again',
        style: 'PRIMARY'
    },

    async execute(interaction) {
        await workCommand.handleButton(interaction);
    }
};

