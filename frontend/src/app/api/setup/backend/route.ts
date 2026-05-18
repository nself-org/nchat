/**
 * Backend Setup API Routes
 *
 * Handles nself CLI integration for backend setup:
 * - Detect existing .backend folder
 * - Initialize new backend (nself init)
 * - Build backend (nself build)
 * - Start/stop services (nself start/stop)
 * - Check service status (nself status)
 */

import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";

import { logger } from "@/lib/logger";

const execAsync = promisify(exec);

// Paths
const PROJECT_ROOT = process.cwd();
const BACKEND_DIR = path.join(PROJECT_ROOT, ".backend");
const NSELF_BIN = path.join(process.env.HOME || "~", ".nself", "bin", "nself");

/**
 * GET /api/setup/backend
 * Returns current backend status
 */
export async function GET() {
  try {
    const status = await getBackendStatus();
    return NextResponse.json(status);
  } catch (error) {
    logger.error("Backend status error:", error);
    return NextResponse.json(
      { error: "Failed to get backend status", details: String(error) },
      { status: 500 },
    );
  }
}

/**
 * POST /api/setup/backend
 * Execute backend commands: init, build, start, stop, restart
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, options = {} } = body;

    switch (action) {
      case "detect":
        return NextResponse.json(await detectBackend());

      case "init":
        return NextResponse.json(await initBackend(options));

      case "build":
        return NextResponse.json(await buildBackend());

      case "start":
        return NextResponse.json(await startBackend());

      case "stop":
        return NextResponse.json(await stopBackend());

      case "restart":
        return NextResponse.json(await restartBackend());

      case "status":
        return NextResponse.json(await getBackendStatus());

      case "urls":
        return NextResponse.json(await getServiceUrls());

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 },
        );
    }
  } catch (error) {
    logger.error("Backend action error:", error);
    return NextResponse.json(
      { error: "Backend action failed", details: String(error) },
      { status: 500 },
    );
  }
}

/**
 * Detect if backend folder exists and is initialized
 */
async function detectBackend() {
  const exists = fs.existsSync(BACKEND_DIR);
  const hasEnv = exists && fs.existsSync(path.join(BACKEND_DIR, ".env"));
  const hasCompose =
    exists && fs.existsSync(path.join(BACKEND_DIR, "docker-compose.yml"));
  const nshelfInstalled = await isNselfInstalled();

  return {
    backendDir: BACKEND_DIR,
    exists,
    initialized: hasEnv && hasCompose,
    hasEnv,
    hasCompose,
    nshelfInstalled,
    nselfPath: nshelfInstalled ? NSELF_BIN : null,
  };
}

/**
 * Check if nself CLI is installed
 */
async function isNselfInstalled(): Promise<boolean> {
  try {
    // Check in standard location
    if (fs.existsSync(NSELF_BIN)) {
      return true;
    }

    // Check if available in PATH
    await execAsync("which nself");
    return true;
  } catch {
    return false;
  }
}

/**
 * Get nself command path
 */
function getNselfCommand(): string {
  if (fs.existsSync(NSELF_BIN)) {
    return NSELF_BIN;
  }
  return "nself"; // Try PATH
}

/**
 * Initialize backend with nself init
 */
async function initBackend(options: { demo?: boolean; wizard?: boolean } = {}) {
  const nself = getNselfCommand();

  // Create .backend directory if needed
  if (!fs.existsSync(BACKEND_DIR)) {
    fs.mkdirSync(BACKEND_DIR, { recursive: true });
  }

  // Build init command
  let command = `cd "${BACKEND_DIR}" && ${nself} init`;
  if (options.demo) command += " --demo";
  if (options.wizard) command += " --wizard";

  // Add non-interactive flag for programmatic use
  command += " --yes 2>&1";

  try {
    const { stdout, stderr } = await execAsync(command, {
      timeout: 120000, // 2 minute timeout
      env: { ...process.env, NSELF_NON_INTERACTIVE: "1" },
    });

    return {
      success: true,
      message: "Backend initialized successfully",
      output: stdout,
      warnings: stderr || null,
    };
  } catch (error: unknown) {
    const execError = error as {
      stdout?: string;
      stderr?: string;
      message?: string;
    };
    return {
      success: false,
      message: "Backend initialization failed",
      error: execError.message,
      output: execError.stdout,
      stderr: execError.stderr,
    };
  }
}

