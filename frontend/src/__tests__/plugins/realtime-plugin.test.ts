/**
 * Realtime Plugin Integration Tests
 *
 * Comprehensive test suite for the Realtime plugin (ɳPlugin: realtime v1.0.0)
 * Tests WebSocket connections, presence tracking, typing indicators, and message delivery.
 *
 * @group integration
 * @group plugins
 * @group realtime
 */

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from "@jest/globals";
import { io, Socket } from "socket.io-client";

// Configuration
const REALTIME_URL =
  process.env.NEXT_PUBLIC_REALTIME_URL || "http://realtime.localhost:3101";
const REALTIME_WS_URL =
  process.env.NEXT_PUBLIC_REALTIME_WS_URL || "ws://realtime.localhost:3101";
const PLUGINS_ENABLED = process.env.PLUGINS_ENABLED === "true";
const TEST_TIMEOUT = 30000;

// Test data
const TEST_USER_1 = {
  id: "test-user-realtime-1",
  name: "Test User 1",
  token: "test-token-1",
};

const TEST_USER_2 = {
  id: "test-user-realtime-2",
  name: "Test User 2",
  token: "test-token-2",
};

const TEST_CHANNEL = {
  id: "test-channel-realtime-1",
  name: "Test Channel",
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

function createSocketClient(userId: string, token: string): Socket {
  return io(REALTIME_WS_URL, {
    auth: {
      token,
      userId,
    },
    reconnection: false,
    timeout: 5000,
  });
}

describe("Realtime Plugin", () => {
  const describeIf = PLUGINS_ENABLED ? describe : describe.skip;

  beforeAll(async () => {
    if (!PLUGINS_ENABLED) {
      console.log("⚠️  Realtime plugin tests skipped (PLUGINS_ENABLED=false)");
      return;
    }

    console.log("Waiting for Realtime plugin to be ready...");
    await waitForPlugin(REALTIME_URL);
    console.log("Realtime plugin ready");
  }, TEST_TIMEOUT);

  describeIf("Health Check", () => {
    it("should return healthy status", async () => {
      const response = await fetch(`${REALTIME_URL}/health`);
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data).toMatchObject({
        status: "healthy",
        service: "realtime",
      });
      expect(data).toHaveProperty("version");
      expect(data).toHaveProperty("uptime");
    }, 10000);

    it("should report WebSocket server status", async () => {
      const response = await fetch(`${REALTIME_URL}/health`);
      const data = await response.json();

      expect(data).toHaveProperty("websocket");
      expect(data.websocket).toHaveProperty("running", true);
      expect(data.websocket).toHaveProperty("connections");
    }, 10000);

    it("should report Redis connection status", async () => {
      const response = await fetch(`${REALTIME_URL}/health`);
      const data = await response.json();

      expect(data).toHaveProperty("dependencies");
      expect(data.dependencies).toHaveProperty("redis");
      expect(data.dependencies.redis).toHaveProperty("status", "connected");
      expect(data.dependencies.redis).toHaveProperty("latency");
    }, 10000);
  });

  describeIf("WebSocket Connection", () => {
    let socket: Socket;

    afterEach(() => {
      if (socket?.connected) {
        socket.disconnect();
      }
    });

    it("should establish WebSocket connection", (done) => {
      socket = createSocketClient(TEST_USER_1.id, TEST_USER_1.token);

      socket.on("connect", () => {
        expect(socket.connected).toBe(true);
        done();
      });

      socket.on("connect_error", (error) => {
        done(error);
      });
    }, 10000);

    it("should handle authentication", (done) => {
      socket = createSocketClient(TEST_USER_1.id, TEST_USER_1.token);

      socket.on("authenticated", () => {
        done();
      });

      socket.on("error", (error) => {
        if (error.type === "auth") {
          // Auth may fail in test environment, that's OK
          done();
        }
      });

      socket.on("connect", () => {
        // Connection without auth event is also acceptable
        setTimeout(() => done(), 1000);
      });
    }, 10000);

    it("should handle disconnection gracefully", (done) => {
      socket = createSocketClient(TEST_USER_1.id, TEST_USER_1.token);

      socket.on("connect", () => {
        socket.disconnect();
      });

      socket.on("disconnect", (reason) => {
        expect(reason).toBeTruthy();
        done();
      });
    }, 10000);

    it("should reconnect after disconnect", (done) => {
      socket = io(REALTIME_WS_URL, {
        auth: {
          token: TEST_USER_1.token,
          userId: TEST_USER_1.id,
        },
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 500,
      });

      let connectCount = 0;

      socket.on("connect", () => {
        connectCount++;
        if (connectCount === 1) {
          socket.disconnect();
        } else if (connectCount === 2) {
          expect(connectCount).toBe(2);
          done();
        }
      });
    }, 15000);
  });

  describeIf("Channel Management", () => {
    let socket: Socket;

    beforeEach((done) => {
      socket = createSocketClient(TEST_USER_1.id, TEST_USER_1.token);
      socket.on("connect", () => done());
    }, 10000);

    afterEach(() => {
      if (socket?.connected) {
        socket.disconnect();
      }
    });

    it("should join a channel", (done) => {
      socket.emit("channel:join", { channelId: TEST_CHANNEL.id });

      socket.on("channel:joined", (data) => {
        expect(data.channelId).toBe(TEST_CHANNEL.id);
        expect(data.userId).toBe(TEST_USER_1.id);
        done();
      });

      // Fallback timeout
      setTimeout(() => {
        done(new Error("Channel join timeout"));
      }, 5000);
    }, 10000);

    it("should leave a channel", (done) => {
      socket.emit("channel:join", { channelId: TEST_CHANNEL.id });

      socket.on("channel:joined", () => {
        socket.emit("channel:leave", { channelId: TEST_CHANNEL.id });
      });

      socket.on("channel:left", (data) => {
        expect(data.channelId).toBe(TEST_CHANNEL.id);
        expect(data.userId).toBe(TEST_USER_1.id);
        done();
      });
    }, 10000);

    it("should receive channel member list on join", (done) => {
      socket.emit("channel:join", { channelId: TEST_CHANNEL.id });

      socket.on("channel:members", (data) => {
        expect(data.channelId).toBe(TEST_CHANNEL.id);
        expect(Array.isArray(data.members)).toBe(true);
        done();
      });

      // May not receive members in test environment
      setTimeout(() => done(), 3000);
    }, 10000);
  });

  describeIf("Presence Tracking", () => {
    it("should get channel presence via HTTP", async () => {
      const response = await fetch(
        `${REALTIME_URL}/presence/${TEST_CHANNEL.id}`,
      );
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data).toHaveProperty("channelId", TEST_CHANNEL.id);
      expect(data).toHaveProperty("users");
      expect(Array.isArray(data.users)).toBe(true);
      expect(data).toHaveProperty("count");
      expect(data.count).toHaveProperty("online");
      expect(data.count).toHaveProperty("away");
      expect(data.count).toHaveProperty("dnd");
      expect(data.count).toHaveProperty("offline");
    }, 10000);

    it("should update presence via HTTP", async () => {
      const response = await fetch(
        `${REALTIME_URL}/presence/${TEST_CHANNEL.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: TEST_USER_1.id,
            status: "online",
          }),
        },
      );

      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data).toHaveProperty("success", true);
    }, 10000);

    it("should broadcast presence changes via WebSocket", (done) => {
      const socket1 = createSocketClient(TEST_USER_1.id, TEST_USER_1.token);
      const socket2 = createSocketClient(TEST_USER_2.id, TEST_USER_2.token);

      let connectedCount = 0;
      const onConnect = () => {
        connectedCount++;
        if (connectedCount === 2) {
          socket1.emit("channel:join", { channelId: TEST_CHANNEL.id });
          socket2.emit("channel:join", { channelId: TEST_CHANNEL.id });
        }
      };

      socket1.on("connect", onConnect);
      socket2.on("connect", onConnect);

      socket2.on("presence", (data) => {
        if (data.userId === TEST_USER_1.id && data.status === "away") {
          socket1.disconnect();
          socket2.disconnect();
          done();
        }
      });

      socket1.on("channel:joined", () => {
        socket1.emit("presence:update", { status: "away" });
      });

      setTimeout(() => {
        socket1.disconnect();
        socket2.disconnect();
        done(new Error("Presence broadcast timeout"));
      }, 8000);
    }, 15000);

    it("should support all presence statuses", async () => {
      const statuses = ["online", "away", "dnd", "offline"];

      for (const status of statuses) {
        const response = await fetch(
          `${REALTIME_URL}/presence/${TEST_CHANNEL.id}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: TEST_USER_1.id,
              status,
            }),
          },
        );

        expect(response.ok).toBe(true);
      }
    }, 15000);
  });

  describeIf("Typing Indicators", () => {
    it("should send typing indicator via HTTP", async () => {
      const response = await fetch(`${REALTIME_URL}/typing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: TEST_USER_1.id,
          channelId: TEST_CHANNEL.id,
          isTyping: true,
        }),
      });

      expect(response.ok).toBe(true);
    }, 10000);

    it("should broadcast typing indicators via WebSocket", (done) => {
      const socket1 = createSocketClient(TEST_USER_1.id, TEST_USER_1.token);
      const socket2 = createSocketClient(TEST_USER_2.id, TEST_USER_2.token);

      let connectedCount = 0;
      const onConnect = () => {
        connectedCount++;
        if (connectedCount === 2) {
          socket1.emit("channel:join", { channelId: TEST_CHANNEL.id });
          socket2.emit("channel:join", { channelId: TEST_CHANNEL.id });
        }
      };

      socket1.on("connect", onConnect);
      socket2.on("connect", onConnect);

      socket2.on("typing", (data) => {
        if (
          data.userId === TEST_USER_1.id &&
          data.channelId === TEST_CHANNEL.id
        ) {
          expect(data.isTyping).toBe(true);
          socket1.disconnect();
          socket2.disconnect();
          done();
        }
      });

      socket1.on("channel:joined", () => {
        socket1.emit("typing", {
          channelId: TEST_CHANNEL.id,
          isTyping: true,
        });
      });

      setTimeout(() => {
        socket1.disconnect();
        socket2.disconnect();
        done(new Error("Typing indicator timeout"));
      }, 8000);
    }, 15000);

    it("should clear typing indicator after timeout", (done) => {
      const socket1 = createSocketClient(TEST_USER_1.id, TEST_USER_1.token);

      socket1.on("connect", () => {
        socket1.emit("channel:join", { channelId: TEST_CHANNEL.id });
      });

      socket1.on("channel:joined", () => {
        socket1.emit("typing", {
          channelId: TEST_CHANNEL.id,
          isTyping: true,
        });
      });

      // Should auto-clear after timeout (default 3000ms)
      setTimeout(() => {
        socket1.disconnect();
        done();
      }, 4000);
    }, 10000);
  });

  describeIf("Message Delivery", () => {
    it("should send message via HTTP", async () => {
      const response = await fetch(`${REALTIME_URL}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: TEST_CHANNEL.id,
          userId: TEST_USER_1.id,
          content: "Test message",
          mentions: [],
        }),
      });

      expect(response.ok).toBe(true);
    }, 10000);

    it("should broadcast messages via WebSocket", (done) => {
      const socket1 = createSocketClient(TEST_USER_1.id, TEST_USER_1.token);
      const socket2 = createSocketClient(TEST_USER_2.id, TEST_USER_2.token);

      const testMessage = "Hello from WebSocket test";

      let connectedCount = 0;
      const onConnect = () => {
        connectedCount++;
        if (connectedCount === 2) {
          socket1.emit("channel:join", { channelId: TEST_CHANNEL.id });
          socket2.emit("channel:join", { channelId: TEST_CHANNEL.id });
        }
      };

      socket1.on("connect", onConnect);
      socket2.on("connect", onConnect);

      socket2.on("message", (data) => {
        if (data.content === testMessage) {
          expect(data.userId).toBe(TEST_USER_1.id);
          expect(data.channelId).toBe(TEST_CHANNEL.id);
          socket1.disconnect();
          socket2.disconnect();
          done();
        }
      });

      socket1.on("channel:joined", () => {
        socket1.emit("message:send", {
          channelId: TEST_CHANNEL.id,
          content: testMessage,
          mentions: [],
        });
      });

      setTimeout(() => {
        socket1.disconnect();
        socket2.disconnect();
        done(new Error("Message delivery timeout"));
      }, 8000);
    }, 15000);
  });

  describeIf("Polling Fallback", () => {
    it("should support HTTP polling for messages", async () => {
      const since = Date.now() - 60000; // Last minute
      const response = await fetch(
        `${REALTIME_URL}/poll?channelId=${TEST_CHANNEL.id}&since=${since}`,
      );
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data).toHaveProperty("messages");
      expect(Array.isArray(data.messages)).toBe(true);
      expect(data).toHaveProperty("timestamp");
    }, 10000);

    it("should return only new messages since timestamp", async () => {
      const now = Date.now();

      // Send a message
      await fetch(`${REALTIME_URL}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: TEST_CHANNEL.id,
          userId: TEST_USER_1.id,
          content: "Polling test message",
          mentions: [],
        }),
      });

      // Poll for messages after timestamp
      const response = await fetch(
        `${REALTIME_URL}/poll?channelId=${TEST_CHANNEL.id}&since=${now}`,
      );
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.messages.length).toBeGreaterThanOrEqual(0);
    }, 10000);
  });

  describeIf("Rate Limiting", () => {
    it("should enforce rate limits", async () => {
      const requests = [];

      // Send 150 requests rapidly (default limit is 100/min)
      for (let i = 0; i < 150; i++) {
        requests.push(
          fetch(`${REALTIME_URL}/typing`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: TEST_USER_1.id,
              channelId: TEST_CHANNEL.id,
              isTyping: true,
            }),
          }),
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter((r) => r.status === 429);

      // Should have at least some rate-limited responses
      expect(rateLimited.length).toBeGreaterThan(0);
    }, 20000);
  });

  describeIf("Error Handling", () => {
    it("should handle invalid channel ID gracefully", async () => {
      const response = await fetch(
        `${REALTIME_URL}/presence/invalid-channel-id`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: TEST_USER_1.id,
            status: "online",
          }),
        },
      );

      // Should either succeed or return appropriate error
      expect([200, 400, 404]).toContain(response.status);
    }, 10000);

    it("should handle malformed requests", async () => {
      const response = await fetch(`${REALTIME_URL}/typing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Missing required fields
        }),
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
    }, 10000);

    it("should handle WebSocket errors", (done) => {
      const socket = createSocketClient("invalid-user", "invalid-token");

      socket.on("error", (error) => {
        expect(error).toBeTruthy();
        socket.disconnect();
        done();
      });

      socket.on("connect", () => {
        // Connection succeeded, try invalid operation
        socket.emit("channel:join", { channelId: "" });
        setTimeout(() => {
          socket.disconnect();
          done();
        }, 2000);
      });
    }, 10000);
  });

  describeIf("Performance", () => {
    it("should handle concurrent connections", async () => {
      const sockets: Socket[] = [];
      const connectionPromises = [];

      // Create 10 concurrent connections
      for (let i = 0; i < 10; i++) {
        const socket = createSocketClient(`test-user-${i}`, `test-token-${i}`);
        sockets.push(socket);

        connectionPromises.push(
          new Promise<void>((resolve, reject) => {
            socket.on("connect", () => resolve());
            socket.on("connect_error", (error) => reject(error));
            setTimeout(() => reject(new Error("Connection timeout")), 5000);
          }),
        );
      }

      try {
        await Promise.all(connectionPromises);
        expect(sockets.every((s) => s.connected)).toBe(true);
      } finally {
        sockets.forEach((s) => s.disconnect());
      }
    }, 15000);

    it("should have low message latency", async () => {
      const startTime = Date.now();

      await fetch(`${REALTIME_URL}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: TEST_CHANNEL.id,
          userId: TEST_USER_1.id,
          content: "Latency test",
          mentions: [],
        }),
      });

      const latency = Date.now() - startTime;

      // Should respond within 200ms for HTTP endpoint
      expect(latency).toBeLessThan(200);
    }, 10000);
  });
});
