import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  UserStatusSelector,
  PresenceIndicator,
  EmojiPicker,
  getPresenceConfig,
  calculateExpiryDate,
  type PresenceStatus,
  type CustomStatus,
  type ClearAfterOption,
} from "../user-status-selector";

// ============================================================================
// Tests
// ============================================================================

describe("UserStatusSelector", () => {
  const defaultProps = {
    currentPresence: "online" as PresenceStatus,
    currentStatus: undefined as CustomStatus | undefined,
    onPresenceChange: jest.fn(),
    onStatusChange: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // Rendering Tests
  // ==========================================================================

  describe("Rendering", () => {
    it("renders trigger button", () => {
      render(<UserStatusSelector {...defaultProps} />);
      expect(screen.getByTestId("status-selector-trigger")).toBeInTheDocument();
    });

    it("displays current presence label", () => {
      render(<UserStatusSelector {...defaultProps} />);
      expect(screen.getByText("Online")).toBeInTheDocument();
    });

    it("displays custom status text when set", () => {
      render(
        <UserStatusSelector
          {...defaultProps}
          currentStatus={{ text: "Working from home" }}
        />,
      );
      expect(screen.getByText("Working from home")).toBeInTheDocument();
    });

    it("displays custom status emoji when set", () => {
      render(
        <UserStatusSelector
          {...defaultProps}
          currentStatus={{ emoji: "🏠", text: "WFH" }}
        />,
      );
      expect(screen.getByText(/🏠/)).toBeInTheDocument();
    });

    it("disables trigger when disabled prop is true", () => {
      render(<UserStatusSelector {...defaultProps} disabled />);
      expect(screen.getByTestId("status-selector-trigger")).toBeDisabled();
    });
  });

  // ==========================================================================
  // Popover Tests
  // ==========================================================================

  describe("Popover", () => {
    it("opens popover when trigger clicked", async () => {
      render(<UserStatusSelector {...defaultProps} />);

      await userEvent.click(screen.getByTestId("status-selector-trigger"));

      expect(screen.getByTestId("presence-options")).toBeInTheDocument();
    });

    it("shows set status button", async () => {
      render(<UserStatusSelector {...defaultProps} />);

      await userEvent.click(screen.getByTestId("status-selector-trigger"));

      expect(screen.getByTestId("set-status-button")).toBeInTheDocument();
    });

    it("shows all presence options", async () => {
      render(<UserStatusSelector {...defaultProps} />);

      await userEvent.click(screen.getByTestId("status-selector-trigger"));

      expect(screen.getByTestId("presence-option-online")).toBeInTheDocument();
      expect(screen.getByTestId("presence-option-away")).toBeInTheDocument();
      expect(screen.getByTestId("presence-option-dnd")).toBeInTheDocument();
      expect(screen.getByTestId("presence-option-offline")).toBeInTheDocument();
    });

    it("highlights current presence", async () => {
      render(<UserStatusSelector {...defaultProps} currentPresence="away" />);

      await userEvent.click(screen.getByTestId("status-selector-trigger"));

      const awayOption = screen.getByTestId("presence-option-away");
      expect(awayOption).toHaveClass("bg-accent");
    });

    it("shows clear button when status is set", async () => {
      render(
        <UserStatusSelector
          {...defaultProps}
          currentStatus={{ emoji: "🏠", text: "WFH" }}
        />,
      );

      await userEvent.click(screen.getByTestId("status-selector-trigger"));

      expect(screen.getByTestId("clear-status-button")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Presence Change Tests
  // ==========================================================================

  describe("Presence Change", () => {
    it("calls onPresenceChange when presence option clicked", async () => {
      const onPresenceChange = jest.fn();
      render(
        <UserStatusSelector
          {...defaultProps}
          onPresenceChange={onPresenceChange}
        />,
      );

      await userEvent.click(screen.getByTestId("status-selector-trigger"));
      await userEvent.click(screen.getByTestId("presence-option-away"));

      expect(onPresenceChange).toHaveBeenCalledWith("away");
    });

    it("closes popover after presence change", async () => {
      render(<UserStatusSelector {...defaultProps} />);

      await userEvent.click(screen.getByTestId("status-selector-trigger"));
      await userEvent.click(screen.getByTestId("presence-option-dnd"));

      expect(screen.queryByTestId("presence-options")).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Status Form Tests
  // ==========================================================================

  describe("Status Form", () => {
    it("shows status form when set status clicked", async () => {
      render(<UserStatusSelector {...defaultProps} />);

      await userEvent.click(screen.getByTestId("status-selector-trigger"));
      await userEvent.click(screen.getByTestId("set-status-button"));

      expect(screen.getByTestId("status-form")).toBeInTheDocument();
    });

    it("shows status text input", async () => {
      render(<UserStatusSelector {...defaultProps} />);

      await userEvent.click(screen.getByTestId("status-selector-trigger"));
      await userEvent.click(screen.getByTestId("set-status-button"));

      expect(screen.getByTestId("status-text-input")).toBeInTheDocument();
    });

    it("shows emoji picker trigger", async () => {
      render(<UserStatusSelector {...defaultProps} />);

      await userEvent.click(screen.getByTestId("status-selector-trigger"));
      await userEvent.click(screen.getByTestId("set-status-button"));

      expect(screen.getByTestId("emoji-picker-trigger")).toBeInTheDocument();
    });

    it("shows clear after select", async () => {
      render(<UserStatusSelector {...defaultProps} />);

      await userEvent.click(screen.getByTestId("status-selector-trigger"));
      await userEvent.click(screen.getByTestId("set-status-button"));

      expect(screen.getByTestId("clear-after-select")).toBeInTheDocument();
    });

    it("opens emoji picker when trigger clicked", async () => {
      render(<UserStatusSelector {...defaultProps} />);

      await userEvent.click(screen.getByTestId("status-selector-trigger"));
      await userEvent.click(screen.getByTestId("set-status-button"));
      await userEvent.click(screen.getByTestId("emoji-picker-trigger"));

      expect(screen.getByTestId("emoji-picker")).toBeInTheDocument();
    });

    it("selects emoji from picker", async () => {
      render(<UserStatusSelector {...defaultProps} />);

      await userEvent.click(screen.getByTestId("status-selector-trigger"));
      await userEvent.click(screen.getByTestId("set-status-button"));
      await userEvent.click(screen.getByTestId("emoji-picker-trigger"));
      await userEvent.click(screen.getByTestId("emoji-😀"));

      expect(screen.getByTestId("emoji-picker-trigger")).toHaveTextContent(
        "😀",
      );
    });

    it("updates status text on input", async () => {
      render(<UserStatusSelector {...defaultProps} />);

      await userEvent.click(screen.getByTestId("status-selector-trigger"));
      await userEvent.click(screen.getByTestId("set-status-button"));

      const input = screen.getByTestId("status-text-input");
      await userEvent.type(input, "In a meeting");

      expect(input).toHaveValue("In a meeting");
    });

    it("disables save button when no text or emoji", async () => {
      render(<UserStatusSelector {...defaultProps} />);

      await userEvent.click(screen.getByTestId("status-selector-trigger"));
      await userEvent.click(screen.getByTestId("set-status-button"));

      expect(screen.getByTestId("save-status-button")).toBeDisabled();
    });

    it("enables save button when text is entered", async () => {
      render(<UserStatusSelector {...defaultProps} />);

      await userEvent.click(screen.getByTestId("status-selector-trigger"));
      await userEvent.click(screen.getByTestId("set-status-button"));

      const input = screen.getByTestId("status-text-input");
      await userEvent.type(input, "Busy");

      expect(screen.getByTestId("save-status-button")).not.toBeDisabled();
    });

    it("enables save button when emoji is selected", async () => {
      render(<UserStatusSelector {...defaultProps} />);

      await userEvent.click(screen.getByTestId("status-selector-trigger"));
      await userEvent.click(screen.getByTestId("set-status-button"));
      await userEvent.click(screen.getByTestId("emoji-picker-trigger"));
      await userEvent.click(screen.getByTestId("emoji-😀"));

      expect(screen.getByTestId("save-status-button")).not.toBeDisabled();
    });

    it("calls onStatusChange with status data on save", async () => {
      const onStatusChange = jest.fn().mockResolvedValue(undefined);
      render(
        <UserStatusSelector
          {...defaultProps}
          onStatusChange={onStatusChange}
        />,
      );

      await userEvent.click(screen.getByTestId("status-selector-trigger"));
      await userEvent.click(screen.getByTestId("set-status-button"));

      // Select emoji
      await userEvent.click(screen.getByTestId("emoji-picker-trigger"));
      await userEvent.click(screen.getByTestId("emoji-☕"));

      // Enter text
      const input = screen.getByTestId("status-text-input");
      await userEvent.type(input, "Coffee break");

      // Save
      await userEvent.click(screen.getByTestId("save-status-button"));

      await waitFor(() => {
        expect(onStatusChange).toHaveBeenCalledWith({
          emoji: "☕",
          text: "Coffee break",
          expiresAt: undefined,
        });
      });
    });

    it("closes popover after successful save", async () => {
      render(<UserStatusSelector {...defaultProps} />);

      await userEvent.click(screen.getByTestId("status-selector-trigger"));
      await userEvent.click(screen.getByTestId("set-status-button"));

      const input = screen.getByTestId("status-text-input");
      await userEvent.type(input, "Test");

      await userEvent.click(screen.getByTestId("save-status-button"));

      await waitFor(() => {
        expect(screen.queryByTestId("status-form")).not.toBeInTheDocument();
      });
    });

    it("returns to presence options on cancel", async () => {
      render(<UserStatusSelector {...defaultProps} />);

      await userEvent.click(screen.getByTestId("status-selector-trigger"));
      await userEvent.click(screen.getByTestId("set-status-button"));

      // Click cancel
      await userEvent.click(screen.getByRole("button", { name: /cancel/i }));

      expect(screen.queryByTestId("status-form")).not.toBeInTheDocument();
      expect(screen.getByTestId("presence-options")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Clear Status Tests
  // ==========================================================================

  describe("Clear Status", () => {
    it("calls onStatusChange with null when clear clicked", async () => {
      const onStatusChange = jest.fn().mockResolvedValue(undefined);
      render(
        <UserStatusSelector
          {...defaultProps}
          currentStatus={{ text: "Test" }}
          onStatusChange={onStatusChange}
        />,
      );

      await userEvent.click(screen.getByTestId("status-selector-trigger"));
      await userEvent.click(screen.getByTestId("clear-status-button"));

      await waitFor(() => {
        expect(onStatusChange).toHaveBeenCalledWith(null);
      });
    });

    it("closes popover after clearing status", async () => {
      render(
        <UserStatusSelector
          {...defaultProps}
          currentStatus={{ text: "Test" }}
        />,
      );

      await userEvent.click(screen.getByTestId("status-selector-trigger"));
      await userEvent.click(screen.getByTestId("clear-status-button"));

      await waitFor(() => {
        expect(
          screen.queryByTestId("clear-status-button"),
        ).not.toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // Clear After Tests
  // ==========================================================================

  describe("Clear After", () => {
    it("includes expiry date when clear after is set", async () => {
      const onStatusChange = jest.fn().mockResolvedValue(undefined);
      render(
        <UserStatusSelector
          {...defaultProps}
          onStatusChange={onStatusChange}
        />,
      );

      await userEvent.click(screen.getByTestId("status-selector-trigger"));
      await userEvent.click(screen.getByTestId("set-status-button"));

      // Enter text
      const input = screen.getByTestId("status-text-input");
      await userEvent.type(input, "Test");

      // Select clear after
      const selectTrigger = screen.getByTestId("clear-after-select");
      await userEvent.click(selectTrigger);
      await userEvent.click(screen.getByText("1 hour"));

      // Save
      await userEvent.click(screen.getByTestId("save-status-button"));

      await waitFor(() => {
        expect(onStatusChange).toHaveBeenCalledWith(
          expect.objectContaining({
            text: "Test",
            expiresAt: expect.any(Date),
          }),
        );
      });
    });
  });
});

// ============================================================================
// PresenceIndicator Tests
// ============================================================================

describe("PresenceIndicator", () => {
  it("renders with correct color for online", () => {
    render(<PresenceIndicator presence="online" />);
    const indicator = screen.getByTestId("presence-indicator-online");
    expect(indicator).toHaveClass("bg-green-500");
  });

  it("renders with correct color for away", () => {
    render(<PresenceIndicator presence="away" />);
    const indicator = screen.getByTestId("presence-indicator-away");
    expect(indicator).toHaveClass("bg-yellow-500");
  });

  it("renders with correct color for dnd", () => {
    render(<PresenceIndicator presence="dnd" />);
    const indicator = screen.getByTestId("presence-indicator-dnd");
    expect(indicator).toHaveClass("bg-red-500");
  });

  it("renders with correct color for offline", () => {
    render(<PresenceIndicator presence="offline" />);
    const indicator = screen.getByTestId("presence-indicator-offline");
    expect(indicator).toHaveClass("bg-gray-400");
  });

  it("renders correct size for sm", () => {
    render(<PresenceIndicator presence="online" size="sm" />);
    const indicator = screen.getByTestId("presence-indicator-online");
    expect(indicator).toHaveClass("h-2", "w-2");
  });

  it("renders correct size for md", () => {
    render(<PresenceIndicator presence="online" size="md" />);
    const indicator = screen.getByTestId("presence-indicator-online");
    expect(indicator).toHaveClass("h-3", "w-3");
  });

  it("renders correct size for lg", () => {
    render(<PresenceIndicator presence="online" size="lg" />);
    const indicator = screen.getByTestId("presence-indicator-online");
    expect(indicator).toHaveClass("h-4", "w-4");
  });

  it("has accessible label", () => {
    render(<PresenceIndicator presence="online" />);
    const indicator = screen.getByTestId("presence-indicator-online");
    expect(indicator).toHaveAttribute("aria-label", "Online");
  });
});

// ============================================================================
// EmojiPicker Tests
// ============================================================================

describe("EmojiPicker", () => {
  it("renders preset emojis", () => {
    render(<EmojiPicker onSelect={jest.fn()} />);

    expect(screen.getByTestId("emoji-😀")).toBeInTheDocument();
    expect(screen.getByTestId("emoji-😊")).toBeInTheDocument();
    expect(screen.getByTestId("emoji-🎉")).toBeInTheDocument();
  });

  it("calls onSelect when emoji clicked", async () => {
    const onSelect = jest.fn();
    render(<EmojiPicker onSelect={onSelect} />);

    await userEvent.click(screen.getByTestId("emoji-☕"));

    expect(onSelect).toHaveBeenCalledWith("☕");
  });
});

// ============================================================================
// Helper Function Tests
// ============================================================================

describe("getPresenceConfig", () => {
  it("returns correct config for online", () => {
    const config = getPresenceConfig("online");
    expect(config.label).toBe("Online");
    expect(config.color).toBe("bg-green-500");
  });

  it("returns correct config for away", () => {
    const config = getPresenceConfig("away");
    expect(config.label).toBe("Away");
    expect(config.color).toBe("bg-yellow-500");
  });

  it("returns correct config for dnd", () => {
    const config = getPresenceConfig("dnd");
    expect(config.label).toBe("Do Not Disturb");
    expect(config.color).toBe("bg-red-500");
  });

  it("returns correct config for offline", () => {
    const config = getPresenceConfig("offline");
    expect(config.label).toBe("Invisible");
    expect(config.color).toBe("bg-gray-400");
  });
});

describe("calculateExpiryDate", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2025-01-15T12:00:00Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns undefined for never", () => {
    const result = calculateExpiryDate("never");
    expect(result).toBeUndefined();
  });

  it("returns date 30 minutes in future for 30min", () => {
    const result = calculateExpiryDate("30min");
    expect(result).toEqual(new Date("2025-01-15T12:30:00Z"));
  });

  it("returns date 1 hour in future for 1hour", () => {
    const result = calculateExpiryDate("1hour");
    expect(result).toEqual(new Date("2025-01-15T13:00:00Z"));
  });

  it("returns date 4 hours in future for 4hours", () => {
    const result = calculateExpiryDate("4hours");
    expect(result).toEqual(new Date("2025-01-15T16:00:00Z"));
  });

  it("returns end of today for today", () => {
    const result = calculateExpiryDate("today");
    expect(result?.getHours()).toBe(23);
    expect(result?.getMinutes()).toBe(59);
  });

  it("returns end of tomorrow for tomorrow", () => {
    const result = calculateExpiryDate("tomorrow");
    expect(result?.getDate()).toBe(16);
    expect(result?.getHours()).toBe(23);
  });
});
