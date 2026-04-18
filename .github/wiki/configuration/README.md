# ⚙️ Configuration

Complete guide to configuring nself-chat for your needs.

---

## 📚 In This Section

### [📝 Configuration Guide](Configuration)

Complete configuration reference covering all aspects of nself-chat.

**Topics:**

- AppConfig interface and structure
- Setup wizard configuration
- Development vs production modes
- Feature toggles and flags
- Theme and branding configuration
- Config persistence (localStorage + database)

**Perfect for:** Understanding the entire configuration system

---

### [🔐 Authentication Setup](Authentication)

Configure authentication providers and permissions.

**Topics:**

- Development mode (FauxAuth with test users)
- Production mode (Nhost Auth)
- 11 authentication providers:
  - Email/password
  - Magic links
  - Google, Facebook, Twitter
  - GitHub, Discord, Slack
  - ID.me (military, police, first responders, government)
- Authentication permissions and access control
- Email verification
- Domain restrictions

**Perfect for:** Setting up user authentication

---

### [🔧 Environment Variables](Environment-Variables)

Complete reference of all environment variables.

**Topics:**

- Frontend variables (NEXT*PUBLIC*\*)
- Backend variables (nself CLI)
- Required vs optional variables
- Development vs production values
- Security best practices

**Perfect for:** Configuring your environment

---

## 🎯 Configuration Quick Start

### Minimal Configuration (Development)

For local development, you only need:

```bash
# .env.local
NEXT_PUBLIC_USE_DEV_AUTH=true
NEXT_PUBLIC_ENV=development
```

That's it! The setup wizard will guide you through the rest.

---

### Production Configuration

For production, configure:

1. **Authentication** (`.env.local`):

```bash
NEXT_PUBLIC_USE_DEV_AUTH=false
NEXT_PUBLIC_GRAPHQL_URL=https://api.your-domain.com/v1/graphql
NEXT_PUBLIC_AUTH_URL=https://auth.your-domain.com/v1/auth
NEXT_PUBLIC_STORAGE_URL=https://storage.your-domain.com/v1/storage
```

2. **Backend** (`.backend/.env`):

```bash
# Managed by nself CLI
# See backend setup guide
```

3. **Complete Setup Wizard** at `/setup`

---

## 📖 Configuration Topics

### Branding & White-Label

- Custom app name and tagline
- Logo and favicon upload
- Color themes (25+ presets)
- Custom CSS injection
- Landing page templates

**Guide:** [White-Label Guide](../features/White-Label-Guide)

---

### Authentication & Security

- Auth provider configuration
- Access permissions (open, restricted, invite-only)
- Email verification
- Domain restrictions
- Role-based access control (RBAC)

**Guides:**

- [Authentication Setup](Authentication)
- [Security Overview](../security/SECURITY)
- [RBAC Guide](../guides/enterprise/RBAC-Guide)

---

### Features & Functionality

- Enable/disable features via toggles:
  - Channels (public, private)
  - Direct messages
  - Threads
  - Reactions
  - Voice messages
  - Video calls
  - Screen sharing
  - Live streaming
  - E2EE
  - Polls
  - GIFs & stickers
  - Bots & plugins

**Guide:** [Features Overview](../features/Features)

---

### Integrations

- Slack import/export
- GitHub notifications
- Jira integration
- Google Drive
- Custom webhooks

**Guide:** [Integration Examples](../guides/integration-examples)

---

### Moderation

- Auto-moderation settings
- Profanity filter
- Spam detection
- Content filtering
- User reporting

**Guides:**

- [Moderation System](../Moderation-System)
- [Admin Advanced Features](../Admin-Advanced-Features)

---

## 🔧 Configuration by Environment

### Development Environment

**Characteristics:**

- 8 test users with auto-login
- FauxAuth service (no real backend)
- Hot reload enabled
- Debug logging
- Error stack traces

**Setup:**

```bash
# .env.local
NEXT_PUBLIC_USE_DEV_AUTH=true
NEXT_PUBLIC_ENV=development
```

**Test Users:**

- owner@nself.org (owner)
- admin@nself.org (admin)
- moderator@nself.org (moderator)
- member@nself.org (member)
- guest@nself.org (guest)

All passwords: `password123`

---

### Staging Environment

**Characteristics:**

- Real authentication
- Production-like setup
- Monitoring enabled
- Separate database

**Setup:**

