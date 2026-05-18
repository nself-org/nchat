/**
 * Email Service - Usage Examples
 *
 * Common email sending patterns and use cases.
 */

import {
  sendWelcomeEmail,
  sendEmailVerification,
  sendPasswordReset,
  sendPasswordChanged,
  sendNewLoginAlert,
  sendMentionNotification,
  sendDMNotification,
  sendDigest,
  setEmailBranding,
} from "./templates";

// ============================================================================
// Setup & Configuration Examples
// ============================================================================

/**
 * Example: Configure email branding for your app
 */
export function setupEmailBranding() {
  setEmailBranding({
    appName: "My Awesome App",
    logoUrl: "https://myapp.com/logo.png",
    supportEmail: "support@myapp.com",
  });
}

// ============================================================================
// Authentication Flow Examples
// ============================================================================

/**
 * Example: New user signup flow
 */
export async function handleUserSignup(user: {
  email: string;
  name: string;
  id: string;
}) {
  // 1. Send welcome email (high priority)
  await sendWelcomeEmail(
    { email: user.email, name: user.name },
    {
      userName: user.name,
      loginUrl: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
    },
    { priority: "high" },
  );

  // 2. Send email verification (urgent)
  const verificationToken = generateVerificationToken(user.id);
  await sendEmailVerification(
    { email: user.email, name: user.name },
    {
      userName: user.name,
      verificationUrl: `${process.env.NEXT_PUBLIC_APP_URL}/verify?token=${verificationToken}`,
      verificationCode: generateSixDigitCode(),
      expiresInHours: 24,
    },
    { priority: "urgent" },
  );
}

/**
 * Example: Password reset flow
 */
