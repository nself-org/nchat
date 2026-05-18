import { render, screen } from "@testing-library/react";
import { MessageList, SimpleMessageList } from "../message-list";
import type { Message } from "@/types/message";

// Mock dependencies
jest.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({
    user: { id: "user1", username: "testuser" },
    loading: false,
  }),
}));

jest.mock("@/stores/message-store", () => ({
  useMessageStore: () => ({
    messages: {},
  }),
}));

// Mock TanStack Virtual to avoid virtualization in tests
jest.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: () => ({
    getVirtualItems: () => [],
    getTotalSize: () => 0,
    measureElement: jest.fn(),
    scrollToIndex: jest.fn(),
  }),
}));

// Mock framer-motion
jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock sub-components for isolated testing
jest.mock("../message-item", () => ({
  MessageItem: ({ message }: { message: any }) => (
    <div data-testid={`message-${message.id}`}>{message.content}</div>
  ),
  MessageGroup: ({ children }: any) => <div>{children}</div>,
}));

jest.mock("../message-skeleton", () => ({
  MessageSkeleton: () => <div data-testid="message-skeleton">Loading...</div>,
}));

jest.mock("../message-empty", () => ({
  MessageEmpty: ({ channelName }: { channelName: string }) => (
    <div data-testid="message-empty">No messages in #{channelName}</div>
  ),
}));

jest.mock("../message-system", () => ({
  DateSeparator: ({ date }: { date: Date }) => (
    <div data-testid="date-separator">{date.toDateString()}</div>
  ),
  NewMessagesSeparator: ({ count }: { count: number }) => (
    <div data-testid="new-messages">{count} new messages</div>
  ),
}));

jest.mock("../typing-indicator", () => ({
  TypingIndicator: () => null,
  InlineTypingIndicator: () => null,
}));

const createMockMessage = (overrides: Partial<Message> = {}): Message => ({
  id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  channelId: "channel-1",
  content: "Test message",
  type: "text",
  userId: "user1",
  user: {
    id: "user1",
    username: "testuser",
    displayName: "Test User",
  },
  createdAt: new Date(),
  isEdited: false,
  ...overrides,
});

describe("MessageList Component", () => {
  const mockMessages: Message[] = [
    createMockMessage({
      id: "1",
      content: "Hello world",
      userId: "user1",
      user: { id: "user1", username: "john", displayName: "John Doe" },
      createdAt: new Date("2024-01-01T10:00:00"),
    }),
    createMockMessage({
      id: "2",
      content: "This is a reply",
      userId: "user2",
      user: { id: "user2", username: "jane", displayName: "Jane Smith" },
      createdAt: new Date("2024-01-01T10:05:00"),
      isEdited: true,
    }),
    createMockMessage({
      id: "3",
      content: "System message",
      userId: "system",
      user: { id: "system", username: "system", displayName: "System" },
      createdAt: new Date("2024-01-01T10:10:00"),
    }),
  ];

  it("shows loading skeleton when loading", () => {
    render(
      <MessageList channelId="channel-1" messages={[]} isLoading={true} />,
    );

    expect(screen.getByTestId("message-skeleton")).toBeInTheDocument();
  });

  it("shows empty state when no messages", () => {
    render(
      <MessageList
        channelId="channel-1"
        channelName="general"
        messages={[]}
        isLoading={false}
      />,
    );

    expect(screen.getByTestId("message-empty")).toBeInTheDocument();
    expect(screen.getByText(/No messages in #general/)).toBeInTheDocument();
  });

  it("renders message list container", () => {
    render(<MessageList channelId="channel-1" messages={mockMessages} />);

    // Component should render without errors
    const container = document.querySelector(".relative.flex.h-full.flex-col");
    expect(container).toBeInTheDocument();
  });

  it("accepts channel props", () => {
    render(
      <MessageList
        channelId="channel-1"
        channelName="test-channel"
        channelType="public"
        messages={mockMessages}
      />,
    );

    // Component should render without errors
    expect(
      document.querySelector(".relative.flex.h-full.flex-col"),
    ).toBeInTheDocument();
  });

  it("accepts callback props", () => {
    const onLoadMore = jest.fn();
    const onReply = jest.fn();
    const onEdit = jest.fn();
    const onDelete = jest.fn();

    render(
      <MessageList
        channelId="channel-1"
        messages={mockMessages}
        onLoadMore={onLoadMore}
        onReply={onReply}
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    );

    // Component should render without errors with callbacks
    expect(
      document.querySelector(".relative.flex.h-full.flex-col"),
    ).toBeInTheDocument();
  });

  it("handles hasMore prop", () => {
    render(
      <MessageList
        channelId="channel-1"
        messages={mockMessages}
        hasMore={true}
      />,
    );

    // Component should render without errors
    expect(
      document.querySelector(".relative.flex.h-full.flex-col"),
    ).toBeInTheDocument();
  });

  it("applies custom className", () => {
    render(
      <MessageList
        channelId="channel-1"
        messages={mockMessages}
        className="custom-class"
      />,
    );

    expect(document.querySelector(".custom-class")).toBeInTheDocument();
  });
});

describe("SimpleMessageList Component", () => {
  const mockMessages: Message[] = [
    createMockMessage({
      id: "1",
      content: "Hello world",
      createdAt: new Date("2024-01-01T10:00:00"),
    }),
    createMockMessage({
      id: "2",
      content: "This is a reply",
      createdAt: new Date("2024-01-01T10:05:00"),
    }),
  ];

  it("renders messages without virtualization", () => {
    render(<SimpleMessageList messages={mockMessages} />);

    expect(screen.getByTestId("message-1")).toBeInTheDocument();
    expect(screen.getByTestId("message-2")).toBeInTheDocument();
  });

  it("renders message content", () => {
    render(<SimpleMessageList messages={mockMessages} />);

    expect(screen.getByText("Hello world")).toBeInTheDocument();
    expect(screen.getByText("This is a reply")).toBeInTheDocument();
  });

  it("renders empty list correctly", () => {
    const { container } = render(<SimpleMessageList messages={[]} />);

    const messageContainer = container.querySelector(".space-y-1");
    expect(messageContainer).toBeInTheDocument();
    expect(messageContainer?.children).toHaveLength(0);
  });

  it("applies custom className", () => {
    const { container } = render(
      <SimpleMessageList messages={mockMessages} className="custom-class" />,
    );

    expect(container.querySelector(".custom-class")).toBeInTheDocument();
  });

  it("accepts callback props", () => {
    const onReply = jest.fn();
    const onEdit = jest.fn();
    const onDelete = jest.fn();
    const onReact = jest.fn();

    render(
      <SimpleMessageList
        messages={mockMessages}
        onReply={onReply}
        onEdit={onEdit}
        onDelete={onDelete}
        onReact={onReact}
      />,
    );

    // Should render without errors
    expect(screen.getByTestId("message-1")).toBeInTheDocument();
  });
});
