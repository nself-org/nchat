/**
 * Basic SDK Usage Examples
 */

import { NChatClient } from "../index";

// ============================================================================
// Example 1: Initialize the Client
// ============================================================================

const client = new NChatClient({
  apiUrl: "https://api.nchat.example.com",
  apiKey: "your-api-key",
  debug: true, // Enable debug logging
});

// ============================================================================
// Example 2: Authentication
// ============================================================================

async function authenticateExample() {
  // Sign in with email/password
  const { user, token } = await client.auth.signIn({
    email: "user@example.com",
    password: "password123",
  });

  console.log("Signed in as:", user.displayName);

  // Update client token for authenticated requests
  client.setToken(token);

  // Get current user
  const currentUser = await client.users.me();
  console.log("Current user:", currentUser);
}

// ============================================================================
// Example 3: Managing Channels
// ============================================================================

async function channelExample() {
  // Create a public channel
  const channel = await client.channels.create({
    name: "general",
    description: "General discussion",
    type: "public",
  });

  console.log("Created channel:", channel.id);

  // List all channels
  const { data: channels } = await client.channels.list({
    limit: 50,
  });

  console.log("Total channels:", channels.length);

  // Join a channel
  await client.channels.join(channel.id);

  // Get channel members
  const { data: members } = await client.channels.getMembers(channel.id);
  console.log("Channel members:", members.length);
}

// ============================================================================
// Example 4: Sending Messages
// ============================================================================

async function messageExample() {
  // Send a simple message
  const message = await client.messages.send({
    channelId: "channel-123",
    content: "Hello, world!",
  });

  console.log("Message sent:", message.id);

  // Send a message with mentions
  await client.messages.send({
    channelId: "channel-123",
    content: "Hey @john, check this out!",
    mentions: ["user-456"],
  });

  // Reply in a thread
  await client.messages.send({
    channelId: "channel-123",
    content: "This is a reply",
    parentId: message.id,
  });

  // Add a reaction
  await client.messages.react(message.id, "👍");

  // Edit a message
  await client.messages.update(message.id, {
    content: "Hello, world! (edited)",
  });
}

// ============================================================================
// Example 5: Listing Messages
// ============================================================================

async function listMessagesExample() {
  // Get recent messages in a channel
  const { data: messages, pagination } = await client.messages.list(
    "channel-123",
    {
      limit: 50,
      orderBy: "created_at",
      orderDirection: "desc",
    },
  );

  console.log("Messages:", messages.length);
  console.log("Has more:", pagination.hasMore);

  // Load more messages (pagination)
  if (pagination.hasMore) {
    const { data: moreMessages } = await client.messages.list("channel-123", {
      limit: 50,
      offset: pagination.offset + pagination.limit,
    });

    console.log("More messages:", moreMessages.length);
  }
}

// ============================================================================
// Example 6: User Management
// ============================================================================

async function userExample() {
  // Search for users
  const { data: users } = await client.users.search("john", {
    limit: 10,
  });

  console.log("Found users:", users.length);

  // Update your profile
  await client.users.update({
    displayName: "John Doe",
    avatarUrl: "https://example.com/avatar.jpg",
  });

  // Update presence
  await client.users.updatePresence("online");

  // Block a user
  await client.users.block("user-789");

  // Get blocked users
  const { data: blocked } = await client.users.getBlocked();
  console.log("Blocked users:", blocked.length);
}

// ============================================================================
// Example 7: Webhooks
// ============================================================================

async function webhookExample() {
  // Create a webhook
  const webhook = await client.webhooks.create({
    name: "My Webhook",
    url: "https://example.com/webhook",
    events: ["message.created", "message.updated", "channel.created"],
  });

  console.log("Webhook created:", webhook.id);
  console.log("Webhook secret:", webhook.secret);

  // Test the webhook
  const { success } = await client.webhooks.test(webhook.id);
  console.log("Webhook test:", success ? "passed" : "failed");

  // Update webhook
  await client.webhooks.update(webhook.id, {
    isActive: false,
  });

  // Regenerate secret
  const { secret } = await client.webhooks.regenerateSecret(webhook.id);
  console.log("New secret:", secret);
}

// ============================================================================
// Example 8: Bots
// ============================================================================

async function botExample() {
  // Create a bot
  const bot = await client.bots.create({
    name: "Helper Bot",
    username: "helperbot",
    description: "A helpful bot",
    permissions: ["send_messages", "read_messages"],
  });

  console.log("Bot created:", bot.id);
  console.log("Bot API key:", bot.apiKey);

  // Send a message as bot
  await client.bots.sendMessage(bot.id, {
    channelId: "channel-123",
    content: "Hello! I am a bot.",
  });

  // Add reaction as bot
  await client.bots.addReaction(bot.id, "message-456", "🤖");
}

// ============================================================================
// Example 9: Admin Operations (requires admin role)
// ============================================================================

async function adminExample() {
  // Get system stats
  const stats = await client.admin.getStats();
  console.log("Total users:", stats.users.total);
  console.log("Active users:", stats.users.active);
  console.log("Total messages:", stats.messages.total);

  // Update user role
  await client.admin.updateUserRole("user-123", {
    role: "moderator",
  });

  // Suspend a user
  await client.admin.suspendUser("user-456", "Violated terms of service");

  // Get audit logs
  const { data: logs } = await client.admin.getAuditLogs({
    limit: 100,
  });
  console.log("Audit logs:", logs.length);

  // Export data
  const { downloadUrl } = await client.admin.exportData("json");
  console.log("Download export at:", downloadUrl);
}

// ============================================================================
// Example 10: Error Handling
// ============================================================================

async function errorHandlingExample() {
  try {
    await client.messages.send({
      channelId: "invalid-channel",
      content: "This will fail",
    });
  } catch (error) {
    if (error instanceof NChatClient.AuthenticationError) {
      console.error("Not authenticated");
    } else if (error instanceof NChatClient.ValidationError) {
      console.error("Validation failed:", error.errors);
    } else if (error instanceof NChatClient.RateLimitError) {
      console.error("Rate limited. Retry after:", error.retryAfter);
    } else {
      console.error("Unknown error:", error);
    }
  }
}

// ============================================================================
// Run Examples
// ============================================================================

async function runAllExamples() {
  try {
    await authenticateExample();
    await channelExample();
    await messageExample();
    await listMessagesExample();
    await userExample();
    await webhookExample();
    await botExample();
    await adminExample();
    await errorHandlingExample();
  } catch (error) {
    console.error("Error running examples:", error);
  }
}

// Export for use in other files
export {
  authenticateExample,
  channelExample,
  messageExample,
  listMessagesExample,
  userExample,
  webhookExample,
  botExample,
  adminExample,
  errorHandlingExample,
};
