# 📖 Guides

Step-by-step implementation and usage guides for nself-chat.

---

## 👤 User Guides

### [📖 Complete User Guide](USER-GUIDE)

Comprehensive guide for end users covering all features.

**Topics:** Setup wizard, Messaging, Channels, Calls, Settings, Notifications, Search, Security

**Perfect for:** End users learning to use nself-chat

---

### [⚙️ Settings Quick Start](Settings-Quick-Start)

Quick reference for user settings and preferences.

**Topics:** Profile, Notifications, Privacy, Appearance, Security

**Perfect for:** Users customizing their experience

---

## 👨‍💻 Developer Guides

### Messaging & Communication

#### [💬 Advanced Messaging Implementation](advanced-messaging-implementation-summary)

Implement edit, delete, forward, pin, and star features.

**Features:** Edit history, Soft delete, Multi-forward, Pin management, Star/bookmark

#### [🔐 E2EE Implementation](E2EE-Implementation)

Add end-to-end encryption to your channels.

**Features:** Signal Protocol, Key exchange, Device verification, Encrypted files

#### [🔍 Search Implementation](Search-Implementation)

Integrate MeiliSearch for powerful search.

**Features:** Full-text search, Advanced filters, Search operators, Saved searches

---

### Real-Time Communication

#### [📞 Call Management Guide](Call-Management-Guide)

Manage voice and video calls in your application.

**Topics:** Call setup, State management, Error handling, Quality monitoring

#### [📺 Live Streaming Implementation](Live-Streaming-Implementation)

Set up live streaming to channels.

**Topics:** HLS setup, Stream encoding, Chat integration, Recording

#### [🖥️ Screen Sharing Implementation](Screen-Sharing-Implementation)

Add screen sharing to calls.

**Topics:** Screen capture API, Peer connection, Quality optimization

#### [📹 Video Calling Implementation](Video-Calling-Implementation)

Implement WebRTC video calling.

**Topics:** WebRTC setup, Media devices, Call signaling, ICE/STUN/TURN

#### [🎙️ Voice Calling Implementation](Voice-Calling-Implementation)

Add voice calling to your app.

**Topics:** Audio setup, Noise suppression, Echo cancellation, Quality indicators

#### [📱 Mobile Call Optimizations](Mobile-Call-Optimizations)

Optimize calls for mobile devices.

**Topics:** Battery optimization, Network adaptation, Background support, Notifications

---

### Testing & Quality

#### [🧪 Testing Guide](testing-guide)

Comprehensive testing strategies and examples.

**Topics:** Unit tests, Integration tests, E2E tests, Coverage

#### [🎨 Visual Regression Testing](visual-regression-testing)

Prevent UI regressions with visual testing.

**Topics:** Screenshot comparison, CI integration, Test organization

#### [📊 Test Coverage Report](test-coverage-report)

Current test coverage and improvement plans.

---

### Accessibility & Internationalization

#### [♿ Accessibility Guide](accessibility)

Make your app accessible to everyone.

**Topics:** WCAG compliance, Screen readers, Keyboard navigation, ARIA

#### [♿ Accessibility Quick Reference](accessibility-quick-reference)

Quick tips for accessibility.

#### [📊 Screen Reader Testing Report](screen-reader-testing-report)

Screen reader compatibility testing results.

#### [🎨 Color Contrast Report](color-contrast-report)

Color contrast audit and recommendations.

#### [🌍 Internationalization](internationalization)

Add multi-language support.

**Topics:** i18n setup, Language files, RTL support, Date/time formatting

#### [🌍 i18n Implementation Summary](i18n-implementation-summary)

Summary of internationalization implementation.

---

### Integration

#### [🔌 Integration Examples](integration-examples)

Code examples for common integrations.

**Topics:** Slack, GitHub, Jira, webhooks, custom integrations

---

## 🏢 Enterprise Guides

### [🏢 Enterprise Overview](enterprise/README)

Enterprise features overview and setup.

**Features:** SSO, RBAC, Audit logging, Compliance

**Includes:**

- [🔐 SSO Setup](enterprise/SSO-Setup) - Single sign-on
- [👥 RBAC Guide](enterprise/RBAC-Guide) - Role-based access control
- [📝 Audit Logging](enterprise/Audit-Logging) - Compliance and auditing
- [📊 Implementation Summary](enterprise/Implementation-Summary) - Enterprise features

---

