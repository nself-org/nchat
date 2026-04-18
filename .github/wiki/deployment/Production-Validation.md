# Production Environment Validation

This document describes the production environment validation system that prevents deploying nself-chat with missing or incorrect environment variables.

## Overview

The production validation system ensures that:

1. All required environment variables are set
2. Production URLs do not use localhost patterns
3. Security secrets meet minimum requirements
4. Development features are disabled

## Validation Script

**Location**: `scripts/validate-env.ts`

**Usage**:

```bash
# Validate current environment
pnpm validate:env

# Validate for production (strict mode)
pnpm validate:env:prod
```

## Production Requirements

### Required Environment Variables

The following environment variables are **required** for production deployment:

#### Frontend (Public)

- `NEXT_PUBLIC_GRAPHQL_URL` - GraphQL endpoint
- `NEXT_PUBLIC_AUTH_URL` - Authentication service endpoint
- `NEXT_PUBLIC_STORAGE_URL` - File storage endpoint

#### Backend (Server-side)

- `HASURA_ADMIN_SECRET` - Admin secret for Hasura (minimum 32 characters)
- `JWT_SECRET` - Secret for JWT signing (minimum 32 characters)

### Prohibited Localhost Patterns

Production URLs cannot contain any of the following patterns:

- `localhost`
- `127.0.0.1`
- `0.0.0.0`
- `.local`
- `host.docker.internal`

**Example of invalid production URL**:

```bash
NEXT_PUBLIC_GRAPHQL_URL=http://localhost:8080/v1/graphql  # ❌ Will fail validation
```

**Example of valid production URL**:

```bash
NEXT_PUBLIC_GRAPHQL_URL=https://graphql.example.com/v1/graphql  # ✓ Valid
```

### Security Requirements

1. **Development Auth**: Must be disabled in production

   ```bash
   NEXT_PUBLIC_USE_DEV_AUTH=false  # Required for production
   ```

2. **JWT Secret**: Minimum 32 characters

   ```bash
   JWT_SECRET=your-super-secret-jwt-key-min-32-chars  # Minimum length enforced
   ```

3. **Hasura Admin Secret**: Minimum 32 characters
   ```bash
   HASURA_ADMIN_SECRET=your-hasura-admin-secret-32-chars  # Minimum length enforced
   ```

## Validation Levels

### 1. Public Environment Variables

Validates format and structure of all `NEXT_PUBLIC_*` variables.

### 2. Environment Information

Checks which services are configured:

- GraphQL API
- Authentication
- Storage
- Real-time (optional)
- Analytics (optional)
- Error tracking (optional)

### 3. Health Check

Performs comprehensive health check:

- Missing required variables
- Localhost usage in production
- Development features in production
- Insecure configurations

### 4. Production Readiness (with `--production` flag)

Strict validation that fails the build if any issues are found:

- All required variables present
- No localhost URLs
- Security requirements met
- Development features disabled

## CI/CD Integration

The validation script is integrated into the CI/CD pipeline:

**File**: `.github/workflows/ci.yml`

```yaml
- name: Validate production environment
  run: pnpm validate:env:prod
  continue-on-error: true
  if: github.ref == 'refs/heads/main' || github.event_name == 'pull_request'
  env:
    NODE_ENV: 'production'
    NEXT_PUBLIC_ENV: 'production'
```

The validation runs on:

- Pushes to `main` branch
- Pull requests to `main` or `develop` branches

**Note**: `continue-on-error: true` allows the build to continue even if production validation fails, but the error is clearly visible in the CI logs. This is intentional for development/staging builds that may not have all production secrets configured.

## Example Output

### Success ✓

```
================================================================================
  ɳChat Environment Validation
================================================================================

1. Public Environment Variables
-------------------------------
✓ Public environment variables are valid

  Environment: production
  App Name: ɳChat
  Dev Auth: Disabled

2. Environment Information
--------------------------

  GraphQL API:      ✓ Configured
  Authentication:   ✓ Configured
  Storage:          ✓ Configured
  Real-time:        ✗ Not configured
  Analytics:        ✗ Disabled
  Error Tracking:   ✗ Disabled

3. Health Check
---------------

✓ Environment is healthy - no issues detected

4. Production Readiness
-----------------------
✓ Environment is ready for production

================================================================================
  Summary
================================================================================

✓ All checks passed!
```

### Failure ❌

```
================================================================================
  ɳChat Environment Validation
================================================================================

...

4. Production Readiness
-----------------------
✗ Environment is NOT ready for production:

❌ Production environment validation failed:

Missing required environment variables:
  - NEXT_PUBLIC_GRAPHQL_URL
  - NEXT_PUBLIC_AUTH_URL
  - NEXT_PUBLIC_STORAGE_URL

Production URLs cannot use localhost:
  - NEXT_PUBLIC_GRAPHQL_URL = http://localhost:8080/v1/graphql

NEXT_PUBLIC_USE_DEV_AUTH is enabled in production.
This is INSECURE and must be set to "false" for production deployments.

Missing required server secrets:
  - JWT_SECRET

Please fix these issues before deploying to production.

 ELIFECYCLE  Command failed with exit code 1.
```

