#!/usr/bin/env ts-node
/**
 * Placeholder/Mock Detection Scanner
 *
 * Scans the codebase for unresolved placeholders and mocks in production code.
 * Part of GATE-C092-002 enforcement for v0.9.2 release.
 *
 * Usage:
 *   pnpm scan:placeholders
 *   pnpm scan:placeholders --strict  # Exit with error on violations
 *   pnpm scan:placeholders --json    # Output JSON for CI
 *
 * Exit codes:
 *   0 - No violations found
 *   1 - Violations found (in strict mode)
 *   2 - Script error
 */

import * as fs from 'fs'
import * as path from 'path'

// ============================================================================
// Configuration
// ============================================================================

interface PlaceholderPattern {
  pattern: RegExp
  description: string
  severity: 'error' | 'warning' | 'info'
}

const PLACEHOLDER_PATTERNS: PlaceholderPattern[] = [
  // Code quality markers
  { pattern: /\bTODO\b/g, description: 'TODO marker', severity: 'warning' },
  { pattern: /\bFIXME\b/g, description: 'FIXME marker', severity: 'error' },
  { pattern: /\bHACK\b/g, description: 'HACK marker', severity: 'warning' },
  {
    pattern: /\bXXX\b(?!X)/g,
    description: 'XXX marker (excluding XXXX placeholders)',
    severity: 'warning',
  },
  { pattern: /\bPLACEHOLDER\b/g, description: 'PLACEHOLDER marker', severity: 'error' },

  // Unimplemented code
  { pattern: /NotImplementedError/g, description: 'Not implemented error', severity: 'error' },
  {
    pattern: /throw new Error\s*\(\s*['"]Not implemented/g,
    description: 'Not implemented throw',
    severity: 'error',
  },
  {
    pattern: /throw new Error\s*\(\s*['"]Placeholder/g,
    description: 'Placeholder throw',
    severity: 'error',
  },
  { pattern: /throw new Error\s*\(\s*['"]TODO/g, description: 'TODO throw', severity: 'error' },

  // Debug code
  {
    pattern: /console\.log\([^)]*placeholder/gi,
    description: 'console.log with placeholder',
    severity: 'warning',
  },
  {
    pattern: /console\.log\([^)]*mock/gi,
    description: 'console.log with mock',
    severity: 'warning',
  },
  { pattern: /\bdebugger\b/g, description: 'debugger statement', severity: 'warning' },

  // Test code in production (allowed patterns are excluded separately)
  { pattern: /jest\.mock\s*\(/g, description: 'jest.mock() in production code', severity: 'error' },
  { pattern: /vi\.mock\s*\(/g, description: 'vi.mock() in production code', severity: 'error' },
  { pattern: /MockService/g, description: 'MockService reference', severity: 'warning' },
]

// Production paths that must be clean
const PRODUCTION_PATHS = [
  'frontend/src',
  'frontend/platforms',
  'backend',
]

// Allowed exception paths (test files, mocks, fixtures)
const EXCEPTION_PATHS = [
  '**/__tests__/**',
  '**/*.test.ts',
  '**/*.test.tsx',
  '**/*.spec.ts',
  '**/*.spec.tsx',
  '**/mocks/**',
  '**/fixtures/**',
  '**/__mocks__/**',
  '**/test-utils/**',
  'frontend/packages/testing/**',
]

// Specific files with approved exceptions
const APPROVED_EXCEPTIONS = [
  // FauxAuth is dev-mode only, properly guarded
  'frontend/src/services/auth/faux-auth.service.ts',
  'frontend/src/contexts/auth-context.tsx', // Uses FauxAuth but guarded

  // Bot API has createMockServices for development
  'frontend/src/lib/bots/bot-api.ts',
  'frontend/src/lib/bots/bot-manager.ts',
  'frontend/src/lib/bots/bot-runtime.ts',
  'frontend/src/lib/bots/index.ts',

  // Draft sync has createMockSyncApiClient for offline mode
  'frontend/src/lib/drafts/draft-sync.ts',
  'frontend/src/lib/drafts/index.ts',

  // Bot store has mock creators for SDK testing
  'frontend/src/stores/bot-sdk-store.ts',

  // System health dashboard uses mock data for demo
  'frontend/src/components/admin/monitoring/SystemHealthDashboard.tsx',

  // Entity conversion API uses mock constructors (not test mocks)
  'frontend/src/app/api/entities/[id]/convert/route.ts',

  // Locale validator checks for TODO/FIXME in translation files
  'frontend/src/lib/i18n/locale-validator.ts',

  // Privacy features use PLACEHOLDER constants for redacted content
  'frontend/src/lib/privacy/ip-anonymizer.ts',
  'frontend/src/lib/privacy/index.ts',
  'frontend/src/lib/disappearing/view-once.ts',
  'frontend/src/lib/disappearing/index.ts',

  // XXXX is used as format placeholder in documentation/comments
  'frontend/src/lib/crypto/key-recovery.ts',
  'frontend/src/lib/security/two-factor.ts',
  'frontend/src/lib/auth/registration-lock.ts',
  'frontend/src/lib/2fa/backup-codes.ts',
  'frontend/src/lib/e2ee/recovery-key.ts',

  // UI components with XXXX as input placeholders
  'frontend/src/app/auth/2fa-backup/page.tsx',
  'frontend/src/components/auth/TwoFactorVerify.tsx',
  'frontend/src/components/admin/deployment/VercelDeployButton.tsx',

  // Feature registry references TODO.md for phase documentation
  'frontend/src/config/feature-registry.ts',
]

// ============================================================================
// Types
// ============================================================================

interface Violation {
  file: string
  line: number
  column: number
  pattern: string
  description: string
  severity: 'error' | 'warning' | 'info'
  content: string
  context: string[]
}

interface ScanResult {
  violations: Violation[]
  stats: {
    filesScanned: number
    violationsFound: number
    errors: number
    warnings: number
    info: number
  }
  timestamp: string
  version: string
}

// ============================================================================
// Utilities
// ============================================================================

function isExceptionPath(filePath: string): boolean {
  // Quick check for common test patterns
  if (
    filePath.includes('/__tests__/') ||
    filePath.includes('/test-utils/') ||
    filePath.includes('/mocks/') ||
    filePath.includes('/fixtures/') ||
    filePath.includes('/__mocks__/') ||
    filePath.endsWith('.test.ts') ||
    filePath.endsWith('.test.tsx') ||
    filePath.endsWith('.spec.ts') ||
    filePath.endsWith('.spec.tsx') ||
    filePath.endsWith('setup.ts') ||
    filePath.includes('/testing/')
  ) {
    return true
  }

  // Check if file is in exception paths
  for (const pattern of EXCEPTION_PATHS) {
    const regexPattern = pattern
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\./g, '\\.')
    const regex = new RegExp(regexPattern)
    if (regex.test(filePath)) {
      return true
    }
  }

  // Check if file is in approved exceptions
  for (const exception of APPROVED_EXCEPTIONS) {
    if (filePath.includes(exception)) {
      return true
    }
  }

  return false
}

function getContext(filePath: string, lineNumber: number, contextLines = 2): string[] {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')
    const start = Math.max(0, lineNumber - contextLines - 1)
    const end = Math.min(lines.length, lineNumber + contextLines)
    return lines.slice(start, end).map((line, idx) => {
      const currentLine = start + idx + 1
      const marker = currentLine === lineNumber ? '> ' : '  '
      return `${marker}${currentLine.toString().padStart(4, ' ')} | ${line}`
    })
  } catch (error) {
    return []
  }
}

function walkDirectory(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList

  const files = fs.readdirSync(dir)
  for (const file of files) {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)

    if (stat.isDirectory()) {
      // Skip node_modules, .next, etc.
      if (
        !file.startsWith('.') &&
        file !== 'node_modules' &&
        file !== 'coverage' &&
        file !== 'dist' &&
        file !== 'build'
      ) {
        walkDirectory(filePath, fileList)
      }
    } else if (stat.isFile()) {
      // Only scan .ts and .tsx files
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        fileList.push(filePath)
      }
    }
  }

  return fileList
}

// ============================================================================
// Scanner
// ============================================================================

function scanForPlaceholders(args: string[]): ScanResult {
  const strict = args.includes('--strict')
  const json = args.includes('--json')
  const violations: Violation[] = []
  const projectRoot = path.resolve(__dirname, '../..')

  if (!json) {
    console.log('🔍 Scanning for placeholders and mocks in production code...\n')
  }

  let filesScanned = 0

  // Scan each production path
  for (const prodPath of PRODUCTION_PATHS) {
    const fullPath = path.join(projectRoot, prodPath)
    if (!fs.existsSync(fullPath)) {
      if (!json) {
        console.log(`⚠️  Path does not exist: ${prodPath}`)
      }
      continue
    }

    if (!json) {
      console.log(`📁 Scanning: ${prodPath}`)
    }

    // Get all files in the path
    const files = walkDirectory(fullPath)
    filesScanned += files.length

    for (const file of files) {
      const relativePath = path.relative(projectRoot, file)

      // Skip if in exception path
      if (isExceptionPath(relativePath)) {
        continue
      }

      try {
        const content = fs.readFileSync(file, 'utf-8')
        const lines = content.split('\n')

        // Scan for each pattern
        for (const { pattern, description, severity } of PLACEHOLDER_PATTERNS) {
          for (let lineNum = 0; lineNum < lines.length; lineNum++) {
            const line = lines[lineNum]
            const matches = line.matchAll(pattern)

            for (const match of matches) {
              const column = match.index !== undefined ? match.index + 1 : 0

              violations.push({
                file: relativePath,
                line: lineNum + 1,
                column,
                pattern: pattern.source,
                description,
                severity,
                content: line.trim(),
                context: getContext(file, lineNum + 1),
              })
            }
          }
        }
      } catch (error) {
        if (!json) {
          console.error(`❌ Error reading file ${file}: ${error}`)
        }
      }
    }
  }

  // Calculate statistics
  const stats = {
    filesScanned,
    violationsFound: violations.length,
    errors: violations.filter((v) => v.severity === 'error').length,
    warnings: violations.filter((v) => v.severity === 'warning').length,
    info: violations.filter((v) => v.severity === 'info').length,
  }

  const result: ScanResult = {
    violations,
    stats,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  }

  // Output results
  if (json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log('\n' + '='.repeat(80))
    console.log('📊 SCAN RESULTS')
    console.log('='.repeat(80) + '\n')

    if (violations.length === 0) {
      console.log('✅ No violations found! Production code is clean.\n')
    } else {
      console.log(`Found ${violations.length} violation(s):\n`)

      // Group by file
      const byFile = violations.reduce(
        (acc, v) => {
          if (!acc[v.file]) acc[v.file] = []
          acc[v.file].push(v)
          return acc
        },
        {} as Record<string, Violation[]>
      )

      for (const [file, fileViolations] of Object.entries(byFile)) {
        console.log(`📄 ${file}`)
        for (const violation of fileViolations) {
          const icon =
            violation.severity === 'error' ? '❌' : violation.severity === 'warning' ? '⚠️' : 'ℹ️'
          console.log(`   ${icon} Line ${violation.line}:${violation.column} - ${violation.description}`)
          console.log(`      Pattern: ${violation.pattern}`)
          console.log(`      Content: ${violation.content}`)
          if (violation.context.length > 0) {
            console.log('      Context:')
            violation.context.forEach((line) => console.log(`        ${line}`))
          }
          console.log()
        }
      }

      console.log('\n' + '='.repeat(80))
      console.log('📈 STATISTICS')
      console.log('='.repeat(80) + '\n')
      console.log(`  Files scanned:     ${stats.filesScanned}`)
      console.log(`  Total violations:  ${stats.violationsFound}`)
      console.log(`  ❌ Errors:         ${stats.errors}`)
      console.log(`  ⚠️  Warnings:       ${stats.warnings}`)
      console.log(`  ℹ️  Info:           ${stats.info}`)
      console.log()

      if (strict) {
        console.log('❌ GATE FAILED: Violations found in strict mode\n')
        process.exit(1)
      } else {
        console.log('⚠️  Run with --strict to fail CI on violations\n')
      }
    }
  }

  return result
}

// ============================================================================
// Main
// ============================================================================

if (require.main === module) {
  try {
    const args = process.argv.slice(2)
    scanForPlaceholders(args)
  } catch (error) {
    console.error('❌ Scanner error:', error)
    process.exit(2)
  }
}

export { scanForPlaceholders, type ScanResult, type Violation }
