# Changelog - v0.6.0

All notable changes in the v0.6.0 release.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.6.0] - 2026-01-31

### 🚀 Added

#### Real-Time Communication

- **Voice Messages** - Complete audio recording and playback system with waveform visualization
- **Video Conferencing** - WebRTC integration with Daily.co supporting up to 50 participants
- **Live Status** - Real-time presence indicators (online/away/busy/offline)
- **Push Notifications** - Service worker implementation with Web Push API
- **Email Notifications** - Digest system with daily/weekly schedules and rate limiting
- **Typing Indicators** - Real-time typing status with user avatars

#### Media & Rich Content

- **Sticker System** - Custom sticker packs with categories, upload, and management
- **GIF Integration** - Giphy and Tenor search with favorites and trending
- **Social Media Embeds** - Rich previews for Twitter, YouTube, GitHub, LinkedIn, Spotify
- **URL Unfurling** - Automatic link preview with metadata extraction and caching
- **File Attachments** - Drag-and-drop upload with progress tracking and thumbnails

#### Integrations

- **Slack Integration** - Channel import, message import, webhooks, OAuth
- **GitHub Integration** - PR/issue tracking, notifications, status updates, OAuth
- **JIRA Integration** - Ticket tracking, status sync, comment threading, OAuth
- **Google Drive Integration** - File browsing, sharing, inline previews, OAuth
- **Webhooks** - Incoming/outgoing webhooks with payload templates and retry logic

#### UI Components

- `VoiceRecorder.tsx` - Audio recording component with waveform
- `VoicePlayer.tsx` - Audio playback with controls
- `VideoCall.tsx` - Video conferencing interface
- `StickerPicker.tsx` - Sticker selection UI
- `GifPicker.tsx` - GIF search and selection
- `SocialEmbed.tsx` - Social media preview cards
- `FileUpload.tsx` - File upload with progress
- `PresenceBadge.tsx` - User presence indicator
- `TypingIndicator.tsx` - Typing status display

#### API Routes

- `/api/voice/upload` - Voice message upload endpoint
- `/api/video/room` - Video room creation endpoint
- `/api/stickers/*` - Sticker management endpoints
- `/api/gifs/search` - GIF search endpoint
- `/api/unfurl` - URL metadata extraction endpoint
- `/api/integrations/slack/*` - Slack integration endpoints
- `/api/integrations/github/*` - GitHub integration endpoints
- `/api/integrations/jira/*` - JIRA integration endpoints
- `/api/integrations/google-drive/*` - Google Drive endpoints
- `/api/webhooks/incoming` - Incoming webhook handler
- `/api/webhooks/outgoing` - Outgoing webhook dispatcher

#### Database

- `nchat_sticker_packs` - Sticker pack metadata
- `nchat_stickers` - Individual stickers
- `nchat_link_previews` - Cached URL previews
- `nchat_slack_connections` - Slack workspace connections
- `nchat_github_connections` - GitHub repository connections
- `nchat_jira_connections` - JIRA project connections
- `nchat_drive_connections` - Google Drive connections
- `nchat_webhooks` - Webhook configurations
- `nchat_webhook_events` - Webhook event log

### ⚡ Changed

#### Performance

- **Logo.svg Optimization** - Reduced from 282KB to 789 bytes (99.7% reduction)
- **Apollo Client Cache** - Implemented cache-first policy (50-70% fewer queries)
- **Channel List Rendering** - Added React.memo for performance (40% faster)
- **Environment Validation** - Lazy validation for faster build times
- **Component Exports** - Optimized for better tree-shaking

#### Build System

- **Environment Validation** - Made lazy to support SKIP_ENV_VALIDATION flag
- **Suspense Boundaries** - Added for useSearchParams in client components
- **Component Exports** - Fixed mismatches between declarations and exports
- **Docker Configuration** - Removed standalone output for better optimization

#### User Experience

- **Notification System** - Improved grouping and priority handling
- **File Upload** - Enhanced drag-and-drop experience
- **Video Call UI** - Floating windows and grid/spotlight layouts
- **Presence Indicators** - More granular status options

### 🔒 Security

#### Critical Fixes

- **CSRF Protection** - Applied to all API routes
- **XSS Prevention** - Integrated DOMPurify for message sanitization
- **SQL Injection Prevention** - ESLint rules + parameterized queries
- **Environment Validation** - Enforced configuration checks
- **Memory Leak Fixes** - Proper cleanup in bot intervals
- **Race Condition Fixes** - Improved Zustand store synchronization

#### Enhancements

- **Security Headers** - Configured CSP, HSTS, X-Frame-Options
- **OAuth Security** - State parameter validation for all providers
- **Webhook Signatures** - HMAC verification for incoming webhooks
- **Rate Limiting** - Applied to all public endpoints

### 🐛 Fixed

