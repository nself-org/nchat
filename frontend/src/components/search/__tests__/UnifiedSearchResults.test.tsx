/**
 * UnifiedSearchResults Component Tests
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { UnifiedSearchResults } from "../UnifiedSearchResults";
import type {
  MessageResult,
  FileResult,
  UserResult,
  ChannelResult,
} from "@/lib/search/search-engine";

// Mock date-fns
jest.mock("date-fns", () => ({
  format: jest.fn((date, formatStr) => "2024-01-15"),
  formatDistanceToNow: jest.fn(() => "2 hours ago"),
  isToday: jest.fn(() => false),
  isYesterday: jest.fn(() => false),
  isThisWeek: jest.fn(() => false),
}));

// Mock UI components
jest.mock("@/components/ui/avatar", () => ({
  Avatar: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div data-testid="avatar" className={className}>
      {children}
    </div>
  ),
  AvatarImage: ({ src, alt }: { src?: string; alt?: string }) => (
    <img data-testid="avatar-image" src={src} alt={alt} />
  ),
  AvatarFallback: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="avatar-fallback">{children}</div>
  ),
}));

jest.mock("@/components/ui/badge", () => ({
  Badge: ({
    children,
    variant,
    className,
  }: {
    children: React.ReactNode;
    variant?: string;
    className?: string;
  }) => (
    <span data-testid="badge" data-variant={variant} className={className}>
      {children}
    </span>
  ),
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    variant,
    className,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: string;
    className?: string;
  }) => (
    <button
      type="button"
      data-testid="button"
      data-variant={variant}
      onClick={onClick}
      className={className}
    >
      {children}
    </button>
  ),
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
}));

jest.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  TooltipProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  TooltipTrigger: ({
    children,
    asChild,
  }: {
    children: React.ReactNode;
    asChild?: boolean;
  }) => <>{children}</>,
}));

// Test data
const mockMessageResult: MessageResult = {
  id: "msg-1",
  type: "message",
  content: "<p>Hello world</p>",
  contentPlain: "Hello world",
  channelId: "channel-1",
  channelName: "general",
  channelType: "public",
  authorId: "user-1",
  authorName: "John Doe",
  authorAvatar: "https://example.com/avatar.jpg",
  timestamp: new Date("2024-01-15"),
  isPinned: false,
  isStarred: false,
  reactions: [],
  attachments: [],
  mentions: [],
  hasLink: false,
  hasCode: false,
  score: 0.95,
};

const mockFileResult: FileResult = {
  id: "file-1",
  type: "file",
  name: "document.pdf",
  originalName: "Important Document.pdf",
  mimeType: "application/pdf",
  size: 1024 * 1024,
  url: "https://example.com/document.pdf",
  channelId: "channel-1",
  channelName: "general",
  messageId: "msg-2",
  uploaderId: "user-1",
  uploaderName: "John Doe",
  uploadedAt: new Date("2024-01-14"),
  score: 0.85,
};

const mockUserResult: UserResult = {
  id: "user-1",
  type: "user",
  username: "johndoe",
  displayName: "John Doe",
  email: "john@example.com",
  avatar: "https://example.com/avatar.jpg",
  bio: "Software developer",
  role: "member",
  status: "online",
  score: 0.9,
};

const mockChannelResult: ChannelResult = {
  id: "channel-1",
  type: "channel",
  name: "general",
  description: "General discussion channel",
  channelType: "public",
  isPrivate: false,
  isArchived: false,
  memberCount: 42,
  isMember: true,
  createdAt: new Date("2024-01-01"),
  lastActivityAt: new Date("2024-01-15"),
  score: 0.88,
};

describe("UnifiedSearchResults", () => {
  // ==========================================================================
  // Basic Rendering
  // ==========================================================================

  describe("basic rendering", () => {
    it("should render empty state when no results", () => {
      render(<UnifiedSearchResults results={[]} totalHits={0} query="test" />);

      expect(screen.getByText("No results found")).toBeInTheDocument();
    });

    it("should render loading skeletons when loading initial", () => {
      render(
        <UnifiedSearchResults
          results={[]}
          totalHits={0}
          query="test"
          isLoadingInitial={true}
        />,
      );

      const skeletons = screen.getAllByTestId("skeleton");
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it("should render results count", () => {
      render(
        <UnifiedSearchResults
          results={[mockMessageResult]}
          totalHits={42}
          query="hello"
        />,
      );

      expect(screen.getByText("42 results")).toBeInTheDocument();
    });

    it("should render singular result count", () => {
      render(
        <UnifiedSearchResults
          results={[mockMessageResult]}
          totalHits={1}
          query="hello"
        />,
      );

      expect(screen.getByText("1 result")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Message Results
  // ==========================================================================

  describe("message results", () => {
    it("should render message result", () => {
      render(
        <UnifiedSearchResults
          results={[mockMessageResult]}
          totalHits={1}
          query="hello"
        />,
      );

      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("general")).toBeInTheDocument();
    });

    it("should highlight matched text", () => {
      render(
        <UnifiedSearchResults
          results={[mockMessageResult]}
          totalHits={1}
          query="Hello"
        />,
      );

      // The text should be rendered
      expect(screen.getByText(/Hello/)).toBeInTheDocument();
    });

    it("should show pinned badge when message is pinned", () => {
      const pinnedMessage = { ...mockMessageResult, isPinned: true };
      render(
        <UnifiedSearchResults
          results={[pinnedMessage]}
          totalHits={1}
          query="test"
        />,
      );

      expect(screen.getByText("Pinned")).toBeInTheDocument();
    });

    it("should show starred badge when message is starred", () => {
      const starredMessage = { ...mockMessageResult, isStarred: true };
      render(
        <UnifiedSearchResults
          results={[starredMessage]}
          totalHits={1}
          query="test"
        />,
      );

      expect(screen.getByText("Starred")).toBeInTheDocument();
    });

    it("should show link badge when message has link", () => {
      const linkMessage = { ...mockMessageResult, hasLink: true };
      render(
        <UnifiedSearchResults
          results={[linkMessage]}
          totalHits={1}
          query="test"
        />,
      );

      expect(screen.getByText("Link")).toBeInTheDocument();
    });

    it("should show code badge when message has code", () => {
      const codeMessage = { ...mockMessageResult, hasCode: true };
      render(
        <UnifiedSearchResults
          results={[codeMessage]}
          totalHits={1}
          query="test"
        />,
      );

      expect(screen.getByText("Code")).toBeInTheDocument();
    });

    it("should show attachment count when message has attachments", () => {
      const attachmentMessage = {
        ...mockMessageResult,
        attachments: [
          { id: "1", type: "file", name: "doc.pdf", url: "/doc.pdf" },
          { id: "2", type: "image", name: "img.png", url: "/img.png" },
        ],
      };
      render(
        <UnifiedSearchResults
          results={[attachmentMessage]}
          totalHits={1}
          query="test"
        />,
      );

      expect(screen.getByText("2 files")).toBeInTheDocument();
    });

    it("should show thread badge when message is in thread", () => {
      const threadMessage = { ...mockMessageResult, threadId: "thread-1" };
      render(
        <UnifiedSearchResults
          results={[threadMessage]}
          totalHits={1}
          query="test"
        />,
      );

      expect(screen.getByText("Thread")).toBeInTheDocument();
    });

    it("should call onMessageClick when clicked", () => {
      const onMessageClick = jest.fn();
      render(
        <UnifiedSearchResults
          results={[mockMessageResult]}
          totalHits={1}
          query="test"
          onMessageClick={onMessageClick}
        />,
      );

      const buttons = screen.getAllByRole("button");
      fireEvent.click(buttons[0]);

      expect(onMessageClick).toHaveBeenCalledWith("msg-1", "channel-1");
    });
  });

  // ==========================================================================
  // File Results
  // ==========================================================================

  describe("file results", () => {
    it("should render file result", () => {
      render(
        <UnifiedSearchResults
          results={[mockFileResult]}
          totalHits={1}
          query="document"
        />,
      );

      // The file name should be highlighted and rendered
      expect(screen.getByText(/Important/)).toBeInTheDocument();
    });

    it("should show file size", () => {
      render(
        <UnifiedSearchResults
          results={[mockFileResult]}
          totalHits={1}
          query="test"
        />,
      );

      expect(screen.getByText("1.0 MB")).toBeInTheDocument();
    });

    it("should show thumbnail for image files", () => {
      const imageFile = {
        ...mockFileResult,
        mimeType: "image/jpeg",
        thumbnailUrl: "https://example.com/thumb.jpg",
      };
      render(
        <UnifiedSearchResults
          results={[imageFile]}
          totalHits={1}
          query="test"
        />,
      );

      const thumbnail = screen.getByRole("img");
      expect(thumbnail).toHaveAttribute("src", "https://example.com/thumb.jpg");
    });

    it("should call onFileClick when clicked", () => {
      const onFileClick = jest.fn();
      render(
        <UnifiedSearchResults
          results={[mockFileResult]}
          totalHits={1}
          query="test"
          onFileClick={onFileClick}
        />,
      );

      const buttons = screen.getAllByRole("button");
      fireEvent.click(buttons[0]);

      expect(onFileClick).toHaveBeenCalledWith("file-1");
    });
  });

  // ==========================================================================
  // User Results
  // ==========================================================================

  describe("user results", () => {
    it("should render user result", () => {
      render(
        <UnifiedSearchResults
          results={[mockUserResult]}
          totalHits={1}
          query="developer"
        />,
      );

      // Should find the display name and username
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("@johndoe")).toBeInTheDocument();
    });

    it("should show user bio", () => {
      render(
        <UnifiedSearchResults
          results={[mockUserResult]}
          totalHits={1}
          query="test"
        />,
      );

      expect(screen.getByText("Software developer")).toBeInTheDocument();
    });

    it("should show user role", () => {
      render(
        <UnifiedSearchResults
          results={[mockUserResult]}
          totalHits={1}
          query="test"
        />,
      );

      expect(screen.getByText("member")).toBeInTheDocument();
    });

    it("should call onUserClick when clicked", () => {
      const onUserClick = jest.fn();
      render(
        <UnifiedSearchResults
          results={[mockUserResult]}
          totalHits={1}
          query="test"
          onUserClick={onUserClick}
        />,
      );

      const buttons = screen.getAllByRole("button");
      fireEvent.click(buttons[0]);

      expect(onUserClick).toHaveBeenCalledWith("user-1");
    });
  });

  // ==========================================================================
  // Channel Results
  // ==========================================================================

  describe("channel results", () => {
    it("should render channel result", () => {
      render(
        <UnifiedSearchResults
          results={[mockChannelResult]}
          totalHits={1}
          query="general"
        />,
      );

      expect(screen.getByText("general")).toBeInTheDocument();
    });

    it("should show channel description", () => {
      render(
        <UnifiedSearchResults
          results={[mockChannelResult]}
          totalHits={1}
          query="test"
        />,
      );

      expect(
        screen.getByText("General discussion channel"),
      ).toBeInTheDocument();
    });

    it("should show member count", () => {
      render(
        <UnifiedSearchResults
          results={[mockChannelResult]}
          totalHits={1}
          query="test"
        />,
      );

      expect(screen.getByText("42 members")).toBeInTheDocument();
    });

    it("should show private badge for private channels", () => {
      const privateChannel = { ...mockChannelResult, isPrivate: true };
      render(
        <UnifiedSearchResults
          results={[privateChannel]}
          totalHits={1}
          query="test"
        />,
      );

      expect(screen.getByText("Private")).toBeInTheDocument();
    });

    it("should show member badge when user is member", () => {
      render(
        <UnifiedSearchResults
          results={[mockChannelResult]}
          totalHits={1}
          query="test"
        />,
      );

      expect(screen.getByText("Member")).toBeInTheDocument();
    });

    it("should call onChannelClick when clicked", () => {
      const onChannelClick = jest.fn();
      render(
        <UnifiedSearchResults
          results={[mockChannelResult]}
          totalHits={1}
          query="test"
          onChannelClick={onChannelClick}
        />,
      );

      const buttons = screen.getAllByRole("button");
      fireEvent.click(buttons[0]);

      expect(onChannelClick).toHaveBeenCalledWith("channel-1");
    });
  });

  // ==========================================================================
  // Grouping
  // ==========================================================================

  describe("grouping", () => {
    it("should group by channel", () => {
      const results = [
        { ...mockMessageResult, id: "msg-1", channelName: "general" },
        {
          ...mockMessageResult,
          id: "msg-2",
          channelId: "channel-2",
          channelName: "random",
        },
      ];
      render(
        <UnifiedSearchResults
          results={results}
          totalHits={2}
          query="test"
          groupBy="channel"
        />,
      );

      // With groupBy=channel, should show 2 results
      expect(screen.getByText("2 results")).toBeInTheDocument();
      // Both messages should be rendered (from different channels)
      const buttons = screen.getAllByRole("button");
      expect(buttons).toHaveLength(2);
    });

    it("should group by type", () => {
      const results = [mockMessageResult, mockFileResult];
      render(
        <UnifiedSearchResults
          results={results}
          totalHits={2}
          query="test"
          groupBy="type"
        />,
      );

      // Both result types should be rendered
      expect(screen.getByText("2 results")).toBeInTheDocument();
      const buttons = screen.getAllByRole("button");
      expect(buttons).toHaveLength(2);
    });

    it("should not show group headers when groupBy is none", () => {
      const results = [mockMessageResult, mockFileResult];
      render(
        <UnifiedSearchResults
          results={results}
          totalHits={2}
          query="test"
          groupBy="none"
        />,
      );

      // No group headers should be rendered
      expect(
        screen.queryByRole("heading", { level: 3 }),
      ).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Loading More
  // ==========================================================================

  describe("loading more", () => {
    it("should show loading indicator when loading more", () => {
      render(
        <UnifiedSearchResults
          results={[mockMessageResult]}
          totalHits={10}
          query="test"
          hasMore={true}
          isLoading={true}
        />,
      );

      expect(screen.getByText("Loading more results...")).toBeInTheDocument();
    });

    it("should show load more button when has more", () => {
      render(
        <UnifiedSearchResults
          results={[mockMessageResult]}
          totalHits={10}
          query="test"
          hasMore={true}
          isLoading={false}
        />,
      );

      expect(screen.getByText("Load more results")).toBeInTheDocument();
    });

    it("should call onLoadMore when button clicked", () => {
      const onLoadMore = jest.fn();
      render(
        <UnifiedSearchResults
          results={[mockMessageResult]}
          totalHits={10}
          query="test"
          hasMore={true}
          isLoading={false}
          onLoadMore={onLoadMore}
        />,
      );

      fireEvent.click(screen.getByText("Load more results"));
      expect(onLoadMore).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Highlighting
  // ==========================================================================

  describe("highlighting", () => {
    it("should highlight pre-marked content", () => {
      const markedMessage = {
        ...mockMessageResult,
        contentPlain: "<mark>Hello</mark> world",
      };
      render(
        <UnifiedSearchResults
          results={[markedMessage]}
          totalHits={1}
          query="hello"
        />,
      );

      const mark = screen.getByText("Hello");
      expect(mark.tagName.toLowerCase()).toBe("mark");
    });

    it("should handle multiple matches", () => {
      const multiMatchMessage = {
        ...mockMessageResult,
        contentPlain: "hello world hello again",
      };
      render(
        <UnifiedSearchResults
          results={[multiMatchMessage]}
          totalHits={1}
          query="hello"
        />,
      );

      // The content should be rendered (may be split across elements due to highlighting)
      expect(screen.getByText(/world/)).toBeInTheDocument();
      // Check for highlighted parts
      expect(screen.getAllByText("hello").length).toBeGreaterThanOrEqual(1);
    });
  });

  // ==========================================================================
  // Mixed Results
  // ==========================================================================

  describe("mixed results", () => {
    it("should render mixed result types", () => {
      const results = [
        mockMessageResult,
        mockFileResult,
        mockUserResult,
        mockChannelResult,
      ];
      render(
        <UnifiedSearchResults results={results} totalHits={4} query="test" />,
      );

      expect(screen.getByText("4 results")).toBeInTheDocument();
      // All result types should be rendered - use getAllByText for names that appear multiple times
      expect(screen.getAllByText("John Doe").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Important/)).toBeInTheDocument();
      expect(screen.getByText("@johndoe")).toBeInTheDocument();
      expect(screen.getByText("42 members")).toBeInTheDocument();
    });
  });
});
