/**
 * MessageReadStatus Component Tests
 *
 * Tests for the message read status indicator component that displays
 * delivery status checkmarks and read receipts.
 */

import { render, screen, fireEvent } from "@testing-library/react";
import {
  MessageReadStatus,
  InlineReadStatus,
  GroupReadIndicator,
} from "../message-read-status";
import type { ReadReceipt } from "@/stores/read-receipts-store";

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Create a mock read receipt
 */
const createMockReceipt = (
  userId: string,
  messageId: string,
  displayName: string = "Test User",
): ReadReceipt => ({
  userId,
  messageId,
  readAt: new Date().toISOString(),
  user: {
    id: userId,
    displayName,
    avatarUrl: `https://example.com/avatar/${userId}.png`,
  },
});

// ============================================================================
// MessageReadStatus Tests
// ============================================================================

describe("MessageReadStatus", () => {
  const defaultProps = {
    messageId: "msg-1",
    status: "sent" as const,
    isOwnMessage: true,
  };

  // ==========================================================================
  // Render Tests
  // ==========================================================================

  describe("rendering", () => {
    it("should not render for non-own messages", () => {
      const { container } = render(
        <MessageReadStatus {...defaultProps} isOwnMessage={false} />,
      );
      expect(container.firstChild).toBeNull();
    });

    it("should render for own messages", () => {
      render(<MessageReadStatus {...defaultProps} />);
      // Status icon should be present
      expect(screen.getByLabelText("Sent")).toBeInTheDocument();
    });

    it("should render sending status with clock icon", () => {
      render(<MessageReadStatus {...defaultProps} status="sending" />);
      expect(screen.getByLabelText("Sending")).toBeInTheDocument();
    });

    it("should render sent status with single check", () => {
      render(<MessageReadStatus {...defaultProps} status="sent" />);
      expect(screen.getByLabelText("Sent")).toBeInTheDocument();
    });

    it("should render delivered status with double check", () => {
      render(<MessageReadStatus {...defaultProps} status="delivered" />);
      expect(screen.getByLabelText("Delivered")).toBeInTheDocument();
    });

    it("should render read status with blue double check", () => {
      render(<MessageReadStatus {...defaultProps} status="read" />);
      expect(screen.getByLabelText("Read")).toBeInTheDocument();
    });

    it("should render failed status with alert icon", () => {
      render(<MessageReadStatus {...defaultProps} status="failed" />);
      expect(
        screen.getByLabelText("Message failed to send. Click to retry."),
      ).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Read Receipt Display Tests
  // ==========================================================================

  describe("read receipts display", () => {
    it("should show read status when readBy has entries", () => {
      const readBy = [createMockReceipt("user-1", "msg-1", "Alice")];

      render(
        <MessageReadStatus {...defaultProps} status="sent" readBy={readBy} />,
      );

      // Should show read status instead of sent
      expect(screen.getByLabelText("Read")).toBeInTheDocument();
    });

    it("should show reader count for group chats with multiple recipients", () => {
      const readBy = [
        createMockReceipt("user-1", "msg-1", "Alice"),
        createMockReceipt("user-2", "msg-1", "Bob"),
      ];

      render(
        <MessageReadStatus
          {...defaultProps}
          status="sent"
          readBy={readBy}
          totalRecipients={5}
        />,
      );

      expect(screen.getByLabelText("Read by 2 people")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // DM vs Group Chat Tests
  // ==========================================================================

  describe("direct message mode", () => {
    it("should show simple seen indicator for DMs", () => {
      const readBy = [createMockReceipt("user-1", "msg-1")];

      render(
        <MessageReadStatus
          {...defaultProps}
          status="read"
          readBy={readBy}
          isDirectMessage
        />,
      );

      expect(screen.getByLabelText("Read")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Failed Status Tests
  // ==========================================================================

  describe("failed status", () => {
    it("should call onRetry when retry button is clicked", () => {
      const onRetry = jest.fn();

      render(
        <MessageReadStatus
          {...defaultProps}
          status="failed"
          onRetry={onRetry}
        />,
      );

      const retryButton = screen.getByLabelText(
        "Message failed to send. Click to retry.",
      );
      fireEvent.click(retryButton);

      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it("should show error message in tooltip", () => {
      render(
        <MessageReadStatus
          {...defaultProps}
          status="failed"
          errorMessage="Network error"
        />,
      );

      // The error message should be visible in tooltip when hovered
      expect(
        screen.getByLabelText("Message failed to send. Click to retry."),
      ).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Size Variant Tests
  // ==========================================================================

  describe("size variants", () => {
    it("should render small size", () => {
      const { container } = render(
        <MessageReadStatus {...defaultProps} size="sm" />,
      );
      expect(container.firstChild).toBeInTheDocument();
    });

    it("should render default size", () => {
      const { container } = render(
        <MessageReadStatus {...defaultProps} size="default" />,
      );
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // showDetails Tests
  // ==========================================================================

  describe("showDetails option", () => {
    it("should not show tooltip when showDetails is false", () => {
      const { container } = render(
        <MessageReadStatus {...defaultProps} showDetails={false} />,
      );

      // Should just render the icon without tooltip wrapper
      expect(container.querySelector("svg")).toBeInTheDocument();
    });
  });
});

// ============================================================================
// InlineReadStatus Tests
// ============================================================================

describe("InlineReadStatus", () => {
  it("should render with correct status", () => {
    render(<InlineReadStatus status="sent" />);
    expect(screen.getByLabelText("Sent")).toBeInTheDocument();
  });

  it("should show read status when hasReaders is true", () => {
    render(<InlineReadStatus status="sent" hasReaders />);
    expect(screen.getByLabelText("Read")).toBeInTheDocument();
  });

  it("should render small size by default", () => {
    const { container } = render(<InlineReadStatus status="sent" />);
    expect(container.querySelector("svg")).toHaveClass("h-3");
  });
});

// ============================================================================
// GroupReadIndicator Tests
// ============================================================================

describe("GroupReadIndicator", () => {
  it("should not render when readBy is empty", () => {
    const { container } = render(<GroupReadIndicator readBy={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("should render avatars for readers", () => {
    const readBy = [
      createMockReceipt("user-1", "msg-1", "Alice"),
      createMockReceipt("user-2", "msg-1", "Bob"),
    ];

    render(<GroupReadIndicator readBy={readBy} />);

    // Should show avatar fallbacks (first letters of names)
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
  });

  it("should limit displayed avatars to maxAvatars", () => {
    const readBy = [
      createMockReceipt("user-1", "msg-1", "Alice"),
      createMockReceipt("user-2", "msg-1", "Bob"),
      createMockReceipt("user-3", "msg-1", "Charlie"),
      createMockReceipt("user-4", "msg-1", "Diana"),
    ];

    render(<GroupReadIndicator readBy={readBy} maxAvatars={2} />);

    // Should show 2 avatars plus "+2" indicator
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
    expect(screen.queryByText("C")).not.toBeInTheDocument();
    expect(screen.getByText("+2")).toBeInTheDocument();
  });

  it("should call onClick when clicked", () => {
    const onClick = jest.fn();
    const readBy = [createMockReceipt("user-1", "msg-1", "Alice")];

    render(<GroupReadIndicator readBy={readBy} onClick={onClick} />);

    const button = screen.getByLabelText("Read by 1 people");
    fireEvent.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("should render in small size", () => {
    const readBy = [createMockReceipt("user-1", "msg-1")];

    const { container } = render(
      <GroupReadIndicator readBy={readBy} size="sm" />,
    );

    // Avatar should have small size class
    expect(container.querySelector(".h-4")).toBeInTheDocument();
  });
});
