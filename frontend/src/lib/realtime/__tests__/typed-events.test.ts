/**
 * @fileoverview Tests for typed Socket.io event interfaces
 */

import type {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
  ServerEventName,
  ClientEventName,
  ServerEventPayload,
  ClientEventPayload,
} from "../typed-events";

describe("ServerToClientEvents", () => {
  describe("message events", () => {
    it("should define message:new event", () => {
      const handler: ServerToClientEvents["message:new"] = (payload) => {
        expect(payload).toHaveProperty("id");
        expect(payload).toHaveProperty("channelId");
        expect(payload).toHaveProperty("content");
      };
      handler({
        id: "msg-1",
        channelId: "ch-1",
        content: "test",
        authorId: "user-1",
        createdAt: "2026-01-29",
      });
    });

    it("should define message:update event", () => {
      const handler: ServerToClientEvents["message:update"] = (payload) => {
        expect(payload.id).toBeDefined();
      };
      handler({
        id: "msg-1",
        channelId: "ch-1",
        content: "updated",
        authorId: "user-1",
        createdAt: "2026-01-29",
      });
    });

    it("should define message:delete event", () => {
      const handler: ServerToClientEvents["message:delete"] = (payload) => {
        expect(payload.messageId).toBeDefined();
        expect(payload.channelId).toBeDefined();
      };
      handler({ messageId: "msg-1", channelId: "ch-1" });
    });

    it("should define message:typing event", () => {
      const handler: ServerToClientEvents["message:typing"] = (payload) => {
        expect(payload.channelId).toBeDefined();
        expect(payload.userId).toBeDefined();
        expect(typeof payload.isTyping).toBe("boolean");
      };
      handler({ channelId: "ch-1", userId: "user-1", isTyping: true });
    });
  });

  describe("presence events", () => {
    it("should define presence:update event", () => {
      const handler: ServerToClientEvents["presence:update"] = (payload) => {
        expect(payload.userId).toBeDefined();
        expect(payload.status).toBeDefined();
      };
      handler({ userId: "user-1", status: "online" });
    });
  });

  describe("channel events", () => {
    it("should define channel:update event", () => {
      const handler: ServerToClientEvents["channel:update"] = (payload) => {
        expect(payload.channelId).toBeDefined();
        expect(payload.data).toBeDefined();
      };
      handler({ channelId: "ch-1", data: { name: "updated" } });
    });

    it("should define channel:member_join event", () => {
      const handler: ServerToClientEvents["channel:member_join"] = (
        payload,
      ) => {
        expect(payload.channelId).toBeDefined();
        expect(payload.userId).toBeDefined();
      };
      handler({ channelId: "ch-1", userId: "user-1" });
    });

    it("should define channel:member_leave event", () => {
      const handler: ServerToClientEvents["channel:member_leave"] = (
        payload,
      ) => {
        expect(payload.channelId).toBeDefined();
        expect(payload.userId).toBeDefined();
      };
      handler({ channelId: "ch-1", userId: "user-1" });
    });
  });

  describe("reaction events", () => {
    it("should define reaction:add event", () => {
      const handler: ServerToClientEvents["reaction:add"] = (payload) => {
        expect(payload.messageId).toBeDefined();
        expect(payload.emoji).toBeDefined();
        expect(payload.userId).toBeDefined();
      };
      handler({ messageId: "msg-1", emoji: "👍", userId: "user-1" });
    });

    it("should define reaction:remove event", () => {
      const handler: ServerToClientEvents["reaction:remove"] = (payload) => {
        expect(payload.messageId).toBeDefined();
        expect(payload.emoji).toBeDefined();
        expect(payload.userId).toBeDefined();
      };
      handler({ messageId: "msg-1", emoji: "👍", userId: "user-1" });
    });
  });

  describe("notification event", () => {
    it("should define notification event", () => {
      const handler: ServerToClientEvents["notification"] = (payload) => {
        expect(payload.type).toBeDefined();
        expect(payload.title).toBeDefined();
        expect(payload.body).toBeDefined();
      };
      handler({ type: "info", title: "Test", body: "Test notification" });
    });

    it("should accept optional data in notification", () => {
      const handler: ServerToClientEvents["notification"] = (payload) => {
        expect(payload.data).toBeDefined();
      };
      handler({
        type: "info",
        title: "Test",
        body: "Test",
        data: { key: "value" },
      });
    });
  });

  describe("error event", () => {
    it("should define error event", () => {
      const handler: ServerToClientEvents["error"] = (payload) => {
        expect(payload.code).toBeDefined();
        expect(payload.message).toBeDefined();
      };
      handler({ code: "ERR_AUTH", message: "Authentication failed" });
    });
  });
});

