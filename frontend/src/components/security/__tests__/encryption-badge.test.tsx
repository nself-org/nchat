/**
 * EncryptionBadge Component Unit Tests
 *
 * Tests for the encryption badge including different levels,
 * tooltip behavior, accessibility, and subcomponents.
 */

import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  EncryptionBadge,
  EncryptionIcon,
  ChannelEncryptionStatus,
  MessageEncryptionIndicator,
  EncryptionLevel,
} from "../encryption-badge";

// ============================================================================
// EncryptionBadge Tests
// ============================================================================

describe("EncryptionBadge", () => {
  describe("Rendering", () => {
    it("should render with default props", () => {
      render(<EncryptionBadge level="none" data-testid="badge" />);

      const badge = screen.getByTestId("badge");
      expect(badge).toBeInTheDocument();
    });

    it("should render all encryption levels", () => {
      const levels: EncryptionLevel[] = [
        "none",
        "initializing",
        "encrypted",
        "verified",
        "error",
      ];

      levels.forEach((level) => {
        const { unmount } = render(
          <EncryptionBadge
            level={level}
            data-testid={`badge-${level}`}
            showTooltip={false}
          />,
        );

        const badge = screen.getByTestId(`badge-${level}`);
        expect(badge).toBeInTheDocument();
        expect(badge).toHaveAttribute("data-encryption-level", level);

        unmount();
      });
    });

    it("should render with custom label", () => {
      render(
        <EncryptionBadge
          level="encrypted"
          label="Custom Label"
          showTooltip={false}
        />,
      );

      expect(screen.getByText("Custom Label")).toBeInTheDocument();
    });

    it("should render with default label", () => {
      render(<EncryptionBadge level="encrypted" showTooltip={false} />);

      expect(screen.getByText("Encrypted")).toBeInTheDocument();
    });

    it("should hide label when showLabel is false", () => {
      render(
        <EncryptionBadge
          level="encrypted"
          showLabel={false}
          showTooltip={false}
        />,
      );

      expect(screen.queryByText("Encrypted")).not.toBeInTheDocument();
    });
  });

  describe("Sizes", () => {
    it("should render small size", () => {
      render(
        <EncryptionBadge
          level="encrypted"
          size="sm"
          data-testid="badge"
          showTooltip={false}
        />,
      );

      const badge = screen.getByTestId("badge");
      expect(badge).toHaveClass("text-xs");
    });

    it("should render medium size (default)", () => {
      render(
        <EncryptionBadge
          level="encrypted"
          data-testid="badge"
          showTooltip={false}
        />,
      );

      const badge = screen.getByTestId("badge");
      expect(badge).toHaveClass("text-sm");
    });

    it("should render large size", () => {
      render(
        <EncryptionBadge
          level="encrypted"
          size="lg"
          data-testid="badge"
          showTooltip={false}
        />,
      );

      const badge = screen.getByTestId("badge");
      expect(badge).toHaveClass("text-base");
    });
  });

  describe("Variants/Levels", () => {
    it("should apply correct styling for none level", () => {
      render(
        <EncryptionBadge
          level="none"
          data-testid="badge"
          showTooltip={false}
        />,
      );

      const badge = screen.getByTestId("badge");
      expect(badge).toHaveClass("bg-muted");
    });

    it("should apply correct styling for initializing level", () => {
      render(
        <EncryptionBadge
          level="initializing"
          data-testid="badge"
          showTooltip={false}
        />,
      );

      const badge = screen.getByTestId("badge");
      expect(badge).toHaveClass("bg-yellow-100");
    });

    it("should apply correct styling for encrypted level", () => {
      render(
        <EncryptionBadge
          level="encrypted"
          data-testid="badge"
          showTooltip={false}
        />,
      );

      const badge = screen.getByTestId("badge");
      expect(badge).toHaveClass("bg-green-100");
    });

    it("should apply correct styling for verified level", () => {
      render(
        <EncryptionBadge
          level="verified"
          data-testid="badge"
          showTooltip={false}
        />,
      );

      const badge = screen.getByTestId("badge");
      expect(badge).toHaveClass("bg-blue-100");
    });

    it("should apply correct styling for error level", () => {
      render(
        <EncryptionBadge
          level="error"
          data-testid="badge"
          showTooltip={false}
        />,
      );

      const badge = screen.getByTestId("badge");
      expect(badge).toHaveClass("bg-red-100");
    });
  });

  describe("Labels", () => {
    it('should show "Not encrypted" for none level', () => {
      render(<EncryptionBadge level="none" showTooltip={false} />);
      expect(screen.getByText("Not encrypted")).toBeInTheDocument();
    });

    it('should show "Initializing..." for initializing level', () => {
      render(<EncryptionBadge level="initializing" showTooltip={false} />);
      expect(screen.getByText("Initializing...")).toBeInTheDocument();
    });

    it('should show "Encrypted" for encrypted level', () => {
      render(<EncryptionBadge level="encrypted" showTooltip={false} />);
      expect(screen.getByText("Encrypted")).toBeInTheDocument();
    });

    it('should show "Verified" for verified level', () => {
      render(<EncryptionBadge level="verified" showTooltip={false} />);
      expect(screen.getByText("Verified")).toBeInTheDocument();
    });

    it('should show "Error" for error level', () => {
      render(<EncryptionBadge level="error" showTooltip={false} />);
      expect(screen.getByText("Error")).toBeInTheDocument();
    });
  });

  describe("Interactive Mode", () => {
    it("should handle click when interactive", async () => {
      const onClick = jest.fn();
      render(
        <EncryptionBadge
          level="encrypted"
          interactive
          onClick={onClick}
          showTooltip={false}
          data-testid="badge"
        />,
      );

      const badge = screen.getByTestId("badge");
      await userEvent.click(badge);

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("should not handle click when not interactive", async () => {
      const onClick = jest.fn();
      render(
        <EncryptionBadge
          level="encrypted"
          onClick={onClick}
          showTooltip={false}
          data-testid="badge"
        />,
      );

      const badge = screen.getByTestId("badge");
      await userEvent.click(badge);

      expect(onClick).not.toHaveBeenCalled();
    });

    it("should have cursor-pointer class when interactive", () => {
      render(
        <EncryptionBadge
          level="encrypted"
          interactive
          showTooltip={false}
          data-testid="badge"
        />,
      );

      const badge = screen.getByTestId("badge");
      expect(badge).toHaveClass("cursor-pointer");
    });

    it("should handle keyboard Enter when interactive", async () => {
      const onClick = jest.fn();
      render(
        <EncryptionBadge
          level="encrypted"
          interactive
          onClick={onClick}
          showTooltip={false}
          data-testid="badge"
        />,
      );

      const badge = screen.getByTestId("badge");
      badge.focus();
      fireEvent.keyDown(badge, { key: "Enter" });

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("should handle keyboard Space when interactive", async () => {
      const onClick = jest.fn();
      render(
        <EncryptionBadge
          level="encrypted"
          interactive
          onClick={onClick}
          showTooltip={false}
          data-testid="badge"
        />,
      );

      const badge = screen.getByTestId("badge");
      badge.focus();
      fireEvent.keyDown(badge, { key: " " });

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("should have button role when interactive", () => {
      render(
        <EncryptionBadge
          level="encrypted"
          interactive
          showTooltip={false}
          data-testid="badge"
        />,
      );

      const badge = screen.getByTestId("badge");
      expect(badge).toHaveAttribute("role", "button");
    });

    it("should have status role when not interactive", () => {
      render(
        <EncryptionBadge
          level="encrypted"
          showTooltip={false}
          data-testid="badge"
        />,
      );

      const badge = screen.getByTestId("badge");
      expect(badge).toHaveAttribute("role", "status");
    });
  });

  describe("Accessibility", () => {
    it("should have correct aria-label for none level", () => {
      render(
        <EncryptionBadge
          level="none"
          showTooltip={false}
          data-testid="badge"
        />,
      );

      const badge = screen.getByTestId("badge");
      expect(badge).toHaveAttribute("aria-label", "Encryption disabled");
    });

    it("should have correct aria-label for encrypted level", () => {
      render(
        <EncryptionBadge
          level="encrypted"
          showTooltip={false}
          data-testid="badge"
        />,
      );

      const badge = screen.getByTestId("badge");
      expect(badge).toHaveAttribute("aria-label", "End-to-end encrypted");
    });

    it("should have correct aria-label for verified level", () => {
      render(
        <EncryptionBadge
          level="verified"
          showTooltip={false}
          data-testid="badge"
        />,
      );

      const badge = screen.getByTestId("badge");
      expect(badge).toHaveAttribute(
        "aria-label",
        "Verified end-to-end encrypted",
      );
    });

    it("should have tabIndex when interactive", () => {
      render(
        <EncryptionBadge
          level="encrypted"
          interactive
          showTooltip={false}
          data-testid="badge"
        />,
      );

      const badge = screen.getByTestId("badge");
      expect(badge).toHaveAttribute("tabIndex", "0");
    });

    it("should not have tabIndex when not interactive", () => {
      render(
        <EncryptionBadge
          level="encrypted"
          showTooltip={false}
          data-testid="badge"
        />,
      );

      const badge = screen.getByTestId("badge");
      expect(badge).not.toHaveAttribute("tabIndex");
    });
  });

  describe("Custom className", () => {
    it("should apply custom className", () => {
      render(
        <EncryptionBadge
          level="encrypted"
          className="custom-class"
          showTooltip={false}
          data-testid="badge"
        />,
      );

      const badge = screen.getByTestId("badge");
      expect(badge).toHaveClass("custom-class");
    });
  });
});

// ============================================================================
// EncryptionIcon Tests
// ============================================================================

describe("EncryptionIcon", () => {
  it("should render without label", () => {
    render(
      <EncryptionIcon
        level="encrypted"
        showTooltip={false}
        data-testid="icon"
      />,
    );

    expect(screen.queryByText("Encrypted")).not.toBeInTheDocument();
  });

  it("should render icon", () => {
    render(
      <EncryptionIcon
        level="encrypted"
        showTooltip={false}
        data-testid="icon"
      />,
    );

    const icon = screen.getByTestId("icon");
    expect(icon).toBeInTheDocument();
    expect(icon.querySelector("svg")).toBeInTheDocument();
  });

  it("should forward all props", () => {
    const onClick = jest.fn();
    render(
      <EncryptionIcon
        level="encrypted"
        interactive
        onClick={onClick}
        showTooltip={false}
        data-testid="icon"
      />,
    );

    const icon = screen.getByTestId("icon");
    fireEvent.click(icon);

    expect(onClick).toHaveBeenCalled();
  });
});

// ============================================================================
// ChannelEncryptionStatus Tests
// ============================================================================

describe("ChannelEncryptionStatus", () => {
  it("should render none level when not encrypted", () => {
    render(<ChannelEncryptionStatus isEncrypted={false} />);

    const status = screen.getByTestId("channel-encryption-status");
    expect(status).toHaveAttribute("data-encryption-level", "none");
  });

  it("should render encrypted level when encrypted", () => {
    render(<ChannelEncryptionStatus isEncrypted={true} />);

    const status = screen.getByTestId("channel-encryption-status");
    expect(status).toHaveAttribute("data-encryption-level", "encrypted");
  });

  it("should render verified level when verified", () => {
    render(<ChannelEncryptionStatus isEncrypted={true} isVerified={true} />);

    const status = screen.getByTestId("channel-encryption-status");
    expect(status).toHaveAttribute("data-encryption-level", "verified");
  });

  it("should render error level when error", () => {
    render(<ChannelEncryptionStatus isEncrypted={true} isError={true} />);

    const status = screen.getByTestId("channel-encryption-status");
    expect(status).toHaveAttribute("data-encryption-level", "error");
  });

  it("should render initializing level when initializing", () => {
    render(
      <ChannelEncryptionStatus isEncrypted={false} isInitializing={true} />,
    );

    const status = screen.getByTestId("channel-encryption-status");
    expect(status).toHaveAttribute("data-encryption-level", "initializing");
  });

  it("should prioritize error over other states", () => {
    render(
      <ChannelEncryptionStatus
        isEncrypted={true}
        isVerified={true}
        isError={true}
      />,
    );

    const status = screen.getByTestId("channel-encryption-status");
    expect(status).toHaveAttribute("data-encryption-level", "error");
  });

  it("should prioritize initializing over encrypted", () => {
    render(
      <ChannelEncryptionStatus isEncrypted={true} isInitializing={true} />,
    );

    const status = screen.getByTestId("channel-encryption-status");
    expect(status).toHaveAttribute("data-encryption-level", "initializing");
  });

  it("should handle onClick", async () => {
    const onClick = jest.fn();
    render(<ChannelEncryptionStatus isEncrypted={true} onClick={onClick} />);

    const status = screen.getByTestId("channel-encryption-status");
    await userEvent.click(status);

    expect(onClick).toHaveBeenCalled();
  });

  it("should hide label when showLabel is false", () => {
    render(<ChannelEncryptionStatus isEncrypted={true} showLabel={false} />);

    expect(screen.queryByText("Encrypted")).not.toBeInTheDocument();
  });

  it("should apply size prop", () => {
    render(<ChannelEncryptionStatus isEncrypted={true} size="lg" />);

    const status = screen.getByTestId("channel-encryption-status");
    expect(status).toHaveClass("text-base");
  });

  it("should apply custom className", () => {
    render(<ChannelEncryptionStatus isEncrypted={true} className="custom" />);

    const status = screen.getByTestId("channel-encryption-status");
    expect(status).toHaveClass("custom");
  });
});

// ============================================================================
// MessageEncryptionIndicator Tests
// ============================================================================

describe("MessageEncryptionIndicator", () => {
  it("should render nothing when not encrypted", () => {
    const { container } = render(
      <MessageEncryptionIndicator isEncrypted={false} />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("should render lock icon when encrypted", () => {
    render(<MessageEncryptionIndicator isEncrypted={true} />);

    const indicator = screen.getByTestId("message-encrypted-indicator");
    expect(indicator).toBeInTheDocument();
    expect(indicator).toHaveAttribute("title", "Message is encrypted");
  });

  it("should have green color when encrypted", () => {
    render(<MessageEncryptionIndicator isEncrypted={true} />);

    const indicator = screen.getByTestId("message-encrypted-indicator");
    expect(indicator).toHaveClass("text-green-600");
  });

  it("should render error indicator when decryption failed", () => {
    render(
      <MessageEncryptionIndicator
        isEncrypted={true}
        isDecryptionFailed={true}
      />,
    );

    const indicator = screen.getByTestId("message-decryption-failed");
    expect(indicator).toBeInTheDocument();
    expect(indicator).toHaveAttribute("title", "Failed to decrypt message");
  });

  it("should have red color when decryption failed", () => {
    render(
      <MessageEncryptionIndicator
        isEncrypted={true}
        isDecryptionFailed={true}
      />,
    );

    const indicator = screen.getByTestId("message-decryption-failed");
    expect(indicator).toHaveClass("text-red-500");
  });

  it("should prioritize decryption failed over encrypted", () => {
    render(
      <MessageEncryptionIndicator
        isEncrypted={true}
        isDecryptionFailed={true}
      />,
    );

    expect(
      screen.queryByTestId("message-encrypted-indicator"),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("message-decryption-failed")).toBeInTheDocument();
  });

  it("should apply custom className", () => {
    render(
      <MessageEncryptionIndicator
        isEncrypted={true}
        className="custom-class"
      />,
    );

    const indicator = screen.getByTestId("message-encrypted-indicator");
    expect(indicator).toHaveClass("custom-class");
  });

  it("should have screen reader text", () => {
    render(<MessageEncryptionIndicator isEncrypted={true} />);

    expect(screen.getByText("Encrypted")).toHaveClass("sr-only");
  });

  it("should have screen reader text for failed decryption", () => {
    render(
      <MessageEncryptionIndicator
        isEncrypted={true}
        isDecryptionFailed={true}
      />,
    );

    expect(screen.getByText("Decryption failed")).toHaveClass("sr-only");
  });
});

// ============================================================================
// Icons Tests
// ============================================================================

describe("Icons", () => {
  it("should render unlock icon for none level", () => {
    render(
      <EncryptionBadge level="none" showTooltip={false} data-testid="badge" />,
    );

    const badge = screen.getByTestId("badge");
    const svg = badge.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });

  it("should render loader icon for initializing level", () => {
    render(
      <EncryptionBadge
        level="initializing"
        showTooltip={false}
        data-testid="badge"
      />,
    );

    const badge = screen.getByTestId("badge");
    const svg = badge.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass("animate-spin");
  });

  it("should render lock icon for encrypted level", () => {
    render(
      <EncryptionBadge
        level="encrypted"
        showTooltip={false}
        data-testid="badge"
      />,
    );

    const badge = screen.getByTestId("badge");
    const svg = badge.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("should render shield icon for verified level", () => {
    render(
      <EncryptionBadge
        level="verified"
        showTooltip={false}
        data-testid="badge"
      />,
    );

    const badge = screen.getByTestId("badge");
    const svg = badge.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("should render alert icon for error level", () => {
    render(
      <EncryptionBadge level="error" showTooltip={false} data-testid="badge" />,
    );

    const badge = screen.getByTestId("badge");
    const svg = badge.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });
});
