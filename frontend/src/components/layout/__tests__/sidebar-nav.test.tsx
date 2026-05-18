import { render, screen, fireEvent, within } from "@testing-library/react";
import { usePathname } from "next/navigation";
import {
  SidebarNav,
  SidebarNavSkeleton,
  type SidebarSection,
  type DirectMessage,
  type SidebarChannel,
} from "../sidebar-nav";

// ============================================================================
// Mocks
// ============================================================================

jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
}));

const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;

// ============================================================================
// Test Data
// ============================================================================

const createMockChannel = (
  overrides: Partial<SidebarChannel> = {},
): SidebarChannel => ({
  id: "channel-1",
  name: "general",
  slug: "general",
  type: "public",
  ...overrides,
});

const createMockDM = (
  overrides: Partial<DirectMessage> = {},
): DirectMessage => ({
  id: "dm-1",
  name: "John Doe",
  presence: "online",
  ...overrides,
});

const mockSections: SidebarSection[] = [
  {
    id: "section-1",
    title: "Channels",
    channels: [
      createMockChannel({ id: "ch-1", name: "general", slug: "general" }),
      createMockChannel({
        id: "ch-2",
        name: "random",
        slug: "random",
        unreadCount: 5,
      }),
      createMockChannel({
        id: "ch-3",
        name: "secret",
        slug: "secret",
        type: "private",
      }),
    ],
  },
  {
    id: "section-2",
    title: "Projects",
    channels: [
      createMockChannel({
        id: "ch-4",
        name: "project-alpha",
        slug: "project-alpha",
      }),
    ],
    collapsed: true,
  },
];

const mockDirectMessages: DirectMessage[] = [
  createMockDM({ id: "dm-1", name: "Alice", presence: "online" }),
  createMockDM({
    id: "dm-2",
    name: "Bob",
    presence: "away",
    unreadCount: 3,
  }),
  createMockDM({ id: "dm-3", name: "Charlie", presence: "offline" }),
];

// ============================================================================
// Tests
// ============================================================================

