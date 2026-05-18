import {
  render,
  screen,
  act,
  waitFor,
  renderHook,
} from "@testing-library/react";
import { ReactNode } from "react";
import {
  ChatProvider,
  useChat,
  useActiveChannel,
  useActiveThread,
  useTypingUsers,
  useUnreadCounts,
  useConnectionState,
} from "../chat-context";
import type { Message } from "@/types/message";

const mockUser = {
  id: "user-1",
  email: "test@example.com",
  username: "testuser",
  displayName: "Test User",
  role: "member" as const,
};

const mockChannel = {
  id: "channel-1",
  name: "general",
  slug: "general",
  description: "General channel",
  type: "public" as const,
  categoryId: null,
  createdBy: "user-1",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  topic: null,
  icon: null,
  color: null,
  isArchived: false,
  isDefault: true,
  memberCount: 5,
  lastMessageAt: null,
  lastMessagePreview: null,
};

const mockMessage: Message = {
  id: "msg-1",
  channelId: "channel-1",
  content: "Hello world",
  senderId: "user-1",
  senderName: "Test User",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isEdited: false,
  isPinned: false,
  reactions: [],
  attachments: [],
};

const mockChannelStore = {
  channels: new Map([["channel-1", mockChannel]]),
  activeChannelId: null as string | null,
  setActiveChannel: jest.fn(),
  getChannelById: jest.fn((id: string) => mockChannel),
};

const mockMessageStore = {
  setCurrentChannel: jest.fn(),
};

const mockUserStore = {
  users: {} as Record<
    string,
    {
      id: string;
      username: string;
      displayName: string;
      avatarUrl?: string;
      presence: "online" | "away" | "dnd" | "offline";
      lastSeenAt?: Date;
    }
  >,
  getUser: jest.fn(),
};

const mockNotificationStore = {
  unreadCounts: {} as Record<string, { messages: number; mentions: number }>,
  markChannelAsRead: jest.fn(),
  markAllAsRead: jest.fn(),
};

jest.mock("@/stores/channel-store", () => ({
  useChannelStore: () => mockChannelStore,
}));

jest.mock("@/stores/message-store", () => ({
  useMessageStore: () => mockMessageStore,
}));

jest.mock("@/stores/user-store", () => ({
  useUserStore: () => mockUserStore,
}));

jest.mock("@/stores/notification-store", () => ({
  useNotificationStore: () => mockNotificationStore,
}));

jest.mock("../auth-context", () => ({
  useAuth: () => ({
    user: mockUser,
    loading: false,
    isAuthenticated: true,
  }),
}));

function TestComponent() {
  const {
    activeChannel,
    activeChannelId,
    activeThread,
    setActiveChannel,
    openThread,
    closeThread,
    isThreadOpen,
    onlineUsers,
    isUserOnline,
    getUserPresence,
    typingUsers,
    getTypingUsersForChannel,
    unreadState,
    getUnreadCount,
    getMentionCount,
    markChannelAsRead,
    markAllAsRead,
    isSidebarCollapsed,
    toggleSidebar,
    setSidebarCollapsed,
    isConnected,
    isReconnecting,
    isLoadingChannel,
    isLoadingMessages,
  } = useChat();

  return (
    <div>
      <div data-testid="active-channel-id">{activeChannelId || "none"}</div>
      <div data-testid="active-channel-name">
        {activeChannel?.name || "none"}
      </div>
      <div data-testid="is-thread-open">{isThreadOpen.toString()}</div>
      <div data-testid="active-thread-id">
        {activeThread?.threadId || "none"}
      </div>
      <div data-testid="online-users-count">{onlineUsers.length}</div>
      <div data-testid="sidebar-collapsed">{isSidebarCollapsed.toString()}</div>
      <div data-testid="is-connected">{isConnected.toString()}</div>
      <div data-testid="is-reconnecting">{isReconnecting.toString()}</div>
      <div data-testid="is-loading-channel">{isLoadingChannel.toString()}</div>
      <div data-testid="unread-total">{unreadState.total}</div>
      <div data-testid="unread-mentions">{unreadState.mentions}</div>
      <button onClick={() => setActiveChannel("channel-1")}>Set Channel</button>
      <button onClick={() => setActiveChannel(null)}>Clear Channel</button>
      <button onClick={() => openThread(mockMessage)}>Open Thread</button>
      <button onClick={() => closeThread()}>Close Thread</button>
      <button onClick={() => toggleSidebar()}>Toggle Sidebar</button>
      <button onClick={() => setSidebarCollapsed(true)}>
        Collapse Sidebar
      </button>
      <button onClick={() => markChannelAsRead("channel-1")}>Mark Read</button>
      <button onClick={() => markAllAsRead()}>Mark All Read</button>
      <div data-testid="is-user-online">
        {isUserOnline("user-1").toString()}
      </div>
      <div data-testid="user-presence">{getUserPresence("user-1")}</div>
      <div data-testid="typing-users">
        {JSON.stringify(getTypingUsersForChannel("channel-1"))}
      </div>
      <div data-testid="channel-unread">{getUnreadCount("channel-1")}</div>
      <div data-testid="channel-mentions">{getMentionCount("channel-1")}</div>
    </div>
  );
}

