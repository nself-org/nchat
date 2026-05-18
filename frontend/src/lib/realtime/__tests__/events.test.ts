/**
 * @fileoverview Tests for Socket.io event definitions
 */

import {
  SOCKET_EVENTS,
  type SocketEvent,
  type MessagePayload,
  type PresencePayload,
  type TypingPayload,
} from "../events";

describe("SOCKET_EVENTS", () => {
  describe("Connection events", () => {
    it("should have CONNECT event", () => {
      expect(SOCKET_EVENTS.CONNECT).toBe("connect");
    });

    it("should have DISCONNECT event", () => {
      expect(SOCKET_EVENTS.DISCONNECT).toBe("disconnect");
    });

    it("should have ERROR event", () => {
      expect(SOCKET_EVENTS.ERROR).toBe("error");
    });
  });

  describe("Message events", () => {
    it("should have MESSAGE_NEW event", () => {
      expect(SOCKET_EVENTS.MESSAGE_NEW).toBe("message:new");
    });

    it("should have MESSAGE_UPDATE event", () => {
      expect(SOCKET_EVENTS.MESSAGE_UPDATE).toBe("message:update");
    });

    it("should have MESSAGE_DELETE event", () => {
      expect(SOCKET_EVENTS.MESSAGE_DELETE).toBe("message:delete");
    });

    it("should have MESSAGE_TYPING event", () => {
      expect(SOCKET_EVENTS.MESSAGE_TYPING).toBe("message:typing");
    });
  });

  describe("Presence events", () => {
    it("should have PRESENCE_UPDATE event", () => {
      expect(SOCKET_EVENTS.PRESENCE_UPDATE).toBe("presence:update");
    });

    it("should have PRESENCE_SUBSCRIBE event", () => {
      expect(SOCKET_EVENTS.PRESENCE_SUBSCRIBE).toBe("presence:subscribe");
    });
  });

  describe("Channel events", () => {
    it("should have CHANNEL_JOIN event", () => {
      expect(SOCKET_EVENTS.CHANNEL_JOIN).toBe("channel:join");
    });

    it("should have CHANNEL_LEAVE event", () => {
      expect(SOCKET_EVENTS.CHANNEL_LEAVE).toBe("channel:leave");
    });

    it("should have CHANNEL_UPDATE event", () => {
      expect(SOCKET_EVENTS.CHANNEL_UPDATE).toBe("channel:update");
    });
  });

  describe("Reaction events", () => {
    it("should have REACTION_ADD event", () => {
      expect(SOCKET_EVENTS.REACTION_ADD).toBe("reaction:add");
    });

    it("should have REACTION_REMOVE event", () => {
      expect(SOCKET_EVENTS.REACTION_REMOVE).toBe("reaction:remove");
    });
  });

  describe("Event naming conventions", () => {
    it("should use colon separator for namespaced events", () => {
      const namespacedEvents = Object.values(SOCKET_EVENTS).filter((v) =>
        v.includes(":"),
      );
      expect(namespacedEvents.length).toBeGreaterThan(0);
      namespacedEvents.forEach((event) => {
        expect(event.split(":").length).toBe(2);
      });
    });

    it("should use lowercase for all events", () => {
      Object.values(SOCKET_EVENTS).forEach((event) => {
        expect(event).toBe(event.toLowerCase());
      });
    });

    it("should have unique event values", () => {
      const values = Object.values(SOCKET_EVENTS);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });
  });

  describe("Message delivery events", () => {
    it("should have MESSAGE_SENT event", () => {
      expect(SOCKET_EVENTS.MESSAGE_SENT).toBe("message:sent");
    });

    it("should have MESSAGE_DELIVERED event", () => {
      expect(SOCKET_EVENTS.MESSAGE_DELIVERED).toBe("message:delivered");
    });

    it("should have MESSAGE_READ event", () => {
      expect(SOCKET_EVENTS.MESSAGE_READ).toBe("message:read");
    });

    it("should have MESSAGE_FAILED event", () => {
      expect(SOCKET_EVENTS.MESSAGE_FAILED).toBe("message:failed");
    });

    it("should have MESSAGE_ACK event", () => {
      expect(SOCKET_EVENTS.MESSAGE_ACK).toBe("message:ack");
    });
  });

  describe("Event count", () => {
    it("should have expected number of events", () => {
      // Event count may change as features are added
      expect(Object.keys(SOCKET_EVENTS).length).toBeGreaterThanOrEqual(19);
    });
  });
});

