# E2E Backend Setup

This page documents how the E2E CI workflow provisions the nself backend stack for
Playwright tests.

## Overview

The three-shard `e2e-web` job provisions the nself backend on each ephemeral GitHub
Actions runner before running the Playwright test slice. Because GHA jobs run on
isolated runners, the backend must be started WITHIN the same job that runs the tests.

## Backend port map

The nself default port assignments used in E2E:

| Service | Port | Health endpoint |
|---------|------|-----------------|
| Hasura GraphQL | 8080 | `http://localhost:8080/healthz` |
| Nhost Auth | 4000 | `http://localhost:4000/healthz` |
| MinIO (S3) | 9000 | — |
| Postgres | 5432 | — (internal only) |
| Redis | 6379 | — (internal only) |
| Nginx (SSL terminator) | 443/80 | — (not used in CI; tests use direct ports) |

These ports are the nself standard defaults; they are not changed by nchat. No new ports
are introduced by tracking `backend/docker-compose.yml`.

## backend/docker-compose.yml in git

`backend/docker-compose.yml` is tracked in this repo as a CI exception to the standard
"generated files are gitignored" rule. The nself CLI's `nself start --skip-build` command
requires the compose file to be present at checkout. Tracking it allows CI to use the
pre-generated stack definition without running `nself build` (which requires a plugin
license key).

The file is regenerated locally by `nself build` on every developer machine; CI uses
the committed version. The `backend/.gitignore` exception is:

```gitignore
docker-compose.*.yml
!docker-compose.yml
```

## Provisioning steps in CI

1. Install nself CLI binary from GitHub release
2. Create `backend/.env` by copying `backend/.env.dev` (the nself CLI detects a project
   via the presence of a bare `.env` file)
3. Create build-state marker so `--skip-build` skips the legacy artifact check
4. Run `nself start --skip-build --allow-legacy --quiet`
5. Wait for Hasura health (up to 120 s)
6. Wait for Auth health (up to 120 s)
7. Seed E2E test users via the Auth API

## Test users

All test users use password `password123` and are seeded before tests run:

| Email | Role |
|-------|------|
| owner@nself.org | owner |
| admin@nself.org | admin |
| moderator@nself.org | moderator |
| member@nself.org | member |
| guest@nself.org | guest |

Seeding is idempotent — HTTP 409/422 (already exists) is treated as success.
