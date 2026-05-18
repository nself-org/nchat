/**
 * Safe Database Query Utilities
 *
 * Provides helpers for building and executing SQL queries safely.
 * All queries use parameterized statements to prevent SQL injection.
 *
 * @module lib/database/safe-query
 *
 * @example
 * ```typescript
 * import { executeQuery, buildWhereClause } from '@/lib/database/safe-query'
 *
 * // Safe parameterized query
 * const users = await executeQuery(
 *   'SELECT * FROM users WHERE email = $1',
 *   ['user@example.com']
 * )
 *
 * // Build WHERE clause safely
 * const { clause, values } = buildWhereClause({
 *   email: 'user@example.com',
 *   status: 'active'
 * })
 * // clause: "email = $1 AND status = $2"
 * // values: ['user@example.com', 'active']
 * ```
 */

import { Pool, QueryResult } from "pg";

// ============================================================================
// Security Guidelines
// ============================================================================

/**
 * SQL INJECTION PREVENTION RULES:
 *
 * 1. ALWAYS use parameterized queries with $1, $2, etc.
 * 2. NEVER concatenate user input into SQL strings
 * 3. NEVER use template literals with variables in SQL
 * 4. Use this module's helpers for dynamic query building
 * 5. Validate and sanitize all user input before queries
 *
 * GOOD:
 *   pool.query('SELECT * FROM users WHERE id = $1', [userId])
 *
 * BAD (SQL INJECTION VULNERABLE — do not copy this pattern):
 *   pool.query("SELECT * FROM users WHERE id = " + userId)
 *   pool.query("SELECT * FROM users WHERE id = " + userId) // string concat
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface WhereCondition {
  [key: string]: string | number | boolean | null | string[] | number[];
}

export interface WhereClauseResult {
  clause: string;
  values: any[];
}

export interface SafeQueryOptions {
  /** Maximum number of rows to return */
  limit?: number;
  /** Number of rows to skip */
  offset?: number;
  /** Order by clause (column names only, validated) */
  orderBy?: string;
  /** Sort direction (validated) */
  sortOrder?: "ASC" | "DESC";
}

// ============================================================================
// Query Execution
// ============================================================================

/**
 * Execute a parameterized SQL query safely
 *
 * @param pool - PostgreSQL connection pool
 * @param query - SQL query with $1, $2, etc. placeholders
 * @param values - Array of values to bind to placeholders
 * @returns Query result
 *
 * @example
 * ```typescript
 * const result = await executeQuery(
 *   pool,
 *   'SELECT * FROM users WHERE email = $1 AND status = $2',
 *   ['user@example.com', 'active']
 * )
 * ```
 */
export async function executeQuery<
  T extends Record<string, any> = Record<string, any>,
>(pool: Pool, query: string, values: any[] = []): Promise<QueryResult<T>> {
  // Validate query doesn't contain template literal patterns
  if (query.includes("${") || query.includes("`")) {
    throw new Error(
      "SECURITY ERROR: Query contains template literal syntax. Use parameterized queries only.",
    );
  }

  // Execute with parameters
  return pool.query<T>(query, values);
}

// ============================================================================
// WHERE Clause Builder
// ============================================================================

/**
 * Build a safe WHERE clause from an object of conditions
 *
 * Automatically parameterizes all values to prevent SQL injection.
 *
 * @param conditions - Object mapping column names to values
 * @param startIndex - Starting parameter index (default: 1)
 * @returns WHERE clause string and parameter values
 *
 * @example
 * ```typescript
 * const { clause, values } = buildWhereClause({
 *   email: 'user@example.com',
 *   status: 'active',
 *   age: 25
 * })
 * // clause: "email = $1 AND status = $2 AND age = $3"
 * // values: ['user@example.com', 'active', 25]
 *
 * // sast-ignore: SQL_INJECTION -- clause is the safe output of buildWhereClause (parameterized), not user input
 * const query = `SELECT * FROM users WHERE ${clause}`
 * const result = await pool.query(query, values)
 * ```
 */
export function buildWhereClause(
  conditions: WhereCondition,
  startIndex: number = 1,
): WhereClauseResult {
  const clauses: string[] = [];
  const values: any[] = [];
  let paramIndex = startIndex;

  for (const [column, value] of Object.entries(conditions)) {
    // Validate column name (prevent SQL injection via column names)
    if (!isValidColumnName(column)) {
      throw new Error(`Invalid column name: ${column}`);
    }

    if (value === null) {
      clauses.push(`${column} IS NULL`);
    } else if (Array.isArray(value)) {
      // Handle IN clause for arrays
      if (value.length === 0) {
        clauses.push("FALSE"); // No matches for empty array
      } else {
        const placeholders = value.map(() => `$${paramIndex++}`);
        clauses.push(`${column} IN (${placeholders.join(", ")})`);
        values.push(...value);
      }
    } else {
      clauses.push(`${column} = $${paramIndex++}`);
      values.push(value);
    }
  }

  return {
    clause: clauses.join(" AND "),
    values,
  };
}