describe("MessagePayload", () => {
  const validPayload: MessagePayload = {
    id: "msg-123",
    channelId: "channel-456",
    content: "Hello world",
    authorId: "user-789",
    createdAt: "2026-01-29T10:00:00Z",
  };

  it("should accept valid payload with required fields", () => {
    expect(validPayload.id).toBeDefined();
    expect(validPayload.channelId).toBeDefined();
    expect(validPayload.content).toBeDefined();
    expect(validPayload.authorId).toBeDefined();
    expect(validPayload.createdAt).toBeDefined();
  });

  it("should accept optional updatedAt field", () => {
    const payloadWithUpdate: MessagePayload = {
      ...validPayload,
      updatedAt: "2026-01-29T11:00:00Z",
    };
    expect(payloadWithUpdate.updatedAt).toBe("2026-01-29T11:00:00Z");
  });

  it("should allow empty content", () => {
    const emptyContent: MessagePayload = {
      ...validPayload,
      content: "",
    };
    expect(emptyContent.content).toBe("");
  });
});

describe("PresencePayload", () => {
  it("should accept online status", () => {
    const payload: PresencePayload = {
      userId: "user-123",
      status: "online",
    };
    expect(payload.status).toBe("online");
  });

  it("should accept away status", () => {
    const payload: PresencePayload = {
      userId: "user-123",
      status: "away",
    };
    expect(payload.status).toBe("away");
  });

  it("should accept dnd status", () => {
    const payload: PresencePayload = {
      userId: "user-123",
      status: "dnd",
    };
    expect(payload.status).toBe("dnd");
  });

  it("should accept offline status", () => {
    const payload: PresencePayload = {
      userId: "user-123",
      status: "offline",
    };
    expect(payload.status).toBe("offline");
  });

  it("should accept optional lastSeen field", () => {
    const payload: PresencePayload = {
      userId: "user-123",
      status: "offline",
      lastSeen: "2026-01-29T10:00:00Z",
    };
    expect(payload.lastSeen).toBe("2026-01-29T10:00:00Z");
  });
});

describe("TypingPayload", () => {
  it("should accept isTyping true", () => {
    const payload: TypingPayload = {
      channelId: "channel-123",
      userId: "user-456",
      isTyping: true,
    };
    expect(payload.isTyping).toBe(true);
  });

  it("should accept isTyping false", () => {
    const payload: TypingPayload = {
      channelId: "channel-123",
      userId: "user-456",
      isTyping: false,
    };
    expect(payload.isTyping).toBe(false);
  });

  it("should have required channelId", () => {
    const payload: TypingPayload = {
      channelId: "channel-123",
      userId: "user-456",
      isTyping: true,
    };
    expect(payload.channelId).toBeDefined();
  });

  it("should have required userId", () => {
    const payload: TypingPayload = {
      channelId: "channel-123",
      userId: "user-456",
      isTyping: true,
    };
    expect(payload.userId).toBeDefined();
  });
});

describe("SocketEvent type", () => {
  it("should allow valid event values", () => {
    const event: SocketEvent = "connect";
    expect(event).toBe("connect");
  });

  it("should allow message:new event", () => {
    const event: SocketEvent = "message:new";
    expect(event).toBe("message:new");
  });

  it("should allow presence:update event", () => {
    const event: SocketEvent = "presence:update";
    expect(event).toBe("presence:update");
  });
});
