# Quick Reference

**nself-chat Command Cheat Sheet** - All essential commands in one place.

---

## 🚀 Quick Start Commands

```bash
# Clone and setup
git clone https://github.com/nself-org/chat.git
cd nself-chat

# Backend setup
cd backend
nself start

# Frontend setup
cd ../frontend/apps/web
pnpm install
pnpm dev
```

---

## 🔧 Backend Commands (nself CLI)

**Location**: Run from `/backend` directory

### Service Management

```bash
# Start all services
nself start

# Stop all services
nself stop

# Restart services
nself restart

# Check status
nself status

# View all service URLs
nself urls

# View logs
nself logs              # All services
nself logs postgres     # Specific service
nself logs -f           # Follow mode

# Diagnose issues
nself doctor
```

### Database Commands

```bash
# Run migrations
nself db migrate up

# Check migration status
nself db migrate status

# Rollback last migration
nself db migrate down

# Seed database
nself db seed

# Backup database
nself db backup database --compress

# Restore from backup
nself db restore <backup-name>

# Open database shell
nself db shell

# Generate TypeScript types
nself db types typescript
```

### Service-Specific Commands

```bash
# Shell into container
nself exec postgres     # PostgreSQL
nself exec hasura      # Hasura
nself exec auth        # Auth service

# Reset services
nself reset             # Reset all services
nself reset postgres    # Reset specific service
```

---

## 💻 Frontend Web Commands

**Location**: Run from `/frontend/apps/web` directory

### Development

```bash
# Start development server (port 3000)
pnpm dev

# Start with Turbopack (faster)
pnpm dev:turbo

# Start on different port
PORT=3001 pnpm dev
```

### Building

```bash
# Production build
pnpm build

# Start production server
pnpm start

# Build and analyze bundle
pnpm analyze:bundle
```

### Testing

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# With coverage
pnpm test:coverage

# E2E tests (Playwright)
pnpm test:e2e

# E2E with UI
pnpm test:e2e:ui

# Specific test file
pnpm test src/components/ui/button.test.tsx
```

### Code Quality

```bash
# Lint code
pnpm lint

# Fix linting issues
pnpm lint:fix

# Type check
pnpm type-check

# Format code (Prettier)
pnpm format

# Check formatting
pnpm format:check

# All checks (lint + type + format)
pnpm check:all
```

---

## 📱 Mobile App Commands

**Location**: Run from `/frontend/apps/mobile` directory

### Development

```bash
# Install dependencies
pnpm install

# Build web app
pnpm build

# Sync to iOS
pnpm sync:ios

# Sync to Android
pnpm sync:android

# Open in Xcode (requires macOS)
pnpm ios

# Open in Android Studio
pnpm android
```

### Testing on Device

```bash
# iOS (via Xcode)
1. Open Xcode: npx cap open ios
2. Select device/simulator
3. Click Run

# Android (via Android Studio)
1. Open Android Studio: npx cap open android
2. Select device/emulator
3. Click Run
```

### Building for Production

```bash
# iOS
pnpm build && pnpm sync:ios
# Then in Xcode: Product > Archive

# Android
pnpm build && pnpm sync:android
# Then in Android Studio: Build > Generate Signed Bundle/APK
```

---

## 🖥️ Desktop App Commands

**Location**: Run from `/frontend/apps/desktop` directory

### Development

```bash
# Install dependencies
pnpm install

# Start Electron app
pnpm start

# Start web dev server (for testing in browser)
pnpm dev
```

### Building Installers

```bash
# Build for current platform
pnpm build

# Build for macOS
pnpm dist:mac
# Output: release/mac/nself-chat-0.9.2.dmg

# Build for Windows
pnpm dist:win
# Output: release/win/nself-chat Setup 0.9.2.exe

# Build for Linux
pnpm dist:linux
# Output: release/linux/nself-chat-0.9.2.AppImage
```

---

## 🔐 Environment Variables

### Backend (.env in /backend)

```bash
# Domain
DOMAIN=local.nself.org

# PostgreSQL
POSTGRES_PASSWORD=your_secure_password

# Hasura
HASURA_GRAPHQL_ADMIN_SECRET=your_admin_secret
HASURA_GRAPHQL_JWT_SECRET={"type":"HS256","key":"your_jwt_secret"}

# Auth
AUTH_JWT_SECRET=your_jwt_secret

# MinIO
MINIO_ROOT_PASSWORD=your_minio_password

# MeiliSearch
MEILI_MASTER_KEY=your_meili_key
```

### Frontend Web (.env.local in /frontend/apps/web)

```bash
# Development mode (uses test users)
NEXT_PUBLIC_USE_DEV_AUTH=true
NEXT_PUBLIC_ENV=development

# Backend URLs
NEXT_PUBLIC_GRAPHQL_URL=http://api.localhost/v1/graphql
NEXT_PUBLIC_AUTH_URL=http://auth.localhost/v1/auth
NEXT_PUBLIC_STORAGE_URL=http://storage.localhost/v1/storage

