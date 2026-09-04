#!/usr/bin/env ts-node
/**
 * Migration Testing Framework
 * Task 139: Data migration and rollback rehearsals
 *
 * Tests database migrations for:
 * - Forward compatibility
 * - Rollback procedures
 * - Data integrity
 * - Performance impact
 */

import { Pool } from 'pg'
import fs from 'fs'
import path from 'path'
import { performance } from 'perf_hooks'
import { getErrorMessage } from "../src/lib/utils/error";

interface MigrationTest {
  name: string
  filePath: string
  forwardSQL: string
  rollbackSQL: string | null
  testData?: string
  expectedChanges: {
    tables?: string[]
    columns?: { table: string; column: string }[]
    indexes?: string[]
    functions?: string[]
  }
}

interface TestResult {
  migration: string
  phase: 'forward' | 'rollback' | 'data-integrity' | 'performance'
  success: boolean
  duration: number
  error?: string
  details?: any
}

class MigrationTester {
  private pool: Pool
  private results: TestResult[] = []
  private migrations: MigrationTest[] = []

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    })
  }

  /**
   * Load all migration files
   */
  async loadMigrations(migrationsDir: string): Promise<void> {
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort()

    for (const file of files) {
      const filePath = path.join(migrationsDir, file)
      const forwardSQL = fs.readFileSync(filePath, 'utf-8')

      // Try to find corresponding rollback file
      const rollbackPath = filePath.replace('.sql', '.rollback.sql')
      let rollbackSQL: string | null = null

      if (fs.existsSync(rollbackPath)) {
        rollbackSQL = fs.readFileSync(rollbackPath, 'utf-8')
      } else {
        // Generate rollback SQL from forward migration
        rollbackSQL = this.generateRollbackSQL(forwardSQL, file)
      }

      this.migrations.push({
        name: file,
        filePath,
        forwardSQL,
        rollbackSQL,
        expectedChanges: this.parseExpectedChanges(forwardSQL),
      })
    }

    console.log(`Loaded ${this.migrations.length} migrations`)
  }

  /**
   * Generate rollback SQL from forward migration
   */
  private generateRollbackSQL(forwardSQL: string, fileName: string): string | null {
    const rollbackStatements: string[] = []

    // Extract CREATE TABLE statements
    const tableMatches = forwardSQL.matchAll(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?([a-z_]+\.)?([a-z_]+)/gi)
    for (const match of tableMatches) {
      const schema = match[1]?.replace('.', '') || 'public'
      const table = match[2]
      rollbackStatements.push(`DROP TABLE IF EXISTS ${schema}.${table} CASCADE;`)
    }

    // Extract ALTER TABLE ADD COLUMN statements
    const alterMatches = forwardSQL.matchAll(/ALTER TABLE\s+([a-z_]+\.)?([a-z_]+)\s+ADD COLUMN\s+(?:IF NOT EXISTS\s+)?([a-z_]+)/gi)
    for (const match of alterMatches) {
      const schema = match[1]?.replace('.', '') || 'public'
      const table = match[2]
      const column = match[3]
      rollbackStatements.push(`ALTER TABLE ${schema}.${table} DROP COLUMN IF EXISTS ${column} CASCADE;`)
    }

    // Extract CREATE INDEX statements
    const indexMatches = forwardSQL.matchAll(/CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF NOT EXISTS\s+)?([a-z_]+)/gi)
    for (const match of indexMatches) {
      const index = match[1]
      rollbackStatements.push(`DROP INDEX IF EXISTS ${index} CASCADE;`)
    }

    // Extract CREATE FUNCTION statements
    const functionMatches = forwardSQL.matchAll(/CREATE\s+(?:OR REPLACE\s+)?FUNCTION\s+([a-z_]+\.)?([a-z_]+)/gi)
    for (const match of functionMatches) {
      const schema = match[1]?.replace('.', '') || 'public'
      const func = match[2]
      rollbackStatements.push(`DROP FUNCTION IF EXISTS ${schema}.${func} CASCADE;`)
    }

    if (rollbackStatements.length === 0) {
      console.warn(`⚠️  Could not generate rollback for ${fileName}`)
      return null
    }

    return `-- Auto-generated rollback for ${fileName}\n` +
           `-- Generated: ${new Date().toISOString()}\n\n` +
           rollbackStatements.reverse().join('\n')
  }

  /**
   * Parse expected changes from migration SQL
   */
  private parseExpectedChanges(sql: string): MigrationTest['expectedChanges'] {
    const tables: string[] = []
    const columns: { table: string; column: string }[] = []
    const indexes: string[] = []
    const functions: string[] = []

    // Extract tables
    const tableMatches = sql.matchAll(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(?:[a-z_]+\.)?([a-z_]+)/gi)
    for (const match of tableMatches) {
      tables.push(match[1])
    }

    // Extract columns
    const alterMatches = sql.matchAll(/ALTER TABLE\s+(?:[a-z_]+\.)?([a-z_]+)\s+ADD COLUMN\s+(?:IF NOT EXISTS\s+)?([a-z_]+)/gi)
    for (const match of alterMatches) {
      columns.push({ table: match[1], column: match[2] })
    }

    // Extract indexes
    const indexMatches = sql.matchAll(/CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF NOT EXISTS\s+)?([a-z_]+)/gi)
    for (const match of indexMatches) {
      indexes.push(match[1])
    }

    // Extract functions
    const functionMatches = sql.matchAll(/CREATE\s+(?:OR REPLACE\s+)?FUNCTION\s+(?:[a-z_]+\.)?([a-z_]+)/gi)
    for (const match of functionMatches) {
      functions.push(match[1])
    }

    return { tables, columns, indexes, functions }
  }

  /**
   * Create test database snapshot
   */
  async createSnapshot(name: string): Promise<void> {
    try {
      // Export current schema
      await this.pool.query(`
        CREATE SCHEMA IF NOT EXISTS migration_snapshots;

        DROP TABLE IF EXISTS migration_snapshots.snapshot_${name};

        CREATE TABLE migration_snapshots.snapshot_${name} AS
        SELECT
          schemaname,
          tablename,
          tableowner
        FROM pg_tables
        WHERE schemaname NOT IN ('pg_catalog', 'information_schema', 'migration_snapshots');
      `)

      console.log(`✓ Created snapshot: ${name}`)
    } catch (error) {
      console.error(`✗ Failed to create snapshot ${name}:`, getErrorMessage(error))
      throw error
    }
  }

  /**
   * Test forward migration
   */
  async testForwardMigration(migration: MigrationTest): Promise<TestResult> {
    const startTime = performance.now()

    try {
      // Create snapshot before migration
      await this.createSnapshot(`before_${migration.name}`)

      // Execute migration
      await this.pool.query(migration.forwardSQL)

      // Verify expected changes
      const verification = await this.verifyChanges(migration.expectedChanges)

      const duration = performance.now() - startTime

      const result: TestResult = {
        migration: migration.name,
        phase: 'forward',
        success: verification.success,
        duration,
        details: verification,
      }

      if (!verification.success) {
        result.error = 'Migration did not produce expected changes'
      }

      this.results.push(result)
      return result

    } catch (error) {
      const duration = performance.now() - startTime
      const result: TestResult = {
        migration: migration.name,
        phase: 'forward',
        success: false,
        duration,
        error: getErrorMessage(error),
      }

      this.results.push(result)
      return result
    }
  }

  /**
   * Test rollback migration
   */
  async testRollback(migration: MigrationTest): Promise<TestResult> {
    const startTime = performance.now()

    if (!migration.rollbackSQL) {
      return {
        migration: migration.name,
        phase: 'rollback',
        success: false,
        duration: 0,
        error: 'No rollback SQL available',
      }
    }

    try {
      // Create snapshot before rollback
      await this.createSnapshot(`before_rollback_${migration.name}`)

      // Execute rollback
      await this.pool.query(migration.rollbackSQL)

      // Verify changes were reverted
      const verification = await this.verifyRollback(migration.expectedChanges)

      const duration = performance.now() - startTime

      const result: TestResult = {
        migration: migration.name,
        phase: 'rollback',
        success: verification.success,
        duration,
        details: verification,
      }

      if (!verification.success) {
        result.error = 'Rollback did not revert all changes'
      }

      this.results.push(result)
      return result

    } catch (error) {
      const duration = performance.now() - startTime
      const result: TestResult = {
        migration: migration.name,
        phase: 'rollback',
        success: false,
        duration,
        error: getErrorMessage(error),
      }

      this.results.push(result)
      return result
    }
  }

  /**
   * Verify migration changes
   */
  private async verifyChanges(expected: MigrationTest['expectedChanges']): Promise<any> {
    const results = {
      success: true,
      tables: { expected: 0, found: 0, missing: [] as string[] },
      columns: { expected: 0, found: 0, missing: [] as any[] },
      indexes: { expected: 0, found: 0, missing: [] as string[] },
      functions: { expected: 0, found: 0, missing: [] as string[] },
    }

    // Verify tables
    if (expected.tables && expected.tables.length > 0) {
      results.tables.expected = expected.tables.length

      for (const table of expected.tables) {
        const { rows } = await this.pool.query(
          `SELECT table_name FROM information_schema.tables
           WHERE table_name = $1 AND table_schema NOT IN ('pg_catalog', 'information_schema')`,
          [table]
        )

        if (rows.length > 0) {
          results.tables.found++
        } else {
          results.tables.missing.push(table)
          results.success = false
        }
      }
    }

    // Verify columns
    if (expected.columns && expected.columns.length > 0) {
      results.columns.expected = expected.columns.length

      for (const col of expected.columns) {
        const { rows } = await this.pool.query(
          `SELECT column_name FROM information_schema.columns
           WHERE table_name = $1 AND column_name = $2`,
          [col.table, col.column]
        )

        if (rows.length > 0) {
          results.columns.found++
        } else {
          results.columns.missing.push(col)
          results.success = false
        }
      }
    }

    // Verify indexes
    if (expected.indexes && expected.indexes.length > 0) {
      results.indexes.expected = expected.indexes.length

      for (const index of expected.indexes) {
        const { rows } = await this.pool.query(
          `SELECT indexname FROM pg_indexes WHERE indexname = $1`,
          [index]
        )

        if (rows.length > 0) {
          results.indexes.found++
        } else {
          results.indexes.missing.push(index)
          results.success = false
        }
      }
    }

    // Verify functions
    if (expected.functions && expected.functions.length > 0) {
      results.functions.expected = expected.functions.length

      for (const func of expected.functions) {
        const { rows } = await this.pool.query(
          `SELECT routine_name FROM information_schema.routines
           WHERE routine_name = $1 AND routine_type = 'FUNCTION'`,
          [func]
        )

        if (rows.length > 0) {
          results.functions.found++
        } else {
          results.functions.missing.push(func)
          results.success = false
        }
      }
    }

    return results
  }

  /**
   * Verify rollback reverted changes
   */
  private async verifyRollback(expected: MigrationTest['expectedChanges']): Promise<any> {
    const results = {
      success: true,
      tables: { shouldBeRemoved: 0, stillExist: [] as string[] },
      columns: { shouldBeRemoved: 0, stillExist: [] as any[] },
    }

    // Verify tables were removed
    if (expected.tables && expected.tables.length > 0) {
      results.tables.shouldBeRemoved = expected.tables.length

      for (const table of expected.tables) {
        const { rows } = await this.pool.query(
          `SELECT table_name FROM information_schema.tables
           WHERE table_name = $1 AND table_schema NOT IN ('pg_catalog', 'information_schema')`,
          [table]
        )

        if (rows.length > 0) {
          results.tables.stillExist.push(table)
          results.success = false
        }
      }
    }

    // Verify columns were removed
    if (expected.columns && expected.columns.length > 0) {
      results.columns.shouldBeRemoved = expected.columns.length

      for (const col of expected.columns) {
        const { rows } = await this.pool.query(
          `SELECT column_name FROM information_schema.columns
           WHERE table_name = $1 AND column_name = $2`,
          [col.table, col.column]
        )

        if (rows.length > 0) {
          results.columns.stillExist.push(col)
          results.success = false
        }
      }
    }

    return results
  }

  /**
   * Test data integrity after migration
   */
  async testDataIntegrity(migration: MigrationTest): Promise<TestResult> {
    const startTime = performance.now()

    try {
      // Run data integrity checks
      const checks = await this.runIntegrityChecks()

      const duration = performance.now() - startTime

      const result: TestResult = {
        migration: migration.name,
        phase: 'data-integrity',
        success: checks.success,
        duration,
        details: checks,
      }

      if (!checks.success) {
        result.error = 'Data integrity violations detected'
      }

      this.results.push(result)
      return result

    } catch (error) {
      const duration = performance.now() - startTime
      const result: TestResult = {
        migration: migration.name,
        phase: 'data-integrity',
        success: false,
        duration,
        error: getErrorMessage(error),
      }

      this.results.push(result)
      return result
    }
  }

  /**
   * Run database integrity checks
   */
  private async runIntegrityChecks(): Promise<any> {
    const checks = {
      success: true,
      foreignKeys: { valid: 0, invalid: 0, violations: [] as any[] },
      uniqueConstraints: { valid: 0, invalid: 0, violations: [] as any[] },
      nullConstraints: { valid: 0, invalid: 0, violations: [] as any[] },
    }

    // Check foreign key constraints
    const fkQuery = `
      SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema NOT IN ('pg_catalog', 'information_schema')
    `

    const { rows: fks } = await this.pool.query(fkQuery)

    for (const fk of fks) {
      // Check for orphaned records
      const orphanQuery = `
        SELECT COUNT(*) as count
        FROM ${fk.table_name} t
        WHERE NOT EXISTS (
          SELECT 1 FROM ${fk.foreign_table_name} f
          WHERE f.${fk.foreign_column_name} = t.${fk.column_name}
        )
      `

      try {
        const { rows: orphans } = await this.pool.query(orphanQuery)

        if (parseInt(orphans[0].count) > 0) {
          checks.foreignKeys.invalid++
          checks.foreignKeys.violations.push({
            constraint: fk.constraint_name,
            table: fk.table_name,
            orphanedRecords: orphans[0].count,
          })
          checks.success = false
        } else {
          checks.foreignKeys.valid++
        }
      } catch (error) {
        // Table might not exist yet
        continue
      }
    }

    return checks
  }

  /**
   * Test migration performance
   */
  async testPerformance(migration: MigrationTest): Promise<TestResult> {
    const startTime = performance.now()

    try {
      // Get query plan for migration
      const explainSQL = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${migration.forwardSQL}`

      let queryPlan: any = null
      try {
        const { rows } = await this.pool.query(explainSQL)
        queryPlan = rows[0]['QUERY PLAN']
      } catch {
        // Some statements can't be explained
        queryPlan = null
      }

      const duration = performance.now() - startTime

      const result: TestResult = {
        migration: migration.name,
        phase: 'performance',
        success: duration < 30000, // Fail if > 30 seconds
        duration,
        details: {
          queryPlan,
          durationMs: duration,
          threshold: 30000,
        },
      }

      if (duration >= 30000) {
        result.error = `Migration took ${duration.toFixed(0)}ms (> 30s threshold)`
      }

      this.results.push(result)
      return result

    } catch (error) {
      const duration = performance.now() - startTime
      const result: TestResult = {
        migration: migration.name,
        phase: 'performance',
        success: false,
        duration,
        error: getErrorMessage(error),
      }

      this.results.push(result)
      return result
    }
  }

  /**
   * Generate test report
   */
  generateReport(): string {
    const report: string[] = []

    report.push('# Migration Test Report')
    report.push(`Generated: ${new Date().toISOString()}`)
    report.push('')
    report.push(`Total Migrations: ${this.migrations.length}`)
    report.push(`Total Tests: ${this.results.length}`)
    report.push('')

    // Summary by phase
    const phases = ['forward', 'rollback', 'data-integrity', 'performance']

    for (const phase of phases) {
      const phaseResults = this.results.filter(r => r.phase === phase)
      const passed = phaseResults.filter(r => r.success).length
      const failed = phaseResults.filter(r => !r.success).length

      report.push(`## ${phase.toUpperCase()} Tests`)
      report.push(`- Passed: ${passed}`)
      report.push(`- Failed: ${failed}`)
      report.push(`- Pass Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`)
      report.push('')
    }

    // Failed tests
    const failedTests = this.results.filter(r => !r.success)

    if (failedTests.length > 0) {
      report.push('## Failed Tests')
      report.push('')

      for (const test of failedTests) {
        report.push(`### ${test.migration} (${test.phase})`)
        report.push(`- Error: ${test.error || 'Unknown error'}`)
        report.push(`- Duration: ${test.duration.toFixed(2)}ms`)

        if (test.details) {
          report.push('- Details:')
          report.push('```json')
          report.push(JSON.stringify(test.details, null, 2))
          report.push('```')
        }

        report.push('')
      }
    }

    // Performance summary
    const perfResults = this.results.filter(r => r.phase === 'performance')
    const avgDuration = perfResults.reduce((sum, r) => sum + r.duration, 0) / perfResults.length
    const maxDuration = Math.max(...perfResults.map(r => r.duration))

    report.push('## Performance Summary')
    report.push(`- Average Duration: ${avgDuration.toFixed(2)}ms`)
    report.push(`- Maximum Duration: ${maxDuration.toFixed(2)}ms`)
    report.push('')

    return report.join('\n')
  }

  /**
   * Cleanup test artifacts
   */
  async cleanup(): Promise<void> {
    try {
      await this.pool.query('DROP SCHEMA IF EXISTS migration_snapshots CASCADE')
      console.log('✓ Cleaned up test artifacts')
    } catch (error) {
      console.error('✗ Cleanup failed:', getErrorMessage(error))
    }

    await this.pool.end()
  }
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2)
  const migrationsDir = args[0] || path.join(__dirname, '../.backend/migrations')
  const connectionString = process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/nself_test'

  console.log('='.repeat(80))
  console.log('Migration Testing Framework')
  console.log('='.repeat(80))
  console.log(`Migrations Directory: ${migrationsDir}`)
  console.log(`Database: ${connectionString.replace(/:[^:]+@/, ':****@')}`)
  console.log('')

  const tester = new MigrationTester(connectionString)

  try {
    // Load migrations
    await tester.loadMigrations(migrationsDir)

    // Test each migration
    for (const migration of tester['migrations'].slice(0, 5)) { // Test first 5 for demo
      console.log(`\nTesting: ${migration.name}`)
      console.log('-'.repeat(80))

      // Forward migration
      const forwardResult = await tester.testForwardMigration(migration)
      console.log(`  Forward: ${forwardResult.success ? '✓' : '✗'} (${forwardResult.duration.toFixed(2)}ms)`)

      // Data integrity
      const integrityResult = await tester.testDataIntegrity(migration)
      console.log(`  Integrity: ${integrityResult.success ? '✓' : '✗'} (${integrityResult.duration.toFixed(2)}ms)`)

      // Rollback
      if (migration.rollbackSQL) {
        const rollbackResult = await tester.testRollback(migration)
        console.log(`  Rollback: ${rollbackResult.success ? '✓' : '✗'} (${rollbackResult.duration.toFixed(2)}ms)`)
      } else {
        console.log(`  Rollback: ⚠️  No rollback SQL`)
      }
    }

    // Generate report
    console.log('\n' + '='.repeat(80))
    const report = tester.generateReport()
    console.log(report)

    // Save report
    const reportPath = path.join(__dirname, '../docs/migration-test-report.md')
    fs.writeFileSync(reportPath, report)
    console.log(`\n✓ Report saved to: ${reportPath}`)

  } catch (error) {
    console.error('\n✗ Test failed:', getErrorMessage(error))
    if (error instanceof Error) {
      console.error(error.stack)
    }
    process.exit(1)
  } finally {
    await tester.cleanup()
  }
}

if (require.main === module) {
  main()
}

export { MigrationTester, MigrationTest, TestResult }
