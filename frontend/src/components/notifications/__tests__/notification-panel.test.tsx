/**
 * NotificationPanel Component Tests
 *
 * Comprehensive tests for the notification panel component including:
 * - Rendering states
 * - Filter functionality
 * - Mark all as read
 * - Notification interactions
 * - Empty states
 * - Accessibility
 */

import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { NotificationPanel } from "../notification-panel";
import {
  useNotificationStore,
  Notification,
  NotificationType,
} from "@/stores/notification-store";

// ============================================================================
// Mocks
// ============================================================================

jest.mock("@/stores/notification-store", () => ({
  useNotificationStore: jest.fn(),
}));

jest.mock("../notification-item", () => ({
  NotificationItem: ({
    notification,
    onClick,
    onArchive,
  }: {
    notification: Notification;
    onClick: () => void;
    onArchive: () => void;
  }) => (
    // Mirror real NotificationItem: onClick on the outer element so
    // fireEvent.click(getByTestId('notification-X')) triggers the handler correctly.
    <div data-testid={`notification-${notification.id}`} onClick={onClick}>
      <span>{notification.title}</span>
      <button
        type="button"
        data-testid={`archive-${notification.id}`}
        onClick={(e) => {
          e.stopPropagation();
          onArchive();
        }}
      >
        Archive
      </button>
    </div>
  ),
}));

const mockUseNotificationStore = useNotificationStore as unknown as jest.Mock;

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
  body: "Test body",
  isRead: false,
  isArchived: false,
  createdAt: new Date().toISOString(),
  ...overrides,
});

const createMockStoreState = (overrides?: Record<string, unknown>) => {
  const notifications = (overrides?.notifications as Notification[]) || [];
  const activeFilter = overrides?.activeFilter || "all";

  return {
    notifications,
    activeFilter,
    unreadCounts: {
      total: notifications.filter((n: Notification) => !n.isRead).length,
      ...overrides?.unreadCounts,
    },
    setActiveFilter: jest.fn(),
    markAllAsRead: jest.fn(),
    markAsRead: jest.fn(),
    archiveNotification: jest.fn(),
    getFilteredNotifications: jest.fn(() => {
      return notifications.filter((n: Notification) => {
        if (n.isArchived) return false;
        if (activeFilter === "all") return true;
        if (activeFilter === "mentions") return n.type === "mention";
        if (activeFilter === "threads") return n.type === "thread_reply";
        if (activeFilter === "reactions") return n.type === "reaction";
        if (activeFilter === "unread") return !n.isRead;
        return true;
      });
    }),
    ...overrides,
  };
};

const setupMockStore = (overrides?: Record<string, unknown>) => {
  const state = createMockStoreState(overrides);
  mockUseNotificationStore.mockImplementation(
    (selector: (state: unknown) => unknown) => {
      if (typeof selector === "function") {
        return selector(state);
      }
      return state;
    },
  );
  return state;
};

// ============================================================================
// Tests
// ============================================================================