# Optional: Tenor GIFs
NEXT_PUBLIC_TENOR_API_KEY=your_tenor_key

# Optional: Sentry monitoring
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
```

---

## 🔗 Important URLs

### Development URLs (local)

```bash
# Frontend
http://localhost:3000                    # Web app
http://localhost:3000/admin              # Admin dashboard
http://localhost:3000/setup              # Setup wizard

# Backend
http://api.localhost/console             # Hasura console
http://api.localhost/v1/graphql          # GraphQL endpoint
http://auth.localhost/v1/auth            # Auth API
http://storage.localhost/v1/storage      # Storage API
http://search.localhost:7700             # MeiliSearch
http://mail.localhost:8025               # Mailpit (email testing)
```

### Production URLs (replace with your domain)

```bash
https://app.yourdomain.com               # Web app
https://api.yourdomain.com/v1/graphql    # GraphQL endpoint
https://api.yourdomain.com/console       # Hasura console (disable in prod)
```

---

## 🧪 Testing Commands

### Unit Tests

```bash
# All unit tests
pnpm test

# Specific test suite
pnpm test hooks
pnpm test components
pnpm test services

# Watch mode
pnpm test:watch

# Coverage report
pnpm test:coverage
```

### E2E Tests

```bash
# Run all E2E tests
pnpm test:e2e

# Run with UI
pnpm test:e2e:ui

# Run specific test file
pnpm test:e2e tests/auth.spec.ts

# Run in specific browser
pnpm test:e2e --project=chromium
pnpm test:e2e --project=firefox
pnpm test:e2e --project=webkit
```

### Integration Tests

```bash
# API integration tests
pnpm test:integration

# Database tests
pnpm test:db
```

---

## 📦 Package Management

### pnpm Commands

```bash
# Install dependencies
pnpm install

# Add dependency
pnpm add package-name

# Add dev dependency
pnpm add -D package-name

# Remove dependency
pnpm remove package-name

# Update dependencies
pnpm update

# Update specific package
pnpm update package-name

# List outdated packages
pnpm outdated

# Clean install
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Workspace Commands (monorepo)

```bash
# Install for all workspaces
pnpm install -r

# Run command in specific workspace
pnpm --filter @nself-chat/web dev
pnpm --filter @nself-chat/mobile build

# Run command in all workspaces
pnpm -r build
pnpm -r test
```

---

## 🐛 Debugging & Troubleshooting

### View Logs

```bash
# Backend logs
nself logs
nself logs postgres -f
nself logs hasura -f

# Frontend logs
# Check terminal where pnpm dev is running

# Browser console
# Open DevTools (F12) in browser
```

### Clear Caches

```bash
# Clear pnpm cache
pnpm store prune

# Clear Next.js cache
cd frontend/apps/web
rm -rf .next

# Clear Jest cache
pnpm jest --clearCache

# Clear all build artifacts
pnpm clean
```

### Reset Services

```bash
# Backend reset
cd backend
nself stop
nself reset
nself start

# Frontend reset
cd frontend/apps/web
rm -rf node_modules .next
pnpm install
pnpm dev
```

---

## 🚀 Deployment Commands

### Docker Deployment

```bash
# Build Docker image
docker build -t nself-chat:latest .

# Run container
docker run -p 3000:3000 nself-chat:latest

# Docker Compose
docker-compose up -d
docker-compose down
docker-compose logs -f
```

### Kubernetes Deployment

```bash
# Apply manifests
kubectl apply -f deploy/k8s/

# Check status
kubectl get pods
kubectl get services

# View logs
kubectl logs -f deployment/nself-chat

# Scale deployment
kubectl scale deployment nself-chat --replicas=3
```

### Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

---

## 💡 Pro Tips

### Aliases

Add to your `~/.bashrc` or `~/.zshrc`:

```bash
# Backend aliases
alias ns='nself status'
alias nstart='nself start'
alias nstop='nself stop'
alias nlogs='nself logs -f'

# Frontend aliases
alias nd='pnpm dev'
alias nb='pnpm build'
alias nt='pnpm test'
alias nl='pnpm lint:fix'

# Git aliases
alias gs='git status'
alias ga='git add'
alias gc='git commit -m'
alias gp='git push'
```

### VS Code Tasks

Add to `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Start Backend",
      "type": "shell",
      "command": "cd backend && nself start",
      "problemMatcher": []
    },
    {
      "label": "Start Frontend",
      "type": "shell",
      "command": "cd frontend/apps/web && pnpm dev",
      "problemMatcher": []
    }
  ]
}
```

---

## 📚 Additional Resources

- [Full Documentation](./) - Complete wiki
- [Getting Started](nself-cli/Quick-Start.md) - Detailed setup guide
- [Architecture Overview](Architecture-Overview.md) - System design
- [Troubleshooting](troubleshooting/README.md) - Common issues
- [API Reference](api/API.md) - Complete API docs

---

**Need help?** Check the [FAQ](troubleshooting/FAQ.md) or [open an issue](https://github.com/nself-org/chat/issues).
