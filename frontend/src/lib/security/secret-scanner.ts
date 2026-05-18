/**
 * Secret Scanner and Security Auditor
 * Phase 19 - Security Hardening (Task 127)
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

interface SecretPattern {
  name: string;
  pattern: RegExp;
  severity: "critical" | "high" | "medium" | "low";
}

interface SecretMatch {
  file: string;
  line: number;
  pattern: string;
  severity: string;
  context: string;
}

// Common secret patterns
const SECRET_PATTERNS: SecretPattern[] = [
  {
    name: "AWS Access Key",
    pattern: /AKIA[0-9A-Z]{16}/g,
    severity: "critical",
  },
  {
    name: "AWS Secret Key",
    pattern: /aws.{0,20}?['\"][0-9a-zA-Z/+]{40}['\"]/gi,
    severity: "critical",
  },
  {
    name: "GitHub Token",
    pattern: /gh[pousr]_[A-Za-z0-9_]{36,}/g,
    severity: "critical",
  },
  {
    name: "Generic API Key",
    pattern: /api[_-]?key['\"]?\s*[:=]\s*['\"]\w{20,}['\"]/gi,
    severity: "high",
  },
  {
    name: "Private Key",
    pattern: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
    severity: "critical",
  },
  {
    name: "Stripe Secret Key",
    pattern: /sk_(live|test)_[0-9a-zA-Z]{24,}/g,
    severity: "critical",
  },
  {
    name: "Database URL with Password",
    pattern: /postgres(ql)?:\/\/\w+:[^@\s]+@/gi,
    severity: "high",
  },
  {
    name: "JWT Token",
    pattern: /eyJ[A-Za-z0-9-_=]+\.eyJ[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/g,
    severity: "medium",
  },
  {
    name: "Slack Webhook",
    pattern:
      /https:\/\/hooks\.slack\.com\/services\/T[0-9A-Z]+\/B[0-9A-Z]+\/[0-9a-zA-Z]{24}/g,
    severity: "high",
  },
  {
    name: "Discord Webhook",
    pattern:
      /https:\/\/discord(app)?\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+/g,
    severity: "high",
  },
  {
    name: "Generic Password",
    pattern: /password['\"]?\s*[:=]\s*['\"]\w{8,}['\"]/gi,
    severity: "medium",
  },
  {
    name: "Generic Secret",
    pattern: /secret['\"]?\s*[:=]\s*['\"]\w{16,}['\"]/gi,
    severity: "medium",
  },
];

// Files and directories to skip
const SKIP_PATTERNS = [
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  ".env.example",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "secret-scanner.ts", // Skip self
];

/**
 * Scan file for secrets
 */
export function scanFile(filePath: string): SecretMatch[] {
  try {
    const content = readFileSync(filePath, "utf-8");
    const lines = content.split("\n");
    const matches: SecretMatch[] = [];

    for (const pattern of SECRET_PATTERNS) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(pattern.pattern);

        if (match) {
          matches.push({
            file: filePath,
            line: i + 1,
            pattern: pattern.name,
            severity: pattern.severity,
            context: line.trim().slice(0, 100),
          });
        }
      }
    }

    return matches;
  } catch (error) {
    // Skip files that can't be read
    return [];
  }
}

/**
 * Recursively scan directory
 */
export function scanDirectory(dirPath: string): SecretMatch[] {
  let matches: SecretMatch[] = [];

  try {
    const items = readdirSync(dirPath);

    for (const item of items) {
      if (SKIP_PATTERNS.some((pattern) => item.includes(pattern))) {
        continue;
      }

      const fullPath = join(dirPath, item);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        matches = [...matches, ...scanDirectory(fullPath)];
      } else if (stat.isFile()) {
        // Only scan text files
        if (fullPath.match(/\.(ts|tsx|js|jsx|json|env|md|txt|yaml|yml|sh)$/)) {
          matches = [...matches, ...scanFile(fullPath)];
        }
      }
    }
  } catch (error) {
    console.error(`Error scanning ${dirPath}:`, error);
  }

  return matches;
}

/**
 * Validate environment variables are not hardcoded
 */
export function auditEnvUsage(dirPath: string): string[] {
  const issues: string[] = [];

  try {
    const items = readdirSync(dirPath);

    for (const item of items) {
      if (SKIP_PATTERNS.some((pattern) => item.includes(pattern))) {
        continue;
      }

      const fullPath = join(dirPath, item);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        issues.push(...auditEnvUsage(fullPath));
      } else if (fullPath.match(/\.(ts|tsx|js|jsx)$/)) {
        const content = readFileSync(fullPath, "utf-8");

        // Check for hardcoded sensitive values
        if (content.match(/=\s*['"][a-zA-Z0-9]{32,}['"]/)) {
          issues.push(`${fullPath}: Potential hardcoded credential`);
        }

        // Check for process.env without validation
        if (
          content.includes("process.env.") &&
          !content.includes("z.string()")
        ) {
          // Should use Zod validation
          issues.push(`${fullPath}: Environment variable without validation`);
        }
      }
    }
  } catch (error) {
    console.error(`Error auditing ${dirPath}:`, error);
  }

  return issues;
}

/**
 * Generate security audit report
 */
export function generateAuditReport(projectRoot: string): {
  secrets: SecretMatch[];
  envIssues: string[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
} {
  console.log("🔍 Scanning for secrets...");
  const secrets = scanDirectory(projectRoot);

  console.log("🔍 Auditing environment variable usage...");
  const envIssues = auditEnvUsage(projectRoot);

  const summary = {
    critical: secrets.filter((s) => s.severity === "critical").length,
    high: secrets.filter((s) => s.severity === "high").length,
    medium: secrets.filter((s) => s.severity === "medium").length,
    low: secrets.filter((s) => s.severity === "low").length,
  };

  return { secrets, envIssues, summary };
}

/**
 * CLI runner
 */
export function runSecurityAudit() {
  const report = generateAuditReport(process.cwd());

  console.log("\n📊 Security Audit Report\n");
  console.log(`Critical: ${report.summary.critical}`);
  console.log(`High: ${report.summary.high}`);
  console.log(`Medium: ${report.summary.medium}`);
  console.log(`Low: ${report.summary.low}`);

  if (report.secrets.length > 0) {
    console.log("\n🚨 Secrets Found:\n");
    report.secrets.forEach((match) => {
      console.log(
        `[${match.severity.toUpperCase()}] ${match.file}:${match.line}`,
      );
      console.log(`  Pattern: ${match.pattern}`);
      console.log(`  Context: ${match.context}`);
      console.log();
    });
  }

  if (report.envIssues.length > 0) {
    console.log("\n⚠️  Environment Variable Issues:\n");
    report.envIssues.forEach((issue) => {
      console.log(`  ${issue}`);
    });
  }

  if (report.secrets.length === 0 && report.envIssues.length === 0) {
    console.log("\n✅ No security issues found!");
  }

  return report;
}