## 🔧 Backend Guides

### [🛠️ nself CLI Setup](backend/nself-cli-setup)

Set up the nself CLI backend infrastructure.

**Topics:** Installation, Configuration, Services, Environment

### [🚀 nself CLI Deployment](backend/nself-cli-deployment)

Deploy nself CLI to production.

**Topics:** Production config, Docker deployment, K8s deployment, Monitoring

---

## 🚀 Deployment Guides

### [📋 Deployment Overview](deployment/README)

Complete deployment guide index.

### Platform-Specific Deployment

#### [🐳 Docker Deployment](deployment/docker-deployment)

Deploy with Docker and Docker Compose.

**Topics:** docker-compose.yml, Environment variables, Volume management, Networking

#### [☸️ Kubernetes/Self-Hosted](deployment/self-hosted)

Deploy to Kubernetes clusters.

**Topics:** Manifests, Helm charts, Ingress, Secrets

**Related:**

- [📋 Self-Hosted Index](deployment/self-hosted-index)
- [🔧 Self-Hosted Troubleshooting](deployment/self-hosted-troubleshooting)

#### [📱 Mobile Deployment](deployment/mobile-deployment)

Deploy to iOS and Android.

**Topics:** Capacitor build, App signing, Store submission, Push notifications

**Related:**

- [🔧 Mobile Troubleshooting](deployment/mobile-deployment-troubleshooting)

#### [🖥️ Desktop Deployment](deployment/desktop-deployment)

Build desktop apps with Tauri or Electron.

**Topics:** App bundling, Auto-updates, Code signing, Distribution

#### [☁️ Vercel Deployment](deployment/vercel-deployment)

Deploy to Vercel platform.

**Topics:** Vercel config, Environment variables, Preview deployments

---

### Deployment Tools

#### [📋 Deployment Checklist](deployment/DEPLOYMENT-CHECKLIST)

Pre-deployment checklist for production.

#### [📊 Deployment Summary](deployment/DEPLOYMENT-SUMMARY)

Complete deployment capabilities overview.

#### [✍️ Code Signing](deployment/code-signing)

Sign your desktop and mobile apps.

#### [🏭 Production Deployment](deployment/production-deployment)

Production deployment best practices.

#### [⚡ Quick Reference](deployment/quick-reference)

Deployment quick reference guide.

---

## 🔧 Development Guides

### [🛠️ Development Overview](development/README)

Development environment setup and tools.

### [💻 CLI Usage](development/cli-usage)

Command-line tools and utilities.

### [📦 SDK Usage](development/sdk-usage)

SDK documentation and examples.

---

## 🚀 Performance

### [⚡ Optimization Guide](performance/optimization)

Performance optimization strategies.

**Topics:** Bundle optimization, Code splitting, Lazy loading, Caching

---

## 🎯 Guides by Role

### For End Users

- **[User Guide](USER-GUIDE)** - Complete user documentation
- **[Settings Quick Start](Settings-Quick-Start)** - Customize your experience

### For Developers

- **[Advanced Messaging](advanced-messaging-implementation-summary)** - Messaging features
- **[E2EE Implementation](E2EE-Implementation)** - Add encryption
- **[Search Implementation](Search-Implementation)** - Add search
- **[Testing Guide](testing-guide)** - Test your code
- **[Integration Examples](integration-examples)** - Integration code

### For Administrators

- **[Enterprise Overview](enterprise/README)** - Enterprise features
- **[SSO Setup](enterprise/SSO-Setup)** - Single sign-on
- **[Audit Logging](enterprise/Audit-Logging)** - Compliance

### For DevOps

- **[nself CLI Setup](backend/nself-cli-setup)** - Backend setup
- **[Docker Deployment](deployment/docker-deployment)** - Docker deploy
- **[Kubernetes](deployment/self-hosted)** - K8s deploy
- **[Production Deployment](deployment/production-deployment)** - Best practices

---

## 🆘 Need Help?

- **[FAQ](../troubleshooting/FAQ)** - Frequently asked questions
- **[Troubleshooting](../troubleshooting/TROUBLESHOOTING)** - Common issues
- **[Runbook](../troubleshooting/RUNBOOK)** - Operations guide

---

<div align="center">

**[⬆ Back to Home](../Home)**

**[Edit this page on GitHub](https://github.com/nself-org/nchat/edit/main/docs/guides/README.md)**

</div>
