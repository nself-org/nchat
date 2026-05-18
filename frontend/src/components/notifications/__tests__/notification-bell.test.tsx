/**
 * NotificationBell Component Tests
 *
 * Comprehensive tests for the notification bell component including:
 * - Rendering states
 * - Badge display
 * - Click interactions
 * - Animation states
 * - Accessibility
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { NotificationBell } from "../notification-bell";
import { useNotificationStore } from "@/stores/notification-store";

// ============================================================================
// Mocks
// ============================================================================

jest.mock("@/stores/notification-store", () => ({
  useNotificationStore: jest.fn(),
}));

const mockUseNotificationStore = useNotificationStore as unknown as jest.Mock;

// ============================================================================
// Test Helpers
// ============================================================================

const createMockStoreState = (overrides?: Record<string, unknown>) => ({
  unreadCounts: {
    total: 0,
    mentions: 0,
    directMessages: 0,
    threads: 0,
    byChannel: {},
  },
  hasNewNotifications: false,
  toggleNotificationCenter: jest.fn(),
  notificationCenterOpen: false,
  ...overrides,
});

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

describe("NotificationBell", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMockStore();
  });

  // ==========================================================================
  // Rendering Tests
  // ==========================================================================

  describe("rendering", () => {
    it("should render bell icon", () => {
      render(<NotificationBell />);

      const button = screen.getByRole("button", { name: /notifications/i });
      expect(button).toBeInTheDocument();
    });

    it("should render with ghost variant by default", () => {
      render(<NotificationBell />);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("hover:bg-accent");
    });

    it("should render with custom variant", () => {
      render(<NotificationBell variant="outline" />);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("border");
    });

    it("should apply custom className", () => {
      render(<NotificationBell className="custom-class" />);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("custom-class");
    });

    it("should render SVG bell icon", () => {
      render(<NotificationBell />);

      const svg = screen.getByRole("button").querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("should have correct icon size by default", () => {
      render(<NotificationBell />);

      const svg = screen.getByRole("button").querySelector("svg");
      expect(svg).toHaveAttribute("width", "20");
      expect(svg).toHaveAttribute("height", "20");
    });

    it("should use custom icon size", () => {
      render(<NotificationBell iconSize={24} />);

      const svg = screen.getByRole("button").querySelector("svg");
      expect(svg).toHaveAttribute("width", "24");
      expect(svg).toHaveAttribute("height", "24");
    });
  });

  // ==========================================================================
  // Badge Tests
  // ==========================================================================

  describe("badge", () => {
    it("should not show badge when unread count is 0", () => {
      setupMockStore({ unreadCounts: { total: 0 } });

      render(<NotificationBell />);

      const badge = screen.queryByText("0");
      expect(badge).not.toBeInTheDocument();
    });

    it("should show badge with unread count", () => {
      setupMockStore({ unreadCounts: { total: 5 } });

      render(<NotificationBell />);

      expect(screen.getByText("5")).toBeInTheDocument();
    });

    it('should show "99+" for counts over max', () => {
      setupMockStore({ unreadCounts: { total: 150 } });

      render(<NotificationBell maxBadgeCount={99} />);

      expect(screen.getByText("99+")).toBeInTheDocument();
    });

    it("should respect custom maxBadgeCount", () => {
      setupMockStore({ unreadCounts: { total: 50 } });

      render(<NotificationBell maxBadgeCount={40} />);

      expect(screen.getByText("40+")).toBeInTheDocument();
    });

    it("should hide badge when showBadge is false", () => {
      setupMockStore({ unreadCounts: { total: 5 } });

      render(<NotificationBell showBadge={false} />);

      expect(screen.queryByText("5")).not.toBeInTheDocument();
    });

    it("should show exact count when under max", () => {
      setupMockStore({ unreadCounts: { total: 42 } });

      render(<NotificationBell maxBadgeCount={99} />);

      expect(screen.getByText("42")).toBeInTheDocument();
    });

    it("should have badge styling", () => {
      setupMockStore({ unreadCounts: { total: 5 } });

      render(<NotificationBell />);

      const badge = screen.getByText("5");
      expect(badge).toHaveClass("bg-destructive");
      expect(badge).toHaveClass("rounded-full");
    });
  });

  // ==========================================================================
  // Click Interaction Tests
  // ==========================================================================

  describe("click interaction", () => {
    it("should call toggleNotificationCenter on click", () => {
      const state = setupMockStore();

      render(<NotificationBell />);

      fireEvent.click(screen.getByRole("button"));

      expect(state.toggleNotificationCenter).toHaveBeenCalled();
    });

    it("should call custom onClick handler", () => {
      setupMockStore();
      const onClick = jest.fn();

      render(<NotificationBell onClick={onClick} />);

      fireEvent.click(screen.getByRole("button"));

      expect(onClick).toHaveBeenCalled();
    });

    it("should call both toggleNotificationCenter and onClick", () => {
      const state = setupMockStore();
      const onClick = jest.fn();

      render(<NotificationBell onClick={onClick} />);

      fireEvent.click(screen.getByRole("button"));

      expect(state.toggleNotificationCenter).toHaveBeenCalled();
      expect(onClick).toHaveBeenCalled();
    });

    it("should pass click event to onClick handler", () => {
      setupMockStore();
      const onClick = jest.fn();

      render(<NotificationBell onClick={onClick} />);

      fireEvent.click(screen.getByRole("button"));

      expect(onClick).toHaveBeenCalledWith(expect.any(Object));
    });
  });

  // ==========================================================================
  // Animation Tests
  // ==========================================================================

  describe("animation", () => {
    it("should animate when hasNewNotifications and unread > 0", () => {
      setupMockStore({
        hasNewNotifications: true,
        unreadCounts: { total: 5 },
      });

      render(<NotificationBell />);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("animate-wiggle");
    });

    it("should not animate when hasNewNotifications but unread is 0", () => {
      setupMockStore({
        hasNewNotifications: true,
        unreadCounts: { total: 0 },
      });

      render(<NotificationBell />);

      const button = screen.getByRole("button");
      expect(button).not.toHaveClass("animate-wiggle");
    });

    it("should not animate when unread > 0 but hasNewNotifications is false", () => {
      setupMockStore({
        hasNewNotifications: false,
        unreadCounts: { total: 5 },
      });

      render(<NotificationBell />);

      const button = screen.getByRole("button");
      expect(button).not.toHaveClass("animate-wiggle");
    });

    it("should not animate when animateOnNew is false", () => {
      setupMockStore({
        hasNewNotifications: true,
        unreadCounts: { total: 5 },
      });

      render(<NotificationBell animateOnNew={false} />);

      const button = screen.getByRole("button");
      expect(button).not.toHaveClass("animate-wiggle");
    });

    it("should pulse badge when animating", () => {
      setupMockStore({
        hasNewNotifications: true,
        unreadCounts: { total: 5 },
      });

      render(<NotificationBell />);

      const badge = screen.getByText("5");
      expect(badge).toHaveClass("animate-pulse");
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe("accessibility", () => {
    it("should have accessible label", () => {
      setupMockStore();

      render(<NotificationBell />);

      const button = screen.getByRole("button", { name: /notifications/i });
      expect(button).toBeInTheDocument();
    });

    it("should include unread count in label", () => {
      setupMockStore({ unreadCounts: { total: 5 } });

      render(<NotificationBell />);

      const button = screen.getByRole("button", {
        name: /notifications.*5 unread/i,
      });
      expect(button).toBeInTheDocument();
    });

    it("should have aria-expanded attribute", () => {
      setupMockStore({ notificationCenterOpen: false });

      render(<NotificationBell />);

      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("aria-expanded", "false");
    });

    it("should update aria-expanded when panel is open", () => {
      setupMockStore({ notificationCenterOpen: true });

      render(<NotificationBell />);

      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("aria-expanded", "true");
    });

    it("should have aria-haspopup attribute", () => {
      setupMockStore();

      render(<NotificationBell />);

      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("aria-haspopup", "true");
    });

    it("should hide icon from screen readers", () => {
      setupMockStore();

      render(<NotificationBell />);

      const svg = screen.getByRole("button").querySelector("svg");
      expect(svg).toHaveAttribute("aria-hidden", "true");
    });

    it("should hide badge from screen readers", () => {
      setupMockStore({ unreadCounts: { total: 5 } });

      render(<NotificationBell />);

      const badge = screen.getByText("5");
      expect(badge).toHaveAttribute("aria-hidden", "true");
    });
  });

  // ==========================================================================
  // Props Forwarding Tests
  // ==========================================================================

  describe("props forwarding", () => {
    it("should forward additional button props", () => {
      setupMockStore();

      render(<NotificationBell data-testid="bell-button" />);

      expect(screen.getByTestId("bell-button")).toBeInTheDocument();
    });

    it("should forward disabled prop", () => {
      setupMockStore();

      render(<NotificationBell disabled />);

      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
    });

    it("should forward type prop", () => {
      setupMockStore();

      render(<NotificationBell type="submit" />);

      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("type", "submit");
    });
  });

  // ==========================================================================
  // Display Name Test
  // ==========================================================================

  describe("displayName", () => {
    it("should have displayName", () => {
      expect(NotificationBell.displayName).toBe("NotificationBell");
    });
  });
});
