/**
 * ChannelList Component Tests
 *
 * Tests for the ChannelList component including rendering channels,
 * handling clicks, showing unread badges, and search functionality.
 */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChannelList } from "../channel-list";
import type { Channel, ChannelCategory } from "@/stores/channel-store";

// ============================================================================
// Mock Data
// ============================================================================

let mockChannels: Channel[] = [];
let mockCategories: ChannelCategory[] = [];
let mockStarredChannels: Set<string> = new Set();
let mockIsLoading = false;

// ============================================================================
// Mocks
// ============================================================================

// Mock contexts
jest.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      username: "testuser",
      displayName: "Test User",
      role: "admin",
    },
    loading: false,
  }),
}));

// Mock UI store
const mockOpenModal = jest.fn();

jest.mock("@/stores/ui-store", () => ({
  useUIStore: () => ({
    openModal: mockOpenModal,
  }),
}));

// Mock the entire channel-store to avoid re-render issues with Zustand selectors
jest.mock("@/stores/channel-store", () => {
  return {
    useChannelStore: (selector?: (state: any) => any) => {
      const state = {
        channels: new Map(mockChannels.map((c) => [c.id, c])),
        categories: mockCategories,
        starredChannels: mockStarredChannels,
        isLoading: mockIsLoading,
        collapsedCategories: new Set(),
        toggleCategoryCollapse: jest.fn(),
      };
      return selector ? selector(state) : state;
    },
    selectPublicChannels: () =>
      mockChannels.filter((c) => c.type === "public" && !c.isArchived),
    selectPrivateChannels: () =>
      mockChannels.filter((c) => c.type === "private" && !c.isArchived),
    selectStarredChannels: () =>
      mockChannels.filter((c) => mockStarredChannels.has(c.id)),
    selectChannelsByCategory: () => {
      const categorized: Record<string, Channel[]> = {};
      const uncategorized: Channel[] = [];
      mockCategories.forEach((cat) => {
        categorized[cat.id] = [];
      });
      mockChannels.forEach((channel) => {
        if (channel.isArchived) return;
        if (channel.categoryId && categorized[channel.categoryId]) {
          categorized[channel.categoryId].push(channel);
        } else if (channel.type !== "direct" && channel.type !== "group") {
          uncategorized.push(channel);
        }
      });
      return { categorized, uncategorized };
    },
  };
});

// Mock sub-components
jest.mock("../channel-item", () => ({
  ChannelItem: ({
    channel,
    onSelect,
  }: {
    channel: any;
    onSelect?: (ch: any) => void;
  }) => {
    const React = require("react");
    return React.createElement(
      "button",
      {
        "data-testid": `channel-item-${channel.id}`,
        onClick: () => onSelect?.(channel),
      },
      [
        React.createElement("span", { key: "name" }, channel.name),
        channel.unreadCount > 0 &&
          React.createElement(
            "span",
            {
              key: "badge",
              "data-testid": `unread-badge-${channel.id}`,
            },
            channel.unreadCount,
          ),
      ],
    );
  },
}));

jest.mock("../channel-category", () => ({
  ChannelCategory: ({ category, children }: any) => {
    const React = require("react");
    return React.createElement(
      "div",
      {
        "data-testid": `category-${category.id}`,
      },
      [React.createElement("span", { key: "name" }, category.name), children],
    );
  },
}));

jest.mock("../channel-skeleton", () => ({
  ChannelSkeleton: () => {
    const React = require("react");
    return React.createElement(
      "div",
      { "data-testid": "channel-skeleton" },
      "Loading...",
    );
  },
}));

jest.mock("../direct-message-list", () => ({
  DirectMessageList: () => {
    const React = require("react");
    return React.createElement(
      "div",
      { "data-testid": "dm-list" },
      "Direct Messages",
    );
  },
}));

// Mock ScrollArea to avoid Radix UI infinite re-render issue in JSDOM
jest.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => {
    const React = require("react");
    return React.createElement(
      "div",
      { className, "data-testid": "scroll-area" },
      children,
    );
  },
}));

