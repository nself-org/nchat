# Email Templates & Notifications

Complete email system for nself-chat with React Email templates, multi-provider support, and advanced features.

## Features

- **Multiple Email Providers**: SMTP, SendGrid, Resend, Mailgun, AWS SES
- **Queue Management**: Automatic retry with exponential backoff
- **Priority Queuing**: Urgent, high, normal, and low priority emails
- **Email Tracking**: Track sends, opens, clicks, and bounces
- **User Preferences**: Granular control over email notifications
- **Digest Emails**: Daily/weekly summaries of activity
- **Template System**: React Email components for consistent branding
- **Scheduled Emails**: Queue emails for future delivery
- **Rate Limiting**: Prevent email spam
- **Unsubscribe Links**: One-click unsubscribe functionality

## Email Templates

### Authentication & Security

- **welcome.tsx** - Welcome new users
- **email-verification.tsx** - Verify email addresses
- **password-reset.tsx** - Password reset with security info
- **password-changed.tsx** - Password change confirmation
- **new-login.tsx** - Alert for logins from new devices

### Notifications

- **mention-notification.tsx** - User mentioned in channel
- **dm-notification.tsx** - New direct message
- **digest.tsx** - Daily/weekly activity summary

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

Dependencies included:

- `@react-email/components` - React Email component library
- `@react-email/render` - Email HTML renderer
- `nodemailer` - SMTP email sending
- `@sendgrid/mail` - SendGrid integration (optional)
- `resend` - Resend integration (optional)

### 2. Configure Email Provider

Copy `.env.email.example` to `.env.local` and configure:

```bash
cp .env.email.example .env.local
```

#### For Development (Mailpit)

```bash
# Run Mailpit for local email testing
docker run -d -p 1025:1025 -p 8025:8025 axllent/mailpit

# Configure in .env.local
EMAIL_PROVIDER=smtp
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
```

View emails at: http://localhost:8025

#### For Production (SendGrid)

```bash
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your-api-key
EMAIL_FROM_ADDRESS=noreply@yourdomain.com
EMAIL_FROM_NAME="Your App"
```

### 3. Run Database Migration

```bash
pnpm db:migrate
```

This creates:

- `nchat_email_queue` - Email sending queue
- `nchat_email_tracking` - Delivery tracking
- `nchat_email_preferences` - User preferences
- `nchat_email_digest_items` - Digest content

### 4. Send Your First Email

```typescript
import { sendWelcomeEmail } from "@/lib/email/templates";

await sendWelcomeEmail(
  { email: "user@example.com", name: "John" },
  {
    userName: "John",
    loginUrl: "https://app.example.com/login",
  },
);
```

## Usage

### Sending Emails Programmatically

```typescript
import {
  sendWelcomeEmail,
  sendEmailVerification,
  sendPasswordReset,
  sendMentionNotification,
  sendDMNotification,
  sendDigest,
} from "@/lib/email/templates";

// Welcome email
await sendWelcomeEmail(
  { email: "user@example.com", name: "Alice" },
  {
    userName: "Alice",
    loginUrl: "https://app.com/login",
  },
);

// Email verification
await sendEmailVerification(
  { email: "user@example.com" },
  {
    userName: "Alice",
    verificationUrl: "https://app.com/verify?token=abc",
    verificationCode: "123456",
  },
);

// Password reset
await sendPasswordReset(
  { email: "user@example.com" },
  {
    resetUrl: "https://app.com/reset?token=xyz",
    ipAddress: "192.168.1.1",
  },
);

// Mention notification
await sendMentionNotification(
  { email: "user@example.com", name: "Alice" },
  {
    userName: "Alice",
    mentionedBy: { name: "Bob" },
    channel: { name: "general", type: "public" },
    messagePreview: "@Alice check this out!",
    messageUrl: "https://app.com/chat/general/msg123",
    timestamp: new Date(),
  },
);
```

### Sending via API

```bash
# Send welcome email
curl -X POST http://localhost:3000/api/email/send \
  -H "Content-Type: application/json" \
  -d '{
    "type": "welcome",
    "to": {
      "email": "user@example.com",
      "name": "John Doe"
    },
    "data": {
      "userName": "John",
      "loginUrl": "https://app.com/login"
    }
  }'

# Get queue status
curl http://localhost:3000/api/email/send?action=status

# Verify email configuration
curl http://localhost:3000/api/email/send?action=verify
```

### Priority & Scheduling

```typescript
// High priority email (sent first)
await sendPasswordReset(
  { email: 'user@example.com' },
  { resetUrl: '...' },
  { priority: 'urgent' }
);

// Scheduled email (send in 1 hour)
await sendDigest(
  { email: 'user@example.com', name: 'Alice' },
  { ... },
  {
    priority: 'low',
    scheduledFor: new Date(Date.now() + 3600000),
  }
);

// Custom retry attempts
await sendWelcomeEmail(
  { email: 'user@example.com' },
  { ... },
  { maxAttempts: 5 }
);
```

## Admin Testing Panel

Use the admin panel to test email templates:

```typescript
import EmailTestPanel from '@/components/admin/EmailTestPanel';

export default function AdminEmailPage() {
  return (
    <div className="container mx-auto py-8">
      <EmailTestPanel />
    </div>
  );
}
```

Features:

- Test all email templates
- Send to any email address
- Verify email configuration
- View queue status
- Monitor send/fail counts

## Email Preferences

Users can control their email notifications:

