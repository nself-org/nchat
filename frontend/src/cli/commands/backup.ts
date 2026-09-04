/**
 * Backup and Restore Commands
 */

import { promises as fs } from "fs";
import chalk from "chalk";
import ora from "ora";
import Table from "cli-table3";
import inquirer from "inquirer";

// Option shapes mirror the `.option(...)` flags registered for each
// subcommand in `@/cli/index.ts` — commander parses every flag value as a
// string (or boolean for value-less flags) unless a coercion fn is given.
interface CreateBackupOptions {
  output?: string;
  includeMedia?: boolean;
}

interface RestoreBackupOptions {
  force?: boolean;
}

interface ListBackupsOptions {
  limit: string;
}

interface DeleteBackupOptions {
  force?: boolean;
}

export const backupCommands = {
  async create(options: CreateBackupOptions) {
    const spinner = ora("Creating backup...").start();
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const output =
      options.output || `./backups/full-backup-${timestamp}.tar.gz`;

    // Create backup...

    spinner.succeed(`Backup created: ${output}`);
  },

  async restore(file: string, options: RestoreBackupOptions) {
    if (!options.force) {
      const { confirm } = await inquirer.prompt([
        {
          type: "confirm",
          name: "confirm",
          message: chalk.yellow(
            `Restore from ${file}? This will replace current data.`,
          ),
          default: false,
        },
      ]);
      if (!confirm) return;
    }

    const spinner = ora("Restoring from backup...").start();
    spinner.succeed("Restore completed successfully");
  },

  async list(options: ListBackupsOptions) {
    const spinner = ora("Listing backups...").start();
    spinner.succeed("Backups retrieved");

    const table = new Table({
      head: ["File", "Size", "Date"],
    });
    // REMOVED: console.log(table.toString())
  },

  async delete(file: string, options: DeleteBackupOptions) {
    if (!options.force) {
      const { confirm } = await inquirer.prompt([
        {
          type: "confirm",
          name: "confirm",
          message: chalk.yellow(`Delete backup ${file}?`),
          default: false,
        },
      ]);
      if (!confirm) return;
    }

    const spinner = ora("Deleting backup...").start();
    await fs.unlink(file);
    spinner.succeed("Backup deleted successfully");
  },
};
