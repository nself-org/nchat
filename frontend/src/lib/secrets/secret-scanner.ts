/**
 * Secret Scanner
 *
 * Detects hardcoded secrets and sensitive data in source code.
 * Designed for CI/CD integration with configurable severity levels.
 *
 * @module lib/secrets/secret-scanner
 */

import { createHash } from "crypto";
import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join, extname, relative } from "path";

// ============================================================================
// Types
// ============================================================================

/**
 * Severity levels for secret findings
 */
export type SecretSeverity = "critical" | "high" | "medium" | "low" | "info";

/**
 * Categories of secrets
 */
export type SecretType =
  | "aws_key"
  | "aws_secret"
  | "github_token"
  | "gitlab_token"
  | "stripe_key"
  | "stripe_webhook"
  | "private_key"
  | "api_key"
  | "jwt_token"
  | "database_url"
  | "password"
  | "slack_webhook"
  | "discord_webhook"
  | "generic_secret"
  | "generic_token"
  | "ssh_key"
  | "google_api"
  | "azure_key"
  | "firebase_key"
  | "sendgrid_key"
  | "twilio_key"
  | "npm_token"
  | "pypi_token"
  | "sentry_dsn"
  | "oauth_token"
  | "bearer_token"
  | "basic_auth"
  | "connection_string";

/**
 * Pattern definition for secret detection
 */
export interface SecretPattern {
  /** Pattern name */
  name: string;
  /** Pattern type */
  type: SecretType;
  /** Regex pattern to match */
  pattern: RegExp;
  /** Severity level */
  severity: SecretSeverity;
  /** Description of the secret type */
  description: string;
  /** Additional keywords to look for in context */
  keywords?: string[];
  /** File extensions this pattern is relevant to */
  fileExtensions?: string[];
  /** Whether this pattern may have false positives */
  mayHaveFalsePositives?: boolean;
}

/**
 * A detected secret finding
 */
export interface SecretFinding {
  /** Unique ID for this finding */
  id: string;
  /** File path where the secret was found */
  file: string;
  /** Relative file path */
  relativeFile: string;
  /** Line number */
  line: number;
  /** Column number */
  column: number;
  /** Pattern that matched */
  pattern: string;
  /** Pattern type */
  type: SecretType;
  /** Severity level */
  severity: SecretSeverity;
  /** Matched value (redacted) */
  match: string;
  /** Line context (redacted) */
  context: string;
  /** Hash of the actual secret for tracking */
  secretHash: string;
  /** Description of the risk */
  description: string;
  /** Suggested remediation */
  remediation: string;
  /** Whether this might be a false positive */
  possibleFalsePositive: boolean;
}

/**
 * Scan result summary
 */
export interface ScanResult {
  /** Total files scanned */
  filesScanned: number;
  /** Files with findings */
  filesWithFindings: number;
  /** All findings */
  findings: SecretFinding[];
  /** Summary by severity */
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  /** Summary by type */
  byType: Map<SecretType, number>;
  /** Scan duration in milliseconds */
  durationMs: number;
  /** Scan timestamp */
  timestamp: Date;
  /** Whether scan should block deployment */
  shouldBlockDeployment: boolean;
}

/**
 * Scanner configuration
 */
export interface ScannerConfig {
  /** Root directory to scan */
  rootDir: string;
  /** Directories to skip */
  skipDirs: string[];
  /** Files to skip */
  skipFiles: string[];
  /** File extensions to scan */
  includeExtensions: string[];
  /** Custom patterns to add */
  customPatterns?: SecretPattern[];
  /** Patterns to exclude */
  excludePatterns?: string[];
  /** Maximum file size in bytes */
  maxFileSizeBytes: number;
  /** Whether to include possible false positives */
  includeFalsePositives: boolean;
  /** Minimum severity to report */
  minSeverity: SecretSeverity;
  /** Whether to generate secret hashes */
  generateHashes: boolean;
  /** Allowlist of file:line combinations to ignore */
  allowlist?: AllowlistEntry[];
}

