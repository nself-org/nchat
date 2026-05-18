/**
 * Tests for notification-store selectors
 *
 * All selectors are pure functions that receive the store state.
 * Tests construct minimal plain-object state and call selectors directly.
 */

import type {
  NotificationStore,
  NotificationState,
  NotificationPreferences,
  UnreadCounts,
} from "../notification-store";
import {
  selectUnreadTotal,
  selectUnreadMentions,
  selectChannelUnread,
  selectIsChannelMuted,
  selectNotificationPreferences,
  selectHasUnread,
} from "../notification-store";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const defaultPreferences: NotificationPreferences = {
  desktopEnabled: true,
  soundEnabled: true,
  emailEnabled: false,
  soundVolume: 50,
  emailDigestFrequency: "never",
  dndSchedule: {
    enabled: false,
    startTime: "22:00",
    endTime: "08:00",
    days: [0, 1, 2, 3, 4, 5, 6],
  },
  mentionsEnabled: true,
  directMessagesEnabled: true,
  threadRepliesEnabled: true,
  reactionsEnabled: true,
  showPreview: true,
  playSound: true,
  channelSettings: {},
};

const defaultUnreadCounts: UnreadCounts = {
  total: 0,
  mentions: 0,
  directMessages: 0,
  threads: 0,
  byChannel: {},
};

function makeState(overrides?: Partial<Record<string, unknown>>): NotificationStore {
  const defaultState: NotificationState = {
    notifications: [],
    isLoading: false,
    error: null,
    activeFilter: "all",
    unreadCounts: defaultUnreadCounts,
    preferences: defaultPreferences,
    notificationCenterOpen: false,
    hasNewNotifications: false,
    lastSeenAt: null,
    desktopPermission: "default",
  };
  const stubs = {
    addNotification: () => undefined,
    addNotifications: () => undefined,
    removeNotification: () => undefined,
    clearAllNotifications: () => undefined,
    markAsRead: () => undefined,
    markAllAsRead: () => undefined,
    markChannelAsRead: () => undefined,
    archiveNotification: () => undefined,
    archiveAllRead: () => undefined,
    setActiveFilter: () => undefined,
    setUnreadCounts: () => undefined,
    incrementUnreadCount: () => undefined,
    decrementUnreadCount: () => undefined,
    resetChannelUnread: () => undefined,
    updatePreferences: () => undefined,
    setChannelNotificationLevel: () => undefined,
    muteChannel: () => undefined,
    unmuteChannel: () => undefined,
    setNotificationCenterOpen: () => undefined,
    toggleNotificationCenter: () => undefined,
    setHasNewNotifications: () => undefined,
    updateLastSeenAt: () => undefined,
    setDesktopPermission: () => undefined,
    setLoading: () => undefined,
    setError: () => undefined,
    getFilteredNotifications: () => [],
    getUnreadNotifications: () => [],
    reset: () => undefined,
  };
  return { ...defaultState, ...stubs, ...overrides } as unknown as NotificationStore;
}

// ---------------------------------------------------------------------------
// selectUnreadTotal
// ---------------------------------------------------------------------------

describe("selectUnreadTotal", () => {
  it("returns 0 by default", () => {
    expect(selectUnreadTotal(makeState())).toBe(0);
  });

  it("returns the total unread count", () => {
    const unreadCounts = { ...defaultUnreadCounts, total: 42 };
    expect(selectUnreadTotal(makeState({ unreadCounts }))).toBe(42);
  });
});

// ---------------------------------------------------------------------------
// selectUnreadMentions
// ---------------------------------------------------------------------------

describe("selectUnreadMentions", () => {
  it("returns 0 by default", () => {
    expect(selectUnreadMentions(makeState())).toBe(0);
  });

  it("returns the mentions count", () => {
    const unreadCounts = { ...defaultUnreadCounts, mentions: 7 };
    expect(selectUnreadMentions(makeState({ unreadCounts }))).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// selectChannelUnread (curried)
// ---------------------------------------------------------------------------

describe("selectChannelUnread", () => {
  it("returns default zero counts for unknown channel", () => {
    const result = selectChannelUnread("ch_missing")(makeState());
    expect(result.unread).toBe(0);
    expect(result.mentions).toBe(0);
  });

  it("returns the channel-specific unread counts", () => {
    const unreadCounts = {
      ...defaultUnreadCounts,
      byChannel: { ch1: { unread: 5, mentions: 2 } },
    };
    const result = selectChannelUnread("ch1")(makeState({ unreadCounts }));
    expect(result.unread).toBe(5);
    expect(result.mentions).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// selectIsChannelMuted (curried)
// ---------------------------------------------------------------------------

describe("selectIsChannelMuted", () => {
  it("returns false when no channel settings", () => {
    expect(selectIsChannelMuted("ch1")(makeState())).toBe(false);
  });

  it("returns true when channel level is nothing", () => {
    const preferences = {
      ...defaultPreferences,
      channelSettings: {
        ch1: { level: "nothing", muteUntil: null },
      },
    };
    expect(selectIsChannelMuted("ch1")(makeState({ preferences }))).toBe(true);
  });

  it("returns true when channel muteUntil is in the future", () => {
    const future = new Date(Date.now() + 3_600_000).toISOString();
    const preferences = {
      ...defaultPreferences,
      channelSettings: {
        ch1: { level: "all", muteUntil: future },
      },
    };
    expect(selectIsChannelMuted("ch1")(makeState({ preferences }))).toBe(true);
  });

  it("returns false when muteUntil is in the past", () => {
    const past = new Date(Date.now() - 3_600_000).toISOString();
    const preferences = {
      ...defaultPreferences,
      channelSettings: {
        ch1: { level: "all", muteUntil: past },
      },
    };
    expect(selectIsChannelMuted("ch1")(makeState({ preferences }))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// selectNotificationPreferences
// ---------------------------------------------------------------------------

describe("selectNotificationPreferences", () => {
  it("returns the default preferences object", () => {
    const result = selectNotificationPreferences(makeState());
    expect(result).toBe(defaultPreferences);
  });

  it("returns updated preferences when overridden", () => {
    const preferences = { ...defaultPreferences, desktopEnabled: false };
    expect(
      selectNotificationPreferences(makeState({ preferences })),
    ).toBe(preferences);
  });
});

// ---------------------------------------------------------------------------
// selectHasUnread
// ---------------------------------------------------------------------------

describe("selectHasUnread", () => {
  it("returns false when total is 0", () => {
    expect(selectHasUnread(makeState())).toBe(false);
  });

  it("returns true when total > 0", () => {
    const unreadCounts = { ...defaultUnreadCounts, total: 1 };
    expect(selectHasUnread(makeState({ unreadCounts }))).toBe(true);
  });
});