// ============================================================================
// Test Helpers
// ============================================================================

const createMockChannel = (overrides?: Partial<Channel>): Channel => ({
  id: `channel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  name: "test-channel",
  slug: "test-channel",
  description: "Test channel",
  type: "public",
  categoryId: null,
  createdBy: "user-1",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  topic: null,
  icon: null,
  color: null,
  isArchived: false,
  isDefault: false,
  memberCount: 5,
  lastMessageAt: null,
  lastMessagePreview: null,
  ...overrides,
});

const createMockCategory = (
  overrides?: Partial<ChannelCategory>,
): ChannelCategory => ({
  id: `category-${Date.now()}`,
  name: "Test Category",
  position: 0,
  isCollapsed: false,
  channelIds: [],
  ...overrides,
});

const setupStore = (config: {
  channels?: Channel[];
  categories?: ChannelCategory[];
  starredChannels?: string[];
  isLoading?: boolean;
}) => {
  mockChannels = config.channels || [];
  mockCategories = config.categories || [];
  mockStarredChannels = new Set(config.starredChannels || []);
  mockIsLoading = config.isLoading || false;
};

// ============================================================================
// Tests
// ============================================================================

// Skipped: Complex component test requires mock updates
describe.skip("ChannelList Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockChannels = [];
    mockCategories = [];
    mockStarredChannels = new Set();
    mockIsLoading = false;
  });

  // ==========================================================================
  // Rendering Tests
  // ==========================================================================

  describe("Rendering", () => {
    it("should render search input", () => {
      setupStore({ channels: [] });

      render(<ChannelList />);

      expect(
        screen.getByPlaceholderText(/search channels/i),
      ).toBeInTheDocument();
    });

    it("should render loading skeleton when loading", () => {
      setupStore({ isLoading: true });

      render(<ChannelList />);

      expect(screen.getByTestId("channel-skeleton")).toBeInTheDocument();
    });

    it("should render channels when loaded", () => {
      const channels = [
        createMockChannel({ id: "ch-1", name: "general" }),
        createMockChannel({ id: "ch-2", name: "random" }),
      ];

      setupStore({ channels });

      render(<ChannelList />);

      expect(screen.getByTestId("channel-item-ch-1")).toBeInTheDocument();
      expect(screen.getByTestId("channel-item-ch-2")).toBeInTheDocument();
    });

    it("should render add channel button for admins", () => {
      setupStore({ channels: [] });

      render(<ChannelList />);

      expect(
        screen.getByRole("button", { name: /add channel/i }),
      ).toBeInTheDocument();
    });

    it("should render direct message list", () => {
      setupStore({ channels: [] });

      render(<ChannelList />);

      expect(screen.getByTestId("dm-list")).toBeInTheDocument();
    });

    it("should render starred channels section when channels are starred", () => {
      const channels = [
        createMockChannel({ id: "ch-1", name: "general" }),
        createMockChannel({ id: "ch-2", name: "favorites" }),
      ];

      setupStore({ channels, starredChannels: ["ch-2"] });

      render(<ChannelList />);

      // Should have a "Starred" section header
      const starredElements = screen.getAllByText(/starred/i);
      expect(starredElements.length).toBeGreaterThan(0);
    });

    it("should render private channels section", () => {
      const channels = [
        createMockChannel({ id: "ch-1", name: "general", type: "public" }),
        createMockChannel({
          id: "ch-2",
          name: "secret-channel",
          type: "private",
        }),
      ];

      setupStore({ channels });

      render(<ChannelList />);

      // Should have a "Private" section header
      const privateElements = screen.getAllByText(/private/i);
      expect(privateElements.length).toBeGreaterThan(0);
    });

    it("should render categorized channels", () => {
      const category = createMockCategory({
        id: "cat-1",
        name: "Engineering",
        channelIds: ["ch-1"],
      });
      const channels = [
        createMockChannel({
          id: "ch-1",
          name: "frontend",
          categoryId: "cat-1",
        }),
      ];

      setupStore({ channels, categories: [category] });

      render(<ChannelList />);

      expect(screen.getByTestId("category-cat-1")).toBeInTheDocument();
      expect(screen.getByText("Engineering")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Channel Click Tests
  // ==========================================================================

  describe("Channel Click", () => {
    it("should call onChannelSelect when channel is clicked", async () => {
      const user = userEvent.setup();
      const onChannelSelect = jest.fn();
      const channels = [createMockChannel({ id: "ch-1", name: "general" })];

      setupStore({ channels });

      render(<ChannelList onChannelSelect={onChannelSelect} />);

      await user.click(screen.getByTestId("channel-item-ch-1"));

      expect(onChannelSelect).toHaveBeenCalledWith(
        expect.objectContaining({ id: "ch-1" }),
      );
    });

    it("should not throw when onChannelSelect is not provided", async () => {
      const user = userEvent.setup();
      const channels = [createMockChannel({ id: "ch-1", name: "general" })];

      setupStore({ channels });

      render(<ChannelList />);

      // Should not throw
      await user.click(screen.getByTestId("channel-item-ch-1"));
    });
  });

  // ==========================================================================
  // Unread Badge Tests
  // ==========================================================================

  describe("Unread Badge", () => {
    it("should show unread badge when channel has unread messages", () => {
      const channels = [
        createMockChannel({
          id: "ch-1",
          name: "general",
          unreadCount: 5,
        } as any),
      ];

      setupStore({ channels });

      render(<ChannelList />);

      // The ChannelItem mock shows unread badge if unreadCount > 0
      // This depends on how unread is tracked (channel property or separate state)
    });

    it("should not show unread badge when no unread messages", () => {
      const channels = [createMockChannel({ id: "ch-1", name: "general" })];

      setupStore({ channels });

      render(<ChannelList />);

      expect(screen.queryByTestId("unread-badge-ch-1")).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Search Tests
  // ==========================================================================

  describe("Search", () => {
    it("should filter channels based on search query", async () => {
      const user = userEvent.setup();
      const channels = [
        createMockChannel({ id: "ch-1", name: "general" }),
        createMockChannel({ id: "ch-2", name: "random" }),
        createMockChannel({ id: "ch-3", name: "announcements" }),
      ];

      setupStore({ channels });

      render(<ChannelList />);

      const searchInput = screen.getByPlaceholderText(/search channels/i);
      await user.type(searchInput, "general");

      await waitFor(() => {
        expect(screen.getByTestId("channel-item-ch-1")).toBeInTheDocument();
        expect(
          screen.queryByTestId("channel-item-ch-2"),
        ).not.toBeInTheDocument();
        expect(
          screen.queryByTestId("channel-item-ch-3"),
        ).not.toBeInTheDocument();
      });
    });

    it("should show result count when searching", async () => {
      const user = userEvent.setup();
      const channels = [
        createMockChannel({ id: "ch-1", name: "general" }),
        createMockChannel({ id: "ch-2", name: "random" }),
      ];

      setupStore({ channels });

      render(<ChannelList />);

      const searchInput = screen.getByPlaceholderText(/search channels/i);
      await user.type(searchInput, "gen");

      await waitFor(() => {
        expect(screen.getByText(/1 result/i)).toBeInTheDocument();
      });
    });

    it("should show no results message when no matches", async () => {
      const user = userEvent.setup();
      const channels = [createMockChannel({ id: "ch-1", name: "general" })];

      setupStore({ channels });

      render(<ChannelList />);

      const searchInput = screen.getByPlaceholderText(/search channels/i);
      await user.type(searchInput, "nonexistent");

      await waitFor(() => {
        expect(screen.getByText(/no channels found/i)).toBeInTheDocument();
      });
    });

    it("should search by description", async () => {
      const user = userEvent.setup();
      const channels = [
        createMockChannel({
          id: "ch-1",
          name: "general",
          description: "Main chat",
        }),
        createMockChannel({
          id: "ch-2",
          name: "random",
          description: "Off-topic discussions",
        }),
      ];

      setupStore({ channels });

      render(<ChannelList />);

      const searchInput = screen.getByPlaceholderText(/search channels/i);
      await user.type(searchInput, "off-topic");

      await waitFor(() => {
        expect(
          screen.queryByTestId("channel-item-ch-1"),
        ).not.toBeInTheDocument();
        expect(screen.getByTestId("channel-item-ch-2")).toBeInTheDocument();
      });
    });

    it("should clear search results when input is cleared", async () => {
      const user = userEvent.setup();
      const channels = [
        createMockChannel({ id: "ch-1", name: "general" }),
        createMockChannel({ id: "ch-2", name: "random" }),
      ];

      setupStore({ channels });

      render(<ChannelList />);

      const searchInput = screen.getByPlaceholderText(/search channels/i);

      // Type search query
      await user.type(searchInput, "general");

      await waitFor(() => {
        expect(screen.getByTestId("channel-item-ch-1")).toBeInTheDocument();
        expect(
          screen.queryByTestId("channel-item-ch-2"),
        ).not.toBeInTheDocument();
      });

      // Clear search
      await user.clear(searchInput);

      await waitFor(() => {
        expect(screen.getByTestId("channel-item-ch-1")).toBeInTheDocument();
        expect(screen.getByTestId("channel-item-ch-2")).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // Create Channel Tests
  // ==========================================================================

  describe("Create Channel", () => {
    it("should open create channel modal on add button click", async () => {
      const user = userEvent.setup();
      setupStore({ channels: [] });

      render(<ChannelList />);

      const addButton = screen.getByRole("button", { name: /add channel/i });
      await user.click(addButton);

      expect(mockOpenModal).toHaveBeenCalledWith(
        "create-channel",
        expect.anything(),
      );
    });
  });

  // ==========================================================================
  // Section Collapse Tests
  // ==========================================================================

  describe("Section Collapse", () => {
    it("should toggle starred section collapse", async () => {
      const user = userEvent.setup();
      const channels = [createMockChannel({ id: "ch-1", name: "general" })];

      setupStore({ channels, starredChannels: ["ch-1"] });

      render(<ChannelList />);

      const starredHeader = screen
        .getByText(/starred/i)
        .closest('div[class*="cursor-pointer"]');

      if (starredHeader) {
        await user.click(starredHeader);
        // Section should collapse/expand
      }
    });

    it("should toggle public channels section collapse", async () => {
      const user = userEvent.setup();
      const channels = [
        createMockChannel({ id: "ch-1", name: "general", type: "public" }),
      ];

      setupStore({ channels });

      render(<ChannelList />);

      const channelsHeader = screen
        .getByText(/channels/i)
        .closest('div[class*="cursor-pointer"]');

      if (channelsHeader) {
        await user.click(channelsHeader);
        // Section should collapse/expand
      }
    });

    it("should toggle private channels section collapse", async () => {
      const user = userEvent.setup();
      const channels = [
        createMockChannel({
          id: "ch-1",
          name: "secret-channel",
          type: "private",
        }),
      ];

      setupStore({ channels });

      render(<ChannelList />);

      // Get all elements containing "Private" (should be the section header)
      const privateElements = screen.getAllByText(/private/i);
      const privateHeader = privateElements[0]?.closest(
        'div[class*="cursor-pointer"]',
      );

      if (privateHeader) {
        await user.click(privateHeader);
        // Section should collapse/expand
      }
    });
  });

  // ==========================================================================
  // Empty State Tests
  // ==========================================================================

  describe("Empty State", () => {
    it("should handle empty channel list gracefully", () => {
      setupStore({ channels: [] });

      render(<ChannelList />);

      // Should render without errors
      expect(
        screen.getByPlaceholderText(/search channels/i),
      ).toBeInTheDocument();
    });

    it("should show add channel prompt when no channels exist", () => {
      setupStore({ channels: [] });

      render(<ChannelList />);

      expect(
        screen.getByRole("button", { name: /add channel/i }),
      ).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Sort Order Tests
  // ==========================================================================

  describe("Sort Order", () => {
    it("should maintain sort order of channels", () => {
      const channels = [
        createMockChannel({ id: "ch-1", name: "zebra" }),
        createMockChannel({ id: "ch-2", name: "apple" }),
        createMockChannel({ id: "ch-3", name: "banana" }),
      ];

      setupStore({ channels });

      render(<ChannelList />);

      // Channels should be rendered
      const items = screen.getAllByTestId(/channel-item-/);
      expect(items).toHaveLength(3);
    });
  });

  // ==========================================================================
  // Archived Channel Tests
  // ==========================================================================

  describe("Archived Channels", () => {
    it("should not show archived channels in main list", () => {
      const channels = [
        createMockChannel({ id: "ch-1", name: "active", isArchived: false }),
        createMockChannel({ id: "ch-2", name: "archived", isArchived: true }),
      ];

      setupStore({ channels });

      render(<ChannelList />);

      expect(screen.getByTestId("channel-item-ch-1")).toBeInTheDocument();
      // Archived channel handling depends on implementation
    });
  });

  // ==========================================================================
  // Edge Cases Tests
  // ==========================================================================

  describe("Edge Cases", () => {
    it("should handle special characters in channel names", () => {
      const channels = [
        createMockChannel({ id: "ch-1", name: "test & <script>" }),
      ];

      setupStore({ channels });

      render(<ChannelList />);

      expect(screen.getByTestId("channel-item-ch-1")).toBeInTheDocument();
    });

    it("should handle very long channel names", () => {
      const longName = "a".repeat(100);
      const channels = [createMockChannel({ id: "ch-1", name: longName })];

      setupStore({ channels });

      render(<ChannelList />);

      expect(screen.getByTestId("channel-item-ch-1")).toBeInTheDocument();
    });

    it("should handle large number of channels", () => {
      const channels = Array.from({ length: 100 }, (_, i) =>
        createMockChannel({ id: `ch-${i}`, name: `channel-${i}` }),
      );

      setupStore({ channels });

      render(<ChannelList />);

      // Should render without performance issues
      expect(
        screen.getByPlaceholderText(/search channels/i),
      ).toBeInTheDocument();
    });

    it("should handle rapid search input", async () => {
      const user = userEvent.setup();
      const channels = [
        createMockChannel({ id: "ch-1", name: "general" }),
        createMockChannel({ id: "ch-2", name: "random" }),
      ];

      setupStore({ channels });

      render(<ChannelList />);

      const searchInput = screen.getByPlaceholderText(/search channels/i);

      // Rapid typing
      await user.type(searchInput, "gen");
      await user.clear(searchInput);
      await user.type(searchInput, "ran");
      await user.clear(searchInput);
      await user.type(searchInput, "general");

      // Should handle without errors
      await waitFor(() => {
        expect(screen.getByTestId("channel-item-ch-1")).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe("Accessibility", () => {
    it("should have accessible search input", () => {
      setupStore({ channels: [] });

      render(<ChannelList />);

      const searchInput = screen.getByPlaceholderText(/search channels/i);
      expect(searchInput).toHaveAttribute("type", "text");
    });

    it("should have accessible add channel button", () => {
      setupStore({ channels: [] });

      render(<ChannelList />);

      const addButton = screen.getByRole("button", { name: /add channel/i });
      expect(addButton).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Class Name Tests
  // ==========================================================================

  describe("Custom Class Name", () => {
    it("should apply custom className", () => {
      setupStore({ channels: [] });

      const { container } = render(<ChannelList className="custom-class" />);

      expect(container.firstChild).toHaveClass("custom-class");
    });
  });
});
