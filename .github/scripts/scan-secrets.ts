#!/usr/bin/env tsx

/**
 * Secrets Scanner for nself-chat
 *
 * Scans the repository for potential secrets and credentials.
 * Used as part of security validation for v1.0.0 release.
 *
 * Usage:
 *   pnpm tsx scripts/scan-secrets.ts
 *   pnpm tsx scripts/scan-secrets.ts --output json
 *
 * Exit codes:
 *   0 - No secrets found
 *   1 - Secrets found or error occurred
 */

import * as fs from 'fs';
import * as path from 'path';

// Patterns for detecting secrets
const SECRET_PATTERNS = [
  // API Keys
  { name: 'Stripe Live Secret Key', pattern: /sk_live_[a-zA-Z0-9]{24,}/g, severity: 'critical' },
  { name: 'Stripe Live Publishable Key', pattern: /pk_live_[a-zA-Z0-9]{24,}/g, severity: 'high' },

  // GitHub Tokens (actual tokens, not examples)
  { name: 'GitHub Personal Access Token', pattern: /ghp_[a-zA-Z0-9]{36,}/g, severity: 'critical' },
  { name: 'GitHub OAuth Token', pattern: /gho_[a-zA-Z0-9]{36,}/g, severity: 'critical' },

  // AWS Keys (actual keys)
  { name: 'AWS Access Key ID', pattern: /AKIA[0-9A-Z]{16}/g, severity: 'critical' },

  // Generic Private Keys
  { name: 'RSA Private Key', pattern: /-----BEGIN RSA PRIVATE KEY-----/g, severity: 'critical' },
  { name: 'SSH Private Key', pattern: /-----BEGIN OPENSSH PRIVATE KEY-----/g, severity: 'critical' },

  // Database passwords in URLs
  { name: 'PostgreSQL Connection String', pattern: /postgres:\/\/[^:]+:[^@]{8,}@/g, severity: 'high' },
];

// Directories to exclude
const EXCLUDE_DIRS = new Set([
  'node_modules',
  '.next',
  '.git',
  'dist',
  'build',
  'coverage',
  '.claude',
  'e2e',
]);

// Files to exclude
const EXCLUDE_FILES = new Set([
  '.env.example',
  '.env.test.example',
  'scan-secrets.ts',
]);

// Allowlist patterns (known safe occurrences)
const ALLOWLIST = [
  /\.example$/,
  /\.md$/,
  /README/i,
  /EXAMPLE/i,
  /__tests__\//,
  /\.test\./,
  /\.spec\./,
  /scan-secrets\.ts$/,
  /\.wiki\//,
  /\.claude\//,
];

interface SecretMatch {
  file: string;
  line: number;
  match: string;
  pattern: string;
  severity: string;
  context: string;
}

interface ScanResult {
  filesScanned: number;
  secretsFound: number;
  matches: SecretMatch[];
}

/**
 * Check if a file/path should be excluded
 */
function isAllowlisted(filePath: string): boolean {
  const fileName = path.basename(filePath);

  // Check if filename is excluded
  if (EXCLUDE_FILES.has(fileName)) {
    return true;
  }

  // Check allowlist patterns
  return ALLOWLIST.some(pattern => pattern.test(filePath));
}

/**
 * Check if directory should be excluded
 */
function shouldExcludeDir(dirName: string): boolean {
  return EXCLUDE_DIRS.has(dirName) || dirName.startsWith('.');
}

/**
 * Check if a file is binary or should be skipped
 */
function shouldSkipFile(filePath: string): boolean {
  const binaryExtensions = [
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.ico', '.webp',
    '.pdf', '.zip', '.tar', '.gz', '.7z', '.rar',
    '.exe', '.dll', '.so', '.dylib',
    '.woff', '.woff2', '.ttf', '.eot',
    '.mp3', '.mp4', '.avi', '.mov',
    '.db', '.sqlite',
    '.min.js', // Minified JS
  ];

  return binaryExtensions.some(ext => filePath.toLowerCase().endsWith(ext));
}

/**
 * Recursively find all files
 */
function findFiles(dir: string, files: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!shouldExcludeDir(entry.name)) {
        findFiles(fullPath, files);
      }
    } else {
      if (!shouldSkipFile(fullPath)) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

/**
 * Scan a file for secrets
 */
function scanFile(filePath: string): SecretMatch[] {
  const matches: SecretMatch[] = [];

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    for (const secretPattern of SECRET_PATTERNS) {
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex];
        const lineMatches = line.matchAll(secretPattern.pattern);

        for (const match of lineMatches) {
          // Extract context (30 chars before and after)
          const start = Math.max(0, (match.index || 0) - 30);
          const end = Math.min(line.length, (match.index || 0) + match[0].length + 30);
          const context = line.substring(start, end).trim();

          matches.push({
            file: filePath,
            line: lineIndex + 1,
            match: match[0],
            pattern: secretPattern.name,
            severity: secretPattern.severity,
            context: context,
          });
        }
      }
    }
  } catch (error) {
    // Skip files that can't be read as text
  }

  return matches;
}

/**
 * Main scan function
 */
function scanRepository(): ScanResult {
  console.log('🔍 Scanning repository for secrets...\n');

  // Find all files
  const rootDir = process.cwd();
  const files = findFiles(rootDir);

  console.log(`Found ${files.length} files to scan`);

  const allMatches: SecretMatch[] = [];
  let filesScanned = 0;

  for (const file of files) {
    // Skip allowlisted files
    if (isAllowlisted(file)) {
      continue;
    }

    filesScanned++;
    const matches = scanFile(file);
    allMatches.push(...matches);
  }

  return {
    filesScanned,
    secretsFound: allMatches.length,
    matches: allMatches,
  };
}

/**
 * Format output as text
 */
function formatText(result: ScanResult): string {
  let output = '';

  output += '═══════════════════════════════════════════════════════════════\n';
  output += '  SECRETS SCAN REPORT\n';
  output += '═══════════════════════════════════════════════════════════════\n\n';

  output += `Files Scanned: ${result.filesScanned}\n`;
  output += `Secrets Found: ${result.secretsFound}\n\n`;

  if (result.matches.length === 0) {
    output += '✅ No secrets detected!\n';
  } else {
    output += '⚠️  SECRETS DETECTED:\n\n';

    // Group by severity
    const bySeverity = result.matches.reduce((acc, match) => {
      if (!acc[match.severity]) acc[match.severity] = [];
      acc[match.severity].push(match);
      return acc;
    }, {} as Record<string, SecretMatch[]>);

    for (const severity of ['critical', 'high', 'medium', 'low']) {
      const matches = bySeverity[severity] || [];
      if (matches.length === 0) continue;

      output += `\n${severity.toUpperCase()} SEVERITY (${matches.length}):\n`;
      output += '─────────────────────────────────────────────────────────────\n';

      for (const match of matches) {
        output += `  File: ${match.file}\n`;
        output += `  Line: ${match.line}\n`;
        output += `  Type: ${match.pattern}\n`;
        output += `  Context: ...${match.context}...\n\n`;
      }
    }
  }

  output += '═══════════════════════════════════════════════════════════════\n';

  return output;
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const outputFormat = args.includes('--output')
    ? args[args.indexOf('--output') + 1]
    : 'text';

  try {
    const result = scanRepository();

    if (outputFormat === 'json') {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(formatText(result));
    }

    // Exit with error code if secrets found
    if (result.secretsFound > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Error during scan:', error);
    process.exit(1);
  }
}

main();
