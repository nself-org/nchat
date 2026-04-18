# ɳChat Notifications Plugin

**Plugin Name**: `notifications`
**Version**: 1.0.0
**Category**: Communication
**Status**: Production Ready
**Priority**: CRITICAL

---

## Overview

The Notifications Plugin provides multi-channel notification delivery for ɳChat. It handles email, push notifications, SMS, and in-app notifications with templating, preferences, and delivery tracking.

---

## Features

### Core Features

- ✅ **Email Notifications** - SMTP, SendGrid, Mailgun support
- ✅ **Push Notifications** - FCM (Android), APNS (iOS)
- ✅ **SMS Notifications** - Twilio integration
- ✅ **In-App Notifications** - Real-time notification center
- ✅ **Templating System** - Customizable templates
- ✅ **User Preferences** - Per-user notification settings
- ✅ **Delivery Tracking** - Status and delivery confirmation
- ✅ **Batching** - Bulk notification sending
- ✅ **Scheduling** - Delayed notification delivery

### Advanced Features

- ✅ **Email Digests** - Daily/weekly summary emails
- ✅ **Notification Categories** - Mentions, messages, threads, etc.
- ✅ **Priority Levels** - Low, normal, high, critical
- ✅ **Retry Logic** - Automatic retry on failure
- ✅ **Rate Limiting** - Prevent notification spam
- ✅ **Analytics** - Delivery rates and engagement tracking
- ✅ **Localization** - Multi-language support
- ✅ **Rich Notifications** - Images, actions, sounds

---

## Installation

### Prerequisites

- Docker running
- nself CLI v0.9.8+
- Mailpit (dev) or SMTP server (prod)

### Install Plugin

```bash
cd /Users/admin/Sites/nself-nchat/backend
nself plugin install notifications
```

### Configuration

Add to `backend/.env.plugins`:

```bash
# Notifications Plugin
NOTIFICATIONS_ENABLED=true
NOTIFICATIONS_PORT=3102
NOTIFICATIONS_ROUTE=notifications.${BASE_DOMAIN:-localhost}
NOTIFICATIONS_MEMORY=128M

# Email Provider (Development)
NOTIFICATIONS_EMAIL_PROVIDER=mailpit
NOTIFICATIONS_SMTP_HOST=mailpit
NOTIFICATIONS_SMTP_PORT=1025
NOTIFICATIONS_SMTP_SECURE=false
NOTIFICATIONS_FROM_EMAIL=noreply@nchat.local
NOTIFICATIONS_FROM_NAME=nself Chat

# Email Provider (Production)
# NOTIFICATIONS_EMAIL_PROVIDER=sendgrid
# NOTIFICATIONS_SENDGRID_API_KEY=${SENDGRID_API_KEY}
# Or SMTP:
# NOTIFICATIONS_EMAIL_PROVIDER=smtp
# NOTIFICATIONS_SMTP_HOST=smtp.example.com
# NOTIFICATIONS_SMTP_PORT=587
# NOTIFICATIONS_SMTP_SECURE=true
# NOTIFICATIONS_SMTP_USER=${SMTP_USER}
# NOTIFICATIONS_SMTP_PASSWORD=${SMTP_PASSWORD}

# Push Notifications
NOTIFICATIONS_PUSH_ENABLED=true
NOTIFICATIONS_FCM_SERVER_KEY=${FCM_SERVER_KEY}
NOTIFICATIONS_APNS_KEY_ID=${APNS_KEY_ID}
NOTIFICATIONS_APNS_TEAM_ID=${APNS_TEAM_ID}
NOTIFICATIONS_APNS_BUNDLE_ID=com.nchat.app

# SMS (Twilio)
NOTIFICATIONS_SMS_ENABLED=false
NOTIFICATIONS_TWILIO_ACCOUNT_SID=${TWILIO_ACCOUNT_SID}
NOTIFICATIONS_TWILIO_AUTH_TOKEN=${TWILIO_AUTH_TOKEN}
NOTIFICATIONS_TWILIO_FROM_NUMBER=${TWILIO_FROM_NUMBER}

# Templates
NOTIFICATIONS_TEMPLATES_DIR=/app/templates
NOTIFICATIONS_DEFAULT_TEMPLATE=default

# Delivery
NOTIFICATIONS_RETRY_ATTEMPTS=3
NOTIFICATIONS_RETRY_DELAY=5000
NOTIFICATIONS_BATCH_SIZE=100
NOTIFICATIONS_RATE_LIMIT=1000

# Database (for preferences and history)
NOTIFICATIONS_DATABASE_URL=${DATABASE_URL}
```

### Start Service

```bash
nself restart
```

---

## API Endpoints

### Health Check

```bash
GET /health
```

**Response:**

```json
{
  "status": "healthy",
  "service": "notifications",
  "version": "1.0.0",
  "uptime": 86400,
  "channels": {
    "email": { "enabled": true, "provider": "mailpit" },
    "push": { "enabled": true },
    "sms": { "enabled": false }
  },
  "providers": {
    "email": { "status": "connected" },
    "fcm": { "status": "connected" }
  }
}
```