describe("NotificationPanel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMockStore();
  });

  // ==========================================================================
  // Rendering Tests
  // ==========================================================================

  describe("rendering", () => {
    it("should render panel", () => {
      render(<NotificationPanel />);

      expect(
        screen.getByRole("dialog", { name: /notifications/i }),
      ).toBeInTheDocument();
    });

    it("should render header", () => {
      render(<NotificationPanel />);

      expect(screen.getByText("Notifications")).toBeInTheDocument();
    });

    it("should apply custom className", () => {
      render(<NotificationPanel className="custom-class" />);

      const panel = screen.getByRole("dialog");
      expect(panel).toHaveClass("custom-class");
    });

    it("should have displayName", () => {
      expect(NotificationPanel.displayName).toBe("NotificationPanel");
    });
  });

  // ==========================================================================
  // Filter Tests
  // ==========================================================================

  describe("filters", () => {
    it("should render filter tabs", () => {
      render(<NotificationPanel />);

      expect(screen.getByRole("tablist")).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /all/i })).toBeInTheDocument();
      expect(
        screen.getByRole("tab", { name: /mentions/i }),
      ).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /threads/i })).toBeInTheDocument();
      expect(
        screen.getByRole("tab", { name: /reactions/i }),
      ).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /unread/i })).toBeInTheDocument();
    });

    it("should hide filters when showFilters is false", () => {
      render(<NotificationPanel showFilters={false} />);

      expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    });

    it("should highlight active filter", () => {
      setupMockStore({ activeFilter: "mentions" });

      render(<NotificationPanel />);

      const mentionsTab = screen.getByRole("tab", { name: /mentions/i });
      expect(mentionsTab).toHaveAttribute("aria-selected", "true");
    });

    it("should call setActiveFilter when filter clicked", () => {
      const state = setupMockStore();

      render(<NotificationPanel />);

      fireEvent.click(screen.getByRole("tab", { name: /mentions/i }));

      expect(state.setActiveFilter).toHaveBeenCalledWith("mentions");
    });

    it("should show unread count in filter tab", () => {
      setupMockStore({
        notifications: [
          createTestNotification({ isRead: false }),
          createTestNotification({ isRead: false }),
        ],
        unreadCounts: { total: 2 },
      });

      render(<NotificationPanel />);

      expect(
        screen.getByRole("tab", { name: /unread.*\(2\)/i }),
      ).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Notifications List Tests
  // ==========================================================================

  describe("notifications list", () => {
    it("should render notifications", () => {
      const notifications = [
        createTestNotification({ id: "notif-1", title: "Notification 1" }),
        createTestNotification({ id: "notif-2", title: "Notification 2" }),
      ];
      setupMockStore({ notifications });

      render(<NotificationPanel />);

      expect(screen.getByTestId("notification-notif-1")).toBeInTheDocument();
      expect(screen.getByTestId("notification-notif-2")).toBeInTheDocument();
    });

    it("should have list role", () => {
      const notifications = [createTestNotification()];
      setupMockStore({ notifications });

      render(<NotificationPanel />);

      expect(
        screen.getByRole("list", { name: /notifications list/i }),
      ).toBeInTheDocument();
    });

    it("should handle notification click", () => {
      const onNotificationClick = jest.fn();
      const notification = createTestNotification({ id: "notif-1" });
      const state = setupMockStore({ notifications: [notification] });

      render(<NotificationPanel onNotificationClick={onNotificationClick} />);

      fireEvent.click(screen.getByTestId("notification-notif-1"));

      expect(state.markAsRead).toHaveBeenCalledWith("notif-1");
      expect(onNotificationClick).toHaveBeenCalledWith(notification);
    });

    it("should handle archive", () => {
      const notification = createTestNotification({ id: "notif-1" });
      const state = setupMockStore({ notifications: [notification] });

      render(<NotificationPanel />);

      fireEvent.click(screen.getByTestId("archive-notif-1"));

      expect(state.archiveNotification).toHaveBeenCalledWith("notif-1");
    });
  });

  // ==========================================================================
  // Mark All As Read Tests
  // ==========================================================================

  describe("mark all as read", () => {
    it("should show mark all as read button when unread > 0", () => {
      setupMockStore({
        notifications: [createTestNotification({ isRead: false })],
        unreadCounts: { total: 1 },
      });

      render(<NotificationPanel />);

      expect(
        screen.getByRole("button", { name: /mark all as read/i }),
      ).toBeInTheDocument();
    });

    it("should hide mark all as read button when unread is 0", () => {
      setupMockStore({
        notifications: [createTestNotification({ isRead: true })],
        unreadCounts: { total: 0 },
      });

      render(<NotificationPanel />);

      expect(
        screen.queryByRole("button", { name: /mark all as read/i }),
      ).not.toBeInTheDocument();
    });

    it("should hide mark all as read button when showMarkAllRead is false", () => {
      setupMockStore({
        notifications: [createTestNotification({ isRead: false })],
        unreadCounts: { total: 1 },
      });

      render(<NotificationPanel showMarkAllRead={false} />);

      expect(
        screen.queryByRole("button", { name: /mark all as read/i }),
      ).not.toBeInTheDocument();
    });

    it("should call markAllAsRead when clicked", () => {
      const state = setupMockStore({
        notifications: [createTestNotification({ isRead: false })],
        unreadCounts: { total: 1 },
      });

      render(<NotificationPanel />);

      fireEvent.click(
        screen.getByRole("button", { name: /mark all as read/i }),
      );

      expect(state.markAllAsRead).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Empty State Tests
  // ==========================================================================

  describe("empty state", () => {
    it("should show empty state when no notifications", () => {
      setupMockStore({ notifications: [] });

      render(<NotificationPanel />);

      expect(screen.getByText("No notifications")).toBeInTheDocument();
      expect(screen.getByText("You're all caught up!")).toBeInTheDocument();
    });

    it("should show mentions empty state", () => {
      setupMockStore({ notifications: [], activeFilter: "mentions" });

      render(<NotificationPanel />);

      expect(screen.getByText("No mentions")).toBeInTheDocument();
    });

    it("should show threads empty state", () => {
      setupMockStore({ notifications: [], activeFilter: "threads" });

      render(<NotificationPanel />);

      expect(screen.getByText("No thread replies")).toBeInTheDocument();
    });

    it("should show reactions empty state", () => {
      setupMockStore({ notifications: [], activeFilter: "reactions" });

      render(<NotificationPanel />);

      expect(screen.getByText("No reactions")).toBeInTheDocument();
    });

    it("should show unread empty state", () => {
      setupMockStore({ notifications: [], activeFilter: "unread" });

      render(<NotificationPanel />);

      expect(screen.getByText("No unread notifications")).toBeInTheDocument();
    });

    it("should hide empty state when showEmpty is false", () => {
      setupMockStore({ notifications: [] });

      render(<NotificationPanel showEmpty={false} />);

      expect(screen.queryByText("No notifications")).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Close Button Tests
  // ==========================================================================

  describe("close button", () => {
    it("should show close button when onClose provided", () => {
      setupMockStore();

      render(<NotificationPanel onClose={jest.fn()} />);

      expect(
        screen.getByRole("button", { name: /close/i }),
      ).toBeInTheDocument();
    });

    it("should hide close button when onClose not provided", () => {
      setupMockStore();

      render(<NotificationPanel />);

      expect(
        screen.queryByRole("button", { name: /close/i }),
      ).not.toBeInTheDocument();
    });

    it("should call onClose when clicked", () => {
      const onClose = jest.fn();
      setupMockStore();

      render(<NotificationPanel onClose={onClose} />);

      fireEvent.click(screen.getByRole("button", { name: /close/i }));

      expect(onClose).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Footer Tests
  // ==========================================================================

  describe("footer", () => {
    it("should show footer when has notifications", () => {
      setupMockStore({
        notifications: [createTestNotification()],
      });

      render(<NotificationPanel />);

      expect(
        screen.getByRole("button", { name: /view all notifications/i }),
      ).toBeInTheDocument();
    });

    it("should hide footer when no notifications", () => {
      setupMockStore({ notifications: [] });

      render(<NotificationPanel />);

      expect(
        screen.queryByRole("button", { name: /view all notifications/i }),
      ).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Max Height Tests
  // ==========================================================================

  describe("max height", () => {
    it("should apply default max height", () => {
      setupMockStore({
        notifications: [createTestNotification()],
      });

      const { container } = render(<NotificationPanel />);

      // ScrollArea should have max height style
      const scrollArea = container.querySelector('[style*="max-height"]');
      expect(scrollArea).toBeInTheDocument();
    });

    it("should apply custom max height", () => {
      setupMockStore({
        notifications: [createTestNotification()],
      });

      const { container } = render(<NotificationPanel maxHeight={500} />);

      const scrollArea = container.querySelector('[style*="500"]');
      expect(scrollArea).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe("accessibility", () => {
    it("should have dialog role", () => {
      render(<NotificationPanel />);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("should have aria-label", () => {
      render(<NotificationPanel />);

      expect(
        screen.getByRole("dialog", { name: /notifications/i }),
      ).toBeInTheDocument();
    });

    it("should have tablist with tabs", () => {
      render(<NotificationPanel />);

      const tablist = screen.getByRole("tablist");
      const tabs = within(tablist).getAllByRole("tab");
      expect(tabs).toHaveLength(5);
    });

    it("should mark active tab with aria-selected", () => {
      setupMockStore({ activeFilter: "all" });

      render(<NotificationPanel />);

      const allTab = screen.getByRole("tab", { name: /^all$/i });
      expect(allTab).toHaveAttribute("aria-selected", "true");

      const mentionsTab = screen.getByRole("tab", { name: /mentions/i });
      expect(mentionsTab).toHaveAttribute("aria-selected", "false");
    });
  });
});
