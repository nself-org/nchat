/**
 * Development Commands
 */

import { spawn } from "child_process";
import chalk from "chalk";
import ora from "ora";

import { logger } from "@/lib/logger";

interface DevStartOptions {
  port?: string;
  turbo?: boolean;
}

interface DevBackendOptions {
  detach?: boolean;
}

interface DevBuildOptions {
  analyze?: boolean;
}

interface DevTestOptions {
  watch?: boolean;
  coverage?: boolean;
}

/**
 * Start development server
 */
export async function start(options: DevStartOptions) {
  const spinner = ora("Starting development server...").start();

  try {
    const args = ["dev"];

    if (options.turbo) {
      args.push("--turbo");
    }

    if (options.port) {
      process.env.PORT = options.port;
    }

    spinner.succeed("Starting development server");
    // REMOVED: console.log(chalk.blue(`\n🚀 Server will run on http://localhost:${options.port || 3000}\n`))

    const child = spawn("pnpm", args, {
      stdio: "inherit",
      shell: true,
    });

    child.on("error", (error) => {
      spinner.fail("Failed to start development server");
      logger.error(chalk.red(error.message));
      process.exit(1);
    });

    child.on("exit", (code) => {
      if (code !== 0) {
        spinner.fail(`Development server exited with code ${code}`);
        process.exit(code || 1);
      }
    });
  } catch (error) {
    spinner.fail("Failed to start development server");
    logger.error(chalk.red((error as Error).message));
    process.exit(1);
  }
}

/**
 * Start backend services
 */
export async function backend(options: DevBackendOptions) {
  const spinner = ora("Starting backend services...").start();

  try {
    const args = options.detach ? ["start", "-d"] : ["start"];

    const child = spawn("nself", args, {
      cwd: ".backend",
      stdio: "inherit",
      shell: true,
    });

    spinner.succeed("Backend services started");
    // REMOVED: console.log(chalk.green('\n✓ Backend services are running'))
    // REMOVED: console.log(chalk.gray('  Run `nself status` to check service status'))
    // REMOVED: console.log(chalk.gray('  Run `nself logs` to view logs\n'))

    if (!options.detach) {
      child.on("exit", (code) => {
        if (code !== 0) {
          logger.error(chalk.red(`\nBackend exited with code ${code}`));
          process.exit(code || 1);
        }
      });
    }
  } catch (error) {
    spinner.fail("Failed to start backend services");
    logger.error(chalk.red((error as Error).message));
    process.exit(1);
  }
}

/**
 * Build for production
 */
export async function build(options: DevBuildOptions) {
  const spinner = ora("Building for production...").start();

  try {
    const env = { ...process.env };

    if (options.analyze) {
      env.ANALYZE = "true";
    }

    const child = spawn("pnpm", ["build"], {
      stdio: "inherit",
      shell: true,
      env,
    });

    child.on("exit", (code) => {
      if (code === 0) {
        spinner.succeed("Build completed successfully");
        // REMOVED: console.log(chalk.green('\n✓ Production build ready'))
        // REMOVED: console.log(chalk.gray('  Run `pnpm start` to start the production server\n'))
      } else {
        spinner.fail(`Build failed with code ${code}`);
        process.exit(code || 1);
      }
    });

    child.on("error", (error) => {
      spinner.fail("Build failed");
      logger.error(chalk.red(error.message));
      process.exit(1);
    });
  } catch (error) {
    spinner.fail("Build failed");
    logger.error(chalk.red((error as Error).message));
    process.exit(1);
  }
}

/**
 * Run tests
 */
export async function test(options: DevTestOptions) {
  const spinner = ora("Running tests...").start();

  try {
    const args = ["test"];

    if (options.watch) {
      args.push("--watch");
    }

    if (options.coverage) {
      args.push("--coverage");
    }

    spinner.succeed("Running tests");

    const child = spawn("pnpm", args, {
      stdio: "inherit",
      shell: true,
    });

    child.on("exit", (code) => {
      if (code === 0) {
        // REMOVED: console.log(chalk.green('\n✓ All tests passed\n'))
      } else {
        logger.error(chalk.red(`\n✗ Tests failed with code ${code}\n`));
        process.exit(code || 1);
      }
    });

    child.on("error", (error) => {
      spinner.fail("Tests failed");
      logger.error(chalk.red(error.message));
      process.exit(1);
    });
  } catch (error) {
    spinner.fail("Tests failed");
    logger.error(chalk.red((error as Error).message));
    process.exit(1);
  }
}

export const devCommands = {
  start,
  backend,
  build,
  test,
};