### Send Notification

```bash
POST /send
Content-Type: application/json

{
  "userId": "user-123",
  "channel": "email",
  "to": {
    "email": "user@example.com"
  },
  "content": {
    "subject": "New message from Alice",
    "body": "Alice sent you a message: Hello!"
  },
  "category": "message",
  "priority": "normal"
}
```

**Response:**

```json
{
  "success": true,
  "notification_id": "notif-abc123",
  "message": "Notification queued",
  "estimated_delivery": "2026-02-03T12:00:05Z"
}
```

### Send Bulk Notifications

```bash
POST /send-bulk
Content-Type: application/json

{
  "notifications": [
    {
      "userId": "user-1",
      "channel": "email",
      "to": { "email": "user1@example.com" },
      "content": { "subject": "Hello", "body": "World" }
    },
    {
      "userId": "user-2",
      "channel": "push",
      "to": { "push_token": "fcm-token" },
      "content": { "title": "Hello", "body": "World" }
    }
  ]
}
```

### Get Notification Status

```bash
GET /notifications/:notificationId
```

**Response:**

```json
{
  "id": "notif-abc123",
  "status": "delivered",
  "channel": "email",
  "userId": "user-123",
  "sentAt": "2026-02-03T12:00:05Z",
  "deliveredAt": "2026-02-03T12:00:07Z",
  "openedAt": null,
  "clickedAt": null
}
```

### User Preferences

#### Get Preferences

```bash
GET /preferences/:userId
```

**Response:**

```json
{
  "userId": "user-123",
  "channels": {
    "email": true,
    "push": true,
    "sms": false
  },
  "categories": {
    "mentions": { "email": true, "push": true },
    "messages": { "email": false, "push": true },
    "threads": { "email": true, "push": false }
  },
  "digest": {
    "enabled": true,
    "frequency": "daily",
    "time": "09:00"
  },
  "quiet_hours": {
    "enabled": true,
    "start": "22:00",
    "end": "08:00"
  }
}
```

#### Update Preferences

```bash
POST /preferences/:userId
Content-Type: application/json

{
  "channels": {
    "email": true,
    "push": false
  },
  "categories": {
    "mentions": { "email": true, "push": true }
  }
}
```

### Notification History

```bash
GET /history/:userId?category=mention&limit=20&offset=0
```

**Response:**

```json
{
  "notifications": [
    {
      "id": "notif-1",
      "category": "mention",
      "channel": "email",
      "status": "delivered",
      "sentAt": "2026-02-03T12:00:00Z"
    }
  ],
  "total": 42,
  "limit": 20,
  "offset": 0
}
```

---

## Notification Channels

### Email

```typescript
{
  "channel": "email",
  "to": {
    "email": "user@example.com",
    "name": "John Doe" // optional
  },
  "content": {
    "subject": "Subject line",
    "body": "Plain text body",
    "html": "<p>HTML body</p>", // optional
    "template": "mention", // optional
    "variables": {
      "actorName": "Alice",
      "channelName": "general"
    }
  },
  "attachments": [ // optional
    {
      "filename": "document.pdf",
      "content": "base64-encoded-content",
      "contentType": "application/pdf"
    }
  ]
}
```

### Push Notification

```typescript
{
  "channel": "push",
  "to": {
    "push_token": "fcm-token-or-apns-token",
    "platform": "android" // or "ios"
  },
  "content": {
    "title": "New message",
    "body": "You have a new message from Alice",
    "icon": "https://example.com/icon.png", // optional
    "image": "https://example.com/image.png", // optional
    "sound": "default", // optional
    "badge": 5, // optional (iOS)
    "data": { // optional custom data
      "channelId": "channel-123",
      "messageId": "msg-456"
    },
    "actions": [ // optional
      {
        "action": "reply",
        "title": "Reply"
      },
      {
        "action": "mark_read",
        "title": "Mark as Read"
      }
    ]
  }
}
```

### SMS

```typescript
{
  "channel": "sms",
  "to": {
    "phone_number": "+12345678901"
  },
  "content": {
    "body": "You have a new message from Alice in #general"
  }
}
```

### In-App

```typescript
{
  "channel": "in-app",
  "to": {
    "userId": "user-123"
  },
  "content": {
    "title": "New message",
    "body": "Alice sent you a message",
    "icon": "message",
    "color": "blue",
    "action_url": "/chat/channel-123"
  }
}
```

---

## Frontend Integration

### Environment Variables

```bash
# .env.local
NEXT_PUBLIC_NOTIFICATIONS_URL=http://notifications.localhost:3102
NEXT_PUBLIC_NOTIFICATIONS_ENABLED=true
```

### React Hook

```typescript
import { useNotificationPreferences } from '@/hooks/use-notification-preferences'

function NotificationSettings() {
  const {
    preferences,
    updatePreferences,
    loading
  } = useNotificationPreferences()

  const handleToggleEmail = async () => {
    await updatePreferences({
      channels: {
        ...preferences.channels,
        email: !preferences.channels.email
      }
    })
  }

  return (
    <div>
      <label>
        <input
          type="checkbox"
          checked={preferences.channels.email}
          onChange={handleToggleEmail}
          disabled={loading}
        />
        Email notifications
      </label>
    </div>
  )
}
```

