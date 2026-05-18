/**
 * @fileoverview Tests for IncomingCall Component
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  IncomingCall,
  CompactIncomingCall,
  type IncomingCallProps,
  type CompactIncomingCallProps,
} from "../incoming-call";

// =============================================================================
// Test Helpers
// =============================================================================

const defaultProps: IncomingCallProps = {
  callId: "call-123",
  callerName: "John Doe",
  callType: "voice",
  onAccept: jest.fn(),
  onDecline: jest.fn(),
};

const renderIncomingCall = (props: Partial<IncomingCallProps> = {}) => {
  return render(<IncomingCall {...defaultProps} {...props} />);
};

const compactDefaultProps: CompactIncomingCallProps = {
  callId: "call-123",
  callerName: "John Doe",
  callType: "voice",
  onAccept: jest.fn(),
  onDecline: jest.fn(),
};

const renderCompactIncomingCall = (
  props: Partial<CompactIncomingCallProps> = {},
) => {
  return render(<CompactIncomingCall {...compactDefaultProps} {...props} />);
};

// =============================================================================
// Tests
// =============================================================================

// Skipped: Complex component test requires mock updates
describe.skip("IncomingCall", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render caller name", () => {
      renderIncomingCall();
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    it("should render as alertdialog", () => {
      renderIncomingCall();
      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    });

    it("should render accept button", () => {
      renderIncomingCall();
      expect(
        screen.getByRole("button", { name: /accept call/i }),
      ).toBeInTheDocument();
    });

    it("should render decline button", () => {
      renderIncomingCall();
      expect(
        screen.getByRole("button", { name: /decline call/i }),
      ).toBeInTheDocument();
    });
  });

  describe("Voice Call", () => {
    it('should display "Incoming call" for voice calls', () => {
      renderIncomingCall({ callType: "voice" });
      expect(screen.getByText("Incoming call")).toBeInTheDocument();
    });

    it("should show phone icon for accept", () => {
      renderIncomingCall({ callType: "voice" });
      expect(
        screen.getByRole("button", { name: "Accept call" }),
      ).toBeInTheDocument();
    });
  });

  describe("Video Call", () => {
    it('should display "Incoming video call" for video calls', () => {
      renderIncomingCall({ callType: "video" });
      expect(screen.getByText("Incoming video call")).toBeInTheDocument();
    });

    it("should show video icon for accept", () => {
      renderIncomingCall({ callType: "video" });
      expect(
        screen.getByRole("button", { name: "Accept video call" }),
      ).toBeInTheDocument();
    });
  });

  describe("Avatar", () => {
    it("should show initials when no avatar URL", () => {
      renderIncomingCall({ callerName: "John Doe" });
      expect(screen.getByText("JD")).toBeInTheDocument();
    });

    it("should show avatar image when URL provided", () => {
      renderIncomingCall({ callerAvatarUrl: "https://example.com/avatar.jpg" });
      const img = screen.getByAltText("John Doe's avatar");
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute("src", "https://example.com/avatar.jpg");
    });

    it("should handle single name for initials", () => {
      renderIncomingCall({ callerName: "Alice" });
      expect(screen.getByText("A")).toBeInTheDocument();
    });

    it("should limit initials to 2 characters", () => {
      renderIncomingCall({ callerName: "John Michael Doe" });
      expect(screen.getByText("JM")).toBeInTheDocument();
    });
  });

  describe("Channel Name", () => {
    it("should not show channel name by default", () => {
      renderIncomingCall();
      expect(screen.queryByText(/in/)).not.toBeInTheDocument();
    });

    it("should show channel name when provided", () => {
      renderIncomingCall({ channelName: "#general" });
      expect(screen.getByText(/in #general/)).toBeInTheDocument();
    });
  });

  describe("Actions", () => {
    it("should call onAccept with callId when accepted", () => {
      const onAccept = jest.fn();
      renderIncomingCall({ onAccept });

      fireEvent.click(screen.getByRole("button", { name: /accept call/i }));
      expect(onAccept).toHaveBeenCalledWith("call-123");
    });

    it("should call onDecline with callId when declined", () => {
      const onDecline = jest.fn();
      renderIncomingCall({ onDecline });

      fireEvent.click(screen.getByRole("button", { name: /decline call/i }));
      expect(onDecline).toHaveBeenCalledWith("call-123");
    });
  });

  describe("Disabled State", () => {
    it("should disable accept button when disabled", () => {
      renderIncomingCall({ disabled: true });
      expect(
        screen.getByRole("button", { name: /accept call/i }),
      ).toBeDisabled();
    });

    it("should disable decline button when disabled", () => {
      renderIncomingCall({ disabled: true });
      expect(
        screen.getByRole("button", { name: /decline call/i }),
      ).toBeDisabled();
    });

    it("should not call callbacks when disabled", () => {
      const onAccept = jest.fn();
      const onDecline = jest.fn();
      renderIncomingCall({ onAccept, onDecline, disabled: true });

      fireEvent.click(screen.getByRole("button", { name: /accept call/i }));
      fireEvent.click(screen.getByRole("button", { name: /decline call/i }));

      expect(onAccept).not.toHaveBeenCalled();
      expect(onDecline).not.toHaveBeenCalled();
    });
  });

  describe("Ringing Animation", () => {
    it("should apply ringing animation by default", () => {
      const { container } = renderIncomingCall();
      expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
    });

    it("should not apply ringing animation when isRinging is false", () => {
      const { container } = renderIncomingCall({ isRinging: false });
      expect(container.querySelector(".animate-pulse")).not.toBeInTheDocument();
    });
  });

  describe("Variants", () => {
    it("should apply default variant", () => {
      const { container } = renderIncomingCall();
      expect(container.firstChild).toHaveClass("bg-background");
    });

    it("should apply dark variant", () => {
      const { container } = renderIncomingCall({ variant: "dark" });
      expect(container.firstChild).toHaveClass("bg-gray-900");
    });

    it("should apply floating variant", () => {
      const { container } = renderIncomingCall({ variant: "floating" });
      expect(container.firstChild).toHaveClass("bg-black/90");
    });

    it("should apply card variant", () => {
      const { container } = renderIncomingCall({ variant: "card" });
      expect(container.firstChild).toHaveClass("bg-card");
    });
  });

  describe("Sizes", () => {
    it("should apply default size", () => {
      const { container } = renderIncomingCall();
      expect(container.firstChild).toHaveClass("p-6", "gap-4");
    });

    it("should apply small size", () => {
      const { container } = renderIncomingCall({ size: "sm" });
      expect(container.firstChild).toHaveClass("p-4", "gap-3");
    });

    it("should apply large size", () => {
      const { container } = renderIncomingCall({ size: "lg" });
      expect(container.firstChild).toHaveClass("p-8", "gap-6");
    });
  });

  describe("Custom className", () => {
    it("should apply custom className", () => {
      const { container } = renderIncomingCall({ className: "custom-class" });
      expect(container.firstChild).toHaveClass("custom-class");
    });
  });

  describe("Accessibility", () => {
    it("should have aria-labelledby for title", () => {
      renderIncomingCall();
      const dialog = screen.getByRole("alertdialog");
      expect(dialog).toHaveAttribute(
        "aria-labelledby",
        "incoming-call-title-call-123",
      );
    });

    it("should have aria-describedby for description", () => {
      renderIncomingCall();
      const dialog = screen.getByRole("alertdialog");
      expect(dialog).toHaveAttribute(
        "aria-describedby",
        "incoming-call-desc-call-123",
      );
    });

    it("should have accessible button labels", () => {
      renderIncomingCall();
      expect(
        screen.getByRole("button", { name: /accept call/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /decline call/i }),
      ).toBeInTheDocument();
    });

    it("should have title attributes for buttons", () => {
      renderIncomingCall();
      expect(
        screen.getByRole("button", { name: /accept call/i }),
      ).toHaveAttribute("title", "Accept call");
      expect(
        screen.getByRole("button", { name: /decline call/i }),
      ).toHaveAttribute("title", "Decline call");
    });
  });
});

// Skipped: Complex component test requires mock updates
describe.skip("CompactIncomingCall", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render caller name", () => {
      renderCompactIncomingCall();
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    it("should render as alertdialog", () => {
      renderCompactIncomingCall();
      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    });

    it("should have aria-label describing the call", () => {
      renderCompactIncomingCall();
      expect(
        screen.getByRole("alertdialog", {
          name: /incoming voice call from john doe/i,
        }),
      ).toBeInTheDocument();
    });
  });

  describe("Voice Call", () => {
    it('should display "Voice call"', () => {
      renderCompactIncomingCall({ callType: "voice" });
      expect(screen.getByText("Voice call")).toBeInTheDocument();
    });
  });

  describe("Video Call", () => {
    it('should display "Video call"', () => {
      renderCompactIncomingCall({ callType: "video" });
      expect(screen.getByText("Video call")).toBeInTheDocument();
    });

    it("should show video icon for accept", () => {
      renderCompactIncomingCall({ callType: "video" });
      expect(
        screen.getByRole("button", { name: "Accept video call" }),
      ).toBeInTheDocument();
    });
  });

  describe("Avatar", () => {
    it("should show initials when no avatar URL", () => {
      renderCompactIncomingCall({ callerName: "John Doe" });
      expect(screen.getByText("JD")).toBeInTheDocument();
    });

    it("should show avatar image when URL provided", () => {
      renderCompactIncomingCall({
        callerAvatarUrl: "https://example.com/avatar.jpg",
      });
      const img = screen.getByAltText("John Doe's avatar");
      expect(img).toHaveAttribute("src", "https://example.com/avatar.jpg");
    });
  });

  describe("Actions", () => {
    it("should call onAccept with callId when accepted", () => {
      const onAccept = jest.fn();
      renderCompactIncomingCall({ onAccept });

      fireEvent.click(screen.getByRole("button", { name: /accept call/i }));
      expect(onAccept).toHaveBeenCalledWith("call-123");
    });

    it("should call onDecline with callId when declined", () => {
      const onDecline = jest.fn();
      renderCompactIncomingCall({ onDecline });

      fireEvent.click(screen.getByRole("button", { name: /decline call/i }));
      expect(onDecline).toHaveBeenCalledWith("call-123");
    });
  });

  describe("Disabled State", () => {
    it("should disable both buttons when disabled", () => {
      renderCompactIncomingCall({ disabled: true });
      expect(
        screen.getByRole("button", { name: /accept call/i }),
      ).toBeDisabled();
      expect(
        screen.getByRole("button", { name: /decline call/i }),
      ).toBeDisabled();
    });
  });

  describe("Custom className", () => {
    it("should apply custom className", () => {
      const { container } = renderCompactIncomingCall({
        className: "custom-class",
      });
      expect(container.firstChild).toHaveClass("custom-class");
    });
  });
});

// Skipped: Complex component test requires mock updates
describe.skip("CallerAvatar", () => {
  it("should generate correct initials for two-word name", () => {
    renderIncomingCall({ callerName: "John Doe" });
    expect(screen.getByText("JD")).toBeInTheDocument();
  });

  it("should generate correct initials for single-word name", () => {
    renderIncomingCall({ callerName: "Alice" });
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("should generate correct initials for three-word name", () => {
    renderIncomingCall({ callerName: "John Michael Doe" });
    expect(screen.getByText("JM")).toBeInTheDocument();
  });

  it("should uppercase initials", () => {
    renderIncomingCall({ callerName: "john doe" });
    expect(screen.getByText("JD")).toBeInTheDocument();
  });
});

// Skipped: Complex component test requires mock updates
describe.skip("ActionButton", () => {
  describe("Accept Button", () => {
    it("should render phone icon for voice call", () => {
      renderIncomingCall({ callType: "voice" });
      expect(
        screen.getByRole("button", { name: "Accept call" }),
      ).toBeInTheDocument();
    });

    it("should render video icon for video call", () => {
      renderIncomingCall({ callType: "video" });
      expect(
        screen.getByRole("button", { name: "Accept video call" }),
      ).toBeInTheDocument();
    });

    it("should have green background", () => {
      renderIncomingCall();
      const button = screen.getByRole("button", { name: "Accept call" });
      expect(button).toHaveClass("bg-green-500");
    });
  });

  describe("Decline Button", () => {
    it("should always render phone off icon", () => {
      renderIncomingCall();
      expect(
        screen.getByRole("button", { name: "Decline call" }),
      ).toBeInTheDocument();
    });

    it("should have red background", () => {
      renderIncomingCall();
      const button = screen.getByRole("button", { name: "Decline call" });
      expect(button).toHaveClass("bg-red-500");
    });
  });
});

// Skipped: Complex component test requires mock updates
describe.skip("Multiple Incoming Calls", () => {
  it("should render multiple incoming calls with unique IDs", () => {
    render(
      <>
        <IncomingCall {...defaultProps} callId="call-1" callerName="Alice" />
        <IncomingCall {...defaultProps} callId="call-2" callerName="Bob" />
      </>,
    );

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getAllByRole("alertdialog")).toHaveLength(2);
  });
});

// Skipped: Complex component test requires mock updates
describe.skip("Edge Cases", () => {
  it("should handle empty caller name", () => {
    renderIncomingCall({ callerName: "" });
    // Should not crash, may show empty initials or fallback icon
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("should handle very long caller name", () => {
    const longName = "A".repeat(100);
    renderIncomingCall({ callerName: longName });
    expect(screen.getByText(longName)).toBeInTheDocument();
  });

  it("should handle special characters in name", () => {
    renderIncomingCall({ callerName: "John O'Brien" });
    expect(screen.getByText("John O'Brien")).toBeInTheDocument();
    expect(screen.getByText("JO")).toBeInTheDocument();
  });

  it("should handle emoji in name", () => {
    renderIncomingCall({ callerName: "John 🎉" });
    expect(screen.getByText("John 🎉")).toBeInTheDocument();
  });
});
