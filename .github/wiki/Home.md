# nself-chat Documentation Wiki

Welcome to the **nself-chat** documentation! A production-ready, white-label team communication platform with multi-platform support (Web, iOS, Android, Desktop).

**Version**: 0.9.2 | **Status**: Production Ready | **Last Updated**: February 10, 2026

---

## Plugin Requirements

ɳChat's advanced features run on **ɳSelf Pro Plugins** — AI moderation, voice/video calls, analytics, Stripe billing, GDPR/HIPAA compliance, live streaming, and more.

**Pro Plugins license: starting at $0.99/month ($9.99/year)** at [nself.org/pricing](https://nself.org/pricing). Set `NSELF_PLUGIN_LICENSE_KEY` in your backend `.env` and `nself start` installs them automatically.

Without a license: core messaging, auth, storage, and search work using the 15 free plugins. You can also implement any Pro Plugin's functionality as a [Custom Service](https://docs.nself.org/custom-services) (CS_1–CS_10).

See the [live demo](https://chat.nself.org) — it runs the full stack with Pro Plugins active.

---

## 🚀 Quick Start

**New to nself-chat?** Start here:

1. **[Quick Start Guide](getting-started/Quick-Start.md)** - Get running in 5 minutes
2. **[Installation Guide](getting-started/Installation.md)** - Detailed setup instructions
3. **[Quick Reference](Quick-Reference.md)** - Common commands cheat sheet

**Already familiar?** Jump to:

- [Architecture Overview](Architecture-Overview.md) - System design and structure
- [Deployment Guide](deployment/DEPLOYMENT-GUIDE.md) - Production deployment
- [API Reference](api/API.md) - Complete API documentation

---

## 🏗️ Project Structure (v0.9.2)

nself-chat follows the **nself-family clean organization pattern**:

```
nself-chat/
├── backend/              # ɳSelf CLI backend infrastructure
│   ├── db/
│   │   └── migrations/   # Database migrations (incl. per-app RBAC)
│   ├── hasura/          # GraphQL metadata
│   └── README.md        # Backend documentation
├── frontend/            # Clean flat structure
│   ├── src/            # Source code
│   │   ├── app/        # Next.js App Router
│   │   ├── components/ # React components
│   │   ├── hooks/      # Custom hooks (incl. useAppPermissions)
│   │   ├── contexts/   # React contexts
│   │   ├── graphql/    # GraphQL queries (incl. RBAC)
│   │   ├── types/      # TypeScript types (incl. RBAC)
│   │   └── lib/        # Utilities
│   ├── platforms/      # Multi-platform builds
│   │   ├── mobile/     # Capacitor (iOS + Android)
│   │   └── desktop/    # Electron (Windows + macOS + Linux)
│   ├── public/         # Static assets
│   ├── tests/          # Jest + Playwright tests
│   └── README.md       # Frontend documentation
└── .wiki/              # Complete documentation (this folder)
    ├── ARCHITECTURE.md      # **NEW** - Monorepo setup guide
    └── ...
```

**Key Features:**

- ✅ Clean flat structure (nself-family pattern)
- ✅ **"One of Many" Monorepo Compatible** - Can run standalone or with other apps
- ✅ **Per-App RBAC** - Users can have different roles across apps
- ✅ Shared authentication with SSO
- ✅ Multi-platform support (Web, iOS, Android, Desktop)

**New in v0.9.2:** Per-app RBAC/ACL system enables users to have different roles in different applications sharing the same backend. See [ARCHITECTURE.md](ARCHITECTURE.md) for monorepo setup.

---

## 📖 Documentation Sections

### 🎯 Getting Started

**Essential guides for new users:**

- [Quick Start](getting-started/Quick-Start.md) - 5-minute setup
- [Installation](getting-started/Installation.md) - Detailed installation guide
- [Configuration](configuration/Configuration.md) - Environment variables and settings
- [Quick Reference](Quick-Reference.md) - Command cheat sheet

### 🎨 Features

**Explore what nself-chat can do:**

- [Features Overview](Features-Complete.md) - Complete feature list
- [Authentication System](AUTH-SYSTEM-COMPLETE.md) - 11 OAuth providers + 2FA
- [End-to-End Encryption](E2EE-COMPLETE.md) - Signal Protocol implementation
- [Voice & Video Calls](VOICE-VIDEO-COMPLETE.md) - WebRTC + LiveKit
- [Search](SEARCH-IMPLEMENTATION-COMPLETE.md) - MeiliSearch integration
- [Messaging](features/Features-Messaging.md) - Advanced messaging features
- [White-Label](features/White-Label-Guide.md) - Branding and customization

### 📱 Platform Guides

**Build for specific platforms:**

- [Web App](../frontend/apps/web/README.md) - Next.js 15 web application
- [Mobile Apps](../frontend/apps/mobile/README.md) - iOS and Android (Capacitor)
- [Desktop Apps](../frontend/apps/desktop/README.md) - Windows, macOS, Linux (Electron)
- [Multi-Platform Deployment](MOBILE-COMPLETE.md) - Deploy to all platforms

### 🔧 Development

**For contributors and developers:**

- [Contributing Guide](CONTRIBUTING.md) - How to contribute
- [Architecture Overview](Architecture-Overview.md) - System design
- [Code Standards](CODE-STANDARDS.md) - Coding conventions
- [Testing Guide](TESTING-GUIDE.md) - Testing strategy
- [Code Quality Report](CODE-QUALITY-REPORT-v091.md) - Quality metrics

### 🚀 Deployment

**Production deployment guides:**

- [Deployment Overview](deployment/DEPLOYMENT-GUIDE.md) - General deployment guide
- **[Monorepo Setup](deployment/Monorepo-Setup.md)** - **NEW** - Run multiple apps with one backend
- [Docker Deployment](deployment/Deployment-Docker.md) - Docker containers
- [Kubernetes Deployment](deployment/Deployment-Kubernetes.md) - K8s manifests
- [Vercel Deployment](deployment/Deployment-Vercel.md) - Vercel hosting
- [Security Runbook](SECURITY-RUNBOOK.md) - Security procedures

### 🔐 Security

**Security features and best practices:**

- [Security Overview](security/SECURITY.md) - Security architecture
- [Security Runbook](SECURITY-RUNBOOK.md) - Incident response procedures
- [2FA Implementation](2FA-COMPLETE.md) - Two-factor authentication
- [PIN Lock System](security/PIN-LOCK-SYSTEM.md) - App lock features
- [OAuth Providers](OAuth-Testing-Guide.md) - OAuth integration guide

### 📚 Reference

**Technical references:**

- [API Documentation](api/API.md) - Complete API reference
- [Database Schema](Schema-Complete.md) - Database structure (222 tables)
- [GraphQL API](GraphQL-Complete.md) - GraphQL queries and mutations
- [Backend Services](nself-cli/README.md) - nself CLI services
- [Environment Variables](configuration/Environment-Variables.md) - All env vars

### 🤖 Advanced Topics

**Power user features:**

- [Bot Framework](Bot-Framework-Complete.md) - Build custom bots
- [Analytics](Analytics.md) - Metrics and monitoring
- [Integrations](Integrations-v0.7.0.md) - Slack, GitHub, Jira, etc.
- [Webhooks](guides/development/Webhooks-Guide.md) - Webhook integration
- [Custom Plugins](plugins/README.md) - Plugin development

---

## 🎓 Learning Paths

### For End Users

1. Start with [Quick Start](getting-started/Quick-Start.md)
2. Read [User Guide](guides/USER-GUIDE.md)
3. Explore [Features Overview](Features-Complete.md)

### For Developers

1. Read [Architecture Overview](Architecture-Overview.md)
2. Follow [Contributing Guide](CONTRIBUTING.md)
3. Review [Code Standards](CODE-STANDARDS.md)
4. Check [API Documentation](api/API.md)

### For DevOps/SysAdmins

1. Review [Deployment Guide](deployment/DEPLOYMENT-GUIDE.md)
2. Read [Security Runbook](SECURITY-RUNBOOK.md)
3. Study [Backend README](../backend/README.md)
4. Check [Troubleshooting](troubleshooting/README.md)

### For Product Owners

1. Explore [Features Overview](Features-Complete.md)
2. Review [Roadmap](Roadmap.md)
3. Check [White-Label Guide](features/White-Label-Guide.md)
4. Read [Multi-Tenancy](Multi-Tenancy-Complete.md)

---

## 🔍 Find What You Need

### By Category

| Category | Files | Description |
|----------|-------|-------------|
| **getting-started/** | 5 files | Quick start, installation, configuration |
| **features/** | 30+ files | Feature documentation and guides |
| **guides/** | 40+ files | How-to guides and tutorials |
| **deployment/** | 15+ files | Deployment guides for all platforms |
| **api/** | 20+ files | API reference and examples |
| **security/** | 10+ files | Security features and best practices |
| **configuration/** | 12+ files | Configuration and settings |
| **troubleshooting/** | 8+ files | Common issues and solutions |
| **about/** | 6 files | Changelog, contributing, license |

### By Task

**I want to...**

- **Get started quickly** → [Quick Start](getting-started/Quick-Start.md)
- **Install nself-chat** → [Installation Guide](getting-started/Installation.md)
- **Deploy to production** → [Deployment Guide](deployment/DEPLOYMENT-GUIDE.md)
- **Customize branding** → [White-Label Guide](features/White-Label-Guide.md)
- **Build a mobile app** → [Mobile Apps Guide](../frontend/apps/mobile/README.md)
- **Understand the architecture** → [Architecture Overview](Architecture-Overview.md)
- **Contribute code** → [Contributing Guide](CONTRIBUTING.md)
- **Report a bug** → [GitHub Issues](https://github.com/nself-org/chat/issues)
- **Ask a question** → [GitHub Discussions](https://github.com/nself-org/chat/discussions)

---

## 📋 Quick Reference

### Essential Commands

```bash
# Backend (from /backend)
nself start          # Start all services
nself status         # Check service status
nself urls           # List service URLs
nself logs           # View logs

# Frontend Web (from /frontend/apps/web)
pnpm dev             # Start dev server
pnpm build           # Production build
pnpm test            # Run tests
pnpm lint            # Lint code

# Frontend Mobile (from /frontend/apps/mobile)
pnpm ios             # Open iOS in Xcode
pnpm android         # Open Android in Android Studio

# Frontend Desktop (from /frontend/apps/desktop)
pnpm start           # Start Electron app
pnpm dist:mac        # Build macOS app
pnpm dist:win        # Build Windows app
```

See [Quick Reference](Quick-Reference.md) for complete command list.

---

## 🆘 Need Help?

### Documentation

- **Search this wiki** - Use Cmd/Ctrl+F to search
- **[FAQ](troubleshooting/FAQ.md)** - Frequently asked questions
- **[Troubleshooting](troubleshooting/README.md)** - Common issues and fixes
- **[Known Limitations](KNOWN-LIMITATIONS.md)** - Current limitations

### Community Support

- **[GitHub Issues](https://github.com/nself-org/chat/issues)** - Bug reports and feature requests
- **[GitHub Discussions](https://github.com/nself-org/chat/discussions)** - Questions and community help
- **[Email Support](mailto:support@nself.org)** - Direct support (paid plans)

### Professional Support

- **Enterprise Support** - Available for production deployments
- **Consulting** - Architecture review and custom development
- **Training** - Team training and onboarding
- Contact: support@nself.org

---

## 📚 Additional Resources

### Project Links

- [Main README](../README.md) - Project overview
- [Backend README](../backend/README.md) - Backend documentation
- [Frontend README](../frontend/README.md) - Frontend monorepo docs
- [GitHub Repository](https://github.com/nself-org/chat)

### External Resources

- [ɳSelf CLI](https://nself.org) - Backend infrastructure
- [Next.js Documentation](https://nextjs.org/docs) - Web framework
- [Capacitor Documentation](https://capacitorjs.com/docs) - Mobile framework
- [Electron Documentation](https://www.electronjs.org/docs) - Desktop framework

---

## 📝 Version History

- **v0.9.2** (2026-02-10) - Monorepo restructure, security hardening, complete docs
- **v0.9.1** (2026-02-03) - WebRTC, channels, OAuth, email integration
- **v0.9.0** (2026-02-01) - Multi-tenancy, billing, AI moderation
- **v0.8.0** (2026-01-31) - Mobile and desktop apps
- **v0.7.0** (2026-01-30) - Vector search, bot framework

See [CHANGELOG](CHANGELOG.md) for complete version history.

---

## ⚖️ License

nself-chat is open source software licensed under the **MIT License**.

See [LICENSE](LICENSE.md) for full license text.

---

**[📖 Browse Documentation](.)** | **[🚀 Quick Start](getting-started/Quick-Start.md)** | **[📝 Changelog](CHANGELOG.md)** | **[🤝 Contributing](CONTRIBUTING.md)**