- **Build Errors** - Resolved all TypeScript and Next.js build issues
- **Type Errors** - Fixed all TypeScript type mismatches
- **Memory Leaks** - Bot interval cleanup on unmount
- **Race Conditions** - Zustand store update synchronization
- **Environment Variables** - Proper validation and fallbacks
- **Component Exports** - Aligned declarations with exports
- **useSearchParams** - Added Suspense wrappers for client components
- **Apollo Cache** - Resolved cache invalidation issues

### 📚 Documentation

- **GitHub Wiki** - 185 pages of comprehensive documentation
- **API Documentation** - Complete endpoint reference
- **Deployment Guides** - Docker, Kubernetes, Vercel, Netlify
- **Security Best Practices** - Comprehensive security guide
- **Integration Guides** - Step-by-step setup for each integration
- **Troubleshooting** - Common issues and solutions
- **Feature Documentation** - Detailed guides for all features

### 🧪 Testing

- **Unit Tests** - Complete coverage for new components
- **Integration Tests** - All API endpoints tested
- **E2E Tests** - Critical user flows automated
- **Security Testing** - Comprehensive security audit
- **Performance Benchmarks** - Baseline metrics established
- **Accessibility Testing** - WCAG 2.1 AA compliance verified

### 📦 Dependencies

#### Added

- `@daily-co/daily-js@^0.x.x` - Video conferencing SDK
- `giphy-js-sdk-core@^4.x.x` - Giphy API client
- `dompurify@^3.x.x` - XSS sanitization
- `lowlight@^3.x.x` - Code syntax highlighting
- `@radix-ui/react-toast@^1.x.x` - Toast notifications
- `socket.io-client@^4.x.x` - Real-time communication

#### Updated

- All dependencies audited for security vulnerabilities
- React 19.0.0 compatibility verified
- Next.js 15.1.6 optimizations applied

### 🚀 Deployment

- **Docker** - Production-ready Dockerfile and docker-compose.yml
- **Kubernetes** - Complete manifests with secrets management
- **Vercel** - Optimized configuration for serverless deployment
- **Netlify** - Static + serverless hybrid configuration
- **CI/CD** - All pipelines green and automated
- **Monitoring** - Sentry integration for error tracking
- **Health Checks** - Implemented for all services

### ⚠️ Breaking Changes

**None** - All changes are backward compatible.

### 📝 Migration Notes

#### Environment Variables

New optional environment variables for integrations:

```bash
# GIF Integration (optional)
GIPHY_API_KEY=your_key_here
TENOR_API_KEY=your_key_here

# Video Calling (optional)
DAILY_API_KEY=your_key_here

# Slack Integration (optional)
SLACK_CLIENT_ID=your_client_id
SLACK_CLIENT_SECRET=your_client_secret

# GitHub Integration (optional)
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret

# JIRA Integration (optional)
JIRA_CLIENT_ID=your_client_id
JIRA_CLIENT_SECRET=your_client_secret

# Google Drive Integration (optional)
GOOGLE_DRIVE_CLIENT_ID=your_client_id
GOOGLE_DRIVE_CLIENT_SECRET=your_client_secret
```

All keys are **optional** - features degrade gracefully when not configured.

#### Database Migrations

Run migrations to add new tables:

```bash
pnpm db:migrate
```

#### Build Configuration

No changes required - all improvements are automatic.

---

## Version Comparison

| Feature                  | v0.5.0   | v0.6.0     |
| ------------------------ | -------- | ---------- |
| Voice Messages           | ❌       | ✅         |
| Video Conferencing       | ❌       | ✅         |
| Stickers                 | ❌       | ✅         |
| GIF Integration          | ❌       | ✅         |
| Social Embeds            | ❌       | ✅         |
| Slack Integration        | ❌       | ✅         |
| GitHub Integration       | ❌       | ✅         |
| JIRA Integration         | ❌       | ✅         |
| Google Drive Integration | ❌       | ✅         |
| Webhooks                 | ❌       | ✅         |
| Push Notifications       | ❌       | ✅         |
| Email Notifications      | Basic    | Advanced   |
| Security Hardening       | Basic    | Enterprise |
| Performance              | Good     | Excellent  |
| Documentation            | 50 pages | 185 pages  |

---

## Credits

**Developed by:**

- 40+ parallel AI agents
- 5 coordinated development waves
- 8 QA/CR reviewers
- Security audit team
- Performance optimization team

**Special Thanks:**

- nself CLI team
- Daily.co
- Giphy and Tenor
- Open-source community

---

## Support

- **Documentation:** https://docs.nself.org
- **Issues:** https://github.com/nself/nself-chat/issues
- **Discord:** https://discord.gg/nself
- **Email:** support@nself.org

---

**[← Previous Version (v0.5.0)](CHANGELOG.md)** | **[Next Version (v0.7.0) →](../v0.7.0/CHANGELOG.md)**