/**
 * Build backend with nself build
 */
async function buildBackend() {
  const nself = getNselfCommand();

  try {
    const { stdout, stderr } = await execAsync(
      `cd "${BACKEND_DIR}" && ${nself} build 2>&1`,
      { timeout: 300000 }, // 5 minute timeout
    );

    return {
      success: true,
      message: "Backend built successfully",
      output: stdout,
      warnings: stderr || null,
    };
  } catch (error: unknown) {
    const execError = error as {
      stdout?: string;
      stderr?: string;
      message?: string;
    };
    return {
      success: false,
      message: "Backend build failed",
      error: execError.message,
      output: execError.stdout,
      stderr: execError.stderr,
    };
  }
}

/**
 * Start backend services with nself start
 */
async function startBackend() {
  const nself = getNselfCommand();

  try {
    const { stdout, stderr } = await execAsync(
      `cd "${BACKEND_DIR}" && ${nself} start 2>&1`,
      { timeout: 180000 }, // 3 minute timeout
    );

    // Wait a bit for services to fully start
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const status = await getBackendStatus();

    return {
      success: true,
      message: "Backend services started",
      output: stdout,
      warnings: stderr || null,
      status,
    };
  } catch (error: unknown) {
    const execError = error as {
      stdout?: string;
      stderr?: string;
      message?: string;
    };
    return {
      success: false,
      message: "Failed to start backend services",
      error: execError.message,
      output: execError.stdout,
      stderr: execError.stderr,
    };
  }
}

/**
 * Stop backend services with nself stop
 */
async function stopBackend() {
  const nself = getNselfCommand();

  try {
    const { stdout, stderr } = await execAsync(
      `cd "${BACKEND_DIR}" && ${nself} stop 2>&1`,
      {
        timeout: 60000,
      },
    );

    return {
      success: true,
      message: "Backend services stopped",
      output: stdout,
      warnings: stderr || null,
    };
  } catch (error: unknown) {
    const execError = error as {
      stdout?: string;
      stderr?: string;
      message?: string;
    };
    return {
      success: false,
      message: "Failed to stop backend services",
      error: execError.message,
      output: execError.stdout,
      stderr: execError.stderr,
    };
  }
}

/**
 * Restart backend services
 */
async function restartBackend() {
  const nself = getNselfCommand();

  try {
    const { stdout, stderr } = await execAsync(
      `cd "${BACKEND_DIR}" && ${nself} restart 2>&1`,
      {
        timeout: 180000,
      },
    );

    await new Promise((resolve) => setTimeout(resolve, 5000));
    const status = await getBackendStatus();

    return {
      success: true,
      message: "Backend services restarted",
      output: stdout,
      warnings: stderr || null,
      status,
    };
  } catch (error: unknown) {
    const execError = error as {
      stdout?: string;
      stderr?: string;
      message?: string;
    };
    return {
      success: false,
      message: "Failed to restart backend services",
      error: execError.message,
      output: execError.stdout,
      stderr: execError.stderr,
    };
  }
}

/**
 * Get detailed backend service status
 */