## Deployment Platforms

### Vercel

Set environment variables in Vercel dashboard or via CLI:

```bash
vercel env add NEXT_PUBLIC_GRAPHQL_URL production
vercel env add HASURA_ADMIN_SECRET production
vercel env add JWT_SECRET production
```

### Netlify

Set in `netlify.toml`:

```toml
[build.environment]
  NEXT_PUBLIC_GRAPHQL_URL = "https://graphql.example.com/v1/graphql"

[context.production.environment]
  NEXT_PUBLIC_USE_DEV_AUTH = "false"
```

### Docker

Pass via environment file:

```bash
docker run --env-file .env.production nself-chat:latest
```

### Kubernetes

Define in ConfigMap and Secret:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nchat-config
data:
  NEXT_PUBLIC_GRAPHQL_URL: 'https://graphql.example.com/v1/graphql'
  NEXT_PUBLIC_AUTH_URL: 'https://auth.example.com/v1/auth'
  NEXT_PUBLIC_STORAGE_URL: 'https://storage.example.com/v1/storage'
---
apiVersion: v1
kind: Secret
metadata:
  name: nchat-secrets
type: Opaque
data:
  JWT_SECRET: <base64-encoded-secret>
  HASURA_ADMIN_SECRET: <base64-encoded-secret>
```

## Testing

A comprehensive test suite verifies the validation works correctly:

```bash
./scripts/test-prod-validation.sh
```

**Test cases**:

1. ✓ Missing required variables (should fail)
2. ✓ Localhost URLs in production (should fail)
3. ✓ Short JWT secret (should fail)
4. ✓ Dev auth enabled in production (should fail)
5. ✓ Valid production configuration (should pass)

## Best Practices

1. **Never commit secrets** to version control
   - Use `.env.local` for local development
   - Use platform-specific secret management for production

2. **Use different secrets per environment**
   - Development: Use generated test secrets
   - Staging: Use staging-specific secrets
   - Production: Use strong, unique secrets

3. **Rotate secrets regularly**
   - JWT secrets should be rotated periodically
   - Use a secret management service (AWS Secrets Manager, HashiCorp Vault, etc.)

4. **Validate before deployment**
   - Always run `pnpm validate:env:prod` before deploying
   - Check CI logs for validation warnings

5. **Monitor production deployments**
   - Set up alerts for configuration errors
   - Review validation logs in CI/CD pipeline

## Troubleshooting

### Error: "Missing required environment variables"

**Solution**: Add the missing variables to your deployment platform's environment configuration.

### Error: "Production URLs cannot use localhost"

**Solution**: Replace localhost URLs with production endpoints:

- Development: `http://localhost:8080` → Production: `https://api.example.com`

### Error: "JWT_SECRET must be at least 32 characters long"

**Solution**: Generate a stronger secret:

```bash
# Generate a 64-character random secret
openssl rand -base64 48
```

### Error: "NEXT_PUBLIC_USE_DEV_AUTH is enabled in production"

**Solution**: Set to false in production environment:

```bash
NEXT_PUBLIC_USE_DEV_AUTH=false
```

## Implementation Details

### Validation Library

**Location**: `src/lib/env/validation.ts`

The validation uses Zod schemas for type-safe environment variable validation:

```typescript
import { validateProductionEnv } from '@/lib/env/validation'

try {
  validateProductionEnv()
  console.log('✓ Production environment is valid')
} catch (error) {
  console.error('❌ Production validation failed:', error.message)
  process.exit(1)
}
```

### Key Functions

- `validatePublicEnv()` - Validates public environment variables
- `validateServerEnv()` - Validates server-side environment variables
- `validateProductionEnv()` - Strict production validation (throws on failure)
- `checkEnvHealth()` - Returns health status with issues list
- `getEnvInfo()` - Returns environment configuration info

## Future Enhancements

Potential improvements to the validation system:

1. **Environment-specific validation**: Different requirements for staging vs production
2. **Secret strength validation**: Check for weak or common passwords
3. **URL reachability tests**: Verify endpoints are accessible
4. **Automated secret rotation**: Integration with secret management services
5. **Compliance checks**: GDPR, SOC2, HIPAA requirements
6. **Configuration drift detection**: Compare deployed vs expected configuration

## Related Documentation

- [Environment Variables Reference](.env.example)
- [Deployment Guide](./Deployment.md)
- [Scripts Documentation](README.md)
- [CI/CD Workflows](README.md)
