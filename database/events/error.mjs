import chalk from 'chalk';

export default{
  name: "error",
  execute(error) {
    console.log(
      chalk.yellow(`[Database Status]: There is an error:\n${error}`)
    );
  },
};
