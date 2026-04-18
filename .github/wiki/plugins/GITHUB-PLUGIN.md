# ɳChat GitHub Plugin

**Plugin Name**: `github`
**Version**: 1.0.0
**Category**: DevOps
**Status**: Production Ready
**Priority**: LOW (Integration)

---

## Overview

The GitHub Plugin integrates GitHub repositories with ɳChat channels, providing commit notifications, PR/issue updates, code snippet embeds, and OAuth authentication.

---

## Features

- ✅ **Repository Integration** - Connect repos to channels
- ✅ **Commit Notifications** - Real-time push notifications
- ✅ **PR/Issue Updates** - Track pull requests and issues
- ✅ **Code Snippets** - Embed GitHub URLs
- ✅ **OAuth Authentication** - Sign in with GitHub
- ✅ **Webhook Events** - Push, PR, issue, release events

---

## Installation

### Prerequisites

- GitHub account
- OAuth App or GitHub App
- Webhook endpoint accessible

### Setup GitHub App

1. Go to GitHub Settings > Developer settings > GitHub Apps
2. Create new GitHub App
3. Set webhook URL: `https://yourdomain.com/api/webhooks/github`
4. Subscribe to events: push, pull_request, issues, release
5. Generate webhook secret
6. Install app on repositories

### Configuration

```bash
# backend/.env.plugins
GITHUB_ENABLED=true
GITHUB_CLIENT_ID=Iv1.abc123...
GITHUB_CLIENT_SECRET=abc123...
GITHUB_WEBHOOK_SECRET=whsec_abc123...
GITHUB_APP_ID=123456
```

---

## API Endpoints

### Connect Repository

```bash
POST /api/integrations/github/connect
{
  "channelId": "channel-123",
  "repo": "owner/repo"
}
```

### Disconnect Repository

```bash
POST /api/integrations/github/disconnect
{
  "channelId": "channel-123",
  "repo": "owner/repo"
}
```

### List Repositories

```bash
GET /api/integrations/github/repos
```

### Webhook Handler

```bash
POST /api/webhooks/github
X-GitHub-Event: push
X-Hub-Signature-256: sha256=...
```

---

## Event Types

- **push** - Code pushed to repository
- **pull_request** - PR opened/closed/merged
- **issues** - Issue opened/closed/commented
- **release** - New release published
- **star** - Repository starred
- **watch** - Repository watched

---

## Frontend Integration

```typescript
function ConnectGitHub({ channelId }) {
  const handleConnect = async () => {
    await fetch('/api/integrations/github/connect', {
      method: 'POST',
      body: JSON.stringify({
        channelId,
        repo: 'nself-org/nchat',
      }),
    })
  }

  return <button onClick={handleConnect}>Connect GitHub</button>
}
```

---

## Code Snippets

GitHub URLs are automatically unfurled:

```
https://github.com/owner/repo/blob/main/file.js
https://github.com/owner/repo/pull/123
https://github.com/owner/repo/issues/456
```

---

## Support

- **GitHub Apps**: https://github.com/settings/apps
- **GitHub Docs**: https://docs.github.com

---

## Related Documentation

- [Plugin System Overview](./README.md)
- [Installation Guide](./INSTALLATION-GUIDE.md)