```typescript
// Get user preferences
const prefs = await db.query(
  "SELECT * FROM nchat_email_preferences WHERE user_id = $1",
  [userId],
);

// Check if email should be sent
const shouldSend = await db.query("SELECT should_send_email($1, $2)", [
  userId,
  "mention-notification",
]);

// Update preferences
await db.query(
  "UPDATE nchat_email_preferences SET mention_enabled = $1 WHERE user_id = $2",
  [false, userId],
);
```

### Unsubscribe

Each user has a unique unsubscribe token:

```typescript
// Generate unsubscribe URL
const unsubscribeUrl = `${baseUrl}/unsubscribe?token=${user.unsubscribeToken}`;
```

## Email Queue

The queue processes emails with:

- **Priority ordering** - Urgent emails sent first
- **Retry logic** - Failed emails retried with exponential backoff
- **Rate limiting** - Prevents overwhelming mail servers
- **Scheduling** - Send emails at specific times

### Queue Status

```typescript
import { getEmailQueueStatus } from "@/lib/email/templates";

const status = getEmailQueueStatus();
console.log(status);
// {
//   total: 10,
//   pending: 5,
//   sending: 2,
//   failed: 1
// }
```

### Cleanup Old Emails

```sql
-- Clean emails older than 30 days
SELECT cleanup_old_emails();

-- Clean old digest items
SELECT cleanup_old_digest_items();
```

## Digest Emails

Aggregate notifications into periodic summaries:

### Creating Digest Items

```typescript
// Add item to digest queue
await db.query(
  `INSERT INTO nchat_email_digest_items (
    user_id, type, channel_id, message_id,
    message_preview, channel_name, sender_name, item_url
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
  [
    userId,
    "mention",
    channelId,
    messageId,
    preview,
    channelName,
    senderName,
    url,
  ],
);
```

### Sending Digest

```typescript
// Get digest items for user
const items = await db.query(
  `SELECT * FROM nchat_email_digest_items
   WHERE user_id = $1 AND included_in_digest = false
   ORDER BY created_at DESC`,
  [userId],
);

// Calculate stats
const stats = {
  totalMessages: items.length,
  totalMentions: items.filter((i) => i.type === "mention").length,
  totalDirectMessages: items.filter((i) => i.type === "direct_message").length,
  totalReactions: items.filter((i) => i.type === "reaction").length,
  activeChannels: [...new Set(items.map((i) => i.channel_name))],
};

// Send digest
await sendDigest(
  { email: user.email, name: user.name },
  {
    userName: user.name,
    frequency: "daily",
    dateRange: { start: yesterday, end: now },
    items: items.map(formatItem),
    stats,
  },
);

// Mark items as included
await db.query(
  `UPDATE nchat_email_digest_items
   SET included_in_digest = true, digest_sent_at = NOW()
   WHERE user_id = $1 AND included_in_digest = false`,
  [userId],
);
```

## Email Tracking

Track delivery and engagement:

```typescript
// Record email event
await db.query(
  `INSERT INTO nchat_email_tracking (email_id, event, metadata)
   VALUES ($1, $2, $3)`,
  [emailId, "opened", { userAgent, ipAddress }],
);

// Get email stats
const stats = await db.query(
  `SELECT
    COUNT(*) FILTER (WHERE event = 'sent') as sent,
    COUNT(*) FILTER (WHERE event = 'opened') as opened,
    COUNT(*) FILTER (WHERE event = 'clicked') as clicked
   FROM nchat_email_tracking
   WHERE email_id = $1`,
  [emailId],
);
```

## Customizing Templates

### Branding

Set global branding for all emails:

```typescript
import { setEmailBranding } from "@/lib/email/templates";

setEmailBranding({
  appName: "My App",
  logoUrl: "https://example.com/logo.png",
  supportEmail: "support@example.com",
});
```

### Custom Templates

Create your own template:

```tsx
// src/emails/templates/custom.tsx
import EmailLayout from "../components/EmailLayout";
import EmailHeading from "../components/EmailHeading";
import EmailButton from "../components/EmailButton";
import { Text } from "@react-email/components";

interface CustomEmailProps {
  userName: string;
  customData: string;
}

export default function CustomEmail({
  userName,
  customData,
}: CustomEmailProps) {
  return (
    <EmailLayout preview="Your custom email">
      <EmailHeading>Hello {userName}!</EmailHeading>
      <Text>{customData}</Text>
      <EmailButton href="https://example.com">Take Action</EmailButton>
    </EmailLayout>
  );
}
```

## Troubleshooting

### Emails not sending

1. Check email configuration:

   ```bash
   curl http://localhost:3000/api/email/send?action=verify
   ```

2. Check queue status:

   ```bash
   curl http://localhost:3000/api/email/send?action=status
   ```

3. Check SMTP credentials and firewall rules

4. For Gmail, enable "Less secure app access" or use App Passwords

### Emails going to spam

1. Configure SPF, DKIM, and DMARC records
2. Use a dedicated sending domain
3. Maintain low bounce and complaint rates
4. Warm up your IP address (gradually increase volume)

### Rate limiting errors

Adjust rate limits in `.env.local`:

```bash
EMAIL_RATE_LIMIT_PER_USER=100
EMAIL_RATE_LIMIT_GLOBAL=5000
```

## Best Practices

1. **Use transactional emails sparingly** - Don't spam users
2. **Respect user preferences** - Always check before sending
3. **Provide unsubscribe links** - Required by law (CAN-SPAM, GDPR)
4. **Test templates** - Use the admin panel before production
5. **Monitor deliverability** - Track bounces and complaints
6. **Use appropriate priorities** - Don't mark everything urgent
7. **Batch digest emails** - Reduce email volume with summaries
8. **Add delays** - Use `delayMinutes` to avoid notification spam

## License

Same as nself-chat project.