describe("ClientToServerEvents", () => {
  describe("message events", () => {
    it("should define message:send event", () => {
      const handler: ClientToServerEvents["message:send"] = (
        payload,
        callback,
      ) => {
        expect(payload.channelId).toBeDefined();
        expect(payload.content).toBeDefined();
        if (callback) {
          callback({ success: true, messageId: "msg-1" });
        }
      };
      handler({ channelId: "ch-1", content: "Hello" }, (ack) => {
        expect(ack.success).toBe(true);
      });
    });

    it("should allow optional replyTo in message:send", () => {
      const handler: ClientToServerEvents["message:send"] = (payload) => {
        expect(payload.replyTo).toBeDefined();
      };
      handler({ channelId: "ch-1", content: "Reply", replyTo: "msg-0" });
    });

    it("should define message:edit event", () => {
      const handler: ClientToServerEvents["message:edit"] = (
        payload,
        callback,
      ) => {
        expect(payload.messageId).toBeDefined();
        expect(payload.content).toBeDefined();
        if (callback) callback({ success: true });
      };
      handler({ messageId: "msg-1", content: "Edited" });
    });

    it("should define message:delete event", () => {
      const handler: ClientToServerEvents["message:delete"] = (
        payload,
        callback,
      ) => {
        expect(payload.messageId).toBeDefined();
        if (callback) callback({ success: true });
      };
      handler({ messageId: "msg-1" });
    });

    it("should define message:typing event", () => {
      const handler: ClientToServerEvents["message:typing"] = (payload) => {
        expect(payload.channelId).toBeDefined();
        expect(typeof payload.isTyping).toBe("boolean");
      };
      handler({ channelId: "ch-1", isTyping: true });
    });
  });

  describe("channel events", () => {
    it("should define channel:join event", () => {
      const handler: ClientToServerEvents["channel:join"] = (
        payload,
        callback,
      ) => {
        expect(payload.channelId).toBeDefined();
        if (callback) callback({ success: true });
      };
      handler({ channelId: "ch-1" });
    });

    it("should define channel:leave event", () => {
      const handler: ClientToServerEvents["channel:leave"] = (payload) => {
        expect(payload.channelId).toBeDefined();
      };
      handler({ channelId: "ch-1" });
    });
  });

  describe("presence events", () => {
    it("should define presence:update event", () => {
      const handler: ClientToServerEvents["presence:update"] = (payload) => {
        expect(payload.status).toBeDefined();
      };
      handler({ status: "online" });
    });

    it("should accept all status values", () => {
      const statuses: Array<"online" | "away" | "dnd" | "offline"> = [
        "online",
        "away",
        "dnd",
        "offline",
      ];
      statuses.forEach((status) => {
        const handler: ClientToServerEvents["presence:update"] = (payload) => {
          expect(payload.status).toBe(status);
        };
        handler({ status });
      });
    });

    it("should define presence:subscribe event", () => {
      const handler: ClientToServerEvents["presence:subscribe"] = (payload) => {
        expect(Array.isArray(payload.userIds)).toBe(true);
      };
      handler({ userIds: ["user-1", "user-2"] });
    });
  });

  describe("reaction events", () => {
    it("should define reaction:add event", () => {
      const handler: ClientToServerEvents["reaction:add"] = (payload) => {
        expect(payload.messageId).toBeDefined();
        expect(payload.emoji).toBeDefined();
      };
      handler({ messageId: "msg-1", emoji: "👍" });
    });

    it("should define reaction:remove event", () => {
      const handler: ClientToServerEvents["reaction:remove"] = (payload) => {
        expect(payload.messageId).toBeDefined();
        expect(payload.emoji).toBeDefined();
      };
      handler({ messageId: "msg-1", emoji: "👍" });
    });
  });
});

describe("InterServerEvents", () => {
  it("should define ping event", () => {
    const handler: InterServerEvents["ping"] = () => {
      // Ping handler should be callable
    };
    expect(handler).toBeDefined();
    handler();
  });
});

describe("SocketData", () => {
  it("should have userId property", () => {
    const data: SocketData = {
      userId: "user-123",
      sessionId: "session-456",
    };
    expect(data.userId).toBe("user-123");
  });

  it("should have sessionId property", () => {
    const data: SocketData = {
      userId: "user-123",
      sessionId: "session-456",
    };
    expect(data.sessionId).toBe("session-456");
  });
});

describe("Type helpers", () => {
  describe("ServerEventName", () => {
    it("should be a valid server event name", () => {
      const eventName: ServerEventName = "message:new";
      expect(eventName).toBe("message:new");
    });
  });

  describe("ClientEventName", () => {
    it("should be a valid client event name", () => {
      const eventName: ClientEventName = "message:send";
      expect(eventName).toBe("message:send");
    });
  });

  describe("ServerEventPayload", () => {
    it("should extract correct payload type for message:new", () => {
      const payload: ServerEventPayload<"message:new"> = {
        id: "msg-1",
        channelId: "ch-1",
        content: "test",
        authorId: "user-1",
        createdAt: "2026-01-29",
      };
      expect(payload.id).toBe("msg-1");
    });

    it("should extract correct payload type for error", () => {
      const payload: ServerEventPayload<"error"> = {
        code: "ERR_TEST",
        message: "Test error",
      };
      expect(payload.code).toBe("ERR_TEST");
    });
  });

  describe("ClientEventPayload", () => {
    it("should extract correct payload type for message:send", () => {
      const payload: ClientEventPayload<"message:send"> = {
        channelId: "ch-1",
        content: "Hello",
      };
      expect(payload.channelId).toBe("ch-1");
    });

    it("should extract correct payload type for channel:join", () => {
      const payload: ClientEventPayload<"channel:join"> = {
        channelId: "ch-1",
      };
      expect(payload.channelId).toBe("ch-1");
    });
  });
});