### Service Layer

```typescript
import { NotificationService } from '@/services/notifications'

const notificationService = new NotificationService()

// Send notification
await notificationService.sendNotification({
  userId: 'user-123',
  channel: 'email',
  to: { email: 'user@example.com' },
  content: {
    subject: 'New message',
    body: 'You have a new message',
  },
})

// Get preferences
const prefs = await notificationService.getPreferences('user-123')

// Update preferences
await notificationService.updatePreferences('user-123', {
  channels: { email: false, push: true },
})
```

---

## Templates

### Template Structure

```
templates/
├── email/
│   ├── mention.html
│   ├── message.html
│   ├── thread-reply.html
│   └── digest.html
├── push/
│   ├── mention.json
│   └── message.json
└── sms/
    └── mention.txt
```

### Email Template Example

```html
<!-- templates/email/mention.html -->
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>{{subject}}</title>
  </head>
  <body>
    <h1>{{actorName}} mentioned you in #{{channelName}}</h1>
    <p>{{messagePreview}}</p>
    <a href="{{actionUrl}}">View message</a>
  </body>
</html>
```

### Template Variables

Available variables in templates:

- `{{actorName}}` - User who triggered the notification
- `{{channelName}}` - Channel name
- `{{messagePreview}}` - Message content preview
- `{{actionUrl}}` - Link to relevant content
- `{{appName}}` - Application name
- `{{timestamp}}` - Notification timestamp

---

## Event Integration

### Processing Chat Events

```typescript
// Automatically process chat events
const events = [
  'message.mention',
  'message.reply',
  'message.reaction',
  'channel.invite',
  'thread.reply',
]

await notificationService.processChatEvent({
  type: 'message.mention',
  timestamp: new Date().toISOString(),
  actor: {
    id: 'user-1',
    name: 'Alice',
  },
  target: {
    user_id: 'user-2',
    user_email: 'bob@example.com',
    user_push_token: 'fcm-token',
  },
  data: {
    channel_id: 'channel-123',
    channel_name: 'general',
    message_preview: 'Hey @bob, check this out!',
    action_url: 'https://nchat.app/channel-123',
  },
})
```

---

## Testing

### Health Check Test

```bash
curl http://notifications.localhost:3102/health
```

### Send Test Email

```bash
curl -X POST http://notifications.localhost:3102/send \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "channel": "email",
    "to": { "email": "test@example.com" },
    "content": {
      "subject": "Test Email",
      "body": "This is a test"
    }
  }'
```

### View Test Emails (Mailpit)

```bash
open http://mailpit.localhost:8025
```

---

## Monitoring

### Metrics

- **Notifications Sent**: Total count by channel
- **Delivery Rate**: Percentage successfully delivered
- **Open Rate**: Email open tracking (if enabled)
- **Click Rate**: Link click tracking
- **Failure Rate**: Failed deliveries
- **Latency**: Time from trigger to delivery

### Dashboard

Access metrics at: `/metrics`

### Logs

```bash
nself logs notifications --follow
```

---

## Troubleshooting

### Email Not Sending

1. Check SMTP configuration
2. Verify Mailpit is running (dev)
3. Check logs: `nself logs notifications`
4. Test SMTP connection: `telnet smtp.example.com 587`

### Push Notifications Not Delivered

1. Verify FCM/APNS credentials
2. Check device token is valid
3. Test with Firebase Console / APNS tester
4. Review notification payload format

### High Failure Rate

1. Check provider status
2. Review rate limits
3. Validate email addresses/tokens
4. Check retry configuration

---

## Best Practices

1. **User Preferences**: Always respect user notification preferences
2. **Rate Limiting**: Prevent notification fatigue
3. **Batching**: Use digest emails for high-volume notifications
4. **Templates**: Use templating for consistency
5. **Tracking**: Monitor delivery and engagement metrics
6. **Testing**: Test with Mailpit before production deployment
7. **Fallback**: Have multiple channels configured
8. **Quiet Hours**: Respect user quiet hours settings

---

## Security

- Validate all recipient addresses
- Sanitize user-provided content
- Use HTTPS for action URLs
- Secure webhook endpoints
- Rate limit to prevent abuse
- Encrypt sensitive data in database

---

## Changelog

### Version 1.0.0 (2026-02-03)

- Initial release
- Email, push, SMS, in-app channels
- Template system
- User preferences
- Delivery tracking
- Event integration

---

## Support

- **Documentation**: https://nself.org/docs/plugins/notifications
- **Issues**: https://github.com/nself-org/plugins/issues

---

## Related Documentation

- [Realtime Plugin](./REALTIME-PLUGIN.md)
- [Jobs Plugin](./JOBS-PLUGIN.md)
- [Integration Guide](./INTEGRATION-GUIDE.md)
