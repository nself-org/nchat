# nself-chat Documentation

**Version**: 0.9.1 (February 3, 2026)
**Status**: Production-Ready
**License**: MIT

<div align="center">

[![Version](https://img.shields.io/badge/version-0.9.1-blue.svg)](about/Changelog)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](../LICENSE)
[![Platform](https://img.shields.io/badge/platform-Web%20%7C%20Desktop%20%7C%20Mobile-lightgrey.svg)]()
[![Status](https://img.shields.io/badge/status-production--ready-brightgreen.svg)]()

**White-Label Team Communication Platform**

[Quick Start](getting-started/QUICK-START) • [Installation](getting-started/INSTALLATION) • [Features](#features) • [Deployment](deployment/DEPLOYMENT) • [API](api/API-DOCUMENTATION) • [Contributing](../CONTRIBUTING)

</div>

---

## Documentation Structure

This documentation is organized into the following sections:

### 📚 [Getting Started](getting-started/)

Start here if you're new to nself-chat.

- **[Quick Start Guide](getting-started/QUICK-START)** - Get running in 5 minutes
- **[Installation Guide](getting-started/INSTALLATION)** - Detailed installation instructions
- **[Getting Started](getting-started/Getting-Started)** - First steps after installation

### ✨ [Features](features/)

Learn about all the features nself-chat offers.

#### Core Features

- **[Features Overview](features/Features)** - Complete feature list
- **[Messaging Features](features/Features-Messaging)** - Chat capabilities
- **[Feature Completion Matrix](features/Features-Complete)** - Feature parity comparison

#### Communication Features

- **[Voice Calling](features/VOICE-CALLING-COMPLETE)** - Voice call implementation
- **[Live Streaming](features/LIVE_STREAMING_IMPLEMENTATION_SUMMARY)** - Live streaming capabilities
- **[Screen Sharing](features/SCREEN-SHARING-SUMMARY)** - Screen sharing features
- **[Mobile Calls](features/MOBILE-CALLS-IMPLEMENTATION)** - Mobile call optimization

#### Interactive Features

- **[GIFs & Stickers](features/GIF-Sticker-Implementation)** - GIF picker and sticker packs
- **[Polls](features/Polls-Implementation)** - Create and manage polls
- **[Social Media Integration](features/Social-Media-Integration)** - Twitter, Instagram, LinkedIn integration

#### Advanced Features

- **[Search](features/SEARCH_IMPLEMENTATION_SUMMARY)** - Enhanced search with MeiliSearch
- **[Social Media Posting](features/SOCIAL-MEDIA-IMPLEMENTATION-SUMMARY)** - Auto-posting to social platforms

#### Customization

- **[White-Label Guide](features/White-Label-Guide)** - Branding and theming
- **[Bots](features/Bots)** - Bot development and integration
- **[Plugins](features/Plugins)** - Plugin system
- **[Plugin List](features/Plugins-List)** - Available plugins
- **[Media Server](features/Media-Server-Setup)** - Media server configuration

### 📖 [Guides](guides/)

Step-by-step implementation and usage guides.

#### Implementation Guides

- **[Advanced Messaging](guides/advanced-messaging-implementation-summary)** - Edit, delete, forward, pin, star messages
- **[E2EE (End-to-End Encryption)](guides/E2EE-Implementation)** - Encryption implementation
- **[Search Implementation](guides/Search-Implementation)** - MeiliSearch integration
- **[Live Streaming](guides/Live-Streaming-Implementation)** - Stream implementation
- **[Screen Sharing](guides/Screen-Sharing-Implementation)** - Screen sharing setup
- **[Video Calling](guides/Video-Calling-Implementation)** - Video call setup
- **[Voice Calling](guides/Voice-Calling-Implementation)** - Voice call implementation
- **[Call Management](guides/Call-Management-Guide)** - Call system management
- **[Mobile Call Optimizations](guides/Mobile-Call-Optimizations)** - Mobile-specific optimizations

#### User Guides

- **[User Guide](guides/USER-GUIDE)** - End-user documentation
- **[Settings Quick Start](guides/Settings-Quick-Start)** - User settings guide
- **[Testing Guide](guides/testing-guide)** - Testing strategies
- **[Integration Examples](guides/integration-examples)** - Code examples
- **[Utilities Guide](guides/README)** - Development utilities

### 📚 [Reference](reference/)

Technical reference documentation.

#### Architecture & Design

- **[Architecture](reference/Architecture)** - System architecture
- **[Architecture Diagrams](reference/ARCHITECTURE-DIAGRAMS)** - Visual documentation
- **[Database Schema](reference/Database-Schema)** - Database structure
- **[Project Structure](reference/Project-Structure)** - Codebase organization
- **[TypeScript Types](reference/Types)** - Type definitions
- **[SPORT Reference](reference/SPORT)** - Complete API reference

#### Quick References

- **[2FA Quick Reference](reference/2FA-Quick-Reference)** - Two-factor authentication
- **[Advanced Messaging Quick Reference](reference/advanced-messaging-quick-reference)** - Messaging shortcuts
- **[Call Management Quick Reference](reference/Call-Management-Quick-Reference)** - Call system shortcuts
- **[Call State Machine](reference/Call-State-Machine-Diagram)** - Call state diagram
- **[E2EE Quick Reference](reference/E2EE-Quick-Reference)** - Encryption quick reference
- **[Live Streaming Quick Start](reference/Live-Streaming-Quick-Start)** - Streaming quick start
- **[Mobile Calls Quick Reference](reference/Mobile-Calls-Quick-Reference)** - Mobile call shortcuts
- **[PIN Lock Quick Start](reference/PIN-LOCK-QUICK-START)** - PIN lock setup
- **[Polls Quick Start](reference/Polls-Quick-Start)** - Polls quick reference
- **[Screen Sharing Quick Reference](reference/Screen-Sharing-Quick-Reference)** - Screen sharing shortcuts
- **[Search Quick Start](reference/Search-Quick-Start)** - Search operators and filters
- **[Social Media Quick Reference](reference/Social-Media-Quick-Reference)** - Social integration shortcuts
- **[Voice Calling Quick Start](reference/Voice-Calling-Quick-Start)** - Voice call quick start

### ⚙️ [Configuration](configuration/)

Configure nself-chat for your needs.

- **[Configuration Guide](configuration/Configuration)** - Complete configuration reference
- **[Authentication Setup](configuration/Authentication)** - Auth provider configuration
- **[Environment Variables](configuration/Environment-Variables)** - All environment variables

### 📡 [API](api/)

API documentation and examples.

- **[API Overview](api/API)** - GraphQL API overview
- **[API Documentation](api/API-DOCUMENTATION)** - Complete API reference
- **[API Examples](api/API-EXAMPLES)** - Multi-language code examples
- **[Bot API Implementation](api/BOT_API_IMPLEMENTATION)** - Bot API reference

### 🚀 [Deployment](deployment/)

Deploy nself-chat to production.

- **[Deployment Overview](deployment/DEPLOYMENT)** - Production deployment guide
- **[Docker Deployment](deployment/Deployment-Docker)** - Deploy with Docker
- **[Kubernetes Deployment](deployment/Deployment-Kubernetes)** - Deploy to K8s
- **[Helm Charts](deployment/Deployment-Helm)** - Helm deployment
- **[Production Checklist](deployment/Production-Deployment-Checklist)** - Pre-deployment checklist
- **[Production Validation](deployment/Production-Validation)** - Post-deployment validation

### 🔐 [Security](security/)

Security features and best practices.

#### Security Features

- **[Security Overview](security/SECURITY)** - Security architecture
- **[Security Audit](security/SECURITY-AUDIT)** - Security audit results
- **[Performance Optimization](security/PERFORMANCE-OPTIMIZATION)** - Performance guide

#### Authentication & Authorization

- **[2FA Implementation](security/2FA-Implementation-Summary)** - Two-factor authentication
- **[PIN Lock System](security/PIN-LOCK-SYSTEM)** - PIN lock and biometric auth
- **[PIN Lock Implementation](security/PIN-LOCK-IMPLEMENTATION-SUMMARY)** - Technical details

#### Encryption

- **[E2EE Implementation Summary](security/E2EE-Implementation-Summary)** - End-to-end encryption
- **[E2EE Security Audit](security/E2EE-Security-Audit)** - Encryption audit

### 🆘 [Troubleshooting](troubleshooting/)

Common issues and solutions.

- **[FAQ](troubleshooting/FAQ)** - Frequently asked questions
- **[Troubleshooting Guide](troubleshooting/TROUBLESHOOTING)** - Common issues
- **[Operations Runbook](troubleshooting/RUNBOOK)** - Operations guide

### ℹ️ [About](about/)

Project information and planning.

#### Release Information

- **[Changelog](about/Changelog)** - Version history
- **[Release Notes v0.3.0](about/RELEASE-NOTES-v0.3.0)** - Latest release notes
- **[Release Checklist v0.3.0](about/RELEASE-CHECKLIST-v0.3.0)** - Release checklist
- **[Implementation Complete](about/IMPLEMENTATION_COMPLETE)** - v0.3.0 completion status

#### Planning & Roadmap

- **[Roadmap](about/Roadmap)** - Future plans
- **[Roadmap v0.2](about/Roadmap-v0.2)** - v0.2 planning
- **[Upgrade Guide](about/UPGRADE-GUIDE)** - Version upgrade guide
- **[Contributing](about/Contributing)** - How to contribute

#### Documentation

- **[Documentation Audit](about/DOCUMENTATION-AUDIT)** - Documentation quality assessment
- **[Documentation Map](about/DOCUMENTATION-MAP)** - Documentation structure
- **[Documentation Improvements](about/DOCUMENTATION-IMPROVEMENT-SUMMARY)** - Improvement summary
- **[Documentation Improvements v0.3.0](about/DOCUMENTATION-IMPROVEMENT-SUMMARY-v0.3.0)** - v0.3.0 improvements
- **[Advanced Messaging Report](about/ADVANCED_MESSAGING_REPORT)** - Feature report

---

## Quick Start

Get nself-chat running in under 5 minutes:

```bash
# 1. Clone the repository
git clone https://github.com/nself-org/nchat.git
cd nself-chat

# 2. Install dependencies
pnpm install

# 3. Start development mode (with test users)
pnpm dev

# 4. Open in browser
open http://localhost:3000
```

**Next Steps:**

1. Complete the [9-step setup wizard](http://localhost:3000/setup)
2. Explore the [feature documentation](features/)
3. Check out the [configuration guide](configuration/Configuration)

**[Full Quick Start Guide →](getting-started/QUICK-START)**

---

## What's New in v0.9.1

### Documentation Excellence & Plugin System

**v0.9.1** brings comprehensive documentation polish and a powerful plugin architecture:

#### Highlights

1. **Advanced Messaging Features** ✅
   - Edit messages with edit history
   - Delete messages (soft delete)
   - Forward messages to multiple channels
   - Pin important messages
   - Star/save messages for later
   - Message read receipts
   - Real-time typing indicators
   - [Learn More →](guides/advanced-messaging-implementation-summary)

2. **GIFs and Stickers** 🎨
   - GIF search integration (Tenor API)
   - GIF picker in message composer
   - Sticker packs management
   - Custom sticker upload (admin/owner)
   - 2 default sticker packs included
   - [Learn More →](features/GIF-Sticker-Implementation)

3. **Polls and Interactive Messages** 📊
   - Create polls with multiple options
   - Single-choice and multiple-choice
   - Anonymous voting option
   - Poll expiration/deadline
   - Live poll results
   - [Learn More →](features/Polls-Implementation)

4. **Two-Factor Authentication (2FA)** 🔒
   - TOTP 2FA setup with QR code
   - Support for authenticator apps
   - 10 backup codes per user
   - 2FA enforcement option
   - Remember device (30 days)
   - Recovery process
   - [Learn More →](security/2FA-Implementation-Summary)

5. **PIN Lock & Session Security** 🔐
   - PIN lock setup (4-6 digits)
   - Lock on app close/background
   - Auto-lock after timeout
   - Biometric unlock (WebAuthn)
   - Emergency unlock with password
   - Failed attempt lockout
   - [Learn More →](security/PIN-LOCK-SYSTEM)

6. **Enhanced Search** 🔍
   - Search messages, files, users, channels
   - Advanced filters (date, channel, user, type)
   - Search within threads
   - Search operators (from:, in:, has:, before:, after:)
   - Search history and saved searches
   - Keyboard shortcuts (Cmd+K)
   - [Learn More →](guides/Search-Implementation)

7. **Bot API Foundation** 🤖
   - Bot user type
   - Bot token generation
   - Bot API endpoints (5 endpoints)
   - Webhook delivery
   - Bot permissions system (16 permissions)
   - Bot management UI
   - [Learn More →](features/Bots)

8. **Social Media Integration** 🌐
   - Link social accounts (Twitter, Instagram, LinkedIn)
   - Monitor accounts for new posts
   - Auto-post to announcement channels
   - Rich embeds for social posts
   - Enable/disable per account
   - Post filtering (hashtags, keywords)
   - [Learn More →](features/Social-Media-Integration)

**[Full Changelog →](about/Changelog)**

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     nself-chat Platform (v0.3.0)                 │
├─────────────────────────────────────────────────────────────────┤
│   Frontend (Next.js 15 + React 19)                              │
│   • 9-step setup wizard                                          │
│   • 25+ theme presets (light/dark)                              │
│   • Real-time messaging UI                                       │
│   • Advanced search (MeiliSearch)                                │
│   • Bot management dashboard                                     │
│   • Social media integration UI                                  │
├─────────────────────────────────────────────────────────────────┤
│   State Management                                               │
│   • Zustand (client state)                                       │
│   • Apollo Client (GraphQL + subscriptions)                      │
│   • LocalStorage + Database sync                                 │
├─────────────────────────────────────────────────────────────────┤
│   Backend (nself CLI v0.4.2)                                     │
│   • PostgreSQL (database)                                        │
│   • Hasura GraphQL Engine                                        │
│   • Nhost Auth (production) / FauxAuth (dev)                    │
│   • MinIO (file storage)                                         │
│   • MeiliSearch (search engine)                                  │
│   • Redis (jobs & caching)                                       │
├─────────────────────────────────────────────────────────────────┤
│   Multi-Platform Support                                         │
│   • Web (Next.js)                                                │
│   • Desktop (Tauri, Electron)                                    │
│   • Mobile (Capacitor, React Native)                             │
│   • PWA (installable)                                            │
└─────────────────────────────────────────────────────────────────┘
```

**[Detailed Architecture →](reference/Architecture)**

---

## Tech Stack

### Frontend

- **Framework**: Next.js 15.5.10, React 19.0.0, TypeScript 5.7.3
- **UI**: Tailwind CSS 3.4.17, Radix UI, Framer Motion 11.18.0
- **State**: Zustand 5.0.3, Apollo Client 3.12.8
- **Forms**: React Hook Form 7.54.2, Zod 3.24.1
- **Editor**: TipTap 2.11.2 (rich text)
- **Real-time**: Socket.io 4.8.1, GraphQL subscriptions

### Backend (via nself CLI)

- **Database**: PostgreSQL with 60+ extensions
- **GraphQL**: Hasura GraphQL Engine
- **Auth**: Nhost Authentication
- **Storage**: MinIO (S3-compatible)
- **Search**: MeiliSearch 0.44.0
- **Cache**: Redis

### Development

- **Testing**: Jest 29.7.0, Playwright 1.50.1
- **Linting**: ESLint 9.18.0, Prettier 3.4.2
- **CI/CD**: 19 GitHub Actions workflows
- **Monitoring**: Sentry 8.47.0

---

## Key Features

### White-Label Everything

- Complete branding customization (name, logo, colors)
- 25+ theme presets with light/dark modes
- Custom CSS injection support
- Landing page templates (5 options)
- Feature toggles for selective functionality

### Dual Authentication

- **Development Mode**: 8 test users for fast iteration
- **Production Mode**: Nhost Auth with 11 provider options
  - Email/password, Magic links
  - Google, Facebook, Twitter, GitHub, Discord, Slack
  - ID.me (military, police, first responders, government)

### Advanced Messaging

- Edit/delete messages with history
- Forward to multiple channels
- Pin important messages
- Star/bookmark messages
- Read receipts & typing indicators
- Threaded conversations
- Rich text editing (markdown, code blocks)

### Powerful Search

- MeiliSearch integration (sub-50ms queries)
- Search operators: `from:`, `in:`, `has:`, `before:`, `after:`, `is:`
- Filter by date, channel, user, file type
- Search within threads
- Saved searches and history
- Keyboard shortcuts (Cmd+K)

### Enterprise Security

- Two-factor authentication (TOTP)
- PIN lock with biometric support
- Session management with device tracking
- Row-level security (RLS) on all tables
- Audit logging for admin actions
- Content moderation and filtering

---

## Documentation By Audience

### For End Users

- [Quick Start](getting-started/QUICK-START)
- [User Guide](guides/USER-GUIDE)
- [Settings Guide](guides/Settings-Quick-Start)
- [FAQ](troubleshooting/FAQ)

### For Administrators

- [Installation](getting-started/INSTALLATION)
- [Configuration](configuration/Configuration)
- [Deployment Guide](deployment/DEPLOYMENT)
- [Production Checklist](deployment/Production-Deployment-Checklist)
- [Runbook](troubleshooting/RUNBOOK)
- [Security Overview](security/SECURITY)

### For Developers

- [Architecture](reference/Architecture)
- [API Reference](api/API-DOCUMENTATION)
- [Contributing Guide](about/Contributing)
- [Testing Guide](guides/testing-guide)
- [Bot Development](features/Bots)
- [Plugin Development](features/Plugins)

### For DevOps

- [Docker Deployment](deployment/Deployment-Docker)
- [Kubernetes Deployment](deployment/Deployment-Kubernetes)
- [Helm Charts](deployment/Deployment-Helm)
- [Production Validation](deployment/Production-Validation)
- [Runbook](troubleshooting/RUNBOOK)

---

## Project Stats

| Metric                  | Value                     |
| ----------------------- | ------------------------- |
| **Version**             | 0.9.1                     |
| **Release Date**        | February 3, 2026          |
| **Total Features**      | 150+                      |
| **Feature Parity**      | ~65% (vs major platforms) |
| **Components**          | 75+ directories           |
| **Custom Hooks**        | 60+ hooks                 |
| **Database Tables**     | 50+ tables                |
| **API Endpoints**       | 40+ endpoints             |
| **Theme Presets**       | 25+ themes                |
| **Auth Providers**      | 11 providers              |
| **CI Workflows**        | 19 workflows              |
| **Documentation Pages** | 333+ pages                |

---

## Support & Community

### Getting Help

- **Documentation**: You're reading it!
- **Issues**: [GitHub Issues](https://github.com/nself-org/nchat/issues)
- **Discussions**: [GitHub Discussions](https://github.com/nself-org/nchat/discussions)
- **Email**: support@nself.org

### Contributing

We welcome contributions! See our [Contributing Guide](about/Contributing) for:

- Code of conduct
- Development setup
- Pull request process
- Code standards
- Testing requirements

### Roadmap

- **v0.9.2** (1 week): Additional plugin integrations
- **v1.0.0** (1 month): Production launch with full feature parity
- **v1.1.0** (2 months): Advanced AI features and analytics
- **v1.2.0** (3 months): Enterprise features and compliance

**[Full Roadmap →](about/Roadmap)**

---

## License

MIT License - see [LICENSE](../LICENSE) for details.

---

## Acknowledgments

Built with:

- [Next.js](https://nextjs.org/) - React framework
- [nself CLI](https://github.com/nself-org/cli) - Backend infrastructure
- [Radix UI](https://www.radix-ui.com/) - UI components
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [MeiliSearch](https://www.meilisearch.com/) - Search engine
- [Hasura](https://hasura.io/) - GraphQL engine

---

<div align="center">

**Version 0.9.1** • **February 2026** • **[GitHub](https://github.com/nself-org/nchat)**

_nself-chat - White-label team communication platform_

</div>
