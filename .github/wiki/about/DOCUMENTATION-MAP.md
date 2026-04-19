# Documentation Map - nself-chat v0.3.0

Quick reference guide to find any documentation in the nself-chat project.

---

## 🚀 Getting Started (Start Here!)

| Document                                                    | Purpose                     | Audience  | Time   |
| ----------------------------------------------------------- | --------------------------- | --------- | ------ |
| [Quick Start](../getting-started/QUICK-START.md)                               | Get running in 5 minutes    | Everyone  | 5 min  |
| [Installation](../getting-started/Installation.md)                             | Detailed setup instructions | Admins    | 15 min |
| [Getting Started Guide](../getting-started/Getting-Started.md) | First steps after install   | Users     | 10 min |
| [User Guide](../guides/USER-GUIDE.md)                          | How to use the platform     | End Users | 20 min |

**Start with:** Quick Start → Installation → Getting Started Guide

---

## 📚 Core Documentation

### Architecture & System Design

| Document                                            | What's Inside                                     |
| --------------------------------------------------- | ------------------------------------------------- |
| [Architecture](../reference/Architecture.md)           | System design and technical architecture          |
| [Architecture Diagrams](../reference/ARCHITECTURE-DIAGRAMS.md)   | **Visual documentation with 14 Mermaid diagrams** |
| [Database Schema](../reference/Database-Schema.md)     | Database structure and relationships              |
| [Project Structure](../reference/Project-Structure.md) | Codebase organization                             |
| [SPORT Reference](../reference/SPORT.md)               | Complete system reference                         |

**Use when:** Understanding system design, database structure, or codebase

### Configuration

| Document                                                        | What's Inside                       |
| --------------------------------------------------------------- | ----------------------------------- |
| [Configuration Guide](../configuration/Configuration.md)           | All configuration options           |
| [Authentication Setup](../configuration/Authentication.md)         | Configure auth providers            |
| [Environment Variables](../configuration/Environment-Variables.md) | All environment variables explained |
| [White-Label Guide](../features/White-Label-Guide.md)              | Branding and theming                |

**Use when:** Setting up or customizing the application

---

## ✨ Feature Documentation (v0.3.0)

### 💬 Advanced Messaging

| Document                                                                    | Type           | What's Inside                    |
| --------------------------------------------------------------------------- | -------------- | -------------------------------- |
| [Advanced Messaging Features](../guides/advanced-messaging-implementation-summary.md) | Implementation | Edit, delete, forward, pin, star |
| [Quick Reference](../reference/advanced-messaging-quick-reference.md)                    | Quick Guide    | Common operations                |

### 🎨 GIFs & Stickers

| Document                                                      | Type           | What's Inside                       |
| ------------------------------------------------------------- | -------------- | ----------------------------------- |
| [GIF & Sticker Implementation](../features/GIF-Sticker-Implementation.md) | Implementation | Tenor integration & custom stickers |

### 📊 Polls & Voting

| Document                                        | Type           | What's Inside           |
| ----------------------------------------------- | -------------- | ----------------------- |
| [Polls Implementation](../features/Polls-Implementation.md) | Implementation | Create and manage polls |
| [Polls Quick Start](../reference/Polls-Quick-Start.md)       | Quick Guide    | Get started with polls  |

### 🔒 Security Features

#### Two-Factor Authentication (2FA)

| Document                                            | Type           | What's Inside         |
| --------------------------------------------------- | -------------- | --------------------- |
| [2FA Implementation](../security/2FA-Implementation-Summary.md) | Implementation | TOTP 2FA setup        |
| [2FA Quick Reference](../reference/2FA-Quick-Reference.md)       | Quick Guide    | Common 2FA operations |

#### PIN Lock & Biometrics