async function getBackendStatus() {
  const detection = await detectBackend();

  if (!detection.exists || !detection.initialized) {
    return {
      ...detection,
      running: false,
      services: {},
    };
  }

  const nself = getNselfCommand();

  try {
    // Get status from nself CLI
    const { stdout } = await execAsync(
      `cd "${BACKEND_DIR}" && ${nself} status --json 2>/dev/null || ${nself} status 2>&1`,
      { timeout: 30000 },
    );

    // Try to parse JSON output first
    try {
      const jsonStatus = JSON.parse(stdout);
      return {
        ...detection,
        running: true,
        services: jsonStatus.services || jsonStatus,
      };
    } catch {
      // Parse text output
      const services = parseStatusOutput(stdout);
      const running = Object.values(services).some(
        (s: { running?: boolean }) => s.running,
      );

      return {
        ...detection,
        running,
        services,
      };
    }
  } catch (error) {
    // nself status failed - services likely not running
    return {
      ...detection,
      running: false,
      services: {},
      error: String(error),
    };
  }
}

/**
 * Get service URLs from nself
 */
async function getServiceUrls() {
  const detection = await detectBackend();

  if (!detection.exists || !detection.initialized) {
    return {
      urls: getDefaultUrls(),
      source: "defaults",
    };
  }

  const nself = getNselfCommand();

  try {
    const { stdout } = await execAsync(
      `cd "${BACKEND_DIR}" && ${nself} urls 2>&1`,
      {
        timeout: 10000,
      },
    );

    const urls = parseUrlsOutput(stdout);

    return {
      urls,
      source: "nself",
    };
  } catch {
    return {
      urls: getDefaultUrls(),
      source: "defaults",
    };
  }
}

/**
 * Parse nself status text output
 */
function parseStatusOutput(
  output: string,
): Record<string, { name: string; running: boolean; healthy: boolean }> {
  const services: Record<
    string,
    { name: string; running: boolean; healthy: boolean }
  > = {};

  const servicePatterns = [
    { name: "postgres", patterns: ["postgres", "postgresql", "db"] },
    { name: "hasura", patterns: ["hasura", "graphql"] },
    { name: "auth", patterns: ["auth", "authentication"] },
    { name: "storage", patterns: ["storage", "minio", "s3"] },
    { name: "redis", patterns: ["redis", "cache"] },
    { name: "meilisearch", patterns: ["meilisearch", "search"] },
    { name: "mailpit", patterns: ["mailpit", "mail", "email"] },
    { name: "nginx", patterns: ["nginx", "proxy"] },
  ];

  const lines = output.toLowerCase().split("\n");

  for (const { name, patterns } of servicePatterns) {
    const line = lines.find((l) => patterns.some((p) => l.includes(p)));
    if (line) {
      const running =
        line.includes("running") ||
        line.includes("up") ||
        line.includes("✓") ||
        line.includes("healthy");
      const healthy =
        line.includes("healthy") || (running && !line.includes("unhealthy"));
      services[name] = { name, running, healthy };
    }
  }

  return services;
}

/**
 * Parse nself urls output
 */
function parseUrlsOutput(output: string): Record<string, string> {
  const urls: Record<string, string> = {};
  const lines = output.split("\n");

  const urlPatterns = [
    { key: "graphql", patterns: ["graphql", "api", "hasura"] },
    { key: "auth", patterns: ["auth"] },
    { key: "storage", patterns: ["storage", "minio"] },
    { key: "mail", patterns: ["mail", "mailpit"] },
    { key: "admin", patterns: ["admin", "dashboard"] },
  ];

  for (const line of lines) {
    const urlMatch = line.match(/(https?:\/\/[^\s]+)/);
    if (urlMatch) {
      const url = urlMatch[1];
      for (const { key, patterns } of urlPatterns) {
        if (patterns.some((p) => line.toLowerCase().includes(p))) {
          urls[key] = url;
          break;
        }
      }
    }
  }

  return urls;
}

/**
 * Default URLs for local development
 */
function getDefaultUrls(): Record<string, string> {
  return {
    graphql: "http://api.localhost/v1/graphql",
    auth: "http://auth.localhost/v1/auth",
    storage: "http://storage.localhost/v1/storage",
    mail: "http://mail.localhost",
    admin: "http://localhost:3021",
  };
}