// ============================================================================
// Column/Table Name Validation
// ============================================================================

/**
 * Validate that a string is a safe column or table name
 *
 * Only allows alphanumeric characters, underscores, and dots (for schema.table)
 *
 * @param name - Column or table name to validate
 * @returns True if valid, false otherwise
 */
export function isValidColumnName(name: string): boolean {
  // Only allow alphanumeric, underscore, and dot
  const validPattern = /^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)?$/;
  return validPattern.test(name);
}

/**
 * Sanitize a column name (throw if invalid)
 *
 * @param name - Column name to sanitize
 * @returns Validated column name
 * @throws {Error} If name contains invalid characters
 */
export function sanitizeColumnName(name: string): string {
  if (!isValidColumnName(name)) {
    throw new Error(
      `Invalid column name: "${name}". Column names must contain only letters, numbers, underscores, and dots.`,
    );
  }
  return name;
}

// ============================================================================
// ORDER BY Builder
// ============================================================================

/**
 * Build a safe ORDER BY clause
 *
 * @param column - Column name to sort by
 * @param direction - Sort direction (ASC or DESC)
 * @returns ORDER BY clause string
 *
 * @example
 * ```typescript
 * const orderBy = buildOrderByClause('created_at', 'DESC')
 * // "ORDER BY created_at DESC"
 *
 * const query = `SELECT * FROM users ${orderBy}`
 * ```
 */
export function buildOrderByClause(
  column: string,
  direction: "ASC" | "DESC" = "ASC",
): string {
  // Validate column name
  const safeColumn = sanitizeColumnName(column);

  // Validate direction
  if (direction !== "ASC" && direction !== "DESC") {
    throw new Error(
      `Invalid sort direction: ${direction}. Must be ASC or DESC.`,
    );
  }

  return `ORDER BY ${safeColumn} ${direction}`;
}

// ============================================================================
// LIMIT/OFFSET Builder
// ============================================================================

/**
 * Build safe LIMIT and OFFSET clauses
 *
 * @param options - Query options with limit and offset
 * @returns Object with limit and offset values for parameterized query
 *
 * @example
 * ```typescript
 * const { limitClause, values } = buildLimitOffsetClause({ limit: 10, offset: 20 })
 * // limitClause: "LIMIT $1 OFFSET $2"
 * // values: [10, 20]
 * ```
 */
export function buildLimitOffsetClause(
  options: SafeQueryOptions,
  startIndex: number = 1,
): { clause: string; values: number[] } {
  const clauses: string[] = [];
  const values: number[] = [];
  let paramIndex = startIndex;

  if (options.limit !== undefined) {
    if (options.limit < 0) {
      throw new Error("LIMIT must be non-negative");
    }
    clauses.push(`LIMIT $${paramIndex++}`);
    values.push(options.limit);
  }

  if (options.offset !== undefined) {
    if (options.offset < 0) {
      throw new Error("OFFSET must be non-negative");
    }
    clauses.push(`OFFSET $${paramIndex++}`);
    values.push(options.offset);
  }

  return {
    clause: clauses.join(" "),
    values,
  };
}

// ============================================================================
// Full Query Builder
// ============================================================================

/**
 * Build a complete SELECT query safely
 *
 * @param table - Table name
 * @param conditions - WHERE conditions
 * @param options - Query options (limit, offset, orderBy)
 * @returns Query string and parameter values
 *
 * @example
 * ```typescript
 * const { query, values } = buildSelectQuery(
 *   'users',
 *   { status: 'active', role: 'admin' },
 *   { limit: 10, offset: 0, orderBy: 'created_at', sortOrder: 'DESC' }
 * )
 * const result = await pool.query(query, values)
 * ```
 */
export function buildSelectQuery(
  table: string,
  conditions: WhereCondition = {},
  options: SafeQueryOptions = {},
): { query: string; values: any[] } {
  // Validate table name
  const safeTable = sanitizeColumnName(table);

  // Build WHERE clause
  const where = buildWhereClause(conditions);
  let paramIndex = where.values.length + 1;

  // Build ORDER BY
  let orderByClause = "";
  if (options.orderBy) {
    orderByClause = buildOrderByClause(options.orderBy, options.sortOrder);
  }

  // Build LIMIT/OFFSET
  const limitOffset = buildLimitOffsetClause(options, paramIndex);

  // Construct query
  const queryParts = [`SELECT * FROM ${safeTable}`];

  if (where.clause) {
    queryParts.push(`WHERE ${where.clause}`);
  }

  if (orderByClause) {
    queryParts.push(orderByClause);
  }

  if (limitOffset.clause) {
    queryParts.push(limitOffset.clause);
  }

  return {
    query: queryParts.join(" "),
    values: [...where.values, ...limitOffset.values],
  };
}
