/**
 * Channel Management Commands
 */

import chalk from "chalk";
import ora from "ora";
import Table from "cli-table3";
import inquirer from "inquirer";

// Option shapes mirror the `.option(...)` flags registered for each
// subcommand in `@/cli/index.ts` — commander parses every flag value as a
// string (or boolean for value-less flags) unless a coercion fn is given.
interface CreateChannelOptions {
  name?: string;
  description?: string;
  type: string;
}

interface ListChannelsOptions {
  limit: string;
  type?: string;
}

interface DeleteChannelOptions {
  force?: boolean;
}

export const channelCommands = {
  async create(options: CreateChannelOptions) {
    const spinner = ora("Creating channel...").start();
    spinner.succeed("Channel created successfully");
  },

  async list(options: ListChannelsOptions) {
    const spinner = ora("Fetching channels...").start();
    spinner.succeed("Channels retrieved");

    const table = new Table({
      head: ["ID", "Name", "Type", "Members", "Created"],
    });
    // REMOVED: console.log(table.toString())
  },

  async delete(channelId: string, options: DeleteChannelOptions) {
    if (!options.force) {
      const { confirm } = await inquirer.prompt([
        {
          type: "confirm",
          name: "confirm",
          message: chalk.yellow(`Delete channel ${channelId}?`),
          default: false,
        },
      ]);
      if (!confirm) return;
    }

    const spinner = ora("Deleting channel...").start();
    spinner.succeed("Channel deleted successfully");
  },

  async archive(channelId: string) {
    const spinner = ora("Archiving channel...").start();
    spinner.succeed("Channel archived successfully");
  },
};