/**
 * Allowlist entry for ignoring specific findings
 */
export interface AllowlistEntry {
  /** File path pattern */
  file: string;
  /** Line number (optional) */
  line?: number;
  /** Pattern name to ignore */
  pattern?: string;
  /** Reason for allowlisting */
  reason: string;
}

// ============================================================================
// Secret Patterns
// ============================================================================

/**
 * Comprehensive list of secret patterns
 */
export const SECRET_PATTERNS: SecretPattern[] = [
  // AWS
  {
    name: "AWS Access Key ID",
    type: "aws_key",
    pattern:
      /\b(A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}\b/g,
    severity: "critical",
    description: "AWS Access Key ID that could provide access to AWS resources",
    keywords: ["aws", "amazon"],
  },
  {
    name: "AWS Secret Access Key",
    type: "aws_secret",
    pattern: /aws.{0,20}['"][0-9a-zA-Z/+]{40}['"]/gi,
    severity: "critical",
    description: "AWS Secret Access Key for authentication",
    keywords: ["aws", "amazon", "secret"],
  },

  // GitHub
  {
    name: "GitHub Personal Access Token",
    type: "github_token",
    pattern:
      /\b(ghp_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9]{22}_[a-zA-Z0-9]{59})\b/g,
    severity: "critical",
    description: "GitHub Personal Access Token",
    keywords: ["github", "token"],
  },
  {
    name: "GitHub OAuth Token",
    type: "github_token",
    pattern: /\bgho_[a-zA-Z0-9]{36}\b/g,
    severity: "critical",
    description: "GitHub OAuth Access Token",
  },
  {
    name: "GitHub App Token",
    type: "github_token",
    pattern: /\b(ghu_[a-zA-Z0-9]{36}|ghs_[a-zA-Z0-9]{36})\b/g,
    severity: "critical",
    description: "GitHub App Token",
  },

  // GitLab
  {
    name: "GitLab Personal Access Token",
    type: "gitlab_token",
    pattern: /\bglpat-[a-zA-Z0-9_-]{20,}\b/g,
    severity: "critical",
    description: "GitLab Personal Access Token",
  },

  // Stripe
  {
    name: "Stripe Secret Key",
    type: "stripe_key",
    pattern: /\bsk_(live|test)_[0-9a-zA-Z]{24,}\b/g,
    severity: "critical",
    description: "Stripe Secret API Key that can access payment data",
    keywords: ["stripe", "payment"],
  },
  {
    name: "Stripe Restricted Key",
    type: "stripe_key",
    pattern: /\brk_(live|test)_[0-9a-zA-Z]{24,}\b/g,
    severity: "high",
    description: "Stripe Restricted API Key",
  },
  {
    name: "Stripe Webhook Secret",
    type: "stripe_webhook",
    pattern: /\bwhsec_[a-zA-Z0-9]{32,}\b/g,
    severity: "high",
    description: "Stripe Webhook Signing Secret",
  },

  // Private Keys
  {
    name: "RSA Private Key",
    type: "private_key",
    pattern:
      /-----BEGIN RSA PRIVATE KEY-----[\s\S]*?-----END RSA PRIVATE KEY-----/g,
    severity: "critical",
    description: "RSA Private Key",
  },
  {
    name: "EC Private Key",
    type: "private_key",
    pattern:
      /-----BEGIN EC PRIVATE KEY-----[\s\S]*?-----END EC PRIVATE KEY-----/g,
    severity: "critical",
    description: "Elliptic Curve Private Key",
  },
  {
    name: "OpenSSH Private Key",
    type: "ssh_key",
    pattern:
      /-----BEGIN OPENSSH PRIVATE KEY-----[\s\S]*?-----END OPENSSH PRIVATE KEY-----/g,
    severity: "critical",
    description: "OpenSSH Private Key",
  },
  {
    name: "PGP Private Key",
    type: "private_key",
    pattern:
      /-----BEGIN PGP PRIVATE KEY BLOCK-----[\s\S]*?-----END PGP PRIVATE KEY BLOCK-----/g,
    severity: "critical",
    description: "PGP Private Key",
  },

  // Database URLs
  {
    name: "PostgreSQL Connection String",
    type: "database_url",
    pattern: /\bpostgres(ql)?:\/\/[^:]+:[^@]+@[^/\s]+\/[^\s'"]+/gi,
    severity: "high",
    description: "PostgreSQL connection string with credentials",
    keywords: ["postgres", "database", "db"],
  },
  {
    name: "MySQL Connection String",
    type: "database_url",
    pattern: /\bmysql:\/\/[^:]+:[^@]+@[^/\s]+\/[^\s'"]+/gi,
    severity: "high",
    description: "MySQL connection string with credentials",
  },
  {
    name: "MongoDB Connection String",
    type: "database_url",
    pattern: /\bmongodb(\+srv)?:\/\/[^:]+:[^@]+@[^/\s]+\/[^\s'"]+/gi,
    severity: "high",
    description: "MongoDB connection string with credentials",
  },
  {
    name: "Redis Connection String",
    type: "connection_string",
    pattern: /\bredis:\/\/[^:]+:[^@]+@[^/\s]+/gi,
    severity: "high",
    description: "Redis connection string with credentials",
  },

  // JWT Tokens
  {
    name: "JSON Web Token",
    type: "jwt_token",
    pattern: /\beyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_.+/=]+\b/g,
    severity: "medium",
    description: "JSON Web Token that may contain sensitive claims",
    mayHaveFalsePositives: true,
  },

  // Slack
  {
    name: "Slack Webhook URL",
    type: "slack_webhook",
    pattern:
      /https:\/\/hooks\.slack\.com\/services\/T[0-9A-Z]+\/B[0-9A-Z]+\/[0-9a-zA-Z]{24}/g,
    severity: "high",
    description: "Slack Incoming Webhook URL",
  },
  {
    name: "Slack Bot Token",
    type: "oauth_token",
    pattern: /\bxoxb-[0-9]{10,13}-[0-9]{10,13}-[a-zA-Z0-9]{24}\b/g,
    severity: "high",
    description: "Slack Bot OAuth Token",
  },
  {
    name: "Slack User Token",
    type: "oauth_token",
    pattern: /\bxoxp-[0-9]{10,13}-[0-9]{10,13}-[a-zA-Z0-9]{24,32}\b/g,
    severity: "high",
    description: "Slack User OAuth Token",
  },

  // Discord
  {
    name: "Discord Webhook URL",
    type: "discord_webhook",
    pattern:
      /https:\/\/discord(app)?\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+/g,
    severity: "high",
    description: "Discord Webhook URL",
  },
  {
    name: "Discord Bot Token",
    type: "oauth_token",
    pattern: /\b[MN][A-Za-z\d]{23,}\.[A-Za-z\d-_]{6}\.[A-Za-z\d-_]{27}\b/g,
    severity: "critical",
    description: "Discord Bot Token",
    mayHaveFalsePositives: true,
  },

  // Google
  {
    name: "Google API Key",
    type: "google_api",
    pattern: /\bAIza[0-9A-Za-z_-]{35}\b/g,
    severity: "high",
    description: "Google API Key",
  },
  {
    name: "Google OAuth Token",
    type: "oauth_token",
    pattern: /\bya29\.[0-9A-Za-z_-]+\b/g,
    severity: "high",
    description: "Google OAuth Access Token",
  },

  // Firebase
  {
    name: "Firebase Database URL",
    type: "firebase_key",
    pattern: /https:\/\/[a-z0-9-]+\.firebaseio\.com/g,
    severity: "medium",
    description: "Firebase Realtime Database URL",
    mayHaveFalsePositives: true,
  },

  // SendGrid
  {
    name: "SendGrid API Key",
    type: "sendgrid_key",
    pattern: /\bSG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}\b/g,
    severity: "high",
    description: "SendGrid API Key",
  },

  // Twilio
  {
    name: "Twilio API Key",
    type: "twilio_key",
    pattern: /\bSK[a-fA-F0-9]{32}\b/g,
    severity: "high",
    description: "Twilio API Key SID",
  },

  // NPM
  {
    name: "NPM Access Token",
    type: "npm_token",
    pattern: /\bnpm_[a-zA-Z0-9]{36}\b/g,
    severity: "critical",
    description: "NPM Access Token",
  },

  // PyPI
  {
    name: "PyPI API Token",
    type: "pypi_token",
    pattern: /\bpypi-[a-zA-Z0-9_-]{64,}\b/g,
    severity: "critical",
    description: "PyPI API Token",
  },

  // Sentry
  {
    name: "Sentry DSN",
    type: "sentry_dsn",
    pattern: /https:\/\/[a-fA-F0-9]{32}@[^/]+\.ingest\.sentry\.io\/\d+/g,
    severity: "medium",
    description: "Sentry DSN with public key",
    mayHaveFalsePositives: true,
  },
  {
    name: "Sentry Auth Token",
    type: "api_key",
    pattern: /\bsntrys_[a-zA-Z0-9]{64}\b/g,
    severity: "high",
    description: "Sentry Auth Token",
  },

  // Azure
  {
    name: "Azure Storage Key",
    type: "azure_key",
    pattern: /AccountKey=[a-zA-Z0-9+/=]{88}/g,
    severity: "critical",
    description: "Azure Storage Account Key",
  },
  {
    name: "Azure Service Principal",
    type: "azure_key",
    pattern:
      /\b[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\b/g,
    severity: "info",
    description: "Possible Azure GUID (may be service principal)",
    mayHaveFalsePositives: true,
  },

  // Generic Patterns
  {
    name: "Generic API Key",
    type: "api_key",
    pattern:
      /['"][a-zA-Z0-9_-]*api[_-]?key['"]?\s*[:=]\s*['"][a-zA-Z0-9_-]{20,}['"]/gi,
    severity: "medium",
    description: "Generic API key pattern",
    mayHaveFalsePositives: true,
  },
  {
    name: "Generic Secret",
    type: "generic_secret",
    pattern:
      /['"][a-zA-Z0-9_-]*secret['"]?\s*[:=]\s*['"][a-zA-Z0-9_-]{16,}['"]/gi,
    severity: "medium",
    description: "Generic secret pattern",
    mayHaveFalsePositives: true,
  },
  {
    name: "Generic Password",
    type: "password",
    pattern: /['"]?password['"]?\s*[:=]\s*['"][^'"]{8,}['"]/gi,
    severity: "medium",
    description: "Hardcoded password",
    mayHaveFalsePositives: true,
  },
  {
    name: "Bearer Token",
    type: "bearer_token",
    pattern: /Bearer\s+[a-zA-Z0-9_-]{20,}/g,
    severity: "medium",
    description: "Bearer authentication token",
    mayHaveFalsePositives: true,
  },
  {
    name: "Basic Auth",
    type: "basic_auth",
    pattern: /Basic\s+[A-Za-z0-9+/=]{20,}/g,
    severity: "medium",
    description: "Basic authentication credentials",
    mayHaveFalsePositives: true,
  },
];

// ============================================================================
// Default Configuration
// ============================================================================

/**
 * Default scanner configuration
 */
const DEFAULT_CONFIG: ScannerConfig = {
  rootDir: process.cwd(),
  skipDirs: [
    "node_modules",
    ".git",
    ".next",
    "dist",
    "build",
    ".pnpm",
    "coverage",
    "__snapshots__",
    ".turbo",
    ".vercel",
    ".netlify",
  ],
  skipFiles: [
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    "*.min.js",
    "*.map",
    "*.bundle.js",
    "secret-scanner.ts", // Skip self
    "secret-scanner.test.ts",
  ],
  includeExtensions: [
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".json",
    ".env",
    ".yml",
    ".yaml",
    ".md",
    ".txt",
    ".sh",
    ".bash",
    ".zsh",
    ".conf",
    ".config",
    ".cfg",
    ".ini",
    ".properties",
    ".xml",
    ".html",
    ".py",
    ".rb",
    ".go",
    ".rs",
    ".java",
    ".cs",
    ".php",
    ".sql",
    ".graphql",
    ".gql",
  ],
  maxFileSizeBytes: 1024 * 1024, // 1MB
  includeFalsePositives: false,
  minSeverity: "low",
  generateHashes: true,
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Severity priority for comparison
 */
const SEVERITY_PRIORITY: Record<SecretSeverity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
  info: 0,
};

/**
 * Check if severity meets minimum threshold
 */
function meetsSeverityThreshold(
  severity: SecretSeverity,
  minSeverity: SecretSeverity,
): boolean {
  return SEVERITY_PRIORITY[severity] >= SEVERITY_PRIORITY[minSeverity];
}

/**
 * Redact a secret value for safe display
 */
export function redactSecret(
  value: string,
  showFirst: number = 4,
  showLast: number = 4,
): string {
  if (value.length <= showFirst + showLast + 4) {
    return "*".repeat(value.length);
  }
  const first = value.substring(0, showFirst);
  const last = value.substring(value.length - showLast);
  const middle = "*".repeat(Math.min(value.length - showFirst - showLast, 8));
  return `${first}${middle}${last}`;
}

/**
 * Generate a unique ID for a finding
 */
function generateFindingId(
  file: string,
  line: number,
  pattern: string,
): string {
  const hash = createHash("sha256")
    .update(`${file}:${line}:${pattern}`)
    .digest("hex")
    .substring(0, 12);
  return `SEC-${hash}`;
}

/**
 * Generate a hash of the secret for tracking
 */
function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex").substring(0, 16);
}

/**
 * Check if a file should be skipped
 */
function shouldSkipFile(filePath: string, config: ScannerConfig): boolean {
  const fileName = filePath.split("/").pop() ?? "";
  const ext = extname(filePath);

  // Check skip files
  for (const pattern of config.skipFiles) {
    if (pattern.startsWith("*")) {
      if (fileName.endsWith(pattern.substring(1))) return true;
    } else if (fileName === pattern) {
      return true;
    }
  }

  // Check extension
  if (!config.includeExtensions.includes(ext)) return true;

  return false;
}

/**
 * Check if finding is allowlisted
 */
function isAllowlisted(
  file: string,
  line: number,
  pattern: string,
  allowlist: AllowlistEntry[],
): boolean {
  for (const entry of allowlist) {
    const fileMatches = file.includes(entry.file) || file.endsWith(entry.file);
    const lineMatches = entry.line === undefined || entry.line === line;
    const patternMatches =
      entry.pattern === undefined || entry.pattern === pattern;

    if (fileMatches && lineMatches && patternMatches) {
      return true;
    }
  }
  return false;
}

/**
 * Get remediation advice for a finding
 */
// sast-ignore: HARDCODED_CREDENTIAL -- remediation advice strings containing token/key/secret type names; not actual credential values
function getRemediation(type: SecretType): string {
  const remediations: Record<SecretType, string> = {
    aws_key:
      "Rotate the AWS access key immediately and use environment variables or AWS Secrets Manager",
    aws_secret:
      "Rotate the AWS secret key immediately and use IAM roles or Secrets Manager",
    github_token:
      "Revoke the GitHub token and generate a new one with minimal scopes",
    gitlab_token: "Revoke the GitLab token and use CI/CD variables instead",
    stripe_key:
      "Rotate the Stripe key in the dashboard and use environment variables",
    stripe_webhook: "Regenerate the webhook secret in Stripe dashboard",
    private_key:
      "Remove the private key and use secure key management (HSM, Vault)",
    api_key:
      "Rotate the API key and store in environment variables or secret manager",
    jwt_token:
      "JWT tokens should not be hardcoded. Use proper token management",
    database_url:
      "Move database credentials to environment variables or secret manager",
    password:
      "Never hardcode passwords. Use environment variables or secret manager",
    slack_webhook:
      "Regenerate the Slack webhook URL and use environment variables",
    discord_webhook:
      "Regenerate the Discord webhook URL and use environment variables",
    generic_secret:
      "Move secrets to environment variables or a secret management solution",
    generic_token: "Rotate the token and use secure credential storage",
    ssh_key:
      "Remove SSH keys from code. Use SSH agent or secure key management",
    google_api:
      "Restrict the API key in Google Cloud Console and use environment variables",
    azure_key: "Rotate the Azure key and use Azure Key Vault",
    firebase_key: "Use environment variables for Firebase configuration",
    sendgrid_key: "Rotate the SendGrid API key and use environment variables",
    twilio_key: "Rotate the Twilio key and use environment variables",
    npm_token:
      "Revoke the NPM token and use `.npmrc` with environment variables",
    pypi_token: "Revoke the PyPI token and use secure credential storage",
    sentry_dsn:
      "Sentry DSN is semi-public, but consider using environment variables",
    // sast-ignore: HARDCODED_CREDENTIAL -- remediation guidance string in the scanner itself, not a real token
    oauth_token: "OAuth tokens should be obtained dynamically, not hardcoded",
    bearer_token: "Bearer tokens should be obtained at runtime, not hardcoded",
    basic_auth: "Basic auth credentials should use environment variables",
    connection_string:
      "Connection strings with credentials should use environment variables",
  };
  return (
    remediations[type] ??
    "Move this secret to a secure secret management solution"
  );
}

// ============================================================================
// Secret Scanner Class
// ============================================================================

/**
 * Secret scanner for detecting hardcoded secrets
 */
export class SecretScanner {
  private config: ScannerConfig;
  private patterns: SecretPattern[];

  constructor(config: Partial<ScannerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.patterns = [...SECRET_PATTERNS, ...(config.customPatterns ?? [])];

    // Filter out excluded patterns
    if (config.excludePatterns) {
      this.patterns = this.patterns.filter(
        (p) => !config.excludePatterns!.includes(p.name),
      );
    }
  }

  /**
   * Scan a single file
   */
  scanFile(filePath: string): SecretFinding[] {
    const findings: SecretFinding[] = [];

    try {
      const stat = statSync(filePath);
      if (stat.size > this.config.maxFileSizeBytes) {
        return findings;
      }

      const content = readFileSync(filePath, "utf-8");
      const lines = content.split("\n");

      for (const pattern of this.patterns) {
        // Skip patterns with false positives if not included
        if (
          pattern.mayHaveFalsePositives &&
          !this.config.includeFalsePositives
        ) {
          continue;
        }

        // Check severity threshold
        if (
          !meetsSeverityThreshold(pattern.severity, this.config.minSeverity)
        ) {
          continue;
        }

        // Check file extension relevance
        if (pattern.fileExtensions) {
          const ext = extname(filePath);
          if (!pattern.fileExtensions.includes(ext)) {
            continue;
          }
        }

        // Reset regex state
        pattern.pattern.lastIndex = 0;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          let match: RegExpExecArray | null;

          // Create a fresh regex for each line
          const regex = new RegExp(
            pattern.pattern.source,
            pattern.pattern.flags,
          );

          while ((match = regex.exec(line)) !== null) {
            const matchValue = match[0];
            const column = match.index;

            // Check allowlist
            if (
              this.config.allowlist &&
              isAllowlisted(
                filePath,
                i + 1,
                pattern.name,
                this.config.allowlist,
              )
            ) {
              continue;
            }

            const finding: SecretFinding = {
              id: generateFindingId(filePath, i + 1, pattern.name),
              file: filePath,
              relativeFile: relative(this.config.rootDir, filePath),
              line: i + 1,
              column: column + 1,
              pattern: pattern.name,
              type: pattern.type,
              severity: pattern.severity,
              match: redactSecret(matchValue),
              context: redactSecret(line.trim(), 10, 10),
              secretHash: this.config.generateHashes
                ? hashSecret(matchValue)
                : "",
              description: pattern.description,
              remediation: getRemediation(pattern.type),
              possibleFalsePositive: pattern.mayHaveFalsePositives ?? false,
            };

            findings.push(finding);
          }
        }
      }
    } catch (error) {
      // Skip files that can't be read
    }

    return findings;
  }

  /**
   * Recursively scan a directory
   */
  scanDirectory(dirPath: string): SecretFinding[] {
    const findings: SecretFinding[] = [];

    try {
      const items = readdirSync(dirPath);

      for (const item of items) {
        // Check skip directories
        if (this.config.skipDirs.includes(item)) {
          continue;
        }

        const fullPath = join(dirPath, item);

        try {
          const stat = statSync(fullPath);

          if (stat.isDirectory()) {
            findings.push(...this.scanDirectory(fullPath));
          } else if (stat.isFile()) {
            if (!shouldSkipFile(fullPath, this.config)) {
              findings.push(...this.scanFile(fullPath));
            }
          }
        } catch {
          // Skip files/directories that can't be accessed
        }
      }
    } catch {
      // Skip directories that can't be read
    }

    return findings;
  }

  /**
   * Run a full scan
   */
  scan(path?: string): ScanResult {
    const startTime = Date.now();
    const scanPath = path ?? this.config.rootDir;

    if (!existsSync(scanPath)) {
      throw new Error(`Path does not exist: ${scanPath}`);
    }

    const stat = statSync(scanPath);
    let findings: SecretFinding[] = [];
    let filesScanned = 0;

    if (stat.isDirectory()) {
      findings = this.scanDirectory(scanPath);
    } else {
      findings = this.scanFile(scanPath);
      filesScanned = 1;
    }

    // Count files (approximate from findings)
    const filesWithFindings = new Set(findings.map((f) => f.file)).size;

    // Calculate summary
    const summary = {
      critical: findings.filter((f) => f.severity === "critical").length,
      high: findings.filter((f) => f.severity === "high").length,
      medium: findings.filter((f) => f.severity === "medium").length,
      low: findings.filter((f) => f.severity === "low").length,
      info: findings.filter((f) => f.severity === "info").length,
    };

    // Count by type
    const byType = new Map<SecretType, number>();
    for (const finding of findings) {
      byType.set(finding.type, (byType.get(finding.type) ?? 0) + 1);
    }

    // Determine if deployment should be blocked
    const shouldBlockDeployment = summary.critical > 0 || summary.high > 0;

    return {
      filesScanned,
      filesWithFindings,
      findings,
      summary,
      byType,
      durationMs: Date.now() - startTime,
      timestamp: new Date(),
      shouldBlockDeployment,
    };
  }

  /**
   * Get all patterns
   */
  getPatterns(): SecretPattern[] {
    return [...this.patterns];
  }

  /**
   * Add a custom pattern
   */
  addPattern(pattern: SecretPattern): void {
    this.patterns.push(pattern);
  }

  /**
   * Remove a pattern by name
   */
  removePattern(name: string): void {
    this.patterns = this.patterns.filter((p) => p.name !== name);
  }
}

// ============================================================================
// Formatting Functions
// ============================================================================

/**
 * Format a finding for console output
 */
export function formatFinding(finding: SecretFinding): string {
  const severityColors: Record<SecretSeverity, string> = {
    critical: "\x1b[31m", // Red
    high: "\x1b[33m", // Yellow
    medium: "\x1b[35m", // Magenta
    low: "\x1b[36m", // Cyan
    info: "\x1b[37m", // White
  };
  const reset = "\x1b[0m";
  const color = severityColors[finding.severity];

  let output = `\n${color}[${finding.severity.toUpperCase()}]${reset} ${finding.pattern}\n`;
  output += `  File: ${finding.relativeFile}:${finding.line}:${finding.column}\n`;
  output += `  ID: ${finding.id}\n`;
  output += `  Match: ${finding.match}\n`;
  output += `  Context: ${finding.context}\n`;
  output += `  Remediation: ${finding.remediation}\n`;

  if (finding.possibleFalsePositive) {
    output += `  Note: This may be a false positive\n`;
  }

  return output;
}

/**
 * Format a scan result for console output
 */
export function formatScanResult(result: ScanResult): string {
  let output = "\n======================================\n";
  output += "       SECRET SCAN RESULTS\n";
  output += "======================================\n\n";

  output += `Scan completed in ${result.durationMs}ms\n`;
  output += `Files with findings: ${result.filesWithFindings}\n\n`;

  output += "Summary:\n";
  output += `  Critical: ${result.summary.critical}\n`;
  output += `  High:     ${result.summary.high}\n`;
  output += `  Medium:   ${result.summary.medium}\n`;
  output += `  Low:      ${result.summary.low}\n`;
  output += `  Info:     ${result.summary.info}\n\n`;

  if (result.findings.length > 0) {
    output += "Findings:\n";
    for (const finding of result.findings) {
      output += formatFinding(finding);
    }
  } else {
    output += "No secrets found!\n";
  }

  output += "\n======================================\n";

  if (result.shouldBlockDeployment) {
    output +=
      "\x1b[31mDEPLOYMENT BLOCKED: Critical or high severity findings detected\x1b[0m\n";
  } else {
    output +=
      "\x1b[32mDEPLOYMENT ALLOWED: No blocking findings detected\x1b[0m\n";
  }

  return output;
}

/**
 * Format result as JSON
 */
export function formatScanResultJson(result: ScanResult): string {
  return JSON.stringify(
    {
      ...result,
      byType: Object.fromEntries(result.byType),
    },
    null,
    2,
  );
}

// ============================================================================
// SARIF Format (for GitHub Code Scanning)
// ============================================================================

/**
 * Convert scan result to SARIF format
 */
export function toSarif(result: ScanResult): object {
  return {
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    version: "2.1.0",
    runs: [
      {
        tool: {
          driver: {
            name: "nchat-secret-scanner",
            version: "1.0.0",
            informationUri: "https://github.com/nself/nchat",
            rules: SECRET_PATTERNS.map((p) => ({
              id: p.type,
              name: p.name,
              shortDescription: { text: p.description },
              defaultConfiguration: {
                level:
                  p.severity === "critical" || p.severity === "high"
                    ? "error"
                    : "warning",
              },
            })),
          },
        },
        results: result.findings.map((f) => ({
          ruleId: f.type,
          level:
            f.severity === "critical" || f.severity === "high"
              ? "error"
              : "warning",
          message: {
            text: `${f.pattern}: ${f.description}. ${f.remediation}`,
          },
          locations: [
            {
              physicalLocation: {
                artifactLocation: {
                  uri: f.relativeFile,
                },
                region: {
                  startLine: f.line,
                  startColumn: f.column,
                },
              },
            },
          ],
          fingerprints: {
            secretHash: f.secretHash,
          },
        })),
      },
    ],
  };
}

// ============================================================================
// Singleton Instance
// ============================================================================

let defaultScanner: SecretScanner | null = null;

/**
 * Get the default secret scanner
 */
export function getSecretScanner(): SecretScanner {
  if (!defaultScanner) {
    defaultScanner = new SecretScanner();
  }
  return defaultScanner;
}

/**
 * Create a new secret scanner with custom configuration
 */
export function createSecretScanner(
  config: Partial<ScannerConfig> = {},
): SecretScanner {
  return new SecretScanner(config);
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Scan the current directory for secrets
 */
export function scanForSecrets(path?: string): ScanResult {
  return getSecretScanner().scan(path);
}

/**
 * Quick check if any critical/high severity secrets are found
 */
export function hasHighRiskSecrets(path?: string): boolean {
  const result = getSecretScanner().scan(path);
  return result.summary.critical > 0 || result.summary.high > 0;
}
