#!/usr/bin/env ts-node
/**
 * Migration Verification Script
 * Task 139: Data migration and rollback rehearsals
 *
 * Runs data integrity checks after migration
 */

import { Pool } from 'pg'
import { getErrorMessage } from "../src/lib/utils/error";

const connectionString = process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/nself_production'

async function verifyIntegrity() {
  const pool = new Pool({ connectionString })

  console.log('='.repeat(80))
  console.log('Database Integrity Verification')
  console.log('='.repeat(80))
  console.log(`Database: ${connectionString.replace(/:[^:]+@/, ':****@')}`)
  console.log('')

  try {
    // Check connection
    await pool.query('SELECT 1')
    console.log('✓ Database connection OK')

    // Check foreign keys
    console.log('\nChecking foreign key constraints...')
    const fkResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM information_schema.table_constraints
      WHERE constraint_type = 'FOREIGN KEY'
        AND table_schema = 'nchat'
    `)
    console.log(`✓ Found ${fkResult.rows[0].count} foreign key constraints`)

    // Check unique constraints
    console.log('\nChecking unique constraints...')
    const uniqueResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM information_schema.table_constraints
      WHERE constraint_type = 'UNIQUE'
        AND table_schema = 'nchat'
    `)
    console.log(`✓ Found ${uniqueResult.rows[0].count} unique constraints`)

    // Check indexes
    console.log('\nChecking indexes...')
    const indexResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM pg_indexes
      WHERE schemaname = 'nchat'
    `)
    console.log(`✓ Found ${indexResult.rows[0].count} indexes`)

    // Check for orphaned records (example for messages)
    console.log('\nChecking for orphaned records...')
    const orphanResult = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM nchat.nchat_messages WHERE NOT EXISTS (
          SELECT 1 FROM nchat.nchat_users WHERE id = nchat_messages.user_id
        )) as orphaned_messages,
        (SELECT COUNT(*) FROM nchat.nchat_channel_members WHERE NOT EXISTS (
          SELECT 1 FROM nchat.nchat_users WHERE id = nchat_channel_members.user_id
        )) as orphaned_channel_members
    `)

    const orphanedMessages = parseInt(orphanResult.rows[0].orphaned_messages)
    const orphanedChannelMembers = parseInt(orphanResult.rows[0].orphaned_channel_members)

    if (orphanedMessages > 0 || orphanedChannelMembers > 0) {
      console.log(`⚠️  Found orphaned records:`)
      console.log(`   - Messages: ${orphanedMessages}`)
      console.log(`   - Channel Members: ${orphanedChannelMembers}`)
      process.exit(1)
    } else {
      console.log('✓ No orphaned records found')
    }

    // Table counts
    console.log('\nTable record counts:')
    const tables = ['nchat_users', 'nchat_channels', 'nchat_messages', 'nchat_channel_members']
    for (const table of tables) {
      const countResult = await pool.query(`SELECT COUNT(*) as count FROM nchat.${table}`)
      console.log(`  - ${table}: ${countResult.rows[0].count}`)
    }

    console.log('\n' + '='.repeat(80))
    console.log('✓ All integrity checks passed')
    console.log('='.repeat(80))

    process.exit(0)

  } catch (error) {
    console.error('\n✗ Integrity check failed:', getErrorMessage(error))
    process.exit(1)
  } finally {
    await pool.end()
  }
}

verifyIntegrity()
