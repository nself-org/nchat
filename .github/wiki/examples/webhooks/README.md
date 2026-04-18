# Webhook Examples

This directory contains practical examples for testing and integrating with the nself-chat webhook system.

## Files

### Testing Scripts

#### `incoming-basic.sh`

Simple script to test incoming webhooks with basic text messages.

**Usage:**

```bash
chmod +x incoming-basic.sh
./incoming-basic.sh http://localhost:3000/api/webhooks/incoming/YOUR_TOKEN
```

#### `incoming-rich.sh`

Advanced script demonstrating rich embeds, fields, attachments, and formatting.

**Usage:**

```bash
chmod +x incoming-rich.sh
./incoming-rich.sh http://localhost:3000/api/webhooks/incoming/YOUR_TOKEN
```

### Server Examples

#### `outgoing-server.js`

Complete Express.js server that receives and validates outgoing webhooks.

**Setup:**

```bash
npm install express body-parser
node outgoing-server.js
```

**Configure nself-chat:**

1. Create outgoing webhook
2. Set URL to: `http://localhost:4000/webhook`
3. Set secret to match `WEBHOOK_SECRET` environment variable

**Features:**

- Signature verification
- Event routing
- Request logging
- Health check endpoint

### Code Examples

#### `signature-verify.ts`

TypeScript examples for verifying webhook signatures from different platforms.

**Includes:**

- GitHub signature verification (HMAC-SHA256)
- Slack signature verification (with timestamp validation)
- Jira signature verification
- Telegram token verification
- Generic HMAC verification
- Express middleware example

**Usage in your code:**

```typescript
import { verifyGitHubSignature } from './signature-verify'

const isValid = verifyGitHubSignature(payload, signature, secret)
if (!isValid) {
  throw new Error('Invalid signature')
}
```

## Quick Start

### 1. Test Incoming Webhook

Create a webhook in nself-chat:

```bash
# Via API or UI, get webhook token
WEBHOOK_TOKEN="your-token-here"

# Send test message
./incoming-basic.sh http://localhost:3000/api/webhooks/incoming/$WEBHOOK_TOKEN
```

### 2. Test Outgoing Webhook

Start the test server:

```bash
# Terminal 1: Start webhook receiver
export WEBHOOK_SECRET="my-secret-key"
node outgoing-server.js
```

Configure outgoing webhook in nself-chat:

- URL: `http://localhost:4000/webhook`
- Secret: `my-secret-key`
- Events: `message.created`, `channel.created`

Trigger an event and watch the server logs.

### 3. Platform Integration

#### GitHub

1. Go to repository Settings → Webhooks
2. Add webhook: `https://your-domain.com/api/webhooks/github`
3. Set secret: `your-github-secret`
4. Select events: Push, Pull requests, Issues
5. Add secret to `.env`: `GITHUB_WEBHOOK_SECRET=your-github-secret`

#### Slack

1. Create Slack App: https://api.slack.com/apps
2. Enable Event Subscriptions
3. Set URL: `https://your-domain.com/api/webhooks/slack`
4. Subscribe to bot events
5. Add signing secret to `.env`: `SLACK_SIGNING_SECRET=your-signing-secret`

#### Jira

1. Jira → Settings → System → WebHooks
2. Create webhook: `https://your-domain.com/api/webhooks/jira`
3. Select events
4. Optional secret in `.env`: `JIRA_WEBHOOK_SECRET=your-secret`

## Common Use Cases

### CI/CD Notifications

```bash
# Jenkins pipeline
curl -X POST $WEBHOOK_URL \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Build completed",
    "embeds": [{
      "title": "Build #'$BUILD_NUMBER'",
      "color": "'$BUILD_STATUS_COLOR'",
      "fields": [
        {"name": "Status", "value": "'$BUILD_STATUS'"},
        {"name": "Duration", "value": "'$BUILD_DURATION'"}
      ]
    }]
  }'
```

### Monitoring Alerts

```bash
# Prometheus AlertManager
curl -X POST $WEBHOOK_URL \
  -H "Content-Type: application/json" \
  -d '{
    "content": "🚨 **ALERT**: High CPU usage detected",
    "embeds": [{
      "title": "CPU Usage: 95%",
      "description": "Server: production-01",
      "color": "#ff0000",
      "fields": [
        {"name": "Current", "value": "95%"},
        {"name": "Threshold", "value": "80%"}
      ]
    }]
  }'
```

### Deployment Notifications

```bash
# Deploy script
curl -X POST $WEBHOOK_URL \
  -H "Content-Type: application/json" \
  -d '{
    "content": "✅ Deployment to **production** completed",
    "embeds": [{
      "title": "Version 1.2.3",
      "url": "https://github.com/org/repo/releases/v1.2.3",
      "color": "#00ff00",
      "fields": [
        {"name": "Environment", "value": "production"},
        {"name": "Deployed by", "value": "'$USER'"},
        {"name": "Duration", "value": "2m 15s"}
      ]
    }]
  }'
```

## Troubleshooting

### Webhook not receiving events

1. Check webhook status is "active"
2. Verify URL is accessible (test with curl)
3. Check firewall settings
4. Review webhook delivery logs

### Signature verification failing

1. Ensure secret matches on both sides
2. Use raw request body (not parsed JSON)
3. Check timestamp for Slack webhooks
4. Verify signature format (prefix, algorithm)

### Messages not appearing

1. Verify channel exists and webhook has access
2. Check webhook delivery status in admin
3. Review error logs
4. Verify GraphQL mutations are succeeding

## Security Notes

1. **Never commit secrets** - Use environment variables
2. **Always use HTTPS** in production
3. **Verify signatures** - Don't skip verification
4. **Validate payloads** - Check required fields
5. **Rate limit** - Prevent abuse
6. **Log activity** - Audit webhook usage
7. **Rotate secrets** - Change secrets regularly

## Additional Resources

- [Main Webhook Documentation](../../Webhooks.md)
- [Implementation Details](../../Webhook-Implementation.md)
- [API Reference](../../api/API.md)

## Support

For issues or questions:

- GitHub Issues: https://github.com/your-org/nself-chat/issues
- Documentation: https://docs.nself-chat.com
