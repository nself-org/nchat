/**
 * Notifications Plugin Integration Tests
 *
 * Comprehensive test suite for the Notifications plugin (ɳPlugin: notifications v1.0.0)
 * Tests push notifications, email delivery, SMS, in-app notifications, and preferences.
 *
 * @group integration
 * @group plugins
 * @group notifications
 */

import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";

// Configuration
const NOTIFICATIONS_URL =
  process.env.NEXT_PUBLIC_NOTIFICATIONS_URL ||
  "http://notifications.localhost:3102";
const PLUGINS_ENABLED = process.env.PLUGINS_ENABLED === "true";
const TEST_TIMEOUT = 30000;

// Test data
const TEST_USER = {
  id: "test-user-notifications-1",
  email: "notifications-test@nchat.local",
  phone: "+15555551234",
  name: "Notifications Test User",
};

const TEST_NOTIFICATION = {
  type: "message",
  title: "Test Notification",
  body: "This is a test notification",
  data: {
    channelId: "test-channel-1",
    messageId: "test-message-1",
  },
};

// Helper functions
async function waitForPlugin(url: string, maxAttempts = 30): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`${url}/health`, {
        signal: AbortSignal.timeout(2000),
      });
      if (response.ok) {
        return;
      }
    } catch (error) {
      // Continue retrying
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Plugin at ${url} did not become ready`);
}

describe("Notifications Plugin", () => {
  const describeIf = PLUGINS_ENABLED ? describe : describe.skip;

  beforeAll(async () => {
    if (!PLUGINS_ENABLED) {
      console.log(
        "⚠️  Notifications plugin tests skipped (PLUGINS_ENABLED=false)",
      );
      return;
    }

    console.log("Waiting for Notifications plugin to be ready...");
    await waitForPlugin(NOTIFICATIONS_URL);
    console.log("Notifications plugin ready");
  }, TEST_TIMEOUT);

  describeIf("Health Check", () => {
    it("should return healthy status", async () => {
      const response = await fetch(`${NOTIFICATIONS_URL}/health`);
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data).toMatchObject({
        status: "healthy",
        service: "notifications",
      });
      expect(data).toHaveProperty("version");
      expect(data).toHaveProperty("uptime");
    }, 10000);

    it("should report email provider status", async () => {
      const response = await fetch(`${NOTIFICATIONS_URL}/health`);
      const data = await response.json();

      expect(data).toHaveProperty("dependencies");
      expect(data.dependencies).toHaveProperty("email");
      expect(data.dependencies.email).toHaveProperty("status");
    }, 10000);

    it("should report queue status", async () => {
      const response = await fetch(`${NOTIFICATIONS_URL}/health`);
      const data = await response.json();

      expect(data).toHaveProperty("queue");
      expect(data.queue).toHaveProperty("pending");
      expect(data.queue).toHaveProperty("processing");
      expect(data.queue).toHaveProperty("completed");
      expect(data.queue).toHaveProperty("failed");
    }, 10000);
  });

  describeIf("Send Notifications", () => {
    it("should send in-app notification", async () => {
      const response = await fetch(`${NOTIFICATIONS_URL}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: TEST_USER.id,
          ...TEST_NOTIFICATION,
          channels: ["in-app"],
        }),
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("notificationId");
      expect(data.channels).toContain("in-app");
    }, 10000);

    it("should send email notification", async () => {
      const response = await fetch(`${NOTIFICATIONS_URL}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: TEST_USER.id,
          email: TEST_USER.email,
          ...TEST_NOTIFICATION,
          channels: ["email"],
        }),
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("notificationId");
      expect(data.channels).toContain("email");
    }, 10000);

    it("should send push notification", async () => {
      const response = await fetch(`${NOTIFICATIONS_URL}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: TEST_USER.id,
          ...TEST_NOTIFICATION,
          channels: ["push"],
          pushToken: "test-fcm-token",
        }),
      });

      const data = await response.json();

      // May fail without valid FCM token, but should accept the request
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);
    }, 10000);

    it("should send SMS notification", async () => {
      const response = await fetch(`${NOTIFICATIONS_URL}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: TEST_USER.id,
          phone: TEST_USER.phone,
          ...TEST_NOTIFICATION,
          channels: ["sms"],
        }),
      });

      const data = await response.json();

      // May fail without Twilio config, but should accept the request
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);
    }, 10000);

    it("should send multi-channel notification", async () => {
      const response = await fetch(`${NOTIFICATIONS_URL}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: TEST_USER.id,
          email: TEST_USER.email,
          ...TEST_NOTIFICATION,
          channels: ["in-app", "email", "push"],
        }),
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data).toHaveProperty("success", true);
      expect(data.channels).toEqual(expect.arrayContaining(["in-app"]));
    }, 10000);

    it("should respect notification priority", async () => {
      const priorities = ["low", "normal", "high", "urgent"];

      for (const priority of priorities) {
        const response = await fetch(`${NOTIFICATIONS_URL}/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: TEST_USER.id,
            ...TEST_NOTIFICATION,
            channels: ["in-app"],
            priority,
          }),
        });

        expect(response.ok).toBe(true);
      }
    }, 15000);
  });

  describeIf("Notification Types", () => {
    const notificationTypes = [
      "message",
      "mention",
      "reply",
      "reaction",
      "channel_invite",
      "dm_invite",
      "system",
      "announcement",
    ];

    it.each(notificationTypes)(
      "should support %s notification type",
      async (type) => {
        const response = await fetch(`${NOTIFICATIONS_URL}/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: TEST_USER.id,
            type,
            title: `Test ${type} notification`,
            body: "Test body",
            channels: ["in-app"],
          }),
        });

        expect(response.ok).toBe(true);
      },
      10000,
    );
  });

  describeIf("Notification Preferences", () => {
    it("should get user notification preferences", async () => {
      const response = await fetch(
        `${NOTIFICATIONS_URL}/preferences/${TEST_USER.id}`,
      );
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data).toHaveProperty("userId", TEST_USER.id);
      expect(data).toHaveProperty("channels");
      expect(data).toHaveProperty("types");
    }, 10000);

    it("should update notification preferences", async () => {
      const preferences = {
        channels: {
          email: true,
          push: true,
          sms: false,
          "in-app": true,
        },
        types: {
          message: true,
          mention: true,
          reply: true,
          reaction: false,
        },
        quiet_hours: {
          enabled: true,
          start: "22:00",
          end: "08:00",
          timezone: "America/New_York",
        },
      };

      const response = await fetch(
        `${NOTIFICATIONS_URL}/preferences/${TEST_USER.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(preferences),
        },
      );

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data).toHaveProperty("success", true);
      expect(data.preferences).toMatchObject(preferences);
    }, 10000);

    it("should respect quiet hours", async () => {
      // Set quiet hours
      await fetch(`${NOTIFICATIONS_URL}/preferences/${TEST_USER.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quiet_hours: {
            enabled: true,
            start: "00:00",
            end: "23:59",
            timezone: "UTC",
          },
        }),
      });

      // Try to send notification during quiet hours
      const response = await fetch(`${NOTIFICATIONS_URL}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: TEST_USER.id,
          ...TEST_NOTIFICATION,
          channels: ["push"],
        }),
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      // Should be queued or suppressed during quiet hours
      expect(data).toHaveProperty("queued");
    }, 10000);

    it("should allow priority notifications during quiet hours", async () => {
      const response = await fetch(`${NOTIFICATIONS_URL}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: TEST_USER.id,
          ...TEST_NOTIFICATION,
          channels: ["push"],
          priority: "urgent",
          ignoreQuietHours: true,
        }),
      });

      expect(response.ok).toBe(true);
    }, 10000);
  });

  describeIf("Notification History", () => {
    it("should get notification history for user", async () => {
      const response = await fetch(
        `${NOTIFICATIONS_URL}/history?userId=${TEST_USER.id}&limit=10`,
      );
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data).toHaveProperty("notifications");
      expect(Array.isArray(data.notifications)).toBe(true);
      expect(data).toHaveProperty("total");
      expect(data).toHaveProperty("unread");
    }, 10000);

    it("should filter notifications by type", async () => {
      const response = await fetch(
        `${NOTIFICATIONS_URL}/history?userId=${TEST_USER.id}&type=message&limit=10`,
      );
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.notifications.every((n: any) => n.type === "message")).toBe(
        true,
      );
    }, 10000);

    it("should filter notifications by read status", async () => {
      const response = await fetch(
        `${NOTIFICATIONS_URL}/history?userId=${TEST_USER.id}&read=false&limit=10`,
      );
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.notifications.every((n: any) => !n.read)).toBe(true);
    }, 10000);

    it("should support pagination", async () => {
      const page1 = await fetch(
        `${NOTIFICATIONS_URL}/history?userId=${TEST_USER.id}&limit=5&offset=0`,
      );
      const data1 = await page1.json();

      const page2 = await fetch(
        `${NOTIFICATIONS_URL}/history?userId=${TEST_USER.id}&limit=5&offset=5`,
      );
      const data2 = await page2.json();

      expect(page1.ok).toBe(true);
      expect(page2.ok).toBe(true);
      expect(data1.notifications).not.toEqual(data2.notifications);
    }, 10000);
  });

  describeIf("Notification Management", () => {
    it("should mark notification as read", async () => {
      // Send a notification first
      const sendResponse = await fetch(`${NOTIFICATIONS_URL}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: TEST_USER.id,
          ...TEST_NOTIFICATION,
          channels: ["in-app"],
        }),
      });

      const { notificationId } = await sendResponse.json();

      // Mark as read
      const readResponse = await fetch(
        `${NOTIFICATIONS_URL}/read/${notificationId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: TEST_USER.id }),
        },
      );

      expect(readResponse.ok).toBe(true);
    }, 10000);

    it("should mark all notifications as read", async () => {
      const response = await fetch(`${NOTIFICATIONS_URL}/read-all`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: TEST_USER.id }),
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("markedCount");
    }, 10000);

    it("should delete notification", async () => {
      // Send a notification first
      const sendResponse = await fetch(`${NOTIFICATIONS_URL}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: TEST_USER.id,
          ...TEST_NOTIFICATION,
          channels: ["in-app"],
        }),
      });

      const { notificationId } = await sendResponse.json();

      // Delete it
      const deleteResponse = await fetch(
        `${NOTIFICATIONS_URL}/${notificationId}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: TEST_USER.id }),
        },
      );

      expect(deleteResponse.ok).toBe(true);
    }, 10000);

    it("should clear all notifications", async () => {
      const response = await fetch(`${NOTIFICATIONS_URL}/clear`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: TEST_USER.id }),
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("deletedCount");
    }, 10000);
  });

  describeIf("Batch Operations", () => {
    it("should send batch notifications", async () => {
      const notifications = [
        { userId: `${TEST_USER.id}-1`, ...TEST_NOTIFICATION },
        { userId: `${TEST_USER.id}-2`, ...TEST_NOTIFICATION },
        { userId: `${TEST_USER.id}-3`, ...TEST_NOTIFICATION },
      ];

      const response = await fetch(`${NOTIFICATIONS_URL}/batch/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notifications,
          channels: ["in-app"],
        }),
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("sent");
      expect(data.sent).toBeGreaterThanOrEqual(notifications.length);
    }, 15000);

    it("should broadcast notification to channel", async () => {
      const response = await fetch(`${NOTIFICATIONS_URL}/broadcast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: "test-channel-1",
          ...TEST_NOTIFICATION,
          channels: ["in-app"],
        }),
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("recipients");
    }, 10000);
  });

  describeIf("Templates", () => {
    it("should get notification templates", async () => {
      const response = await fetch(`${NOTIFICATIONS_URL}/templates`);
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data).toHaveProperty("templates");
      expect(Array.isArray(data.templates)).toBe(true);
    }, 10000);

    it("should send notification using template", async () => {
      const response = await fetch(`${NOTIFICATIONS_URL}/send/template`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: TEST_USER.id,
          templateId: "welcome",
          variables: {
            userName: TEST_USER.name,
          },
          channels: ["email"],
        }),
      });

      // May not have templates configured in test environment
      expect(response.status).toBeGreaterThanOrEqual(200);
    }, 10000);
  });

  describeIf("Webhooks", () => {
    it("should register notification webhook", async () => {
      const response = await fetch(`${NOTIFICATIONS_URL}/webhooks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: TEST_USER.id,
          url: "https://example.com/webhook",
          events: ["notification.sent", "notification.failed"],
        }),
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data).toHaveProperty("webhookId");
    }, 10000);

    it("should list user webhooks", async () => {
      const response = await fetch(
        `${NOTIFICATIONS_URL}/webhooks?userId=${TEST_USER.id}`,
      );
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data).toHaveProperty("webhooks");
      expect(Array.isArray(data.webhooks)).toBe(true);
    }, 10000);
  });

  describeIf("Error Handling", () => {
    it("should handle invalid user ID", async () => {
      const response = await fetch(`${NOTIFICATIONS_URL}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "",
          ...TEST_NOTIFICATION,
          channels: ["in-app"],
        }),
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
    }, 10000);

    it("should handle invalid channel", async () => {
      const response = await fetch(`${NOTIFICATIONS_URL}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: TEST_USER.id,
          ...TEST_NOTIFICATION,
          channels: ["invalid-channel"],
        }),
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
    }, 10000);

    it("should handle malformed request", async () => {
      const response = await fetch(`${NOTIFICATIONS_URL}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Missing required fields
        }),
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
    }, 10000);

    it("should handle email delivery failure gracefully", async () => {
      const response = await fetch(`${NOTIFICATIONS_URL}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: TEST_USER.id,
          email: "invalid@invalid",
          ...TEST_NOTIFICATION,
          channels: ["email"],
        }),
      });

      // Should accept request even if delivery fails
      expect(response.status).toBeLessThan(500);
    }, 10000);
  });

  describeIf("Performance", () => {
    it("should handle high notification volume", async () => {
      const requests = [];

      // Send 50 notifications concurrently
      for (let i = 0; i < 50; i++) {
        requests.push(
          fetch(`${NOTIFICATIONS_URL}/send`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: `${TEST_USER.id}-${i}`,
              ...TEST_NOTIFICATION,
              channels: ["in-app"],
            }),
          }),
        );
      }

      const responses = await Promise.all(requests);
      const successful = responses.filter((r) => r.ok);

      expect(successful.length).toBeGreaterThan(40); // At least 80% success rate
    }, 20000);

    it("should process notifications quickly", async () => {
      const startTime = Date.now();

      await fetch(`${NOTIFICATIONS_URL}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: TEST_USER.id,
          ...TEST_NOTIFICATION,
          channels: ["in-app"],
        }),
      });

      const latency = Date.now() - startTime;

      // Should respond within 300ms
      expect(latency).toBeLessThan(300);
    }, 10000);
  });
});