| Document                                                      | Type           | What's Inside               |
| ------------------------------------------------------------- | -------------- | --------------------------- |
| [PIN Lock System](../security/PIN-LOCK-SYSTEM.md)                         | Overview       | PIN lock and biometric auth |
| [PIN Lock Implementation](../security/PIN-LOCK-SYSTEM.md) | Implementation | Technical details           |
| [PIN Lock Quick Start](../reference/PIN-LOCK-QUICK-START.md)               | Quick Guide    | Setup guide                 |

### 🔍 Enhanced Search

| Document                                          | Type           | What's Inside           |
| ------------------------------------------------- | -------------- | ----------------------- |
| [Search Implementation](../guides/Search-Implementation.md) | Implementation | MeiliSearch integration |
| [Search Quick Start](../reference/Search-Quick-Start.md)       | Quick Guide    | Operators and filters   |

### 🤖 Bot API

| Document                                            | Type              | What's Inside                  |
| --------------------------------------------------- | ----------------- | ------------------------------ |
| [Bot API Implementation](../api/BOT_API_IMPLEMENTATION.md) | Implementation    | Technical details              |
| [Bot Development Guide](../features/Bots.md)           | Guide             | How to build bots              |
| **[Bot API Examples](../api/API-EXAMPLES.md)**         | **Code Examples** | **7 languages, all endpoints** |

### 🌐 Social Media Integration

| Document                                                        | Type           | What's Inside                |
| --------------------------------------------------------------- | -------------- | ---------------------------- |
| [Social Media Integration](../features/Social-Media-Integration.md)         | Implementation | Twitter, Instagram, LinkedIn |
| [Social Media Quick Reference](../reference/Social-Media-Quick-Reference.md) | Quick Guide    | Common operations            |

### 📋 Complete Feature Lists

| Document                                                   | What's Inside               |
| ---------------------------------------------------------- | --------------------------- |
| [All Features](../features/Features.md)                       | Overview of all features    |
| [Messaging Features](../features/Features-Messaging.md)       | Messaging-specific features |
| [Feature Completion Matrix](../features/Features-Complete.md) | Feature parity comparison   |

---

## 🔧 API Reference

| Document                                      | Audience       | What's Inside                 |
| --------------------------------------------- | -------------- | ----------------------------- |
| [API Overview](../api/API.md)                    | Everyone       | Introduction to the API       |
| [API Documentation](../api/API-DOCUMENTATION.md) | Developers     | GraphQL API reference         |
| **[API Code Examples](../api/API-EXAMPLES.md)**  | **Developers** | **7 languages, 50+ examples** |

**Languages covered:** cURL, JavaScript, TypeScript, Python, Go, Ruby, PHP

---

## 🚢 Deployment

### Guides

| Document                                                     | Target | What's Inside               |
| ------------------------------------------------------------ | ------ | --------------------------- |
| [Deployment Overview](../deployment/DEPLOYMENT.md)              | DevOps | Production deployment guide |
| [Docker Deployment](../deployment/Deployment-Docker.md)         | DevOps | Deploy with Docker          |
| [Kubernetes Deployment](../deployment/Deployment-Kubernetes.md) | DevOps | Deploy to K8s               |
| [Helm Charts](../deployment/Deployment-Helm.md)                 | DevOps | Helm deployment             |

### Checklists

| Document                                                              | When to Use                    |
| --------------------------------------------------------------------- | ------------------------------ |
| [Production Checklist](../deployment/Production-Deployment-Checklist.md) | Before deploying to production |
| [Production Validation](../deployment/Production-Validation.md)          | After deploying to production  |

---

## 🆘 Troubleshooting & Support

| Document                                                        | What's Inside                       |
| --------------------------------------------------------------- | ----------------------------------- |
| **[Troubleshooting Guide](../troubleshooting/TROUBLESHOOTING.md)** | **50+ common issues and solutions** |
| [FAQ](../troubleshooting/FAQ.md)                                   | Frequently asked questions          |
| [Runbook](../troubleshooting/RUNBOOK.md)                           | Operations guide                    |

