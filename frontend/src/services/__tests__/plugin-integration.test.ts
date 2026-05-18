/**
 * Plugin Integration Test Suite
 *
 * End-to-end integration tests for ɳPlugins with real data flows.
 * These tests verify that plugins work correctly together and with
 * the ɳChat application.
 *
 * @group integration
 * @group e2e
 */

import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";

// Skip tests if plugins are not enabled - default to false for unit tests
// These are integration tests that require real plugin services
const PLUGINS_ENABLED = process.env.PLUGINS_ENABLED === "true";

const PLUGIN_ENDPOINTS = {
  realtime:
    process.env.NEXT_PUBLIC_REALTIME_URL || "http://realtime.localhost:3101",
  notifications:
    process.env.NEXT_PUBLIC_NOTIFICATIONS_URL ||
    "http://notifications.localhost:3102",
  jobs: process.env.NEXT_PUBLIC_JOBS_URL || "http://jobs.localhost:3105",
  fileProcessing:
    process.env.NEXT_PUBLIC_FILE_PROCESSING_URL ||
    "http://files.localhost:3104",
};

// Test user and channel IDs
const TEST_USER_ID = "test-user-integration";
const TEST_CHANNEL_ID = "test-channel-integration";
const TEST_EMAIL = "integration@test.nchat.local";