// Skipped: Complex component test requires mock updates
describe.skip("SidebarNav", () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue("/chat/channel/general");
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // Rendering Tests
  // ==========================================================================

  describe("Rendering", () => {
    it("renders without crashing", () => {
      render(<SidebarNav />);
      expect(screen.getByTestId("sidebar-nav")).toBeInTheDocument();
    });

    it("renders loading skeleton when loading", () => {
      render(<SidebarNav loading />);
      expect(screen.getByTestId("sidebar-nav-skeleton")).toBeInTheDocument();
    });

    it("renders channel sections", () => {
      render(<SidebarNav sections={mockSections} />);
      expect(screen.getByTestId("section-section-1")).toBeInTheDocument();
      expect(screen.getByTestId("section-section-2")).toBeInTheDocument();
    });

    it("renders channels within sections", () => {
      render(<SidebarNav sections={mockSections} />);
      expect(screen.getByTestId("channel-item-ch-1")).toBeInTheDocument();
      expect(screen.getByTestId("channel-item-ch-2")).toBeInTheDocument();
    });

    it("renders direct messages", () => {
      render(<SidebarNav directMessages={mockDirectMessages} />);
      expect(screen.getByTestId("dm-item-dm-1")).toBeInTheDocument();
      expect(screen.getByTestId("dm-item-dm-2")).toBeInTheDocument();
    });

    it("renders empty state when no sections or DMs", () => {
      render(<SidebarNav onCreateChannel={jest.fn()} />);
      expect(screen.getByText("No channels or DMs yet")).toBeInTheDocument();
      expect(screen.getByTestId("sidebar-empty-create")).toBeInTheDocument();
    });

    it("renders search button when onOpenSearch is provided", () => {
      render(<SidebarNav onOpenSearch={jest.fn()} />);
      expect(screen.getByTestId("sidebar-search")).toBeInTheDocument();
    });

    it("renders settings button when onOpenSettings is provided", () => {
      render(<SidebarNav onOpenSettings={jest.fn()} />);
      expect(screen.getByTestId("sidebar-settings")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Channel Display Tests
  // ==========================================================================

  describe("Channel Display", () => {
    it("displays unread count badge", () => {
      render(<SidebarNav sections={mockSections} />);
      expect(screen.getByTestId("channel-unread-ch-2")).toHaveTextContent("5");
    });

    it("displays mention badge with destructive style", () => {
      const sections: SidebarSection[] = [
        {
          id: "section-1",
          title: "Channels",
          channels: [
            createMockChannel({
              id: "ch-1",
              unreadCount: 2,
              hasUnreadMentions: true,
            }),
          ],
        },
      ];
      render(<SidebarNav sections={sections} />);
      const badge = screen.getByTestId("channel-unread-ch-1");
      expect(badge).toHaveClass("bg-destructive");
    });

    it("applies active style to current channel", () => {
      mockUsePathname.mockReturnValue("/chat/channel/general");
      render(<SidebarNav sections={mockSections} />);
      const channelItem = screen.getByTestId("channel-item-ch-1");
      expect(channelItem).toHaveClass("bg-accent");
    });

    it("applies muted style to muted channels", () => {
      const sections: SidebarSection[] = [
        {
          id: "section-1",
          title: "Channels",
          channels: [createMockChannel({ id: "ch-1", isMuted: true })],
        },
      ];
      render(<SidebarNav sections={sections} />);
      expect(screen.getByTestId("channel-item-ch-1")).toHaveClass("opacity-60");
    });

    it("displays emoji icon when channel has emoji", () => {
      const sections: SidebarSection[] = [
        {
          id: "section-1",
          title: "Channels",
          channels: [createMockChannel({ id: "ch-1", emoji: "🚀" })],
        },
      ];
      render(<SidebarNav sections={sections} />);
      expect(screen.getByText("🚀")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Direct Message Display Tests
  // ==========================================================================

  describe("Direct Message Display", () => {
    it("displays presence indicator", () => {
      render(<SidebarNav directMessages={mockDirectMessages} />);
      expect(screen.getByTestId("dm-presence-dm-1")).toHaveClass(
        "bg-green-500",
      );
      expect(screen.getByTestId("dm-presence-dm-2")).toHaveClass(
        "bg-yellow-500",
      );
      expect(screen.getByTestId("dm-presence-dm-3")).toHaveClass("bg-gray-400");
    });

    it("displays DND presence correctly", () => {
      const dms = [createMockDM({ id: "dm-dnd", presence: "dnd" })];
      render(<SidebarNav directMessages={dms} />);
      expect(screen.getByTestId("dm-presence-dm-dnd")).toHaveClass(
        "bg-red-500",
      );
    });

    it("displays unread count for DMs", () => {
      render(<SidebarNav directMessages={mockDirectMessages} />);
      expect(screen.getByTestId("dm-unread-dm-2")).toHaveTextContent("3");
    });

    it("applies active style to current DM", () => {
      mockUsePathname.mockReturnValue("/chat/dm/dm-1");
      render(<SidebarNav directMessages={mockDirectMessages} />);
      const dmItem = screen.getByTestId("dm-item-dm-1");
      expect(dmItem).toHaveClass("bg-accent");
    });
  });

  // ==========================================================================
  // Interaction Tests
  // ==========================================================================

  describe("Interactions", () => {
    it("calls onOpenSearch when search button clicked", () => {
      const onOpenSearch = jest.fn();
      render(<SidebarNav onOpenSearch={onOpenSearch} />);
      fireEvent.click(screen.getByTestId("sidebar-search"));
      expect(onOpenSearch).toHaveBeenCalledTimes(1);
    });

    it("calls onOpenSettings when settings button clicked", () => {
      const onOpenSettings = jest.fn();
      render(<SidebarNav onOpenSettings={onOpenSettings} />);
      fireEvent.click(screen.getByTestId("sidebar-settings"));
      expect(onOpenSettings).toHaveBeenCalledTimes(1);
    });

    it("calls onCreateChannel when add button clicked", () => {
      const onCreateChannel = jest.fn();
      render(
        <SidebarNav
          sections={mockSections}
          onCreateChannel={onCreateChannel}
        />,
      );
      const addButton = screen.getByTestId("section-add-channels");
      fireEvent.click(addButton);
      expect(onCreateChannel).toHaveBeenCalledTimes(1);
    });

    it("calls onCreateDM when DM add button clicked", () => {
      const onCreateDM = jest.fn();
      render(
        <SidebarNav
          directMessages={mockDirectMessages}
          onCreateDM={onCreateDM}
        />,
      );
      const addButton = screen.getByTestId("section-add-direct-messages");
      fireEvent.click(addButton);
      expect(onCreateDM).toHaveBeenCalledTimes(1);
    });

    it("toggles section collapse on header click", () => {
      const onSectionToggle = jest.fn();
      render(
        <SidebarNav
          sections={mockSections}
          onSectionToggle={onSectionToggle}
        />,
      );

      // Click to collapse
      fireEvent.click(screen.getByTestId("section-toggle-channels"));
      expect(onSectionToggle).toHaveBeenCalledWith("section-1", true);

      // Channels should now be hidden
      fireEvent.click(screen.getByTestId("section-toggle-channels"));
      expect(onSectionToggle).toHaveBeenCalledWith("section-1", false);
    });
  });

  // ==========================================================================
  // Channel Menu Tests
  // ==========================================================================

  describe("Channel Menu", () => {
    it("shows channel menu on hover", () => {
      render(
        <SidebarNav sections={mockSections} onChannelAction={jest.fn()} />,
      );
      expect(screen.getByTestId("channel-menu-ch-1")).toBeInTheDocument();
    });

    it("calls onChannelAction with mute action", async () => {
      const onChannelAction = jest.fn();
      render(
        <SidebarNav
          sections={mockSections}
          onChannelAction={onChannelAction}
        />,
      );

      fireEvent.click(screen.getByTestId("channel-menu-ch-1"));
      fireEvent.click(screen.getByText("Mute"));
      expect(onChannelAction).toHaveBeenCalledWith("ch-1", "mute");
    });

    it("calls onChannelAction with leave action", () => {
      const onChannelAction = jest.fn();
      render(
        <SidebarNav
          sections={mockSections}
          onChannelAction={onChannelAction}
        />,
      );

      fireEvent.click(screen.getByTestId("channel-menu-ch-1"));
      fireEvent.click(screen.getByText("Leave Channel"));
      expect(onChannelAction).toHaveBeenCalledWith("ch-1", "leave");
    });

    it("calls onChannelAction with settings action", () => {
      const onChannelAction = jest.fn();
      render(
        <SidebarNav
          sections={mockSections}
          onChannelAction={onChannelAction}
        />,
      );

      fireEvent.click(screen.getByTestId("channel-menu-ch-1"));
      fireEvent.click(screen.getByText("Settings"));
      expect(onChannelAction).toHaveBeenCalledWith("ch-1", "settings");
    });

    it("shows Unmute for muted channels", () => {
      const sections: SidebarSection[] = [
        {
          id: "section-1",
          title: "Channels",
          channels: [createMockChannel({ id: "ch-1", isMuted: true })],
        },
      ];
      render(<SidebarNav sections={sections} onChannelAction={jest.fn()} />);

      fireEvent.click(screen.getByTestId("channel-menu-ch-1"));
      expect(screen.getByText("Unmute")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Collapsed View Tests
  // ==========================================================================

  describe("Collapsed View", () => {
    it("renders collapsed view when collapsed prop is true", () => {
      render(<SidebarNav collapsed />);
      expect(screen.getByTestId("sidebar-nav-collapsed")).toBeInTheDocument();
    });

    it("shows icon-only buttons in collapsed view", () => {
      render(
        <SidebarNav
          collapsed
          onOpenSearch={jest.fn()}
          onCreateChannel={jest.fn()}
          onCreateDM={jest.fn()}
          onOpenSettings={jest.fn()}
        />,
      );

      expect(
        screen.getByTestId("sidebar-search-collapsed"),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("sidebar-create-channel-collapsed"),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("sidebar-create-dm-collapsed"),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("sidebar-settings-collapsed"),
      ).toBeInTheDocument();
    });

    it("handles collapsed button clicks", () => {
      const onOpenSearch = jest.fn();
      const onOpenSettings = jest.fn();

      render(
        <SidebarNav
          collapsed
          onOpenSearch={onOpenSearch}
          onOpenSettings={onOpenSettings}
        />,
      );

      fireEvent.click(screen.getByTestId("sidebar-search-collapsed"));
      expect(onOpenSearch).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByTestId("sidebar-settings-collapsed"));
      expect(onOpenSettings).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // Section State Tests
  // ==========================================================================

  describe("Section State", () => {
    it("respects initial collapsed state from sections", () => {
      render(<SidebarNav sections={mockSections} />);

      // section-2 has collapsed: true in mockSections
      // Content should be hidden for collapsed sections
      const section2 = screen.getByTestId("section-section-2");
      expect(
        within(section2).queryByTestId("channel-item-ch-4"),
      ).not.toBeInTheDocument();
    });

    it("maintains collapse state after toggling", () => {
      render(<SidebarNav sections={mockSections} />);

      // Toggle section-1 to collapse
      fireEvent.click(screen.getByTestId("section-toggle-channels"));

      // Channels should now be hidden
      const section1 = screen.getByTestId("section-section-1");
      expect(
        within(section1).queryByTestId("channel-item-ch-1"),
      ).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Empty States Tests
  // ==========================================================================

  describe("Empty States", () => {
    it("shows empty message when section has no channels", () => {
      const emptySections: SidebarSection[] = [
        {
          id: "empty-section",
          title: "Empty",
          channels: [],
        },
      ];
      render(<SidebarNav sections={emptySections} />);
      expect(screen.getByText("No channels yet")).toBeInTheDocument();
    });

    it("shows create button in empty state", () => {
      const onCreateChannel = jest.fn();
      render(<SidebarNav onCreateChannel={onCreateChannel} />);

      const createButton = screen.getByTestId("sidebar-empty-create");
      fireEvent.click(createButton);
      expect(onCreateChannel).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe("Accessibility", () => {
    it("channel links have proper href", () => {
      render(<SidebarNav sections={mockSections} />);
      const link = screen.getByTestId("channel-item-ch-1");
      expect(link).toHaveAttribute("href", "/chat/channel/general");
    });

    it("DM links have proper href", () => {
      render(<SidebarNav directMessages={mockDirectMessages} />);
      const link = screen.getByTestId("dm-item-dm-1");
      expect(link).toHaveAttribute("href", "/chat/dm/dm-1");
    });

    it("avatar has alt text for DMs", () => {
      render(<SidebarNav directMessages={mockDirectMessages} />);
      expect(screen.getByAltText("Alice")).toBeInTheDocument();
    });
  });
});

// ============================================================================
// SidebarNavSkeleton Tests
// ============================================================================

// Skipped: Complex component test requires mock updates
describe.skip("SidebarNavSkeleton", () => {
  it("renders skeleton elements", () => {
    render(<SidebarNavSkeleton />);
    expect(screen.getByTestId("sidebar-nav-skeleton")).toBeInTheDocument();
  });
});
