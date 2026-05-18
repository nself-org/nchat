/**
 * Shared Database Connection Pool
 *
 * Singleton pg Pool instance for auth API routes. Using a shared pool
 * prevents multiple pool instances being created when Next.js hot-reloads
 * or when multiple route modules initialise in the same worker process.
 *
 * Usage:
 *   import { getAuthPool } from '@/lib/db/pool'
 *   const pool = getAuthPool()
 *   if (!pool) return // dev-auth mode or env not configured
 */

import { Pool } from "pg";

// ------------------------------------------------------------------
// Module-level singletons (survive across hot-reloads in dev)
// ------------------------------------------------------------------

let _pool: Pool | null = null;

/**
 * Return (or lazily create) the shared pg Pool.
 * Returns null when running in dev-auth mode or when DB env vars are absent,
 * so callers can gracefully degrade without throwing.
 */
export function getAuthPool(): Pool | null {
  if (_pool) return _pool;

  // Honour dev-auth / CI environments that have no real DB
  if (
    process.env.NEXT_PUBLIC_USE_DEV_AUTH === "true" ||
    process.env.SKIP_ENV_VALIDATION === "true"
  ) {
    return null;
  }

  // Require minimum config before creating a pool
  if (
    !process.env.DATABASE_HOST ||
    !process.env.DATABASE_NAME ||
    !process.env.DATABASE_USER
  ) {
    return null;
  }

  _pool = new Pool({
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT || "5432", 10),
    database: process.env.DATABASE_NAME,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    // Limit pool size — each Next.js worker shares this pool across all auth routes
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

  return _pool;
}
