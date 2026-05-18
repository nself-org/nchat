import { render, screen, fireEvent } from "@testing-library/react";
import {
  EmptyState,
  NoMessagesState,
  NoChannelsState,
  NoResultsState,
  NoMembersState,
  NoFilesState,
  NoNotificationsState,
  NoStarredState,
  EMPTY_STATE_PRESETS,
} from "../empty-state";
import { AlertCircle } from "lucide-react";

describe("EmptyState", () => {
  // ==========================================================================
  // Rendering Tests
  // ==========================================================================

  describe("Rendering", () => {
    it("renders with default props", () => {
      render(<EmptyState />);

      expect(screen.getByTestId("empty-state")).toBeInTheDocument();
      expect(screen.getByTestId("empty-state-icon")).toBeInTheDocument();
      expect(screen.getByTestId("empty-state-title")).toBeInTheDocument();
      expect(screen.getByTestId("empty-state-description")).toBeInTheDocument();
    });

    it("renders custom title", () => {
      render(<EmptyState title="Custom Title" />);
      expect(screen.getByTestId("empty-state-title")).toHaveTextContent(
        "Custom Title",
      );
    });

    it("renders custom description", () => {
      render(<EmptyState description="Custom description text" />);
      expect(screen.getByTestId("empty-state-description")).toHaveTextContent(
        "Custom description text",
      );
    });

    it("renders custom icon", () => {
      render(<EmptyState icon={AlertCircle} />);
      const iconContainer = screen.getByTestId("empty-state-icon");
      expect(iconContainer.querySelector("svg")).toBeInTheDocument();
    });

    it("renders action button when provided", () => {
      render(
        <EmptyState
          action={{
            label: "Click Me",
            onClick: jest.fn(),
          }}
        />,
      );
      expect(screen.getByTestId("empty-state-action")).toBeInTheDocument();
      expect(screen.getByText("Click Me")).toBeInTheDocument();
    });

    it("renders secondary action when provided", () => {
      render(
        <EmptyState
          secondaryAction={{
            label: "Secondary",
            onClick: jest.fn(),
          }}
        />,
      );
      expect(
        screen.getByTestId("empty-state-secondary-action"),
      ).toBeInTheDocument();
      expect(screen.getByText("Secondary")).toBeInTheDocument();
    });

    it("renders both actions when provided", () => {
      render(
        <EmptyState
          action={{ label: "Primary", onClick: jest.fn() }}
          secondaryAction={{ label: "Secondary", onClick: jest.fn() }}
        />,
      );
      expect(screen.getByTestId("empty-state-action")).toBeInTheDocument();
      expect(
        screen.getByTestId("empty-state-secondary-action"),
      ).toBeInTheDocument();
    });

    it("does not render actions container when no actions", () => {
      render(<EmptyState />);
      expect(
        screen.queryByTestId("empty-state-actions"),
      ).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Preset Tests
  // ==========================================================================

  describe("Presets", () => {
    it("renders no-messages preset", () => {
      render(<EmptyState type="no-messages" />);
      expect(screen.getByText("No messages yet")).toBeInTheDocument();
      expect(screen.getByText(/start the conversation/i)).toBeInTheDocument();
    });

    it("renders no-channels preset", () => {
      render(<EmptyState type="no-channels" />);
      expect(screen.getByText("No channels")).toBeInTheDocument();
      expect(screen.getByText(/create a channel/i)).toBeInTheDocument();
    });

    it("renders no-results preset", () => {
      render(<EmptyState type="no-results" />);
      expect(screen.getByText("No results found")).toBeInTheDocument();
      expect(screen.getByText(/try adjusting/i)).toBeInTheDocument();
    });

    it("renders no-members preset", () => {
      render(<EmptyState type="no-members" />);
      expect(screen.getByText("No members")).toBeInTheDocument();
      expect(screen.getByText(/invite people/i)).toBeInTheDocument();
    });

    it("renders no-files preset", () => {
      render(<EmptyState type="no-files" />);
      expect(screen.getByText("No files")).toBeInTheDocument();
      expect(screen.getByText(/files shared/i)).toBeInTheDocument();
    });

    it("renders no-notifications preset", () => {
      render(<EmptyState type="no-notifications" />);
      expect(screen.getByText("All caught up")).toBeInTheDocument();
      expect(screen.getByText(/no new notifications/i)).toBeInTheDocument();
    });

    it("renders no-starred preset", () => {
      render(<EmptyState type="no-starred" />);
      expect(screen.getByText("No starred items")).toBeInTheDocument();
      expect(screen.getByText(/star important/i)).toBeInTheDocument();
    });

    it("renders no-folder preset", () => {
      render(<EmptyState type="no-folder" />);
      expect(screen.getByText("This folder is empty")).toBeInTheDocument();
      expect(screen.getByText(/add files/i)).toBeInTheDocument();
    });

    it("allows overriding preset title", () => {
      render(<EmptyState type="no-messages" title="Custom Messages Title" />);
      expect(screen.getByText("Custom Messages Title")).toBeInTheDocument();
    });

    it("allows overriding preset description", () => {
      render(
        <EmptyState type="no-messages" description="Custom description" />,
      );
      expect(screen.getByText("Custom description")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Size Variants Tests
  // ==========================================================================

  describe("Size Variants", () => {
    it("renders small size", () => {
      render(<EmptyState size="sm" />);
      const emptyState = screen.getByTestId("empty-state");
      expect(emptyState).toHaveClass("py-8");
    });

    it("renders medium size (default)", () => {
      render(<EmptyState />);
      const emptyState = screen.getByTestId("empty-state");
      expect(emptyState).toHaveClass("py-12");
    });

    it("renders large size", () => {
      render(<EmptyState size="lg" />);
      const emptyState = screen.getByTestId("empty-state");
      expect(emptyState).toHaveClass("py-16");
    });

    it("adjusts icon container size for sm", () => {
      render(<EmptyState size="sm" />);
      const iconContainer = screen.getByTestId("empty-state-icon");
      expect(iconContainer).toHaveClass("h-12", "w-12");
    });

    it("adjusts icon container size for lg", () => {
      render(<EmptyState size="lg" />);
      const iconContainer = screen.getByTestId("empty-state-icon");
      expect(iconContainer).toHaveClass("h-20", "w-20");
    });

    it("adjusts title font size for sm", () => {
      render(<EmptyState size="sm" />);
      const title = screen.getByTestId("empty-state-title");
      expect(title).toHaveClass("text-sm");
    });

    it("adjusts title font size for lg", () => {
      render(<EmptyState size="lg" />);
      const title = screen.getByTestId("empty-state-title");
      expect(title).toHaveClass("text-xl");
    });
  });

  // ==========================================================================
  // Interaction Tests
  // ==========================================================================

  describe("Interactions", () => {
    it("calls onClick when action button clicked", () => {
      const onClick = jest.fn();
      render(
        <EmptyState
          action={{
            label: "Click Me",
            onClick,
          }}
        />,
      );

      fireEvent.click(screen.getByTestId("empty-state-action"));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("calls onClick when secondary action clicked", () => {
      const onClick = jest.fn();
      render(
        <EmptyState
          secondaryAction={{
            label: "Secondary",
            onClick,
          }}
        />,
      );

      fireEvent.click(screen.getByTestId("empty-state-secondary-action"));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("applies button variant to action", () => {
      render(
        <EmptyState
          action={{
            label: "Click Me",
            onClick: jest.fn(),
            variant: "outline",
          }}
        />,
      );

      const button = screen.getByTestId("empty-state-action");
      expect(button).toHaveClass("border");
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe("Accessibility", () => {
    it("has role status", () => {
      render(<EmptyState />);
      const emptyState = screen.getByTestId("empty-state");
      expect(emptyState).toHaveAttribute("role", "status");
    });

    it("has aria-label matching title", () => {
      render(<EmptyState title="Custom Title" />);
      const emptyState = screen.getByTestId("empty-state");
      expect(emptyState).toHaveAttribute("aria-label", "Custom Title");
    });

    it("action button is accessible", () => {
      render(
        <EmptyState
          action={{
            label: "Create Channel",
            onClick: jest.fn(),
          }}
        />,
      );

      const button = screen.getByRole("button", { name: "Create Channel" });
      expect(button).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Custom Props Tests
  // ==========================================================================

  describe("Custom Props", () => {
    it("applies custom className", () => {
      render(<EmptyState className="custom-class" />);
      const emptyState = screen.getByTestId("empty-state");
      expect(emptyState).toHaveClass("custom-class");
    });

    it("passes through additional props", () => {
      render(<EmptyState data-custom="test" />);
      const emptyState = screen.getByTestId("empty-state");
      expect(emptyState).toHaveAttribute("data-custom", "test");
    });
  });
});

// ============================================================================
// Convenience Component Tests
// ============================================================================

describe("Convenience Components", () => {
  describe("NoMessagesState", () => {
    it("renders no-messages preset", () => {
      render(<NoMessagesState />);
      expect(screen.getByText("No messages yet")).toBeInTheDocument();
    });

    it("allows custom props", () => {
      render(<NoMessagesState title="Custom" />);
      expect(screen.getByText("Custom")).toBeInTheDocument();
    });
  });

  describe("NoChannelsState", () => {
    it("renders no-channels preset", () => {
      render(<NoChannelsState />);
      expect(screen.getByText("No channels")).toBeInTheDocument();
    });
  });

  describe("NoResultsState", () => {
    it("renders no-results preset", () => {
      render(<NoResultsState />);
      expect(screen.getByText("No results found")).toBeInTheDocument();
    });
  });

  describe("NoMembersState", () => {
    it("renders no-members preset", () => {
      render(<NoMembersState />);
      expect(screen.getByText("No members")).toBeInTheDocument();
    });
  });

  describe("NoFilesState", () => {
    it("renders no-files preset", () => {
      render(<NoFilesState />);
      expect(screen.getByText("No files")).toBeInTheDocument();
    });
  });

  describe("NoNotificationsState", () => {
    it("renders no-notifications preset", () => {
      render(<NoNotificationsState />);
      expect(screen.getByText("All caught up")).toBeInTheDocument();
    });
  });

  describe("NoStarredState", () => {
    it("renders no-starred preset", () => {
      render(<NoStarredState />);
      expect(screen.getByText("No starred items")).toBeInTheDocument();
    });
  });
});

// ============================================================================
// Presets Export Test
// ============================================================================

describe("EMPTY_STATE_PRESETS", () => {
  it("exports all preset configurations", () => {
    expect(EMPTY_STATE_PRESETS).toHaveProperty("no-messages");
    expect(EMPTY_STATE_PRESETS).toHaveProperty("no-channels");
    expect(EMPTY_STATE_PRESETS).toHaveProperty("no-results");
    expect(EMPTY_STATE_PRESETS).toHaveProperty("no-members");
    expect(EMPTY_STATE_PRESETS).toHaveProperty("no-files");
    expect(EMPTY_STATE_PRESETS).toHaveProperty("no-notifications");
    expect(EMPTY_STATE_PRESETS).toHaveProperty("no-starred");
    expect(EMPTY_STATE_PRESETS).toHaveProperty("no-folder");
  });

  it("each preset has required properties", () => {
    Object.values(EMPTY_STATE_PRESETS).forEach((preset) => {
      expect(preset).toHaveProperty("icon");
      expect(preset).toHaveProperty("title");
      expect(preset).toHaveProperty("description");
    });
  });
});