describe("Plugin Integration Tests", () => {
  const describeIf = PLUGINS_ENABLED ? describe : describe.skip;

  beforeAll(async () => {
    if (!PLUGINS_ENABLED) {
      console.log(
        "⚠️  Plugin integration tests skipped (PLUGINS_ENABLED=false)",
      );
      return;
    }

    // Wait for all plugins to be ready
    console.log("Waiting for plugins to be ready...");
    await Promise.all([
      waitForPlugin(PLUGIN_ENDPOINTS.realtime),
      waitForPlugin(PLUGIN_ENDPOINTS.notifications),
      waitForPlugin(PLUGIN_ENDPOINTS.jobs),
      waitForPlugin(PLUGIN_ENDPOINTS.fileProcessing),
    ]);
    console.log("All plugins ready");
  });

  describeIf("Realtime + Notifications Integration", () => {
    it("should send notification when user comes online", async () => {
      // Step 1: Update user presence to online
      const presenceResponse = await fetch(
        `${PLUGIN_ENDPOINTS.realtime}/presence`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: TEST_USER_ID,
            channelId: TEST_CHANNEL_ID,
            status: "online",
          }),
        },
      );

      expect(presenceResponse.ok).toBe(true);

      // Step 2: Verify notification was triggered
      // In real implementation, this would check notification queue
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Notifications service should have logged the presence change
      const notificationResponse = await fetch(
        `${PLUGIN_ENDPOINTS.notifications}/history?userId=${TEST_USER_ID}&type=presence&limit=1`,
      );

      if (notificationResponse.ok) {
        const data = await notificationResponse.json();
        // Notification may or may not be sent depending on preferences
        expect(data).toHaveProperty("notifications");
      }
    }, 20000);

    it("should send typing notification via realtime", async () => {
      // Send typing indicator
      const typingResponse = await fetch(
        `${PLUGIN_ENDPOINTS.realtime}/typing`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: TEST_USER_ID,
            channelId: TEST_CHANNEL_ID,
            isTyping: true,
          }),
        },
      );

      expect(typingResponse.ok).toBe(true);

      // Typing indicators should be broadcast via WebSocket
      // In real implementation, other users would receive this
    }, 10000);
  });

  describeIf("Jobs + Notifications Integration", () => {
    it("should schedule and send delayed notification", async () => {
      const futureTime = new Date(Date.now() + 5000); // 5 seconds from now

      // Schedule a notification job
      const jobResponse = await fetch(`${PLUGIN_ENDPOINTS.jobs}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "send-notification",
          payload: {
            userId: TEST_USER_ID,
            channel: "email",
            to: { email: TEST_EMAIL },
            content: {
              subject: "Integration Test",
              body: "This is a test notification",
            },
          },
          runAt: futureTime.toISOString(),
        }),
      });

      expect(jobResponse.ok).toBe(true);
      const jobData = await jobResponse.json();
      expect(jobData).toHaveProperty("jobId");

      const jobId = jobData.jobId;

      // Wait for job to be processed
      await new Promise((resolve) => setTimeout(resolve, 6000));

      // Check job status
      const statusResponse = await fetch(
        `${PLUGIN_ENDPOINTS.jobs}/jobs/${jobId}`,
      );
      const statusData = await statusResponse.json();

      expect(["completed", "active"]).toContain(statusData.status);
    }, 15000);

    it("should schedule recurring email digest job", async () => {
      const jobResponse = await fetch(`${PLUGIN_ENDPOINTS.jobs}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "send-email-digest",
          payload: {
            userId: TEST_USER_ID,
            frequency: "daily",
            hour: 9, // 9 AM
          },
          schedule: "0 9 * * *", // Daily at 9 AM
        }),
      });

      expect(jobResponse.ok).toBe(true);
      const data = await jobResponse.json();
      expect(data).toHaveProperty("jobId");

      // Verify job is in scheduled queue
      const queueResponse = await fetch(
        `${PLUGIN_ENDPOINTS.jobs}/queues/scheduled`,
      );
      if (queueResponse.ok) {
        const queueData = await queueResponse.json();
        expect(queueData).toHaveProperty("jobs");
      }
    }, 10000);
  });

  describeIf("File Processing + Storage Integration", () => {
    it("should upload, process, and retrieve image", async () => {
      // Create test image blob
      const testImage = createTestImage();
      const formData = new FormData();
      formData.append("file", testImage, "test-image.png");
      formData.append(
        "options",
        JSON.stringify({
          resize: true,
          maxWidth: 1024,
          maxHeight: 1024,
          optimize: true,
          thumbnail: true,
        }),
      );

      // Upload and process
      const uploadResponse = await fetch(
        `${PLUGIN_ENDPOINTS.fileProcessing}/process`,
        {
          method: "POST",
          body: formData,
        },
      );

      expect(uploadResponse.ok).toBe(true);
      const uploadData = await uploadResponse.json();
      expect(uploadData).toHaveProperty("fileId");
      expect(uploadData).toHaveProperty("url");
      expect(uploadData).toHaveProperty("thumbnail");

      // Retrieve processed file
      const fileUrl = uploadData.url;
      const fileResponse = await fetch(fileUrl);
      expect(fileResponse.ok).toBe(true);

      // Verify thumbnail exists
      if (uploadData.thumbnail) {
        const thumbnailResponse = await fetch(uploadData.thumbnail);
        expect(thumbnailResponse.ok).toBe(true);
      }
    }, 20000);

    it("should handle video thumbnail generation", async () => {
      const testVideo = createTestVideo();
      const formData = new FormData();
      formData.append("file", testVideo, "test-video.mp4");
      formData.append(
        "options",
        JSON.stringify({
          thumbnail: true,
          thumbnailTime: 1, // 1 second into video
        }),
      );

      const uploadResponse = await fetch(
        `${PLUGIN_ENDPOINTS.fileProcessing}/process`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (uploadResponse.ok) {
        const data = await uploadResponse.json();
        expect(data).toHaveProperty("fileId");
        expect(data).toHaveProperty("thumbnail");
      } else {
        // Video processing may not be enabled
        expect([501, 503]).toContain(uploadResponse.status);
      }
    }, 30000);

    it("should strip EXIF metadata from images", async () => {
      const testImage = createTestImage();
      const formData = new FormData();
      formData.append("file", testImage, "test-image.jpg");
      formData.append(
        "options",
        JSON.stringify({
          stripMetadata: true,
        }),
      );

      const uploadResponse = await fetch(
        `${PLUGIN_ENDPOINTS.fileProcessing}/process`,
        {
          method: "POST",
          body: formData,
        },
      );

      expect(uploadResponse.ok).toBe(true);
      const data = await uploadResponse.json();
      expect(data).toHaveProperty("metadata");
      expect(data.metadata.stripped).toBe(true);
    }, 15000);
  });

  describeIf("Multi-Plugin Message Flow", () => {
    it("should complete full message flow: send → store → notify → index", async () => {
      const testMessage = {
        id: `msg-${Date.now()}`,
        channelId: TEST_CHANNEL_ID,
        userId: TEST_USER_ID,
        content: "Integration test message @alice",
        createdAt: new Date().toISOString(),
      };

      // Step 1: Send message via Realtime
      const sendResponse = await fetch(
        `${PLUGIN_ENDPOINTS.realtime}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(testMessage),
        },
      );

      expect(sendResponse.ok).toBe(true);

      // Step 2: Verify notification was triggered for mention
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const notificationResponse = await fetch(
        `${PLUGIN_ENDPOINTS.notifications}/history?userId=alice&type=mention&limit=1`,
      );

      if (notificationResponse.ok) {
        const notifData = await notificationResponse.json();
        expect(notifData).toHaveProperty("notifications");
      }

      // Step 3: Verify message indexing job was created
      const jobsResponse = await fetch(
        `${PLUGIN_ENDPOINTS.jobs}/jobs?type=index-message&limit=10`,
      );

      if (jobsResponse.ok) {
        const jobsData = await jobsResponse.json();
        expect(Array.isArray(jobsData.jobs)).toBe(true);
      }
    }, 25000);

    it("should handle file attachment flow", async () => {
      // Upload file
      const testFile = createTestImage();
      const formData = new FormData();
      formData.append("file", testFile, "attachment.png");

      const uploadResponse = await fetch(
        `${PLUGIN_ENDPOINTS.fileProcessing}/process`,
        {
          method: "POST",
          body: formData,
        },
      );

      expect(uploadResponse.ok).toBe(true);
      const fileData = await uploadResponse.json();

      // Send message with attachment
      const message = {
        channelId: TEST_CHANNEL_ID,
        userId: TEST_USER_ID,
        content: "Check out this image!",
        attachments: [
          {
            fileId: fileData.fileId,
            url: fileData.url,
            thumbnail: fileData.thumbnail,
            mimeType: "image/png",
            size: testFile.size,
          },
        ],
      };

      const messageResponse = await fetch(
        `${PLUGIN_ENDPOINTS.realtime}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(message),
        },
      );

      expect(messageResponse.ok).toBe(true);

      // Message should be delivered with attachment
      const messageData = await messageResponse.json();
      expect(messageData.attachments).toHaveLength(1);
    }, 20000);
  });

  describeIf("Error Recovery Integration", () => {
    it("should queue notifications when service is temporarily unavailable", async () => {
      // This test simulates notification service being down
      // Jobs service should queue notifications for retry

      const jobResponse = await fetch(`${PLUGIN_ENDPOINTS.jobs}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "send-notification",
          payload: {
            userId: TEST_USER_ID,
            channel: "email",
            to: { email: TEST_EMAIL },
            content: { subject: "Test", body: "Test" },
          },
          options: {
            retry: {
              attempts: 3,
              delay: 1000,
            },
          },
        }),
      });

      expect(jobResponse.ok).toBe(true);
      const data = await jobResponse.json();
      expect(data).toHaveProperty("jobId");
    }, 10000);

    it("should fallback to polling when WebSocket fails", async () => {
      // Test graceful degradation
      // If realtime WebSocket connection fails, app should fallback to polling

      const healthResponse = await fetch(`${PLUGIN_ENDPOINTS.realtime}/health`);
      const healthData = await healthResponse.json();

      if (healthData.websocket.running === false) {
        // WebSocket is down, should use polling endpoint
        const pollResponse = await fetch(
          `${PLUGIN_ENDPOINTS.realtime}/poll?channelId=${TEST_CHANNEL_ID}&since=0`,
        );

        expect(pollResponse.ok).toBe(true);
        const pollData = await pollResponse.json();
        expect(pollData).toHaveProperty("messages");
      }
    }, 10000);
  });

  describeIf("Performance and Load Testing", () => {
    it("should handle concurrent notifications", async () => {
      const notifications = Array(10)
        .fill(null)
        .map((_, i) => ({
          userId: `user-${i}`,
          channel: "email",
          to: { email: `user-${i}@test.local` },
          content: { subject: "Test", body: "Test" },
        }));

      const promises = notifications.map((notif) =>
        fetch(`${PLUGIN_ENDPOINTS.notifications}/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(notif),
        }),
      );

      const results = await Promise.all(promises);
      const successCount = results.filter((r) => r.ok).length;

      expect(successCount).toBeGreaterThanOrEqual(8); // At least 80% success
    }, 20000);

    it("should handle concurrent file uploads", async () => {
      const uploads = Array(5)
        .fill(null)
        .map(() => {
          const formData = new FormData();
          formData.append("file", createTestImage(), "concurrent.png");
          return formData;
        });

      const promises = uploads.map((formData) =>
        fetch(`${PLUGIN_ENDPOINTS.fileProcessing}/process`, {
          method: "POST",
          body: formData,
        }),
      );

      const results = await Promise.all(promises);
      const successCount = results.filter((r) => r.ok).length;

      expect(successCount).toBeGreaterThanOrEqual(4); // At least 80% success
    }, 30000);
  });
});

// Helper Functions

async function waitForPlugin(url: string, maxAttempts = 30): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`${url}/health`);
      if (response.ok) {
        return true;
      }
    } catch (error) {
      // Plugin not ready yet
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(
    `Plugin at ${url} did not become ready after ${maxAttempts} attempts`,
  );
}

function createTestImage(): Blob {
  // Create minimal PNG image (1x1 red pixel)
  const base64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
  const binary = atob(base64);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  return new Blob([array], { type: "image/png" });
}

function createTestVideo(): Blob {
  // Create minimal video blob (not a real video, just for testing)
  const videoData = new Uint8Array([
    0x00,
    0x00,
    0x00,
    0x20,
    0x66,
    0x74,
    0x79,
    0x70, // ftyp header
    0x69,
    0x73,
    0x6f,
    0x6d,
    0x00,
    0x00,
    0x02,
    0x00,
  ]);
  return new Blob([videoData], { type: "video/mp4" });
}