```bash
# .env.local
NEXT_PUBLIC_USE_DEV_AUTH=false
NEXT_PUBLIC_ENV=staging
NEXT_PUBLIC_GRAPHQL_URL=https://api.staging.example.com/v1/graphql
```

---

### Production Environment

**Characteristics:**

- Real authentication
- SSL/TLS required
- Monitoring and alerting
- Backup and recovery
- Performance optimization

**Setup:**

```bash
# .env.local
NEXT_PUBLIC_USE_DEV_AUTH=false
NEXT_PUBLIC_ENV=production
NEXT_PUBLIC_GRAPHQL_URL=https://api.example.com/v1/graphql
```

**Checklist:** [Production Deployment Checklist](../deployment/Production-Deployment-Checklist)

---

## 🎨 Configuration Patterns

### AppConfig Structure

```typescript
interface AppConfig {
  setup: { isCompleted, currentStep, visitedSteps }
  owner: { name, email, company, role }
  branding: { appName, logo, favicon, tagline, logoScale }
  landingTheme: 'login-only' | 'simple-landing' | 'full-homepage' | 'corporate' | 'community'
  homepage: { mode, landingPages, redirectTo }
  authProviders: { emailPassword, magicLinks, google, github, ... }
  authPermissions: { mode, requireEmailVerification, allowedDomains, ... }
  features: { publicChannels, privateChannels, directMessages, threads, ... }
  integrations: { slack, github, jira, googleDrive, webhooks }
  moderation: { autoModeration, profanityFilter, spamDetection, ... }
  theme: { preset, colors (16 properties), colorScheme, customCSS }
  seo: { title, description, keywords, ogImage }
  legal: { privacyPolicyUrl, termsOfServiceUrl, supportEmail }
  social: { twitter, linkedin, github, discord }
}
```

**Reference:** [AppConfig Documentation](Configuration#appconfig-interface)

---

### Configuration Persistence

nself-chat uses a dual-persistence strategy:

1. **localStorage** - Fast, immediate access
2. **Database** - Persistent, multi-device sync

**Flow:**

1. Load from localStorage (instant)
2. Fetch from database in background
3. Merge and update localStorage
4. Save changes to both

**API:**

- GET `/api/config` - Fetch config
- POST `/api/config` - Update config

---

## 🔐 Security Best Practices

### Environment Variables

- ✅ Never commit `.env.local` to git
- ✅ Use different values per environment
- ✅ Rotate secrets regularly
- ✅ Use secrets management in production
- ❌ Don't expose secrets to client

### Authentication

- ✅ Enable 2FA for admins
- ✅ Require email verification
- ✅ Use strong password requirements
- ✅ Implement rate limiting
- ✅ Monitor failed login attempts

### Access Control

- ✅ Use invite-only mode for private teams
- ✅ Configure domain restrictions
- ✅ Implement RBAC
- ✅ Regular permission audits
- ✅ Principle of least privilege

**Guide:** [Security Best Practices](../security/security-best-practices)

---

## 🆘 Common Configuration Issues

### Setup Wizard Not Appearing

**Cause:** Setup already completed
**Solution:** Reset config in admin panel or database

### Test Users Not Working

**Cause:** Production mode enabled
**Solution:** Set `NEXT_PUBLIC_USE_DEV_AUTH=true`

### Theme Not Applying

**Cause:** localStorage not syncing
**Solution:** Clear browser cache and reload

### Auth Provider Not Working

**Cause:** Missing credentials
**Solution:** Check provider configuration in dashboard

**Full Guide:** [Troubleshooting](../troubleshooting/TROUBLESHOOTING)

---

## 📖 Related Documentation

- **[Installation Guide](../getting-started/Installation)** - Initial setup
- **[Deployment Guide](../deployment/DEPLOYMENT)** - Production deployment
- **[API Documentation](../api/API-DOCUMENTATION)** - API reference
- **[Security Guide](../security/SECURITY)** - Security features

---

## 🎯 Next Steps

After configuration:

- **[Complete Setup Wizard](../guides/USER-GUIDE#setup-wizard)** - 9-step guided setup
- **[Customize Theme](../features/White-Label-Guide)** - Brand your app
- **[Deploy to Production](../deployment/DEPLOYMENT)** - Go live
- **[Configure Enterprise Features](../guides/enterprise/README)** - SSO, RBAC, Audit

---

<div align="center">

**[⬆ Back to Home](../Home)**

**[Edit this page on GitHub](https://github.com/nself-org/nchat/edit/main/docs/configuration/README.md)**

</div>
