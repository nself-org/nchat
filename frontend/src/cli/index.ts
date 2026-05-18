#!/usr/bin/env node

/**
 * nChat CLI - Command Line Interface
 *
 * Development, deployment, and data management tools for nChat.
 *
 * @example
 * ```bash
 * nchat-cli dev                    # Start development server
 * nchat-cli deploy --env production # Deploy to production
 * nchat-cli db:migrate             # Run database migrations
 * nchat-cli user create            # Create a new user
 * ```
 */

import { Command } from "commander";
import chalk from "chalk";
import { version } from "../../package.json";

// Command modules
import { devCommands } from "./commands/dev";
import { dbCommands } from "./commands/db";
import { userCommands } from "./commands/user";
import { channelCommands } from "./commands/channel";
import { deployCommands } from "./commands/deploy";
import { configCommands } from "./commands/config";
import { backupCommands } from "./commands/backup";

// Create the main program
const program = new Command();

program
  .name("nchat-cli")
  .description("nChat CLI - Development and management tools")
  .version(version)
  .option("-v, --verbose", "Enable verbose output")
  .option("--no-color", "Disable colored output");

// ============================================================================
// Development Commands
// ============================================================================

const dev = program.command("dev").description("Development server commands");

dev
  .command("start")
  .description("Start development server")
  .option("-p, --port <port>", "Port to run on", "3000")
  .option("--turbo", "Use Turbopack")
  .action(devCommands.start);

dev
  .command("backend")
  .description("Start backend services")
  .option("--detach", "Run in background")
  .action(devCommands.backend);

dev
  .command("build")
  .description("Build for production")
  .option("--analyze", "Analyze bundle size")
  .action(devCommands.build);

dev
  .command("test")
  .description("Run tests")
  .option("--watch", "Watch mode")
  .option("--coverage", "Generate coverage report")
  .action(devCommands.test);

// ============================================================================
// Database Commands
// ============================================================================

const db = program.command("db").description("Database management commands");

db.command("migrate")
  .description("Run database migrations")
  .option("--up", "Migrate up (default)")
  .option("--down", "Migrate down")
  .option("--to <version>", "Migrate to specific version")
  .action(dbCommands.migrate);

db.command("seed")
  .description("Seed database with sample data")
  .option("--users <count>", "Number of users to create", "10")
  .option("--channels <count>", "Number of channels to create", "5")
  .option("--messages <count>", "Number of messages per channel", "50")
  .action(dbCommands.seed);

db.command("reset")
  .description("Reset database (WARNING: destroys all data)")
  .option("--force", "Skip confirmation prompt")
  .action(dbCommands.reset);

db.command("status")
  .description("Show database connection status")
  .action(dbCommands.status);

db.command("backup")
  .description("Create database backup")
  .option("-o, --output <path>", "Output file path")
  .action(dbCommands.backup);

db.command("restore")
  .description("Restore database from backup")
  .argument("<file>", "Backup file to restore")
  .option("--force", "Skip confirmation prompt")
  .action(dbCommands.restore);

// ============================================================================
// User Commands
// ============================================================================

const user = program.command("user").description("User management commands");

user
  .command("create")
  .description("Create a new user")
  .option("-e, --email <email>", "User email")
  .option("-n, --name <name>", "Display name")
  .option("-p, --password <password>", "Password")
  .option("-r, --role <role>", "User role", "member")
  .action(userCommands.create);

user
  .command("list")
  .description("List all users")
  .option("-l, --limit <limit>", "Number of users to show", "50")
  .option("-r, --role <role>", "Filter by role")
  .action(userCommands.list);

user
  .command("update")
  .argument("<userId>", "User ID")
  .description("Update a user")
  .option("-n, --name <name>", "Display name")
  .option("-r, --role <role>", "User role")
  .option("-s, --status <status>", "User status")
  .action(userCommands.update);

user
  .command("delete")
  .argument("<userId>", "User ID")
  .description("Delete a user")
  .option("--force", "Skip confirmation prompt")
  .action(userCommands.delete);

user
  .command("suspend")
  .argument("<userId>", "User ID")
  .description("Suspend a user")
  .option("-r, --reason <reason>", "Suspension reason")
  .action(userCommands.suspend);

user
  .command("unsuspend")
  .argument("<userId>", "User ID")
  .description("Unsuspend a user")
  .action(userCommands.unsuspend);

// ============================================================================
// Channel Commands
// ============================================================================

const channel = program
  .command("channel")
  .description("Channel management commands");

channel
  .command("create")
  .description("Create a new channel")
  .option("-n, --name <name>", "Channel name")
  .option("-d, --description <description>", "Channel description")
  .option("-t, --type <type>", "Channel type (public/private)", "public")
  .action(channelCommands.create);

channel
  .command("list")
  .description("List all channels")
  .option("-l, --limit <limit>", "Number of channels to show", "50")
  .option("-t, --type <type>", "Filter by type")
  .action(channelCommands.list);

channel
  .command("delete")
  .argument("<channelId>", "Channel ID")
  .description("Delete a channel")
  .option("--force", "Skip confirmation prompt")
  .action(channelCommands.delete);

channel
  .command("archive")
  .argument("<channelId>", "Channel ID")
  .description("Archive a channel")
  .action(channelCommands.archive);

// ============================================================================
// Deploy Commands
// ============================================================================

const deploy = program.command("deploy").description("Deployment commands");

deploy
  .command("vercel")
  .description("Deploy to Vercel")
  .option("--prod", "Deploy to production")
  .action(deployCommands.vercel);

deploy
  .command("docker")
  .description("Build and push Docker image")
  .option("-t, --tag <tag>", "Image tag", "latest")
  .option("--push", "Push to registry")
  .action(deployCommands.docker);

deploy
  .command("k8s")
  .description("Deploy to Kubernetes")
  .option("-n, --namespace <namespace>", "Kubernetes namespace", "default")
  .option("-f, --file <file>", "Manifest file path")
  .action(deployCommands.k8s);

// ============================================================================
// Config Commands
// ============================================================================

const config = program
  .command("config")
  .description("Configuration management commands");

config
  .command("get")
  .description("Get configuration value")
  .argument("[key]", "Configuration key")
  .action(configCommands.get);

config
  .command("set")
  .description("Set configuration value")
  .argument("<key>", "Configuration key")
  .argument("<value>", "Configuration value")
  .action(configCommands.set);

config
  .command("export")
  .description("Export configuration")
  .option("-o, --output <file>", "Output file path")
  .option("-f, --format <format>", "Format (json/yaml)", "json")
  .action(configCommands.export);

config
  .command("import")
  .description("Import configuration")
  .argument("<file>", "Configuration file")
  .option("--merge", "Merge with existing config")
  .action(configCommands.import);

// ============================================================================
// Backup Commands
// ============================================================================

const backup = program
  .command("backup")
  .description("Backup and restore commands");

backup
  .command("create")
  .description("Create a full backup")
  .option("-o, --output <path>", "Output directory")
  .option("--include-media", "Include media files")
  .action(backupCommands.create);

backup
  .command("restore")
  .description("Restore from backup")
  .argument("<file>", "Backup file")
  .option("--force", "Skip confirmation prompt")
  .action(backupCommands.restore);

backup
  .command("list")
  .description("List available backups")
  .option("-l, --limit <limit>", "Number of backups to show", "20")
  .action(backupCommands.list);

backup
  .command("delete")
  .description("Delete a backup")
  .argument("<file>", "Backup file")
  .option("--force", "Skip confirmation prompt")
  .action(backupCommands.delete);

// ============================================================================
// Parse and Execute
// ============================================================================

program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
