import chalk from 'chalk';

export default {
  name: "connecting",
  async execute() {
    console.log(chalk.cyan("[Database Status]: Connecting."));
  },
};
