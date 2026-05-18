/**
 * NotificationEventDispatcher Tests
 */

import {
  NotificationEventDispatcher,
  getNotificationEventDispatcher,
  resetNotificationEventDispatcher,
} from "../event-dispatcher";
import { NotificationService } from "../notification.service";
import { PreferenceService } from "../preference.service";
import { ChatNotificationEvent } from "@/types/notifications";

// Mock the services
jest.mock("../notification.service");
jest.mock("../preference.service");

describe("NotificationEventDispatcher", () => {
  let dispatcher: NotificationEventDispatcher;
  let mockNotificationService: jest.Mocked<NotificationService>;
  let mockPreferenceService: jest.Mocked<PreferenceService>;

  const createMockEvent = (
    type: ChatNotificationEvent["type"] = "message.new",
  ): ChatNotificationEvent => ({
    type,
    timestamp: new Date().toISOString(),
    actor: {
      id: "actor-123",
      name: "John Doe",
      avatar_url: "https://example.com/avatar.jpg",
    },
    target: {
      user_id: "target-123",
      user_email: "target@example.com",
      user_push_token: "push-token-xyz",
    },
    data: {
      channel_id: "channel-123",
      channel_name: "general",
      message_id: "msg-123",
      message_preview: "Hello, world!",
      action_url: "https://example.com/chat/channel-123",
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    resetNotificationEventDispatcher();

    mockNotificationService = {
      processChatEvent: jest
        .fn()
        .mockResolvedValue([{ success: true, notification_id: "notif-123" }]),
    } as unknown as jest.Mocked<NotificationService>;

    mockPreferenceService = {
      canReceive: jest.fn().mockResolvedValue(true),
    } as unknown as jest.Mocked<PreferenceService>;

    dispatcher = new NotificationEventDispatcher({
      notificationService: mockNotificationService,
      preferenceService: mockPreferenceService,
      checkPreferences: true,
    });
  });

  describe("dispatch", () => {
    it("should dispatch event successfully", async () => {
      const event = createMockEvent();

      const results = await dispatcher.dispatch(event);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(mockNotificationService.processChatEvent).toHaveBeenCalledWith(
        event,
      );
    });

    it("should check preferences before dispatching", async () => {
      const event = createMockEvent();

      await dispatcher.dispatch(event);

      expect(mockPreferenceService.canReceive).toHaveBeenCalled();
    });

    it("should skip notification when user opted out", async () => {
      mockPreferenceService.canReceive.mockResolvedValue(false);

      const event = createMockEvent();
      const results = await dispatcher.dispatch(event);

      // Should return empty results since user opted out
      expect(mockNotificationService.processChatEvent).not.toHaveBeenCalled();
    });

    it("should handle errors gracefully", async () => {
      mockNotificationService.processChatEvent.mockRejectedValue(
        new Error("API error"),
      );

      const onError = jest.fn();
      const errorDispatcher = new NotificationEventDispatcher({
        notificationService: mockNotificationService,
        preferenceService: mockPreferenceService,
        onError,
      });

      const event = createMockEvent();
      const results = await errorDispatcher.dispatch(event);

      expect(results[0].success).toBe(false);
      expect(onError).toHaveBeenCalled();
    });

    it("should call onNotificationSent callback", async () => {
      const onNotificationSent = jest.fn();

      const callbackDispatcher = new NotificationEventDispatcher({
        notificationService: mockNotificationService,
        preferenceService: mockPreferenceService,
        onNotificationSent,
      });

      const event = createMockEvent();
      await callbackDispatcher.dispatch(event);

      expect(onNotificationSent).toHaveBeenCalledWith(
        event,
        expect.arrayContaining([expect.objectContaining({ success: true })]),
      );
    });
  });

  describe("event handlers", () => {
    it("should call event-specific handlers", async () => {
      const handler = jest.fn();
      dispatcher.on("message.new", handler);

      const event = createMockEvent("message.new");
      await dispatcher.dispatch(event);

      expect(handler).toHaveBeenCalledWith(event);
    });

    it("should call global handlers", async () => {
      const handler = jest.fn();
      dispatcher.onAll(handler);

      const event = createMockEvent("message.mention");
      await dispatcher.dispatch(event);

      expect(handler).toHaveBeenCalledWith(event);
    });

    it("should unsubscribe handlers", async () => {
      const handler = jest.fn();
      const subscription = dispatcher.on("message.new", handler);

      subscription.unsubscribe();

      const event = createMockEvent("message.new");
      await dispatcher.dispatch(event);

      expect(handler).not.toHaveBeenCalled();
    });

    it("should remove all handlers with off", () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      dispatcher.on("message.new", handler1);
      dispatcher.on("message.new", handler2);
      dispatcher.off("message.new");

      const event = createMockEvent("message.new");
      dispatcher.dispatch(event);

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });

    it("should remove all handlers with offAll", () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      dispatcher.on("message.new", handler1);
      dispatcher.onAll(handler2);
      dispatcher.offAll();

      const event = createMockEvent("message.new");
      dispatcher.dispatch(event);

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });
  });

  describe("convenience methods", () => {
    it("should notify new message", async () => {
      await dispatcher.notifyNewMessage({
        actorId: "actor-123",
        actorName: "John Doe",
        targetUserId: "target-123",
        channelId: "channel-123",
        channelName: "general",
        messageId: "msg-123",
        messagePreview: "Hello!",
        actionUrl: "https://example.com/chat",
      });

      expect(mockNotificationService.processChatEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "message.new",
        }),
      );
    });

    it("should notify mention", async () => {
      await dispatcher.notifyMention({
        actorId: "actor-123",
        actorName: "John Doe",
        targetUserId: "target-123",
        channelId: "channel-123",
        channelName: "general",
        messageId: "msg-123",
        messagePreview: "Hey @target",
        actionUrl: "https://example.com/chat",
      });

      expect(mockNotificationService.processChatEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "message.mention",
        }),
      );
    });

    it("should notify thread reply", async () => {
      await dispatcher.notifyThreadReply({
        actorId: "actor-123",
        actorName: "John Doe",
        targetUserId: "target-123",
        channelId: "channel-123",
        channelName: "general",
        threadId: "thread-123",
        messageId: "msg-123",
        messagePreview: "Great point!",
        actionUrl: "https://example.com/chat",
      });

      expect(mockNotificationService.processChatEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "thread.reply",
          data: expect.objectContaining({
            thread_id: "thread-123",
          }),
        }),
      );
    });

    it("should notify direct message", async () => {
      await dispatcher.notifyDirectMessage({
        actorId: "actor-123",
        actorName: "John Doe",
        targetUserId: "target-123",
        messageId: "msg-123",
        messagePreview: "Hey there!",
        actionUrl: "https://example.com/dm",
      });

      expect(mockNotificationService.processChatEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "dm.new",
        }),
      );
    });

    it("should notify channel invite", async () => {
      await dispatcher.notifyChannelInvite({
        actorId: "actor-123",
        actorName: "John Doe",
        targetUserId: "target-123",
        channelId: "channel-123",
        channelName: "new-project",
        actionUrl: "https://example.com/invite",
      });

      expect(mockNotificationService.processChatEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "channel.invite",
        }),
      );
    });

    it("should notify reminder", async () => {
      await dispatcher.notifyReminder({
        targetUserId: "target-123",
        reminderTitle: "Team meeting",
        reminderDescription: "Weekly sync call",
        actionUrl: "https://example.com/reminder",
      });

      expect(mockNotificationService.processChatEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "reminder.due",
          actor: expect.objectContaining({
            id: "system",
          }),
        }),
      );
    });
  });

  describe("singleton", () => {
    it("should return same instance", () => {
      const instance1 = getNotificationEventDispatcher();
      const instance2 = getNotificationEventDispatcher();

      expect(instance1).toBe(instance2);
    });

    it("should reset instance", () => {
      const instance1 = getNotificationEventDispatcher();
      resetNotificationEventDispatcher();
      const instance2 = getNotificationEventDispatcher();

      expect(instance1).not.toBe(instance2);
    });
  });
});