describe("ChatContext", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockChannelStore.activeChannelId = null;
    mockChannelStore.setActiveChannel.mockClear();
    mockMessageStore.setCurrentChannel.mockClear();
    mockNotificationStore.markChannelAsRead.mockClear();
    mockNotificationStore.markAllAsRead.mockClear();
  });

  it("provides chat context to children", () => {
    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>,
    );

    expect(screen.getByTestId("active-channel-id")).toBeInTheDocument();
    expect(screen.getByTestId("is-connected")).toBeInTheDocument();
  });

  it("throws error when useChat is used outside ChatProvider", () => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => render(<TestComponent />)).toThrow(
      "useChat must be used within a ChatProvider",
    );

    consoleSpy.mockRestore();
  });

  it("initializes with default values", () => {
    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>,
    );

    expect(screen.getByTestId("active-channel-id")).toHaveTextContent("none");
    expect(screen.getByTestId("is-thread-open")).toHaveTextContent("false");
    expect(screen.getByTestId("sidebar-collapsed")).toHaveTextContent("false");
    expect(screen.getByTestId("is-connected")).toHaveTextContent("true");
    expect(screen.getByTestId("is-reconnecting")).toHaveTextContent("false");
  });

  it("sets active channel correctly", async () => {
    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>,
    );

    const setChannelButton = screen.getByText("Set Channel");

    await act(async () => {
      setChannelButton.click();
    });

    expect(mockChannelStore.setActiveChannel).toHaveBeenCalledWith("channel-1");
    expect(mockMessageStore.setCurrentChannel).toHaveBeenCalledWith(
      "channel-1",
    );
  });

  it("clears active channel correctly", async () => {
    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>,
    );

    const clearButton = screen.getByText("Clear Channel");

    await act(async () => {
      clearButton.click();
    });

    expect(mockChannelStore.setActiveChannel).toHaveBeenCalledWith(null);
    expect(mockMessageStore.setCurrentChannel).toHaveBeenCalledWith(null);
  });

  it("opens thread correctly", async () => {
    mockChannelStore.activeChannelId = "channel-1";

    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>,
    );

    const openThreadButton = screen.getByText("Open Thread");

    await act(async () => {
      openThreadButton.click();
    });

    expect(screen.getByTestId("is-thread-open")).toHaveTextContent("true");
    expect(screen.getByTestId("active-thread-id")).toHaveTextContent("msg-1");
  });

  it("closes thread correctly", async () => {
    mockChannelStore.activeChannelId = "channel-1";

    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>,
    );

    const openThreadButton = screen.getByText("Open Thread");
    const closeThreadButton = screen.getByText("Close Thread");

    await act(async () => {
      openThreadButton.click();
    });

    expect(screen.getByTestId("is-thread-open")).toHaveTextContent("true");

    await act(async () => {
      closeThreadButton.click();
    });

    expect(screen.getByTestId("is-thread-open")).toHaveTextContent("false");
    expect(screen.getByTestId("active-thread-id")).toHaveTextContent("none");
  });

  it("toggles sidebar collapsed state", async () => {
    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>,
    );

    const toggleButton = screen.getByText("Toggle Sidebar");

    expect(screen.getByTestId("sidebar-collapsed")).toHaveTextContent("false");

    await act(async () => {
      toggleButton.click();
    });

    expect(screen.getByTestId("sidebar-collapsed")).toHaveTextContent("true");

    await act(async () => {
      toggleButton.click();
    });

    expect(screen.getByTestId("sidebar-collapsed")).toHaveTextContent("false");
  });

  it("sets sidebar collapsed state directly", async () => {
    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>,
    );

    const collapseButton = screen.getByText("Collapse Sidebar");

    await act(async () => {
      collapseButton.click();
    });

    expect(screen.getByTestId("sidebar-collapsed")).toHaveTextContent("true");
  });

  it("marks channel as read", async () => {
    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>,
    );

    const markReadButton = screen.getByText("Mark Read");

    await act(async () => {
      markReadButton.click();
    });

    expect(mockNotificationStore.markChannelAsRead).toHaveBeenCalledWith(
      "channel-1",
    );
  });

  it("marks all as read", async () => {
    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>,
    );

    const markAllReadButton = screen.getByText("Mark All Read");

    await act(async () => {
      markAllReadButton.click();
    });

    expect(mockNotificationStore.markAllAsRead).toHaveBeenCalled();
  });

  it("checks if user is online", () => {
    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>,
    );

    expect(screen.getByTestId("is-user-online")).toHaveTextContent("false");
  });

  it("gets user presence", () => {
    mockUserStore.getUser.mockReturnValue({
      id: "user-1",
      presence: "online",
    });

    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>,
    );

    expect(screen.getByTestId("user-presence")).toHaveTextContent("online");
  });

  it("returns offline for unknown user presence", () => {
    mockUserStore.getUser.mockReturnValue(undefined);

    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>,
    );

    expect(screen.getByTestId("user-presence")).toHaveTextContent("offline");
  });

  it("gets typing users for channel", () => {
    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>,
    );

    expect(screen.getByTestId("typing-users")).toHaveTextContent("[]");
  });

  it("gets unread count for channel", () => {
    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>,
    );

    expect(screen.getByTestId("channel-unread")).toHaveTextContent("0");
  });

  it("gets mention count for channel", () => {
    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>,
    );

    expect(screen.getByTestId("channel-mentions")).toHaveTextContent("0");
  });

  it("handles connection events", async () => {
    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>,
    );

    expect(screen.getByTestId("is-connected")).toHaveTextContent("true");

    await act(async () => {
      window.dispatchEvent(new Event("nchat:disconnected"));
    });

    expect(screen.getByTestId("is-connected")).toHaveTextContent("false");

    await act(async () => {
      window.dispatchEvent(new Event("nchat:connected"));
    });

    expect(screen.getByTestId("is-connected")).toHaveTextContent("true");
  });

  it("handles reconnecting event", async () => {
    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>,
    );

    expect(screen.getByTestId("is-reconnecting")).toHaveTextContent("false");

    await act(async () => {
      window.dispatchEvent(new Event("nchat:reconnecting"));
    });

    expect(screen.getByTestId("is-reconnecting")).toHaveTextContent("true");
  });
});