export async function handlePasswordResetRequest(
  user: { email: string; name?: string },
  request: { ip?: string; userAgent?: string },
) {
  const resetToken = generateResetToken(user.email);

  await sendPasswordReset(
    { email: user.email, name: user.name },
    {
      userName: user.name,
      resetUrl: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`,
      expiresInMinutes: 60,
      ipAddress: request.ip,
      userAgent: request.userAgent,
    },
    { priority: "urgent" },
  );
}

/**
 * Example: Password changed confirmation
 */
export async function handlePasswordChanged(
  user: { email: string; name?: string },
  metadata: { ip?: string },
) {
  await sendPasswordChanged(
    { email: user.email, name: user.name },
    {
      userName: user.name,
      supportUrl: `${process.env.NEXT_PUBLIC_APP_URL}/support`,
      ipAddress: metadata.ip,
      timestamp: new Date(),
    },
    { priority: "high" },
  );
}

/**
 * Example: New login alert
 */
export async function handleNewLoginDetected(
  user: { email: string; name?: string },
  loginInfo: {
    browser?: string;
    os?: string;
    device?: string;
    city?: string;
    country?: string;
    ip?: string;
  },
) {
  await sendNewLoginAlert(
    { email: user.email, name: user.name },
    {
      userName: user.name,
      securityUrl: `${process.env.NEXT_PUBLIC_APP_URL}/settings/security`,
      deviceInfo: {
        browser: loginInfo.browser,
        os: loginInfo.os,
        device: loginInfo.device,
      },
      location: {
        city: loginInfo.city,
        country: loginInfo.country,
      },
      ipAddress: loginInfo.ip,
      timestamp: new Date(),
    },
    { priority: "high" },
  );
}

// ============================================================================
// Notification Examples
// ============================================================================

/**
 * Example: User mentioned in a message
 */
export async function handleMention(data: {
  mentionedUser: { email: string; name: string };
  author: { name: string; avatarUrl?: string };
  channel: { name: string; type: "public" | "private" };
  message: { id: string; content: string };
}) {
  // Add 5-minute delay to batch multiple mentions
  await sendMentionNotification(
    { email: data.mentionedUser.email, name: data.mentionedUser.name },
    {
      userName: data.mentionedUser.name,
      mentionedBy: {
        name: data.author.name,
        avatarUrl: data.author.avatarUrl,
      },
      channel: {
        name: data.channel.name,
        type: data.channel.type,
      },
      messagePreview: truncate(data.message.content, 200),
      messageUrl: `${process.env.NEXT_PUBLIC_APP_URL}/chat/${data.channel.name}/${data.message.id}`,
      timestamp: new Date(),
    },
    {
      priority: "normal",
      delay: 300000, // 5 minutes
    },
  );
}

/**
 * Example: Direct message received
 */
export async function handleDirectMessage(data: {
  recipient: { email: string; name: string };
  sender: { name: string; avatarUrl?: string };
  message: { id: string; content: string };
  conversationId: string;
  isFirstMessage?: boolean;
}) {
  // Add 5-minute delay to batch rapid messages
  await sendDMNotification(
    { email: data.recipient.email, name: data.recipient.name },
    {
      userName: data.recipient.name,
      sender: {
        name: data.sender.name,
        avatarUrl: data.sender.avatarUrl,
      },
      messagePreview: truncate(data.message.content, 200),
      messageUrl: `${process.env.NEXT_PUBLIC_APP_URL}/chat/dm/${data.conversationId}`,
      timestamp: new Date(),
      isFirstMessage: data.isFirstMessage,
    },
    {
      priority: "normal",
      delay: 300000, // 5 minutes
    },
  );
}

// ============================================================================
// Digest Examples
// ============================================================================

/**
 * Example: Daily digest email
 */
export async function sendDailyDigest(user: {
  id: string;
  email: string;
  name: string;
}) {
  // Fetch digest items from database
  const items = await fetchDigestItems(user.id, "daily");

  if (items.length === 0) {
    // REMOVED: console.log(`No digest items for user ${user.id}`)
    return;
  }

  // Calculate stats
  const stats = {
    totalMessages: items.length,
    totalMentions: items.filter((i) => i.type === "mention").length,
    totalDirectMessages: items.filter((i) => i.type === "direct_message")
      .length,
    totalReactions: items.filter((i) => i.type === "reaction").length,
    activeChannels: [...new Set(items.map((i) => i.channelName))],
  };

  // Send digest
  await sendDigest(
    { email: user.email, name: user.name },
    {
      userName: user.name,
      frequency: "daily",
      dateRange: {
        start: new Date(Date.now() - 86400000), // 24 hours ago
        end: new Date(),
      },
      items: items.map((item) => ({
        id: item.id,
        type: item.type,
        channelName: item.channelName,
        senderName: item.senderName,
        messagePreview: item.messagePreview,
        url: item.url,
        timestamp: item.timestamp,
      })),
      stats,
      appUrl: process.env.NEXT_PUBLIC_APP_URL,
      preferencesUrl: `${process.env.NEXT_PUBLIC_APP_URL}/settings/notifications`,
    },
    { priority: "low" },
  );

  // Mark items as sent
  await markDigestItemsAsSent(
    user.id,
    items.map((i) => i.id),
  );
}

/**
 * Example: Weekly digest email
 */
export async function sendWeeklyDigest(user: {
  id: string;
  email: string;
  name: string;
}) {
  const items = await fetchDigestItems(user.id, "weekly");

  if (items.length === 0) {
    return;
  }

  const stats = calculateDigestStats(items);

  await sendDigest(
    { email: user.email, name: user.name },
    {
      userName: user.name,
      frequency: "weekly",
      dateRange: {
        start: new Date(Date.now() - 604800000), // 7 days ago
        end: new Date(),
      },
      items: items.slice(0, 20).map(formatDigestItem), // Limit to 20 items
      stats,
      appUrl: process.env.NEXT_PUBLIC_APP_URL,
      preferencesUrl: `${process.env.NEXT_PUBLIC_APP_URL}/settings/notifications`,
    },
    { priority: "low" },
  );

  await markDigestItemsAsSent(
    user.id,
    items.map((i) => i.id),
  );
}

// ============================================================================
// Batch Operations Examples
// ============================================================================

/**
 * Example: Send email to multiple users
 */
export async function sendBulkWelcomeEmails(
  users: Array<{ email: string; name: string }>,
) {
  const promises = users.map((user) =>
    sendWelcomeEmail(
      { email: user.email, name: user.name },
      {
        userName: user.name,
        loginUrl: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
      },
      { priority: "normal" },
    ),
  );

  const results = await Promise.allSettled(promises);

  const successful = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  // REMOVED: console.log(`Bulk welcome emails: ${successful} sent, ${failed} failed`)

  return { successful, failed };
}

/**
 * Example: Send team announcement
 */
export async function sendTeamAnnouncement(
  teamMembers: Array<{ email: string; name: string }>,
  announcement: {
    subject: string;
    message: string;
  },
) {
  const promises = teamMembers.map(async (member) => {
    // Use custom email for announcements
    const { getEmailSender } = await import("./sender");
    const sender = getEmailSender();

    return sender.queue(
      {
        to: { email: member.email, name: member.name },
        subject: announcement.subject,
        html: `<p>Hi ${member.name},</p><p>${announcement.message}</p>`,
        tags: ["announcement", "team"],
      },
      "custom",
      { priority: "normal" },
    );
  });

  await Promise.all(promises);
}

// ============================================================================
// Helper Functions
// ============================================================================

function generateVerificationToken(userId: string): string {
  // Implement your token generation logic
  return `verify_${userId}_${Date.now()}_${Math.random().toString(36)}`;
}

function generateSixDigitCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateResetToken(email: string): string {
  // Implement your token generation logic
  return `reset_${email}_${Date.now()}_${Math.random().toString(36)}`;
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}

async function fetchDigestItems(
  userId: string,
  frequency: "daily" | "weekly",
): Promise<any[]> {
  // Implement your database query
  // This should fetch items from nchat_email_digest_items table
  return [];
}

async function markDigestItemsAsSent(
  userId: string,
  itemIds: string[],
): Promise<void> {
  // Implement your database update
  // UPDATE nchat_email_digest_items SET included_in_digest = true, digest_sent_at = NOW()
}

function calculateDigestStats(items: any[]) {
  return {
    totalMessages: items.length,
    totalMentions: items.filter((i) => i.type === "mention").length,
    totalDirectMessages: items.filter((i) => i.type === "direct_message")
      .length,
    totalReactions: items.filter((i) => i.type === "reaction").length,
    activeChannels: [...new Set(items.map((i) => i.channelName))],
  };
}

function formatDigestItem(item: any) {
  return {
    id: item.id,
    type: item.type,
    channelName: item.channelName,
    senderName: item.senderName,
    messagePreview: truncate(item.messagePreview, 200),
    url: item.url,
    timestamp: new Date(item.timestamp),
  };
}