**Topics covered:** Installation, Auth, 2FA, PIN Lock, Search, Social Media, Bot API, Messages, Performance, Database

---

## 🛠️ Development

### For Contributors

| Document                                               | What's Inside         |
| ------------------------------------------------------ | --------------------- |
| [Contributing Guide](../Contributing.md)               | How to contribute     |
| [Testing Guide](../guides/testing-guide.md)               | Testing strategies    |
| [Utilities & Hooks](README.md)                  | Development utilities |
| [Integration Examples](../guides/integration-examples.md) | Integration patterns  |

### For Plugin Developers

| Document                                | What's Inside     |
| --------------------------------------- | ----------------- |
| [Plugins System](../features/Plugins.md)   | How plugins work  |
| [Plugin List](../features/Plugins-List.md) | Available plugins |

---

## 🔒 Security

| Document                                                         | What's Inside          |
| ---------------------------------------------------------------- | ---------------------- |
| [Security Overview](../security/SECURITY.md)                        | Security features      |
| [Security Audit](../security/SECURITY-AUDIT.md)                     | Security audit results |
| [Performance Optimization](../security/PERFORMANCE-OPTIMIZATION.md) | Performance tuning     |

---

## ℹ️ About

### Version History

| Document                                         | What's Inside              |
| ------------------------------------------------ | -------------------------- |
| [Changelog](Changelog.md)                  | Complete version history   |
| [Release Notes v0.3.0](RELEASE-NOTES-v0.3.0.md)  | What's new in v0.3.0       |
| [Release Checklist](RELEASE-CHECKLIST-v0.3.0.md) | Testing checklist          |
| [Upgrade Guide](UPGRADE-GUIDE.md)          | Upgrading between versions |

### Planning

| Document                              | What's Inside            |
| ------------------------------------- | ------------------------ |
| [Roadmap](Roadmap.md)           | Future plans (12 phases) |
| [Roadmap v0.2](Roadmap-v0.2.md) | Historical v0.2 plan     |

### Meta Documentation

| Document                                                                  | What's Inside      |
| ------------------------------------------------------------------------- | ------------------ |
| [Documentation Audit](DOCUMENTATION-AUDIT.md)                             | Quality assessment |
| [Documentation Improvements](DOCUMENTATION-AUDIT.md) | What was improved  |
| [Documentation Map](DOCUMENTATION-MAP.md)                                 | This file          |

---

## 📖 Documentation by Audience

### 👤 For End Users

**Start here:** Quick Start → User Guide

**Essential reading:**

1. [Quick Start Guide](../getting-started/QUICK-START.md) - 5 minutes
2. [User Guide](../guides/USER-GUIDE.md) - 20 minutes
3. [FAQ](../troubleshooting/FAQ.md) - As needed

**Feature guides:**

- [2FA Quick Reference](../reference/2FA-Quick-Reference.md)
- [PIN Lock Quick Start](../reference/PIN-LOCK-QUICK-START.md)
- [Search Quick Start](../reference/Search-Quick-Start.md)
- [Polls Quick Start](../reference/Polls-Quick-Start.md)

**Need help?**

- [Troubleshooting Guide](../troubleshooting/TROUBLESHOOTING.md)
- [FAQ](../troubleshooting/FAQ.md)

---

### 👨‍💼 For Administrators

**Start here:** Installation → Configuration → Deployment

**Essential reading:**

1. [Installation Guide](../getting-started/Installation.md) - 15 minutes
2. [Configuration Guide](../configuration/Configuration.md) - 30 minutes
3. [Deployment Overview](../deployment/DEPLOYMENT.md) - 30 minutes
4. [Production Checklist](../deployment/Production-Deployment-Checklist.md) - 20 minutes

**Security setup:**

- [Authentication Setup](../configuration/Authentication.md)
- [Security Overview](../security/SECURITY.md)
- [Environment Variables](../configuration/Environment-Variables.md)