describe("useActiveChannel hook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockChannelStore.activeChannelId = null;
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <ChatProvider>{children}</ChatProvider>
  );

  it("returns null when no channel is active", () => {
    const { result } = renderHook(() => useActiveChannel(), { wrapper });

    expect(result.current).toBeNull();
  });

  it("returns active channel when set", () => {
    mockChannelStore.activeChannelId = "channel-1";
    mockChannelStore.getChannelById.mockReturnValue(mockChannel);

    const { result } = renderHook(() => useActiveChannel(), { wrapper });

    expect(result.current).toBeDefined();
    expect(result.current?.id).toBe("channel-1");
  });
});

describe("useActiveThread hook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockChannelStore.activeChannelId = "channel-1";
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <ChatProvider>{children}</ChatProvider>
  );

  it("returns null when no thread is active", () => {
    const { result } = renderHook(() => useActiveThread(), { wrapper });

    expect(result.current).toBeNull();
  });
});

describe("useTypingUsers hook", () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ChatProvider>{children}</ChatProvider>
  );

  it("returns empty array for channel with no typing users", () => {
    const { result } = renderHook(() => useTypingUsers("channel-1"), {
      wrapper,
    });

    expect(result.current).toEqual([]);
  });
});

describe("useUnreadCounts hook", () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ChatProvider>{children}</ChatProvider>
  );

  it("returns unread state and count functions", () => {
    const { result } = renderHook(() => useUnreadCounts(), { wrapper });

    expect(result.current.unreadState).toBeDefined();
    expect(result.current.unreadState.total).toBe(0);
    expect(typeof result.current.getUnreadCount).toBe("function");
    expect(typeof result.current.getMentionCount).toBe("function");
  });

  it("returns zero for unknown channel", () => {
    const { result } = renderHook(() => useUnreadCounts(), { wrapper });

    expect(result.current.getUnreadCount("unknown-channel")).toBe(0);
    expect(result.current.getMentionCount("unknown-channel")).toBe(0);
  });
});

describe("useConnectionState hook", () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ChatProvider>{children}</ChatProvider>
  );

  it("returns connection state", () => {
    const { result } = renderHook(() => useConnectionState(), { wrapper });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.isReconnecting).toBe(false);
  });
});
