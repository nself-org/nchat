# Contributing to nSelf Chat

## What This Is

An open-source chat client that runs on top of the nSelf backend stack. Users self-host it using the nSelf CLI.

## Prerequisites

- Node.js 22+
- pnpm 9+
- nSelf CLI with a running local instance

## Setup

```bash
git clone https://github.com/nself-org/nchat
cd chat
pnpm install
```

## Backend

```bash
cd .backend
nself license set nself_pro_xxxx   # if using pro plugins
nself start                         # starts backend stack
```

## Frontend

```bash
pnpm dev    # starts the web client
```

## Pull Requests

1. Fork and create a branch
2. `pnpm lint` and `pnpm typecheck` must pass
3. Submit PR against `main`

## Commit Style

Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `test:`
