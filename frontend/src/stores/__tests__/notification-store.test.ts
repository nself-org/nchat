/**
 * Notification Store Tests
 *
 * Comprehensive tests for the notification store including:
 * - Notification CRUD operations
 * - Read state management
 * - Archive management
 * - Filter management
 * - Unread counts
 * - Preferences
 * - UI state
 * - Selectors
 */

import { act } from "@testing-library/react";
import {
  useNotificationStore,
  Notification,
  NotificationType,
  NotificationPriority,
  UnreadCounts,
  NotificationPreferences,
  selectUnreadTotal,
  selectUnreadMentions,
  selectChannelUnread,
  selectIsChannelMuted,
  selectNotificationPreferences,
  selectHasUnread,
} from "../notification-store";

// ============================================================================
// Test Helpers
// ============================================================================

const createTestNotification = (
  overrides?: Partial<Notification>,
): Notification => ({
  id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  type: "mention",
  priority: "normal",
  title: "Test Notification",
  body: "This is a test notification body",
  isRead: false,
  isArchived: false,
  createdAt: new Date().toISOString(),
  ...overrides,
});

// ============================================================================
// Test Setup
// ============================================================================

describe("Notification Store", () => {
  beforeEach(() => {
    act(() => {
      useNotificationStore.getState().reset();
    });
  });

  // ==========================================================================
  // Notification CRUD Tests
  // ==========================================================================

  describe("Notification CRUD Operations", () => {
    describe("addNotification", () => {
      it("should add a notification", () => {
        const notification = createTestNotification({ id: "notif-1" });

        act(() => {
          useNotificationStore.getState().addNotification(notification);
        });

        const state = useNotificationStore.getState();
        expect(state.notifications).toHaveLength(1);
        expect(state.notifications[0].id).toBe("notif-1");
      });

      it("should add notification to beginning of array", () => {
        const notif1 = createTestNotification({ id: "notif-1" });
        const notif2 = createTestNotification({ id: "notif-2" });

        act(() => {
          useNotificationStore.getState().addNotification(notif1);
          useNotificationStore.getState().addNotification(notif2);
        });

        const state = useNotificationStore.getState();
        expect(state.notifications[0].id).toBe("notif-2");
        expect(state.notifications[1].id).toBe("notif-1");
      });

      it("should set hasNewNotifications to true", () => {
        const notification = createTestNotification();

        act(() => {
          useNotificationStore.getState().addNotification(notification);
        });

        expect(useNotificationStore.getState().hasNewNotifications).toBe(true);
      });

      it("should update unread count for unread notification", () => {
        const notification = createTestNotification({ isRead: false });

        act(() => {
          useNotificationStore.getState().addNotification(notification);
        });

        expect(useNotificationStore.getState().unreadCounts.total).toBe(1);
      });

      it("should update mentions count for mention notification", () => {
        const notification = createTestNotification({
          type: "mention",
          isRead: false,
        });

        act(() => {
          useNotificationStore.getState().addNotification(notification);
        });

        expect(useNotificationStore.getState().unreadCounts.mentions).toBe(1);
      });

      it("should update DM count for direct message notification", () => {
        const notification = createTestNotification({
          type: "direct_message",
          isRead: false,
        });

        act(() => {
          useNotificationStore.getState().addNotification(notification);
        });

        expect(
          useNotificationStore.getState().unreadCounts.directMessages,
        ).toBe(1);
      });

      it("should update thread count for thread reply notification", () => {
        const notification = createTestNotification({
          type: "thread_reply",
          isRead: false,
        });

        act(() => {
          useNotificationStore.getState().addNotification(notification);
        });

        expect(useNotificationStore.getState().unreadCounts.threads).toBe(1);
      });

      it("should update channel-specific count", () => {
        const notification = createTestNotification({
          channelId: "channel-1",
          isRead: false,
        });

        act(() => {
          useNotificationStore.getState().addNotification(notification);
        });

        const state = useNotificationStore.getState();
        expect(state.unreadCounts.byChannel["channel-1"].unread).toBe(1);
      });

      it("should update channel mention count", () => {
        const notification = createTestNotification({
          type: "mention",
          channelId: "channel-1",
          isRead: false,
        });

        act(() => {
          useNotificationStore.getState().addNotification(notification);
        });

        const state = useNotificationStore.getState();
        expect(state.unreadCounts.byChannel["channel-1"].mentions).toBe(1);
      });

      it("should not update counts for read notification", () => {
        const notification = createTestNotification({ isRead: true });

        act(() => {
          useNotificationStore.getState().addNotification(notification);
        });

        expect(useNotificationStore.getState().unreadCounts.total).toBe(0);
      });
    });

    describe("addNotifications", () => {
      it("should add multiple notifications", () => {
        const notifications = [
          createTestNotification({ id: "notif-1" }),
          createTestNotification({ id: "notif-2" }),
        ];

        act(() => {
          useNotificationStore.getState().addNotifications(notifications);
        });

        expect(useNotificationStore.getState().notifications).toHaveLength(2);
      });

      it("should prepend new notifications", () => {
        const existing = createTestNotification({ id: "existing" });
        const newNotifs = [
          createTestNotification({ id: "new-1" }),
          createTestNotification({ id: "new-2" }),
        ];

        act(() => {
          useNotificationStore.getState().addNotification(existing);
          useNotificationStore.getState().addNotifications(newNotifs);
        });

        const state = useNotificationStore.getState();
        expect(state.notifications[0].id).toBe("new-1");
        expect(state.notifications[2].id).toBe("existing");
      });
    });

    describe("removeNotification", () => {
      it("should remove a notification", () => {
        const notification = createTestNotification({ id: "notif-1" });

        act(() => {
          useNotificationStore.getState().addNotification(notification);
          useNotificationStore.getState().removeNotification("notif-1");
        });

        expect(useNotificationStore.getState().notifications).toHaveLength(0);
      });

      it("should update unread count when removing unread notification", () => {
        const notification = createTestNotification({
          id: "notif-1",
          isRead: false,
        });

        act(() => {
          useNotificationStore.getState().addNotification(notification);
          useNotificationStore.getState().removeNotification("notif-1");
        });

        expect(useNotificationStore.getState().unreadCounts.total).toBe(0);
      });

      it("should update type-specific count when removing", () => {
        const notification = createTestNotification({
          id: "notif-1",
          type: "mention",
          isRead: false,
        });

        act(() => {
          useNotificationStore.getState().addNotification(notification);
          useNotificationStore.getState().removeNotification("notif-1");
        });

        expect(useNotificationStore.getState().unreadCounts.mentions).toBe(0);
      });

      it("should handle removing non-existent notification", () => {
        act(() => {
          useNotificationStore.getState().removeNotification("non-existent");
        });

        expect(useNotificationStore.getState().notifications).toHaveLength(0);
      });
    });

    describe("clearAllNotifications", () => {
      it("should clear all notifications", () => {
        act(() => {
          useNotificationStore
            .getState()
            .addNotification(createTestNotification());
          useNotificationStore
            .getState()
            .addNotification(createTestNotification());
          useNotificationStore.getState().clearAllNotifications();
        });

        expect(useNotificationStore.getState().notifications).toHaveLength(0);
      });

      it("should reset all unread counts", () => {
        const notification = createTestNotification({
          type: "mention",
          channelId: "channel-1",
          isRead: false,
        });

        act(() => {
          useNotificationStore.getState().addNotification(notification);
          useNotificationStore.getState().clearAllNotifications();
        });

        const state = useNotificationStore.getState();
        expect(state.unreadCounts.total).toBe(0);
        expect(state.unreadCounts.mentions).toBe(0);
        expect(state.unreadCounts.byChannel).toEqual({});
      });

      it("should reset hasNewNotifications", () => {
        act(() => {
          useNotificationStore
            .getState()
            .addNotification(createTestNotification());
          useNotificationStore.getState().clearAllNotifications();
        });

        expect(useNotificationStore.getState().hasNewNotifications).toBe(false);
      });
    });
  });

  // ==========================================================================
  // Read State Management Tests
  // ==========================================================================

  describe("Read State Management", () => {
    describe("markAsRead", () => {
      it("should mark notification as read", () => {
        const notification = createTestNotification({
          id: "notif-1",
          isRead: false,
        });

        act(() => {
          useNotificationStore.getState().addNotification(notification);
          useNotificationStore.getState().markAsRead("notif-1");
        });

        expect(useNotificationStore.getState().notifications[0].isRead).toBe(
          true,
        );
      });

      it("should set readAt timestamp", () => {
        const notification = createTestNotification({
          id: "notif-1",
          isRead: false,
        });

        act(() => {
          useNotificationStore.getState().addNotification(notification);
          useNotificationStore.getState().markAsRead("notif-1");
        });

        expect(
          useNotificationStore.getState().notifications[0].readAt,
        ).toBeDefined();
      });

      it("should decrement unread count", () => {
        const notification = createTestNotification({
          id: "notif-1",
          isRead: false,
        });

        act(() => {
          useNotificationStore.getState().addNotification(notification);
          useNotificationStore.getState().markAsRead("notif-1");
        });

        expect(useNotificationStore.getState().unreadCounts.total).toBe(0);
      });

      it("should decrement type-specific count", () => {
        const notification = createTestNotification({
          id: "notif-1",
          type: "mention",
          isRead: false,
        });

        act(() => {
          useNotificationStore.getState().addNotification(notification);
          useNotificationStore.getState().markAsRead("notif-1");
        });

        expect(useNotificationStore.getState().unreadCounts.mentions).toBe(0);
      });

      it("should decrement channel count", () => {
        const notification = createTestNotification({
          id: "notif-1",
          channelId: "channel-1",
          isRead: false,
        });

        act(() => {
          useNotificationStore.getState().addNotification(notification);
          useNotificationStore.getState().markAsRead("notif-1");
        });

        expect(
          useNotificationStore.getState().unreadCounts.byChannel["channel-1"]
            .unread,
        ).toBe(0);
      });

      it("should not update already read notification", () => {
        const notification = createTestNotification({
          id: "notif-1",
          isRead: true,
        });

        act(() => {
          useNotificationStore.getState().addNotification(notification);
          useNotificationStore.getState().markAsRead("notif-1");
        });

        expect(useNotificationStore.getState().unreadCounts.total).toBe(0);
      });
    });

    describe("markAllAsRead", () => {
      it("should mark all notifications as read", () => {
        act(() => {
          useNotificationStore
            .getState()
            .addNotification(createTestNotification({ id: "notif-1" }));
          useNotificationStore
            .getState()
            .addNotification(createTestNotification({ id: "notif-2" }));
          useNotificationStore.getState().markAllAsRead();
        });

        const state = useNotificationStore.getState();
        expect(state.notifications.every((n) => n.isRead)).toBe(true);
      });

      it("should set readAt for all notifications", () => {
        act(() => {
          useNotificationStore
            .getState()
            .addNotification(createTestNotification({ id: "notif-1" }));
          useNotificationStore
            .getState()
            .addNotification(createTestNotification({ id: "notif-2" }));
          useNotificationStore.getState().markAllAsRead();
        });

        const state = useNotificationStore.getState();
        expect(state.notifications.every((n) => n.readAt !== undefined)).toBe(
          true,
        );
      });

      it("should reset all unread counts", () => {
        act(() => {
          useNotificationStore.getState().addNotification(
            createTestNotification({
              type: "mention",
              channelId: "channel-1",
            }),
          );
          useNotificationStore
            .getState()
            .addNotification(
              createTestNotification({ type: "direct_message" }),
            );
          useNotificationStore.getState().markAllAsRead();
        });

        const state = useNotificationStore.getState();
        expect(state.unreadCounts.total).toBe(0);
        expect(state.unreadCounts.mentions).toBe(0);
        expect(state.unreadCounts.directMessages).toBe(0);
      });

      it("should reset hasNewNotifications", () => {
        act(() => {
          useNotificationStore
            .getState()
            .addNotification(createTestNotification());
          useNotificationStore.getState().markAllAsRead();
        });

        expect(useNotificationStore.getState().hasNewNotifications).toBe(false);
      });
    });

    describe("markChannelAsRead", () => {
      it("should mark all channel notifications as read", () => {
        act(() => {
          useNotificationStore
            .getState()
            .addNotification(
              createTestNotification({ id: "notif-1", channelId: "channel-1" }),
            );
          useNotificationStore
            .getState()
            .addNotification(
              createTestNotification({ id: "notif-2", channelId: "channel-1" }),
            );
          useNotificationStore
            .getState()
            .addNotification(
              createTestNotification({ id: "notif-3", channelId: "channel-2" }),
            );
          useNotificationStore.getState().markChannelAsRead("channel-1");
        });

        const state = useNotificationStore.getState();
        const channel1Notifs = state.notifications.filter(
          (n) => n.channelId === "channel-1",
        );
        const channel2Notifs = state.notifications.filter(
          (n) => n.channelId === "channel-2",
        );

        expect(channel1Notifs.every((n) => n.isRead)).toBe(true);
        expect(channel2Notifs.every((n) => !n.isRead)).toBe(true);
      });

      it("should reset channel-specific counts", () => {
        act(() => {
          useNotificationStore
            .getState()
            .addNotification(
              createTestNotification({ channelId: "channel-1" }),
            );
          useNotificationStore.getState().markChannelAsRead("channel-1");
        });

        expect(
          useNotificationStore.getState().unreadCounts.byChannel["channel-1"],
        ).toEqual({
          unread: 0,
          mentions: 0,
        });
      });
    });
  });

  // ==========================================================================
  // Archive Management Tests
  // ==========================================================================

  describe("Archive Management", () => {
    describe("archiveNotification", () => {
      it("should archive notification", () => {
        const notification = createTestNotification({ id: "notif-1" });

        act(() => {
          useNotificationStore.getState().addNotification(notification);
          useNotificationStore.getState().archiveNotification("notif-1");
        });

        expect(
          useNotificationStore.getState().notifications[0].isArchived,
        ).toBe(true);
      });

      it("should handle non-existent notification", () => {
        act(() => {
          useNotificationStore.getState().archiveNotification("non-existent");
        });

        expect(useNotificationStore.getState().notifications).toHaveLength(0);
      });
    });

    describe("archiveAllRead", () => {
      it("should archive all read notifications", () => {
        act(() => {
          useNotificationStore
            .getState()
            .addNotification(
              createTestNotification({ id: "notif-1", isRead: true }),
            );
          useNotificationStore
            .getState()
            .addNotification(
              createTestNotification({ id: "notif-2", isRead: false }),
            );
          useNotificationStore.getState().archiveAllRead();
        });

        const state = useNotificationStore.getState();
        expect(
          state.notifications.find((n) => n.id === "notif-1")?.isArchived,
        ).toBe(true);
        expect(
          state.notifications.find((n) => n.id === "notif-2")?.isArchived,
        ).toBe(false);
      });
    });
  });

  // ==========================================================================
  // Filter Management Tests
  // ==========================================================================

  describe("Filter Management", () => {
    describe("setActiveFilter", () => {
      it("should set active filter", () => {
        act(() => {
          useNotificationStore.getState().setActiveFilter("mentions");
        });

        expect(useNotificationStore.getState().activeFilter).toBe("mentions");
      });

      it("should allow all filter values", () => {
        const filters: Array<
          "all" | "mentions" | "threads" | "reactions" | "unread"
        > = ["all", "mentions", "threads", "reactions", "unread"];

        filters.forEach((filter) => {
          act(() => {
            useNotificationStore.getState().setActiveFilter(filter);
          });
          expect(useNotificationStore.getState().activeFilter).toBe(filter);
        });
      });
    });

    describe("getFilteredNotifications", () => {
      beforeEach(() => {
        act(() => {
          useNotificationStore.getState().addNotification(
            createTestNotification({
              id: "notif-1",
              type: "mention",
              isRead: false,
            }),
          );
          useNotificationStore.getState().addNotification(
            createTestNotification({
              id: "notif-2",
              type: "thread_reply",
              isRead: false,
            }),
          );
          useNotificationStore.getState().addNotification(
            createTestNotification({
              id: "notif-3",
              type: "reaction",
              isRead: true,
            }),
          );
          useNotificationStore.getState().addNotification(
            createTestNotification({
              id: "notif-4",
              type: "mention",
              isArchived: true,
            }),
          );
        });
      });

      it('should return all non-archived notifications for "all" filter', () => {
        act(() => {
          useNotificationStore.getState().setActiveFilter("all");
        });

        const filtered = useNotificationStore
          .getState()
          .getFilteredNotifications();
        expect(filtered).toHaveLength(3);
        expect(filtered.every((n) => !n.isArchived)).toBe(true);
      });

      it("should filter mentions only", () => {
        act(() => {
          useNotificationStore.getState().setActiveFilter("mentions");
        });

        const filtered = useNotificationStore
          .getState()
          .getFilteredNotifications();
        expect(filtered).toHaveLength(1);
        expect(filtered[0].type).toBe("mention");
      });

      it("should filter threads only", () => {
        act(() => {
          useNotificationStore.getState().setActiveFilter("threads");
        });

        const filtered = useNotificationStore
          .getState()
          .getFilteredNotifications();
        expect(filtered).toHaveLength(1);
        expect(filtered[0].type).toBe("thread_reply");
      });

      it("should filter reactions only", () => {
        act(() => {
          useNotificationStore.getState().setActiveFilter("reactions");
        });

        const filtered = useNotificationStore
          .getState()
          .getFilteredNotifications();
        expect(filtered).toHaveLength(1);
        expect(filtered[0].type).toBe("reaction");
      });

      it("should filter unread only", () => {
        act(() => {
          useNotificationStore.getState().setActiveFilter("unread");
        });

        const filtered = useNotificationStore
          .getState()
          .getFilteredNotifications();
        expect(filtered).toHaveLength(2);
        expect(filtered.every((n) => !n.isRead)).toBe(true);
      });
    });

    describe("getUnreadNotifications", () => {
      it("should return only unread non-archived notifications", () => {
        act(() => {
          useNotificationStore
            .getState()
            .addNotification(
              createTestNotification({ id: "notif-1", isRead: false }),
            );
          useNotificationStore
            .getState()
            .addNotification(
              createTestNotification({ id: "notif-2", isRead: true }),
            );
          useNotificationStore.getState().addNotification(
            createTestNotification({
              id: "notif-3",
              isRead: false,
              isArchived: true,
            }),
          );
        });

        const unread = useNotificationStore.getState().getUnreadNotifications();
        expect(unread).toHaveLength(1);
        expect(unread[0].id).toBe("notif-1");
      });
    });
  });

  // ==========================================================================
  // Unread Counts Tests
  // ==========================================================================

  describe("Unread Counts", () => {
    describe("setUnreadCounts", () => {
      it("should set unread counts", () => {
        const counts: UnreadCounts = {
          total: 10,
          mentions: 3,
          directMessages: 5,
          threads: 2,
          byChannel: {
            "channel-1": { unread: 5, mentions: 2 },
          },
        };

        act(() => {
          useNotificationStore.getState().setUnreadCounts(counts);
        });

        expect(useNotificationStore.getState().unreadCounts).toEqual(counts);
      });
    });

    describe("incrementUnreadCount", () => {
      it("should increment total count", () => {
        act(() => {
          useNotificationStore.getState().incrementUnreadCount("channel-1");
        });

        expect(useNotificationStore.getState().unreadCounts.total).toBe(1);
      });

      it("should increment mention count when specified", () => {
        act(() => {
          useNotificationStore
            .getState()
            .incrementUnreadCount("channel-1", true);
        });

        expect(useNotificationStore.getState().unreadCounts.mentions).toBe(1);
      });

      it("should increment channel counts", () => {
        act(() => {
          useNotificationStore
            .getState()
            .incrementUnreadCount("channel-1", true);
        });

        const channelCounts =
          useNotificationStore.getState().unreadCounts.byChannel["channel-1"];
        expect(channelCounts.unread).toBe(1);
        expect(channelCounts.mentions).toBe(1);
      });
    });

    describe("decrementUnreadCount", () => {
      it("should decrement total count", () => {
        act(() => {
          useNotificationStore.getState().incrementUnreadCount("channel-1");
          useNotificationStore.getState().decrementUnreadCount("channel-1");
        });

        expect(useNotificationStore.getState().unreadCounts.total).toBe(0);
      });

      it("should not go below 0", () => {
        act(() => {
          useNotificationStore.getState().decrementUnreadCount("channel-1");
        });

        expect(useNotificationStore.getState().unreadCounts.total).toBe(0);
      });

      it("should decrement mention count when specified", () => {
        act(() => {
          useNotificationStore
            .getState()
            .incrementUnreadCount("channel-1", true);
          useNotificationStore
            .getState()
            .decrementUnreadCount("channel-1", true);
        });

        expect(useNotificationStore.getState().unreadCounts.mentions).toBe(0);
      });
    });

    describe("resetChannelUnread", () => {
      it("should reset channel-specific counts", () => {
        act(() => {
          useNotificationStore.getState().incrementUnreadCount("channel-1");
          useNotificationStore
            .getState()
            .incrementUnreadCount("channel-1", true);
          useNotificationStore.getState().resetChannelUnread("channel-1");
        });

        const state = useNotificationStore.getState();
        expect(state.unreadCounts.byChannel["channel-1"]).toEqual({
          unread: 0,
          mentions: 0,
        });
      });

      it("should decrement global counts", () => {
        act(() => {
          useNotificationStore.getState().incrementUnreadCount("channel-1");
          useNotificationStore
            .getState()
            .incrementUnreadCount("channel-1", true);
          useNotificationStore.getState().resetChannelUnread("channel-1");
        });

        const state = useNotificationStore.getState();
        expect(state.unreadCounts.total).toBe(0);
        expect(state.unreadCounts.mentions).toBe(0);
      });
    });
  });

  // ==========================================================================
  // Preferences Tests
  // ==========================================================================

  describe("Preferences", () => {
    describe("updatePreferences", () => {
      it("should update preferences", () => {
        act(() => {
          useNotificationStore
            .getState()
            .updatePreferences({ desktopEnabled: false });
        });

        expect(useNotificationStore.getState().preferences.desktopEnabled).toBe(
          false,
        );
      });

      it("should merge with existing preferences", () => {
        act(() => {
          useNotificationStore
            .getState()
            .updatePreferences({ desktopEnabled: false });
          useNotificationStore
            .getState()
            .updatePreferences({ soundEnabled: false });
        });

        const prefs = useNotificationStore.getState().preferences;
        expect(prefs.desktopEnabled).toBe(false);
        expect(prefs.soundEnabled).toBe(false);
      });
    });

    describe("setChannelNotificationLevel", () => {
      it("should set channel notification level", () => {
        act(() => {
          useNotificationStore
            .getState()
            .setChannelNotificationLevel("channel-1", "mentions");
        });

        const settings =
          useNotificationStore.getState().preferences.channelSettings[
            "channel-1"
          ];
        expect(settings.level).toBe("mentions");
        expect(settings.overrideGlobal).toBe(true);
      });
    });

    describe("muteChannel", () => {
      it("should mute channel", () => {
        act(() => {
          useNotificationStore.getState().muteChannel("channel-1");
        });

        const settings =
          useNotificationStore.getState().preferences.channelSettings[
            "channel-1"
          ];
        expect(settings.level).toBe("nothing");
      });

      it("should set mute expiry", () => {
        const until = new Date(Date.now() + 3600000).toISOString();

        act(() => {
          useNotificationStore.getState().muteChannel("channel-1", until);
        });

        const settings =
          useNotificationStore.getState().preferences.channelSettings[
            "channel-1"
          ];
        expect(settings.muteUntil).toBe(until);
      });
    });

    describe("unmuteChannel", () => {
      it("should unmute channel", () => {
        act(() => {
          useNotificationStore.getState().muteChannel("channel-1");
          useNotificationStore.getState().unmuteChannel("channel-1");
        });

        const settings =
          useNotificationStore.getState().preferences.channelSettings[
            "channel-1"
          ];
        expect(settings.level).toBe("all");
        expect(settings.muteUntil).toBeUndefined();
      });
    });
  });

  // ==========================================================================
  // UI State Tests
  // ==========================================================================

  describe("UI State", () => {
    describe("setNotificationCenterOpen", () => {
      it("should set notification center open state", () => {
        act(() => {
          useNotificationStore.getState().setNotificationCenterOpen(true);
        });

        expect(useNotificationStore.getState().notificationCenterOpen).toBe(
          true,
        );
      });

      it("should reset hasNewNotifications when opened", () => {
        act(() => {
          useNotificationStore
            .getState()
            .addNotification(createTestNotification());
          useNotificationStore.getState().setNotificationCenterOpen(true);
        });

        expect(useNotificationStore.getState().hasNewNotifications).toBe(false);
      });

      it("should update lastSeenAt when opened", () => {
        act(() => {
          useNotificationStore.getState().setNotificationCenterOpen(true);
        });

        expect(useNotificationStore.getState().lastSeenAt).not.toBeNull();
      });
    });

    describe("toggleNotificationCenter", () => {
      it("should toggle notification center", () => {
        act(() => {
          useNotificationStore.getState().toggleNotificationCenter();
        });

        expect(useNotificationStore.getState().notificationCenterOpen).toBe(
          true,
        );

        act(() => {
          useNotificationStore.getState().toggleNotificationCenter();
        });

        expect(useNotificationStore.getState().notificationCenterOpen).toBe(
          false,
        );
      });
    });

    describe("setHasNewNotifications", () => {
      it("should set hasNewNotifications", () => {
        act(() => {
          useNotificationStore.getState().setHasNewNotifications(true);
        });

        expect(useNotificationStore.getState().hasNewNotifications).toBe(true);
      });
    });

    describe("updateLastSeenAt", () => {
      it("should update lastSeenAt", () => {
        act(() => {
          useNotificationStore.getState().updateLastSeenAt();
        });

        expect(useNotificationStore.getState().lastSeenAt).not.toBeNull();
      });
    });
  });

  // ==========================================================================
  // Desktop Permission Tests
  // ==========================================================================

  describe("Desktop Permission", () => {
    describe("setDesktopPermission", () => {
      it("should set desktop permission", () => {
        act(() => {
          useNotificationStore.getState().setDesktopPermission("granted");
        });

        expect(useNotificationStore.getState().desktopPermission).toBe(
          "granted",
        );
      });
    });
  });

  // ==========================================================================
  // Loading/Error State Tests
  // ==========================================================================

  describe("Loading/Error State", () => {
    describe("setLoading", () => {
      it("should set loading state", () => {
        act(() => {
          useNotificationStore.getState().setLoading(true);
        });

        expect(useNotificationStore.getState().isLoading).toBe(true);
      });
    });

    describe("setError", () => {
      it("should set error state", () => {
        act(() => {
          useNotificationStore.getState().setError("Something went wrong");
        });

        expect(useNotificationStore.getState().error).toBe(
          "Something went wrong",
        );
      });

      it("should clear error", () => {
        act(() => {
          useNotificationStore.getState().setError("Error");
          useNotificationStore.getState().setError(null);
        });

        expect(useNotificationStore.getState().error).toBeNull();
      });
    });
  });

  // ==========================================================================
  // Selector Tests
  // ==========================================================================

  describe("Selectors", () => {
    describe("selectUnreadTotal", () => {
      it("should return total unread count", () => {
        act(() => {
          useNotificationStore
            .getState()
            .addNotification(createTestNotification());
          useNotificationStore
            .getState()
            .addNotification(createTestNotification());
        });

        expect(selectUnreadTotal(useNotificationStore.getState())).toBe(2);
      });
    });

    describe("selectUnreadMentions", () => {
      it("should return mention count", () => {
        act(() => {
          useNotificationStore
            .getState()
            .addNotification(createTestNotification({ type: "mention" }));
        });

        expect(selectUnreadMentions(useNotificationStore.getState())).toBe(1);
      });
    });

    describe("selectChannelUnread", () => {
      it("should return channel-specific counts", () => {
        act(() => {
          useNotificationStore
            .getState()
            .addNotification(
              createTestNotification({ channelId: "channel-1" }),
            );
        });

        const counts = selectChannelUnread("channel-1")(
          useNotificationStore.getState(),
        );
        expect(counts.unread).toBe(1);
      });

      it("should return default for unknown channel", () => {
        const counts = selectChannelUnread("unknown")(
          useNotificationStore.getState(),
        );
        expect(counts).toEqual({ unread: 0, mentions: 0 });
      });
    });

    describe("selectIsChannelMuted", () => {
      it("should return true when level is nothing", () => {
        act(() => {
          useNotificationStore.getState().muteChannel("channel-1");
        });

        expect(
          selectIsChannelMuted("channel-1")(useNotificationStore.getState()),
        ).toBe(true);
      });

      it("should return true when mute is active", () => {
        const until = new Date(Date.now() + 3600000).toISOString();

        act(() => {
          useNotificationStore.getState().muteChannel("channel-1", until);
        });

        expect(
          selectIsChannelMuted("channel-1")(useNotificationStore.getState()),
        ).toBe(true);
      });

      it("should return false when mute expired", () => {
        const until = new Date(Date.now() - 3600000).toISOString();

        act(() => {
          useNotificationStore
            .getState()
            .setChannelNotificationLevel("channel-1", "all");
          useNotificationStore.getState().updatePreferences({
            channelSettings: {
              "channel-1": {
                channelId: "channel-1",
                level: "all",
                muteUntil: until,
                overrideGlobal: true,
              },
            },
          });
        });

        expect(
          selectIsChannelMuted("channel-1")(useNotificationStore.getState()),
        ).toBe(false);
      });

      it("should return false for unmuted channel", () => {
        expect(
          selectIsChannelMuted("channel-1")(useNotificationStore.getState()),
        ).toBe(false);
      });
    });

    describe("selectNotificationPreferences", () => {
      it("should return preferences", () => {
        const prefs = selectNotificationPreferences(
          useNotificationStore.getState(),
        );
        expect(prefs).toBeDefined();
        expect(prefs.desktopEnabled).toBeDefined();
      });
    });

    describe("selectHasUnread", () => {
      it("should return true when there are unread notifications", () => {
        act(() => {
          useNotificationStore
            .getState()
            .addNotification(createTestNotification());
        });

        expect(selectHasUnread(useNotificationStore.getState())).toBe(true);
      });

      it("should return false when no unread notifications", () => {
        expect(selectHasUnread(useNotificationStore.getState())).toBe(false);
      });
    });
  });

  // ==========================================================================
  // Reset Tests
  // ==========================================================================

  describe("Reset", () => {
    describe("reset", () => {
      it("should reset store to initial state", () => {
        act(() => {
          useNotificationStore
            .getState()
            .addNotification(createTestNotification());
          useNotificationStore.getState().setActiveFilter("mentions");
          useNotificationStore.getState().setNotificationCenterOpen(true);
          useNotificationStore.getState().reset();
        });

        const state = useNotificationStore.getState();
        expect(state.notifications).toHaveLength(0);
        expect(state.activeFilter).toBe("all");
        expect(state.notificationCenterOpen).toBe(false);
      });
    });
  });
});