**Operations:**

- [Runbook](../troubleshooting/RUNBOOK.md)
- [Production Validation](../deployment/Production-Validation.md)
- [Performance Optimization](../security/PERFORMANCE-OPTIMIZATION.md)

---

### 👨‍💻 For Developers

**Start here:** Architecture → API Documentation → Examples

**Essential reading:**

1. [Architecture](../reference/Architecture.md) - 30 minutes
2. [Architecture Diagrams](../reference/ARCHITECTURE-DIAGRAMS.md) - 15 minutes
3. [Project Structure](../reference/Project-Structure.md) - 15 minutes
4. [API Documentation](../api/API-DOCUMENTATION.md) - 45 minutes

**For bot development:**

1. [Bot Development Guide](../features/Bots.md) - 30 minutes
2. [Bot API Examples](../api/API-EXAMPLES.md) - 20 minutes
3. Pick your language, copy examples

**For contributing:**

1. [Contributing Guide](../Contributing.md) - 20 minutes
2. [Testing Guide](../guides/testing-guide.md) - 20 minutes
3. [Utilities & Hooks](README.md) - 30 minutes

**Visual references:**

- [Architecture Diagrams](../reference/ARCHITECTURE-DIAGRAMS.md) - 14 Mermaid diagrams
- [Database Schema](../reference/Database-Schema.md) - ERD diagrams

---

### 👨‍🔧 For DevOps

**Start here:** Deployment guides → Checklists

**Essential reading:**

1. [Deployment Overview](../deployment/DEPLOYMENT.md) - 30 minutes
2. Your platform guide:
   - [Docker Deployment](../deployment/Deployment-Docker.md) - 20 minutes
   - [Kubernetes Deployment](../deployment/Deployment-Kubernetes.md) - 30 minutes
   - [Helm Charts](../deployment/Deployment-Helm.md) - 20 minutes
3. [Production Checklist](../deployment/Production-Deployment-Checklist.md) - 20 minutes

**Before deployment:**

- [Environment Variables](../configuration/Environment-Variables.md)
- [Production Checklist](../deployment/Production-Deployment-Checklist.md)
- [Security Overview](../security/SECURITY.md)

**After deployment:**

- [Production Validation](../deployment/Production-Validation.md)
- [Runbook](../troubleshooting/RUNBOOK.md)
- [Performance Optimization](../security/PERFORMANCE-OPTIMIZATION.md)

**Troubleshooting:**

