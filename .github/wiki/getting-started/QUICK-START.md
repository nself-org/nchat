# Quick Start Guide

Get nself-chat running in **under 5 minutes**. This guide will have you up and running with a fully functional team chat application.

**Version**: 0.9.2 (New Monorepo Structure)

---

## Prerequisites

Before you begin, ensure you have:

- **Node.js** >= 20.0.0 ([Download](https://nodejs.org/))
- **pnpm** >= 9.0.0 (installed automatically via corepack)
- **Docker** (optional, for backend services) ([Download](https://www.docker.com/))
- **Git** ([Download](https://git-scm.com/))
- A **code editor** (VS Code recommended)
- A **modern web browser** (Chrome, Firefox, Safari, or Edge)

**Pro Plugins license (recommended):** ɳChat's advanced features — AI moderation, calls, analytics, billing, compliance, streaming — run on ɳSelf Pro Plugins. Get a license at [nself.org/pricing](https://nself.org/pricing) (Basic tier: $0.99/mo or $9.99/yr), add `NSELF_PLUGIN_LICENSE_KEY` to your `.env`, and `nself start` installs everything automatically. Without it, core messaging and auth work via the 15 free plugins.

---

## 🏗️ New Monorepo Structure (v0.9.2)

nself-chat is now organized as a clean monorepo:

```
nself-chat/
├── backend/          # ɳSelf CLI backend (PostgreSQL + Hasura + Auth)
├── frontend/         # Multi-platform frontend
│   ├── apps/
│   │   ├── web/      # Next.js 15 web app
│   │   ├── mobile/   # Capacitor (iOS + Android)
│   │   └── desktop/  # Electron (Windows + macOS + Linux)
│   └── packages/     # Shared code
└── .wiki/            # Complete documentation
```

---

## 5-Minute Setup

### Step 1: Clone the Repository

```bash
git clone https://github.com/nself-org/nchat.git
cd nself-chat
```

### Step 2: Start Backend Services (1 minute)

```bash
# Navigate to backend
cd backend

# Start all services (PostgreSQL, Hasura, Auth, etc.)
nself start

# Verify services are running
nself status

# View service URLs
nself urls
```

**Expected Output:**

```
✓ postgres    - Running (port 5432)
✓ hasura      - Running (port 8080)
✓ auth        - Running (port 4000)
✓ nginx       - Running (port 80/443)
...
```

### Step 3: Install Frontend Dependencies (2 minutes)

```bash
# Navigate to web app (from project root)
cd frontend/apps/web

# Enable corepack (if not already enabled)
corepack enable

# Install dependencies
pnpm install
```

This will install all frontend dependencies (~2 minutes).

### Step 4: Start Frontend Development Server (1 minute)

```bash
# Start Next.js dev server (from frontend/apps/web)
pnpm dev
```

The development server will start on `http://localhost:3000`.

### Step 5: Open in Browser

```bash
# macOS
open http://localhost:3000

# Linux
xdg-open http://localhost:3000

# Windows
start http://localhost:3000

# Or just visit http://localhost:3000 in your browser
```

### Step 6: Complete Setup Wizard (5 minutes)

The first time you visit the application, you'll see a **12-step setup wizard**:

1. **Welcome** - Introduction
2. **Environment Detection** - Auto-detects backend
3. **Backend Setup** - One-click backend start
4. **Owner Info** - Your name, email, company
5. **Branding** - App name, logo, tagline
6. **Theme** - Choose from 27 presets
7. **Landing Page** - Configure homepage
8. **Auth Methods** - Select authentication providers
9. **Access Permissions** - Set access control
10. **Features** - Enable/disable features
11. **Deployment** - Choose deployment target
12. **Review & Launch** - Review and launch

**Tip**: You can skip the wizard and use defaults by clicking "Skip Setup" on the welcome screen.

---

## What You Get

After setup, you'll have:

✅ **Complete team chat application** with channels, DMs, threads
✅ **8 test users** for development (see below)
✅ **25+ theme presets** to choose from
✅ **Advanced messaging** features (edit, delete, forward, pin, star)
✅ **GIFs and stickers** powered by Tenor
✅ **Polls** for team decisions
✅ **Enhanced search** with MeiliSearch
✅ **Bot API** for automation
✅ **Social media integration** (optional)

---

## Development Mode Features

### Test Users

In development mode (`NEXT_PUBLIC_USE_DEV_AUTH=true`), you get 8 test users:

| Email               | Role      | Password    |
| ------------------- | --------- | ----------- |
| owner@nself.org     | Owner     | password123 |
| admin@nself.org     | Admin     | password123 |
| moderator@nself.org | Moderator | password123 |
| member@nself.org    | Member    | password123 |
| guest@nself.org     | Guest     | password123 |
| alice@nself.org     | Member    | password123 |
| bob@nself.org       | Member    | password123 |
| charlie@nself.org   | Member    | password123 |

**Auto-Login**: By default, you'll be automatically logged in as `owner@nself.org`.

### Switching Users

To test different user roles, you can switch users in two ways:

1. **Logout and login** as a different user
2. **Use the user switcher** (if enabled in dev tools)

---

## Quick Tour

### 1. Setup Wizard (First Run)

- Visit `http://localhost:3000/setup`
- Configure branding, themes, auth, and features
- Takes ~5 minutes to complete

### 2. Main Chat Interface

- Visit `http://localhost:3000/chat`
- See channels in left sidebar
- Send messages in the main area
- Use @ for mentions, # for channels

### 3. User Settings

- Click your avatar in the top right
- Select "Settings"
- Configure notifications, appearance, privacy

### 4. Admin Dashboard (Owner/Admin only)

- Visit `http://localhost:3000/admin`
- Manage users, channels, bots
- View analytics and audit logs

---

## Key Features to Try

### Advanced Messaging

- **Edit a message**: Click the "..." menu on any message → Edit
- **Delete a message**: Click the "..." menu → Delete
- **Forward a message**: Click the "..." menu → Forward
- **Pin a message**: Click the "..." menu → Pin
- **Star a message**: Click the ⭐ icon

### GIFs & Stickers

- Click the **GIF button** in the message composer
- Search for GIFs using the Tenor API
- Click the **sticker button** for stickers
- Browse 2 default sticker packs

### Polls

- Click the **poll icon** in a channel
- Create single-choice or multiple-choice polls
- Set expiration date (optional)
- Enable anonymous voting (optional)

### Search

- Press **Cmd+K** (Mac) or **Ctrl+K** (Windows/Linux)
- Search messages, files, users, channels
- Use operators: `from:alice`, `in:#general`, `has:file`

### 2FA & PIN Lock

- Go to **Settings → Security**
- Enable **Two-Factor Authentication**
- Setup **PIN Lock** for app protection

---

## Common Tasks

### Customize Branding

1. Go to `http://localhost:3000/setup` or Admin → Configuration
2. Update app name, logo, colors
3. Choose a theme preset or create custom theme
4. Save changes

### Create a Channel

1. Click **+** next to Channels in sidebar
2. Enter channel name and description
3. Choose public or private
4. Invite members (for private channels)

### Invite Users

In development mode, users are pre-created. In production:

1. Go to **Admin → Users → Invite**
2. Enter email addresses
3. Send invitations

### Send Direct Message

1. Click **+** next to Direct Messages
2. Select a user from the list
3. Start chatting

### Create a Bot

1. Go to **Admin → Bots**
2. Click **Create Bot**
3. Enter bot name and description
4. Set permissions
5. Generate API token
6. Use token to make API calls

---

## Configuration Files

### Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Development mode (uses test users)
NEXT_PUBLIC_USE_DEV_AUTH=true
NEXT_PUBLIC_ENV=development

# Backend URLs (default for local development)
NEXT_PUBLIC_GRAPHQL_URL=http://api.localhost/v1/graphql
NEXT_PUBLIC_AUTH_URL=http://auth.localhost/v1/auth
NEXT_PUBLIC_STORAGE_URL=http://storage.localhost/v1/storage

# Optional: GIFs (Tenor API)
NEXT_PUBLIC_TENOR_API_KEY=your-tenor-key

# Optional: Search (MeiliSearch)
NEXT_PUBLIC_MEILISEARCH_URL=http://search.localhost:7700
NEXT_PUBLIC_MEILISEARCH_KEY=your-meilisearch-key

# Optional: Social media integration
TWITTER_CLIENT_ID=your-twitter-client-id
TWITTER_CLIENT_SECRET=your-twitter-client-secret
```

**See [Configuration Guide](CONFIGURATION) for all options.**

---

## Next Steps

### Learn More

- [Installation Guide](INSTALLATION) - Detailed installation
- [Configuration Guide](CONFIGURATION) - All configuration options
- [Features Overview](features/Features) - Explore all features
- [User Guide](guides/USER-GUIDE) - End-user documentation

### Deploy to Production

- [Deployment Guide](deployment/DEPLOYMENT) - Production deployment
- [Docker Guide](deployment/Deployment-Docker) - Deploy with Docker
- [Kubernetes Guide](deployment/Deployment-Kubernetes) - Deploy to K8s

### Develop & Contribute

- [Architecture](reference/Architecture) - System design
- [API Reference](API-REFERENCE) - GraphQL API
- [Contributing Guide](about/Contributing) - How to contribute
- [Code Standards](../.ai/CODE-STANDARDS) - Coding conventions

---

## Troubleshooting

### Port 3000 is already in use

```bash
# Use a different port
PORT=3001 pnpm dev
```

### Dependencies installation fails

```bash
# Clear cache and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### TypeScript errors

```bash
# Run type checking
pnpm type-check

# Fix automatically
pnpm lint:fix
```

### Can't login with test users

1. Check that `NEXT_PUBLIC_USE_DEV_AUTH=true` in `.env.local`
2. Restart the development server
3. Clear browser cache and cookies

### Setup wizard doesn't show

1. Clear localStorage: `localStorage.removeItem('app-config')`
2. Visit `http://localhost:3000/setup` directly
3. Check browser console for errors

**More issues?** See [Troubleshooting Guide](TROUBLESHOOTING) or [FAQ](troubleshooting/FAQ).

---

## Getting Help

### Documentation

- [Full Documentation](README)
- [FAQ](troubleshooting/FAQ)
- [Troubleshooting](TROUBLESHOOTING)

### Community

- [GitHub Issues](https://github.com/nself-org/nchat/issues) - Bug reports
- [GitHub Discussions](https://github.com/nself-org/nchat/discussions) - Questions
- [Email Support](mailto:support@nself.org) - Direct support

---

## What's Next?

Now that you have nself-chat running, you can:

1. **Explore v0.3.0 features** - Try advanced messaging, GIFs, polls, search
2. **Customize your instance** - Set up branding, themes, and features
3. **Integrate with services** - Connect social media, bots, webhooks
4. **Deploy to production** - Follow the deployment guide
5. **Contribute** - Help improve nself-chat

---

**Congratulations!** You now have a fully functional team communication platform. 🎉

**[Back to Documentation →](README)**
