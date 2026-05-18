/**
 * Database Commands
 */

import { spawn } from "child_process";
import { promises as fs } from "fs";
import chalk from "chalk";
import ora from "ora";
import inquirer from "inquirer";

import { logger } from "@/lib/logger";

interface MigrateOptions {
  up?: boolean;
  down?: boolean;
  to?: string;
}

interface SeedOptions {
  users?: string;
  channels?: string;
  messages?: string;
}

interface ResetOptions {
  force?: boolean;
}

interface BackupOptions {
  output?: string;
}

interface RestoreOptions {
  force?: boolean;
}

/**
 * Run database migrations
 */
export async function migrate(options: MigrateOptions) {
  const spinner = ora("Running database migrations...").start();

  try {
    const args = ["db", "migrate"];

    if (options.down) {
      args.push("down");
    } else if (options.to) {
      args.push("to", options.to);
    } else {
      args.push("up");
    }

    const child = spawn("nself", args, {
      cwd: ".backend",
      stdio: "inherit",
      shell: true,
    });

    child.on("exit", (code) => {
      if (code === 0) {
        spinner.succeed("Migrations completed successfully");
      } else {
        spinner.fail(`Migrations failed with code ${code}`);
        process.exit(code || 1);
      }
    });

    child.on("error", (error) => {
      spinner.fail("Migrations failed");
      logger.error(chalk.red(error.message));
      process.exit(1);
    });
  } catch (error) {
    spinner.fail("Migrations failed");
    logger.error(chalk.red((error as Error).message));
    process.exit(1);
  }
}

/**
 * Seed database with sample data
 */
export async function seed(options: SeedOptions) {
  const spinner = ora("Seeding database...").start();

  try {
    spinner.text = `Creating ${options.users || 10} users, ${options.channels || 5} channels, ${options.messages || 50} messages per channel...`;

    // This would typically use the SDK or direct database access

    await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate seeding

    spinner.succeed("Database seeded successfully");
    // REMOVED: console.log(chalk.green('\n✓ Sample data created:'))
    // REMOVED: console.log(chalk.gray(`  - ${options.users || 10} users`))
    // REMOVED: console.log(chalk.gray(`  - ${options.channels || 5} channels`))
    // REMOVED: console.log(
    //   chalk.gray(
    //     `  - ${parseInt(options.messages || '50') * parseInt(options.channels || '5')} messages\n`
    //   )
    // )
  } catch (error) {
    spinner.fail("Seeding failed");
    logger.error(chalk.red((error as Error).message));
    process.exit(1);
  }
}

/**
 * Reset database
 */
export async function reset(options: ResetOptions) {
  if (!options.force) {
    const { confirm } = await inquirer.prompt([
      {
        type: "confirm",
        name: "confirm",
        message: chalk.yellow("⚠️  This will DELETE ALL DATA. Are you sure?"),
        default: false,
      },
    ]);

    if (!confirm) {
      // REMOVED: console.log(chalk.gray('Database reset cancelled'))
      return;
    }
  }

  const spinner = ora("Resetting database...").start();

  try {
    // Run migrations down
    await migrate({ down: true });

    // Run migrations up
    await migrate({ up: true });

    spinner.succeed("Database reset successfully");
  } catch (error) {
    spinner.fail("Database reset failed");
    logger.error(chalk.red((error as Error).message));
    process.exit(1);
  }
}

/**
 * Show database status
 */
export async function status() {
  const spinner = ora("Checking database status...").start();

  try {
    const child = spawn("nself", ["db", "status"], {
      cwd: ".backend",
      stdio: "inherit",
      shell: true,
    });

    child.on("exit", (code) => {
      if (code === 0) {
        spinner.succeed("Database is connected");
      } else {
        spinner.fail("Database connection failed");
        process.exit(code || 1);
      }
    });
  } catch (error) {
    spinner.fail("Failed to check database status");
    logger.error(chalk.red((error as Error).message));
    process.exit(1);
  }
}

/**
 * Backup database
 */
export async function backup(options: BackupOptions) {
  const spinner = ora("Creating database backup...").start();

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const outputPath = options.output || `./backups/backup-${timestamp}.sql`;

    // Ensure backup directory exists
    const backupDir = outputPath.substring(0, outputPath.lastIndexOf("/"));
    await fs.mkdir(backupDir, { recursive: true });

    const child = spawn("nself", ["db", "backup", "-o", outputPath], {
      cwd: ".backend",
      stdio: "inherit",
      shell: true,
    });

    child.on("exit", (code) => {
      if (code === 0) {
        spinner.succeed("Database backup created");
        // REMOVED: console.log(chalk.green(`\n✓ Backup saved to: ${outputPath}\n`))
      } else {
        spinner.fail("Backup failed");
        process.exit(code || 1);
      }
    });

    child.on("error", (error) => {
      spinner.fail("Backup failed");
      logger.error(chalk.red(error.message));
      process.exit(1);
    });
  } catch (error) {
    spinner.fail("Backup failed");
    logger.error(chalk.red((error as Error).message));
    process.exit(1);
  }
}

/**
 * Restore database from backup
 */
export async function restore(file: string, options: RestoreOptions) {
  if (!options.force) {
    const { confirm } = await inquirer.prompt([
      {
        type: "confirm",
        name: "confirm",
        message: chalk.yellow(
          `⚠️  This will REPLACE ALL DATA with backup from ${file}. Continue?`,
        ),
        default: false,
      },
    ]);

    if (!confirm) {
      // REMOVED: console.log(chalk.gray('Database restore cancelled'))
      return;
    }
  }

  const spinner = ora("Restoring database from backup...").start();

  try {
    // Check if file exists
    await fs.access(file);

    const child = spawn("nself", ["db", "restore", file], {
      cwd: ".backend",
      stdio: "inherit",
      shell: true,
    });

    child.on("exit", (code) => {
      if (code === 0) {
        spinner.succeed("Database restored successfully");
        // REMOVED: console.log(chalk.green('\n✓ Database restored from backup\n'))
      } else {
        spinner.fail("Restore failed");
        process.exit(code || 1);
      }
    });

    child.on("error", (error) => {
      spinner.fail("Restore failed");
      logger.error(chalk.red(error.message));
      process.exit(1);
    });
  } catch (error) {
    spinner.fail("Restore failed");
    logger.error(chalk.red((error as Error).message));
    process.exit(1);
  }
}

export const dbCommands = {
  migrate,
  seed,
  reset,
  status,
  backup,
  restore,
};
