# Email Service Library

Production-ready email service for nself-chat with queue management, retry logic, and multiple provider support.

## Directory Structure

```
src/lib/email/
├── types.ts           # TypeScript type definitions
├── sender.ts          # Email sender class with queue
├── templates.ts       # Template helper functions
└── README.md          # This file

src/emails/
├── components/        # Reusable email components
│   ├── EmailLayout.tsx
│   ├── EmailButton.tsx
│   └── EmailHeading.tsx
└── templates/         # Email templates
    ├── welcome.tsx
    ├── email-verification.tsx
    ├── password-reset.tsx
    ├── password-changed.tsx
    ├── new-login.tsx
    ├── mention-notification.tsx
    ├── dm-notification.tsx
    └── digest.tsx
```

## Quick Examples

### Send Welcome Email

```typescript
import { sendWelcomeEmail } from "@/lib/email/templates";

await sendWelcomeEmail(
  { email: "user@example.com", name: "Alice" },
  {
    userName: "Alice",
    loginUrl: "https://app.example.com/login",
  },
);
```

### Send Password Reset

```typescript
import { sendPasswordReset } from "@/lib/email/templates";

await sendPasswordReset(
  { email: "user@example.com" },
  {
    resetUrl: "https://app.example.com/reset?token=xyz",
    expiresInMinutes: 60,
    ipAddress: request.ip,
    userAgent: request.headers["user-agent"],
  },
  { priority: "urgent" }, // Send immediately
);
```

### Send Notification with Delay

```typescript
import { sendMentionNotification } from "@/lib/email/templates";

// Wait 5 minutes before sending (prevent spam)
await sendMentionNotification(
  { email: "user@example.com", name: "Alice" },
  {
    userName: "Alice",
    mentionedBy: { name: "Bob", avatarUrl: "..." },
    channel: { name: "general", type: "public" },
    messagePreview: "@Alice check this out!",
    messageUrl: "https://app.com/chat/general/msg123",
    timestamp: new Date(),
  },
  { delay: 300000 }, // 5 minutes
);
```

### Send Custom Email

```typescript
import { getEmailSender, renderEmailTemplate } from "@/lib/email/sender";
import MyCustomTemplate from "@/emails/templates/my-custom-template";
import React from "react";

const component = React.createElement(MyCustomTemplate, {
  userName: "Alice",
  customData: "Hello!",
});

const { html, text } = await renderEmailTemplate(component);

const sender = getEmailSender();
await sender.send({
  to: { email: "user@example.com", name: "Alice" },
  subject: "My Custom Email",
  html,
  text,
  tags: ["custom"],
});
```

## Configuration

### Environment Variables

Required:

```bash
EMAIL_PROVIDER=smtp
EMAIL_FROM_NAME="nChat"
EMAIL_FROM_ADDRESS="noreply@example.com"
```

SMTP (default):

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

SendGrid:

```bash
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
```

Resend:

```bash
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_xxxxxxxxxxxxx
```

### Set Branding

```typescript
import { setEmailBranding } from "@/lib/email/templates";

setEmailBranding({
  appName: "My App",
  logoUrl: "https://example.com/logo.png",
  supportEmail: "support@example.com",
});
```

## Email Queue

### Queue Management

```typescript
import { getEmailSender } from "@/lib/email/sender";

const sender = getEmailSender();

// Queue an email
const emailId = await sender.queue(
  {
    to: { email: "user@example.com" },
    subject: "Test",
    html: "<p>Hello</p>",
  },
  "custom",
  { priority: "high", maxAttempts: 5 },
);

// Get queue status
const status = sender.getQueueStatus();
console.log(status);
// { total: 10, pending: 5, sending: 2, failed: 1 }

// Get queue length
const length = sender.getQueueLength();
```

### Priority Levels

- **urgent** - Sent first (security alerts, password resets)
- **high** - Important emails (welcome, verification)
- **normal** - Standard notifications (mentions, DMs)
- **low** - Digest emails and summaries

### Retry Logic

Failed emails are automatically retried with exponential backoff:

- Attempt 1: Retry after 1 second
- Attempt 2: Retry after 5 seconds
- Attempt 3: Retry after 15 seconds
- Attempt 4: Retry after 1 minute
- Attempt 5: Retry after 5 minutes

Maximum attempts configurable per email (default: 3).

## Email Types

All available email types:

```typescript
type EmailType =
  | "welcome"
  | "email-verification"
  | "password-reset"
  | "password-changed"
  | "new-login"
  | "mention-notification"
  | "dm-notification"
  | "digest"
  | "security-alert"
  | "account-deleted"
  | "team-invite"
  | "custom";
```

## Template Functions

All template functions follow the same pattern:

```typescript
async function send[TemplateName](
  to: EmailRecipient,
  data: [TemplateName]Data,
  options?: EmailQueueOptions
): Promise<string> // Returns email ID
```

### Available Functions

- `sendWelcomeEmail(to, data, options?)`
- `sendEmailVerification(to, data, options?)`
- `sendPasswordReset(to, data, options?)`
- `sendPasswordChanged(to, data, options?)`
- `sendNewLoginAlert(to, data, options?)`
- `sendMentionNotification(to, data, options?)`
- `sendDMNotification(to, data, options?)`
- `sendDigest(to, data, options?)`

## Testing

### Development Setup (Mailpit)

```bash
# Run Mailpit
docker run -d -p 1025:1025 -p 8025:8025 axllent/mailpit

# Configure
EMAIL_PROVIDER=smtp
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false

# View emails at http://localhost:8025
```

### Test Email Configuration

```typescript
import { verifyEmailConfig } from "@/lib/email/templates";

const isValid = await verifyEmailConfig();
if (isValid) {
  console.log("Email configuration is working!");
}
```

### Admin Test Panel

```typescript
import EmailTestPanel from '@/components/admin/EmailTestPanel';

// In your admin page
<EmailTestPanel />
```

## API Routes

### Send Email

```bash
POST /api/email/send
Content-Type: application/json

{
  "type": "welcome",
  "to": {
    "email": "user@example.com",
    "name": "John Doe"
  },
  "data": {
    "userName": "John",
    "loginUrl": "https://app.com/login"
  },
  "options": {
    "priority": "high"
  }
}
```

### Get Queue Status

```bash
GET /api/email/send?action=status

Response:
{
  "total": 10,
  "pending": 5,
  "sending": 2,
  "failed": 1
}
```

### Verify Configuration

```bash
GET /api/email/send?action=verify

Response:
{
  "valid": true
}
```

## Database Functions

### Check User Preferences

```sql
-- Check if user should receive email type
SELECT should_send_email('user-id', 'mention-notification');

-- Get user preferences
SELECT * FROM get_user_email_preferences('user-id');

-- Get queue stats
SELECT * FROM get_email_queue_stats();
```

### Cleanup

```sql
-- Clean old sent emails (30+ days)
SELECT cleanup_old_emails();

-- Clean old digest items (7+ days)
SELECT cleanup_old_digest_items();
```

## Best Practices

1. **Always check user preferences** before sending notifications
2. **Use appropriate priorities** - don't mark everything urgent
3. **Add delays for notifications** - prevent spam from rapid mentions
4. **Batch digest emails** - send daily/weekly summaries instead of each notification
5. **Handle errors gracefully** - queue will retry failed sends
6. **Test templates** - use Mailpit or admin panel before production
7. **Monitor queue** - watch for growing failed count
8. **Clean up old data** - run cleanup functions regularly

## Troubleshooting

### Emails not sending

```typescript
// 1. Verify configuration
const valid = await verifyEmailConfig();
console.log("Config valid:", valid);

// 2. Check queue
import { getEmailQueueStatus } from "@/lib/email/templates";
const status = getEmailQueueStatus();
console.log("Queue status:", status);

// 3. Send test email
await sendWelcomeEmail(
  { email: "your@email.com" },
  { userName: "Test", loginUrl: "http://localhost:3000" },
);
```

### Queue stuck

```typescript
// Get sender instance and check status
import { getEmailSender } from "@/lib/email/sender";
const sender = getEmailSender();

console.log("Queue length:", sender.getQueueLength());
console.log("Status:", sender.getQueueStatus());
```

### Gmail errors

1. Enable 2-factor authentication
2. Create an App Password: https://myaccount.google.com/apppasswords
3. Use App Password as `SMTP_PASSWORD`

### SendGrid errors

1. Verify sender identity in SendGrid
2. Check API key permissions
3. Ensure sender email matches verified domain

## Support

For issues or questions:

- Check the main README: `/src/emails/README.md`
- Review email types: `/src/lib/email/types.ts`
- Test with admin panel: `/src/components/admin/EmailTestPanel.tsx`
