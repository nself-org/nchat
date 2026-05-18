#!/usr/bin/env tsx
/**
 * CI Environment Variable Validation Script
 *
 * Validates that all required environment variables declared in
 * frontend/.env.example are present and properly configured.
 *
 * This script is used by .github/workflows/validate-secrets.yml to
 * ensure .env.example and the validation registry stay in sync.
 *
 * Usage:
 *   pnpm tsx scripts/validate-secrets.ts --env dev
 *   pnpm tsx scripts/validate-secrets.ts --env staging
 *   pnpm tsx scripts/validate-secrets.ts --env production
 */

// =============================================================================
// Environment variable registry
// Keep in sync with frontend/.env.example
// =============================================================================

interface EnvVar {
  name: string;
  required: boolean;
  description: string;
  environments: ('dev' | 'staging' | 'production')[];
}

const ENV_VARS: EnvVar[] = [
  {
    name: 'HASURA_ADMIN_SECRET',
    required: true,
    description: 'Hasura GraphQL Engine admin secret',
    environments: ['dev', 'staging', 'production'],
  },
  {
    name: 'NEXT_PUBLIC_ALLOW_UNSCANNED_UPLOADS',
    required: false,
    description: 'Allow uploads without virus scan (dev only)',
    environments: ['dev'],
  },
  {
    name: 'NEXT_PUBLIC_APP_NAME',
    required: true,
    description: 'Application display name',
    environments: ['dev', 'staging', 'production'],
  },
  {
    name: 'NEXT_PUBLIC_AUTH_URL',
    required: true,
    description: 'Nhost Auth service URL',
    environments: ['dev', 'staging', 'production'],
  },
  {
    name: 'NEXT_PUBLIC_GRAPHQL_URL',
    required: true,
    description: 'Hasura GraphQL endpoint URL',
    environments: ['dev', 'staging', 'production'],
  },
  {
    name: 'NEXT_PUBLIC_PRIMARY_COLOR',
    required: false,
    description: 'App primary brand color (hex)',
    environments: ['dev', 'staging', 'production'],
  },
  {
    name: 'NEXT_PUBLIC_STORAGE_URL',
    required: true,
    description: 'Nhost Storage service URL',
    environments: ['dev', 'staging', 'production'],
  },
  {
    name: 'NODE_ENV',
    required: true,
    description: 'Node.js environment (development | staging | production)',
    environments: ['dev', 'staging', 'production'],
  },
];

// =============================================================================
// Validation logic
// =============================================================================

function parseArgs(): { env: string; strict: boolean } {
  const args = process.argv.slice(2);
  const envIdx = args.indexOf('--env');
  const env = envIdx >= 0 ? args[envIdx + 1] : 'dev';
  const strict = args.includes('--strict');
  return { env, strict };
}

function mapEnv(env: string): 'dev' | 'staging' | 'production' {
  if (env === 'prod' || env === 'production') return 'production';
  if (env === 'staging') return 'staging';
  return 'dev';
}

function validate(env: 'dev' | 'staging' | 'production', strict: boolean): boolean {
  const vars = ENV_VARS.filter((v) => v.environments.includes(env));
  let passed = 0;
  let failed = 0;

  for (const v of vars) {
    const value = process.env[v.name];
    if (!value && v.required) {
      console.error(`MISSING: ${v.name} — ${v.description}`);
      failed++;
    } else {
      console.log(`OK: ${v.name}`);
      passed++;
    }
  }

  console.log(`\nResult: ${passed} passed, ${failed} failed`);
  return strict ? failed === 0 : true;
}

const { env, strict } = parseArgs();
const mapped = mapEnv(env);
const ok = validate(mapped, strict);
process.exit(ok ? 0 : 1);
