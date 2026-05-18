/**
 * Environment File Generation API
 *
 * Generates and saves .env files from wizard configuration
 */

import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";
import { generateEnvFile, envToConfig } from "@/lib/setup/environment-detector";

import { logger } from "@/lib/logger";

const PROJECT_ROOT = process.cwd();

/**
 * GET /api/setup/env
 * Returns current environment configuration
 */
export async function GET() {
  try {
    const envFiles = await detectEnvFiles();
    const currentEnv = process.env.NEXT_PUBLIC_ENV || "development";
    const configFromEnv = envToConfig(process.env as Record<string, string>);

    return NextResponse.json({
      environment: currentEnv,
      files: envFiles,
      configFromEnv,
      variables: getPublicEnvVars(),
    });
  } catch (error) {
    logger.error("Env detection error:", error);
    return NextResponse.json(
      { error: "Failed to detect environment", details: String(error) },
      { status: 500 },
    );
  }
}

/**
 * POST /api/setup/env
 * Generate or update environment files
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, config, environment, backendUrls } = body;

    switch (action) {
      case "generate":
        return NextResponse.json(
          await generateEnv(config, environment, backendUrls),
        );

      case "save":
        return NextResponse.json(
          await saveEnvFile(config, environment, backendUrls),
        );

      case "preview":
        return NextResponse.json(
          previewEnvFile(config, environment, backendUrls),
        );

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 },
        );
    }
  } catch (error) {
    logger.error("Env generation error:", error);
    return NextResponse.json(
      { error: "Environment generation failed", details: String(error) },
      { status: 500 },
    );
  }
}

/**
 * Detect existing .env files
 */
async function detectEnvFiles() {
  const files: Record<
    string,
    { exists: boolean; path: string; size?: number; modified?: string }
  > = {};

  const envFileNames = [
    { name: "local", file: ".env.local" },
    { name: "development", file: ".env.development" },
    { name: "staging", file: ".env.staging" },
    { name: "production", file: ".env.production" },
    { name: "example", file: ".env.example" },
  ];

  for (const { name, file } of envFileNames) {
    const filePath = path.join(PROJECT_ROOT, file);
    const exists = fs.existsSync(filePath);

    files[name] = {
      exists,
      path: filePath,
    };

    if (exists) {
      const stats = fs.statSync(filePath);
      files[name].size = stats.size;
      files[name].modified = stats.mtime.toISOString();
    }
  }

  return files;
}

/**
 * Get all NEXT_PUBLIC_ environment variables
 */
function getPublicEnvVars(): Record<string, string> {
  const vars: Record<string, string> = {};

  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith("NEXT_PUBLIC_") && value) {
      vars[key] = value;
    }
  }

  return vars;
}

/**
 * Generate environment file content
 */
async function generateEnv(
  config: Record<string, unknown>,
  environment: "development" | "staging" | "production" = "development",
  backendUrls?: {
    graphql?: string;
    auth?: string;
    storage?: string;
    socket?: string;
  },
) {
  const content = generateEnvFile(config, {
    environment,
    backendUrls,
    includeComments: true,
  });

  return {
    content,
    environment,
    lineCount: content.split("\n").length,
    variableCount: content.split("\n").filter((l) => l.includes("=")).length,
  };
}

/**
 * Preview environment file without saving
 */
function previewEnvFile(
  config: Record<string, unknown>,
  environment: "development" | "staging" | "production" = "development",
  backendUrls?: {
    graphql?: string;
    auth?: string;
    storage?: string;
    socket?: string;
  },
) {
  const content = generateEnvFile(config, {
    environment,
    backendUrls,
    includeComments: true,
  });

  return {
    preview: content,
    filename:
      environment === "development" ? ".env.local" : `.env.${environment}`,
    environment,
  };
}

/**
 * Save environment file to disk
 */
async function saveEnvFile(
  config: Record<string, unknown>,
  environment: "development" | "staging" | "production" = "development",
  backendUrls?: {
    graphql?: string;
    auth?: string;
    storage?: string;
    socket?: string;
  },
) {
  const content = generateEnvFile(config, {
    environment,
    backendUrls,
    includeComments: true,
  });

  // Determine filename
  const filename =
    environment === "development" ? ".env.local" : `.env.${environment}`;
  const filePath = path.join(PROJECT_ROOT, filename);

  // Backup existing file if it exists
  if (fs.existsSync(filePath)) {
    const backupPath = `${filePath}.backup.${Date.now()}`;
    fs.copyFileSync(filePath, backupPath);
  }

  // Write new file
  fs.writeFileSync(filePath, content, "utf-8");

  return {
    success: true,
    filename,
    path: filePath,
    environment,
    lineCount: content.split("\n").length,
    variableCount: content.split("\n").filter((l) => l.includes("=")).length,
    message: `Environment file saved to ${filename}`,
  };
}