- [Troubleshooting Guide](../troubleshooting/TROUBLESHOOTING.md)
- Architecture diagrams: [Docker](../reference/ARCHITECTURE-DIAGRAMS.md#docker-compose-deployment) | [Kubernetes](../reference/ARCHITECTURE-DIAGRAMS.md#kubernetes-deployment)

---

## 📊 Documentation Statistics

- **Total Files:** 71
- **Total Lines:** ~16,000
- **Code Examples:** 50+ (7 languages)
- **Diagrams:** 14 Mermaid diagrams
- **Feature Coverage:** 100%
- **Quality Score:** 92% (Excellent)

---

## 🔍 Finding What You Need

### By Topic

| I want to...                | Read this...                                                                                                            |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Get started quickly         | [Quick Start Guide](../getting-started/QUICK-START.md)                                                                                     |
| Install nself-chat          | [Installation Guide](../getting-started/Installation.md)                                                                                   |
| Understand the architecture | [Architecture Diagrams](../reference/ARCHITECTURE-DIAGRAMS.md)                                                                       |
| Configure authentication    | [Authentication Setup](../configuration/Authentication.md)                                                                 |
| Build a bot                 | [Bot API Examples](../api/API-EXAMPLES.md)                                                                                 |
| Deploy to production        | [Deployment Overview](../deployment/DEPLOYMENT.md) + [Production Checklist](../deployment/Production-Deployment-Checklist.md) |
| Fix an issue                | [Troubleshooting Guide](../troubleshooting/TROUBLESHOOTING.md)                                                             |
| Use 2FA                     | [2FA Quick Reference](../reference/2FA-Quick-Reference.md)                                                                           |
| Set up search               | [Search Implementation](../guides/Search-Implementation.md)                                                                       |
| Connect social media        | [Social Media Integration](../features/Social-Media-Integration.md)                                                                 |
| Contribute code             | [Contributing Guide](../Contributing.md)                                                                                |

### By Time Available

#### ⚡ 5 minutes

- [Quick Start Guide](../getting-started/QUICK-START.md)
- [2FA Quick Reference](../reference/2FA-Quick-Reference.md)
- [PIN Lock Quick Start](../reference/PIN-LOCK-QUICK-START.md)
- [Search Quick Start](../reference/Search-Quick-Start.md)

#### 🏃 15 minutes

- [Getting Started Guide](../getting-started/Getting-Started.md)
- [Architecture Diagrams](../reference/ARCHITECTURE-DIAGRAMS.md)
- [Installation Guide](../getting-started/Installation.md)
- [API Examples](../api/API-EXAMPLES.md) (pick language)

#### 🚶 30 minutes

- [User Guide](../guides/USER-GUIDE.md)
- [Configuration Guide](../configuration/Configuration.md)
- [Bot Development Guide](../features/Bots.md)
- [Architecture](../reference/Architecture.md)

#### 🧘 1 hour+

- [API Documentation](../api/API-DOCUMENTATION.md)
- [All feature implementations](#feature-documentation-v030)
- [Complete deployment setup](#deployment)

---

## 🆕 What's New in v0.3.0 Documentation

### New Files (5)

1. ✅ [Documentation Audit](DOCUMENTATION-AUDIT.md) - Quality assessment
2. ✅ [Architecture Diagrams](../reference/ARCHITECTURE-DIAGRAMS.md) - 14 visual diagrams
3. ✅ [API Examples](../api/API-EXAMPLES.md) - 7 languages, 50+ examples
4. ✅ [Troubleshooting Guide](../troubleshooting/TROUBLESHOOTING.md) - 50+ issues
5. ✅ [Documentation Improvements](DOCUMENTATION-AUDIT.md) - Summary

### Updated Files

- ✅ [README](README.md) - Fixed broken links, added new docs
- ✅ [Sidebar](../_Sidebar.md) - Complete rewrite with all v0.3.0 features
- ✅ All feature docs updated with v0.3.0 content

### Improvements

- +14 Mermaid diagrams
- +50 code examples in 7 languages
- +3,000 lines of documentation
- +19% quality improvement (73% → 92%)
- 100% feature coverage

---

## 📞 Support & Help

### Documentation Issues

- **Missing info?** [Open an issue](https://github.com/nself-org/nchat/issues)
- **Need clarification?** [Start a discussion](https://github.com/nself-org/nchat/discussions)
- **Found a typo?** [Submit a PR](../Contributing.md)

### Getting Help

1. Check [Troubleshooting Guide](../troubleshooting/TROUBLESHOOTING.md) first
2. Search [FAQ](../troubleshooting/FAQ.md)
3. Search existing [GitHub Issues](https://github.com/nself-org/nchat/issues)
4. Ask in [GitHub Discussions](https://github.com/nself-org/nchat/discussions)
5. Contact support: support@nself.org

---

## 🗺️ Navigation Tips

### Use the Sidebar

The [sidebar](../_Sidebar.md) has all 60+ documentation links organized by category.

### Follow Cross-References

Most docs include "Related Documentation" sections with links to relevant pages.

### Search GitHub

All documentation is searchable on GitHub. Use keywords to find specific topics.

### Use This Map

Bookmark this page as your go-to reference for finding any documentation.

---

**Last Updated:** January 30, 2026 • **Version:** 0.3.0

**Need help finding something?** Open an issue or ask in discussions!
