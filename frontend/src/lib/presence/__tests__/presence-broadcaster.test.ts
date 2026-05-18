/**
 * @fileoverview Tests for Presence Broadcaster
 */

import {
  PresenceBroadcaster,
  getPresenceBroadcaster,
  destroyPresenceBroadcaster,
} from "../presence-broadcaster";
import * as socketClient from "../../socket/client";
import { SocketEvents } from "../../socket/events";

// Mock the socket client
jest.mock("../../socket/client", () => ({
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  isConnected: jest.fn(() => true),
}));

describe("PresenceBroadcaster", () => {
  let broadcaster: PresenceBroadcaster;
  let onPresenceUpdateMock: jest.Mock;
  let onPresenceBulkMock: jest.Mock;
  let onTypingStartMock: jest.Mock;
  let onTypingStopMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    (socketClient.isConnected as jest.Mock).mockReturnValue(true);

    onPresenceUpdateMock = jest.fn();
    onPresenceBulkMock = jest.fn();
    onTypingStartMock = jest.fn();
    onTypingStopMock = jest.fn();

    broadcaster = new PresenceBroadcaster({
      throttleInterval: 1000, // 1 second for testing
      onPresenceUpdate: onPresenceUpdateMock,
      onPresenceBulk: onPresenceBulkMock,
      onTypingStart: onTypingStartMock,
      onTypingStop: onTypingStopMock,
    });
  });

  afterEach(() => {
    broadcaster.destroy();
    destroyPresenceBroadcaster();
  });

  describe("initialize", () => {
    it("should set up socket listeners", () => {
      broadcaster.initialize();

      expect(socketClient.on).toHaveBeenCalledWith(
        SocketEvents.PRESENCE_UPDATE,
        expect.any(Function),
      );
      expect(socketClient.on).toHaveBeenCalledWith(
        SocketEvents.PRESENCE_BULK,
        expect.any(Function),
      );
      expect(socketClient.on).toHaveBeenCalledWith(
        SocketEvents.TYPING_START,
        expect.any(Function),
      );
      expect(socketClient.on).toHaveBeenCalledWith(
        SocketEvents.TYPING_STOP,
        expect.any(Function),
      );
    });

    it("should not initialize twice", () => {
      broadcaster.initialize();
      broadcaster.initialize();

      // Count PRESENCE_UPDATE listener registrations
      const presenceUpdateCalls = (
        socketClient.on as jest.Mock
      ).mock.calls.filter((call) => call[0] === SocketEvents.PRESENCE_UPDATE);
      expect(presenceUpdateCalls).toHaveLength(1);
    });
  });

  describe("destroy", () => {
    it("should remove socket listeners", () => {
      broadcaster.initialize();
      broadcaster.destroy();

      expect(socketClient.off).toHaveBeenCalledWith(
        SocketEvents.PRESENCE_UPDATE,
        expect.any(Function),
      );
      expect(socketClient.off).toHaveBeenCalledWith(
        SocketEvents.PRESENCE_BULK,
        expect.any(Function),
      );
    });

    it("should clear subscribed users", () => {
      broadcaster.initialize();
      broadcaster.subscribeToUsers(["user-1", "user-2"]);

      broadcaster.destroy();

      expect(broadcaster.getSubscribedUsers()).toHaveLength(0);
    });
  });

  describe("broadcastPresence", () => {
    it("should emit presence update", () => {
      broadcaster.broadcastPresence("online", undefined, true);

      expect(socketClient.emit).toHaveBeenCalledWith(
        SocketEvents.PRESENCE_UPDATE,
        {
          status: "online",
          customStatus: undefined,
          customEmoji: undefined,
        },
      );
    });

    it("should include custom status", () => {
      broadcaster.broadcastPresence(
        "online",
        { text: "Working", emoji: "💻" },
        true,
      );

      expect(socketClient.emit).toHaveBeenCalledWith(
        SocketEvents.PRESENCE_UPDATE,
        {
          status: "online",
          customStatus: "Working",
          customEmoji: "💻",
        },
      );
    });

    it("should convert invisible to offline", () => {
      broadcaster.broadcastPresence("invisible", undefined, true);

      expect(socketClient.emit).toHaveBeenCalledWith(
        SocketEvents.PRESENCE_UPDATE,
        {
          status: "offline",
          customStatus: undefined,
          customEmoji: undefined,
        },
      );
    });

    it("should throttle broadcasts without force flag", () => {
      broadcaster.broadcastPresence("online");
      broadcaster.broadcastPresence("online");

      expect(socketClient.emit).toHaveBeenCalledTimes(1);
    });

    it("should not throttle with force flag", () => {
      broadcaster.broadcastPresence("online", undefined, true);
      broadcaster.broadcastPresence("online", undefined, true);

      expect(socketClient.emit).toHaveBeenCalledTimes(2);
    });

    it("should not emit when disconnected", () => {
      (socketClient.isConnected as jest.Mock).mockReturnValue(false);

      const result = broadcaster.broadcastPresence("online", undefined, true);

      expect(result).toBe(false);
      expect(socketClient.emit).not.toHaveBeenCalled();
    });
  });

  describe("broadcastOffline", () => {
    it("should emit offline status", () => {
      broadcaster.broadcastOffline();

      expect(socketClient.emit).toHaveBeenCalledWith(
        SocketEvents.PRESENCE_UPDATE,
        {
          status: "offline",
          customStatus: undefined,
          customEmoji: undefined,
        },
      );
    });
  });

  describe("broadcastCustomStatus", () => {
    it("should emit user status event", () => {
      broadcaster.broadcastCustomStatus({ text: "In a meeting", emoji: "📅" });

      expect(socketClient.emit).toHaveBeenCalledWith(SocketEvents.USER_STATUS, {
        status: "online",
        customStatus: "In a meeting",
        customEmoji: "📅",
        expiresAt: undefined,
      });
    });

    it("should include expiration date", () => {
      const expiresAt = new Date("2024-01-15T12:00:00Z");
      broadcaster.broadcastCustomStatus({
        text: "Meeting",
        expiresAt,
      });

      expect(socketClient.emit).toHaveBeenCalledWith(SocketEvents.USER_STATUS, {
        status: "online",
        customStatus: "Meeting",
        customEmoji: undefined,
        expiresAt: "2024-01-15T12:00:00.000Z",
      });
    });

    it("should clear custom status with null", () => {
      broadcaster.broadcastCustomStatus(null);

      expect(socketClient.emit).toHaveBeenCalledWith(SocketEvents.USER_STATUS, {
        status: "online",
        customStatus: undefined,
        customEmoji: undefined,
        expiresAt: undefined,
      });
    });
  });

  describe("broadcastTypingStart", () => {
    it("should emit typing start event", () => {
      broadcaster.broadcastTypingStart("ch-1");

      expect(socketClient.emit).toHaveBeenCalledWith(
        SocketEvents.TYPING_START,
        {
          channelId: "ch-1",
          threadId: undefined,
        },
      );
    });

    it("should include thread ID", () => {
      broadcaster.broadcastTypingStart("ch-1", "th-1");

      expect(socketClient.emit).toHaveBeenCalledWith(
        SocketEvents.TYPING_START,
        {
          channelId: "ch-1",
          threadId: "th-1",
        },
      );
    });
  });

  describe("broadcastTypingStop", () => {
    it("should emit typing stop event", () => {
      broadcaster.broadcastTypingStop("ch-1");

      expect(socketClient.emit).toHaveBeenCalledWith(SocketEvents.TYPING_STOP, {
        channelId: "ch-1",
        threadId: undefined,
      });
    });
  });

  describe("subscribeToUsers", () => {
    it("should emit subscribe event", () => {
      broadcaster.subscribeToUsers(["user-1", "user-2"]);

      expect(socketClient.emit).toHaveBeenCalledWith(
        SocketEvents.PRESENCE_SUBSCRIBE,
        {
          userIds: ["user-1", "user-2"],
        },
      );
    });

    it("should track subscribed users", () => {
      broadcaster.subscribeToUsers(["user-1", "user-2"]);

      expect(broadcaster.getSubscribedUsers()).toEqual(["user-1", "user-2"]);
      expect(broadcaster.isSubscribedTo("user-1")).toBe(true);
    });

    it("should not re-subscribe to already subscribed users", () => {
      broadcaster.subscribeToUsers(["user-1"]);
      broadcaster.subscribeToUsers(["user-1", "user-2"]);

      // Second call should only include new user
      expect(socketClient.emit).toHaveBeenLastCalledWith(
        SocketEvents.PRESENCE_SUBSCRIBE,
        {
          userIds: ["user-2"],
        },
      );
    });

    it("should not emit if all users already subscribed", () => {
      broadcaster.subscribeToUsers(["user-1"]);
      (socketClient.emit as jest.Mock).mockClear();

      broadcaster.subscribeToUsers(["user-1"]);

      expect(socketClient.emit).not.toHaveBeenCalled();
    });
  });

  describe("unsubscribeFromUsers", () => {
    it("should emit unsubscribe event", () => {
      broadcaster.subscribeToUsers(["user-1", "user-2"]);
      broadcaster.unsubscribeFromUsers(["user-1"]);

      expect(socketClient.emit).toHaveBeenCalledWith(
        SocketEvents.PRESENCE_UNSUBSCRIBE,
        {
          userIds: ["user-1"],
        },
      );
    });

    it("should remove from tracked users", () => {
      broadcaster.subscribeToUsers(["user-1", "user-2"]);
      broadcaster.unsubscribeFromUsers(["user-1"]);

      expect(broadcaster.isSubscribedTo("user-1")).toBe(false);
      expect(broadcaster.isSubscribedTo("user-2")).toBe(true);
    });

    it("should not emit for unsubscribed users", () => {
      (socketClient.emit as jest.Mock).mockClear();

      broadcaster.unsubscribeFromUsers(["user-1"]);

      expect(socketClient.emit).not.toHaveBeenCalled();
    });
  });

  describe("setCallbacks", () => {
    it("should update callbacks", () => {
      const newOnPresenceUpdate = jest.fn();
      broadcaster.setCallbacks({ onPresenceUpdate: newOnPresenceUpdate });

      // Get the handler registered during initialize
      broadcaster.initialize();

      // Find the presence update handler
      const onCall = (socketClient.on as jest.Mock).mock.calls.find(
        (call) => call[0] === SocketEvents.PRESENCE_UPDATE,
      );
      expect(onCall).toBeDefined();

      // Call the handler
      const handler = onCall[1];
      handler({ userId: "user-1", status: "online" });

      expect(newOnPresenceUpdate).toHaveBeenCalledWith({
        userId: "user-1",
        status: "online",
      });
    });
  });

  describe("Event Handlers", () => {
    beforeEach(() => {
      broadcaster.initialize();
    });

    it("should call onPresenceUpdate when receiving presence event", () => {
      const handler = (socketClient.on as jest.Mock).mock.calls.find(
        (call) => call[0] === SocketEvents.PRESENCE_UPDATE,
      )?.[1];

      handler({ userId: "user-1", status: "online" });

      expect(onPresenceUpdateMock).toHaveBeenCalledWith({
        userId: "user-1",
        status: "online",
      });
    });

    it("should call onPresenceBulk when receiving bulk presence", () => {
      const handler = (socketClient.on as jest.Mock).mock.calls.find(
        (call) => call[0] === SocketEvents.PRESENCE_BULK,
      )?.[1];

      handler({
        presences: [
          { userId: "user-1", status: "online" },
          { userId: "user-2", status: "away" },
        ],
      });

      expect(onPresenceBulkMock).toHaveBeenCalledWith([
        { userId: "user-1", status: "online" },
        { userId: "user-2", status: "away" },
      ]);
    });

    it("should call onTypingStart when receiving typing start", () => {
      const handler = (socketClient.on as jest.Mock).mock.calls.find(
        (call) => call[0] === SocketEvents.TYPING_START,
      )?.[1];

      handler({ userId: "user-1", channelId: "ch-1" });

      expect(onTypingStartMock).toHaveBeenCalledWith({
        userId: "user-1",
        channelId: "ch-1",
        threadId: undefined,
      });
    });

    it("should call onTypingStop when receiving typing stop", () => {
      const handler = (socketClient.on as jest.Mock).mock.calls.find(
        (call) => call[0] === SocketEvents.TYPING_STOP,
      )?.[1];

      handler({ userId: "user-1", channelId: "ch-1" });

      expect(onTypingStopMock).toHaveBeenCalledWith({
        userId: "user-1",
        channelId: "ch-1",
      });
    });
  });

  describe("Singleton", () => {
    it("should return same instance", () => {
      const instance1 = getPresenceBroadcaster();
      const instance2 = getPresenceBroadcaster();

      expect(instance1).toBe(instance2);
    });

    it("should allow destroying and recreating", () => {
      const instance1 = getPresenceBroadcaster();
      destroyPresenceBroadcaster();

      const instance2 = getPresenceBroadcaster();
      expect(instance1).not.toBe(instance2);
    });
  });
});
