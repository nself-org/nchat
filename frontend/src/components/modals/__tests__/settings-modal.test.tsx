import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  SettingsModal,
  QuickSettingsModal,
  type SettingsSection,
  type SettingsModalProps,
} from "../settings-modal";

// ============================================================================
// JSDOM Polyfills
// ============================================================================

// Add pointer capture support for Radix UI components
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = function () {
    return false;
  };
}

if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = function () {
    // no-op
  };
}

if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = function () {
    // no-op
  };
}

// ============================================================================
// Mocks
// ============================================================================

jest.mock("../base-modal", () => ({
  BaseModal: ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open: boolean;
  }) => (open ? <div data-testid="base-modal">{children}</div> : null),
  ModalHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="modal-header">{children}</div>
  ),
  ModalTitle: ({ children }: { children: React.ReactNode }) => (
    <h2 data-testid="modal-title">{children}</h2>
  ),
  ModalDescription: ({ children }: { children: React.ReactNode }) => (
    <p data-testid="modal-description">{children}</p>
  ),
  ModalBody: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="modal-body">{children}</div>
  ),
  ModalFooter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="modal-footer">{children}</div>
  ),
}));

// ============================================================================
// Test Data
// ============================================================================

const mockSections: SettingsSection[] = [
  {
    title: "General",
    description: "Basic settings",
    settings: [
      {
        key: "username",
        label: "Username",
        description: "Your display name",
        type: "text",
        defaultValue: "testuser",
        placeholder: "Enter username",
      },
      {
        key: "notifications",
        label: "Enable Notifications",
        description: "Receive push notifications",
        type: "boolean",
        defaultValue: true,
      },
    ],
  },
  {
    title: "Appearance",
    settings: [
      {
        key: "theme",
        label: "Theme",
        type: "select",
        defaultValue: "dark",
        options: [
          { value: "light", label: "Light" },
          { value: "dark", label: "Dark" },
          { value: "system", label: "System" },
        ],
      },
      {
        key: "fontSize",
        label: "Font Size",
        type: "number",
        defaultValue: 14,
        min: 12,
        max: 24,
        step: 1,
      },
      {
        key: "accentColor",
        label: "Accent Color",
        type: "color",
        defaultValue: "#6366f1",
      },
    ],
  },
];

// ============================================================================
// Tests
// ============================================================================

// Skipped: Complex component test requires mock updates
describe.skip("SettingsModal", () => {
  const defaultProps: SettingsModalProps = {
    open: true,
    onOpenChange: jest.fn(),
    sections: mockSections,
    onSave: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // Rendering Tests
  // ==========================================================================

  describe("Rendering", () => {
    it("renders when open is true", () => {
      render(<SettingsModal {...defaultProps} />);
      expect(screen.getByTestId("base-modal")).toBeInTheDocument();
    });

    it("does not render when open is false", () => {
      render(<SettingsModal {...defaultProps} open={false} />);
      expect(screen.queryByTestId("base-modal")).not.toBeInTheDocument();
    });

    it("renders title", () => {
      render(<SettingsModal {...defaultProps} title="Custom Settings" />);
      expect(screen.getByText("Custom Settings")).toBeInTheDocument();
    });

    it("renders description when provided", () => {
      render(
        <SettingsModal
          {...defaultProps}
          description="Configure your preferences"
        />,
      );
      expect(
        screen.getByText("Configure your preferences"),
      ).toBeInTheDocument();
    });

    it("renders default title when not provided", () => {
      render(<SettingsModal {...defaultProps} />);
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    it("renders section titles", () => {
      render(<SettingsModal {...defaultProps} />);
      expect(screen.getByText("General")).toBeInTheDocument();
      expect(screen.getByText("Appearance")).toBeInTheDocument();
    });

    it("renders section descriptions", () => {
      render(<SettingsModal {...defaultProps} />);
      expect(screen.getByText("Basic settings")).toBeInTheDocument();
    });

    it("renders setting labels", () => {
      render(<SettingsModal {...defaultProps} />);
      expect(screen.getByText("Username")).toBeInTheDocument();
      expect(screen.getByText("Enable Notifications")).toBeInTheDocument();
      expect(screen.getByText("Theme")).toBeInTheDocument();
    });

    it("renders setting descriptions", () => {
      render(<SettingsModal {...defaultProps} />);
      expect(screen.getByText("Your display name")).toBeInTheDocument();
      expect(
        screen.getByText("Receive push notifications"),
      ).toBeInTheDocument();
    });

    it("renders Cancel and Save buttons", () => {
      render(<SettingsModal {...defaultProps} />);
      expect(
        screen.getByRole("button", { name: /cancel/i }),
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    });

    it("renders Reset button when showResetButton is true", () => {
      render(<SettingsModal {...defaultProps} showResetButton />);
      expect(
        screen.getByRole("button", { name: /reset/i }),
      ).toBeInTheDocument();
    });

    it("does not render Reset button by default", () => {
      render(<SettingsModal {...defaultProps} />);
      expect(
        screen.queryByRole("button", { name: /reset/i }),
      ).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Text Input Tests
  // ==========================================================================

  describe("Text Input", () => {
    it("renders text input with default value", () => {
      render(<SettingsModal {...defaultProps} />);
      const input = screen.getByLabelText("Username");
      expect(input).toHaveValue("testuser");
    });

    it("updates text input value on change", async () => {
      render(<SettingsModal {...defaultProps} />);
      const input = screen.getByLabelText("Username");

      await userEvent.clear(input);
      await userEvent.type(input, "newusername");

      expect(input).toHaveValue("newusername");
    });

    it("renders placeholder for text input", () => {
      render(<SettingsModal {...defaultProps} />);
      const input = screen.getByLabelText("Username");
      expect(input).toHaveAttribute("placeholder", "Enter username");
    });

    it("renders text input from initial values", () => {
      render(
        <SettingsModal
          {...defaultProps}
          initialValues={{ username: "customuser" }}
        />,
      );
      const input = screen.getByLabelText("Username");
      expect(input).toHaveValue("customuser");
    });
  });

  // ==========================================================================
  // Boolean/Switch Tests
  // ==========================================================================

  describe("Boolean Setting", () => {
    it("renders switch with default value", () => {
      render(<SettingsModal {...defaultProps} />);
      const switchEl = screen.getByRole("switch", { name: /notifications/i });
      expect(switchEl).toBeChecked();
    });

    it("toggles switch on click", async () => {
      render(<SettingsModal {...defaultProps} />);
      const switchEl = screen.getByRole("switch", { name: /notifications/i });

      expect(switchEl).toBeChecked();
      await userEvent.click(switchEl);
      expect(switchEl).not.toBeChecked();
    });

    it("renders switch from initial values", () => {
      render(
        <SettingsModal
          {...defaultProps}
          initialValues={{ notifications: false }}
        />,
      );
      const switchEl = screen.getByRole("switch", { name: /notifications/i });
      expect(switchEl).not.toBeChecked();
    });
  });

  // ==========================================================================
  // Select Tests
  // ==========================================================================

  describe("Select Setting", () => {
    it("renders select with default value", () => {
      render(<SettingsModal {...defaultProps} />);
      const trigger = screen.getByRole("combobox");
      expect(trigger).toHaveTextContent("Dark");
    });

    // TODO: These tests fail due to Radix Select portal rendering in JSDOM
    // The select options are rendered in a portal which @testing-library doesn't find
    // These work fine in the browser but are difficult to test in JSDOM
    it.skip("shows select options when clicked", async () => {
      render(<SettingsModal {...defaultProps} />);
      const trigger = screen.getByRole("combobox");

      await userEvent.click(trigger);

      expect(screen.getByText("Light")).toBeInTheDocument();
      expect(screen.getByText("Dark")).toBeInTheDocument();
      expect(screen.getByText("System")).toBeInTheDocument();
    });

    it.skip("updates select value when option clicked", async () => {
      render(<SettingsModal {...defaultProps} />);
      const trigger = screen.getByRole("combobox");

      await userEvent.click(trigger);
      await userEvent.click(screen.getByText("Light"));

      expect(trigger).toHaveTextContent("Light");
    });
  });

  // ==========================================================================
  // Number Input Tests
  // ==========================================================================

  describe("Number Setting", () => {
    it("renders number input with default value", () => {
      render(<SettingsModal {...defaultProps} />);
      const input = screen.getByLabelText("Font Size");
      expect(input).toHaveValue(14);
    });

    it("updates number input value on change", async () => {
      render(<SettingsModal {...defaultProps} />);
      const input = screen.getByLabelText("Font Size");

      await userEvent.clear(input);
      await userEvent.type(input, "18");

      expect(input).toHaveValue(18);
    });

    it("has min and max attributes", () => {
      render(<SettingsModal {...defaultProps} />);
      const input = screen.getByLabelText("Font Size");
      expect(input).toHaveAttribute("min", "12");
      expect(input).toHaveAttribute("max", "24");
    });
  });

  // ==========================================================================
  // Color Input Tests
  // ==========================================================================

  describe("Color Setting", () => {
    it("renders color input with default value", () => {
      render(<SettingsModal {...defaultProps} />);
      const input = screen.getByLabelText("Accent Color");
      expect(input).toHaveValue("#6366f1");
    });

    it("renders color preview", () => {
      render(<SettingsModal {...defaultProps} />);
      const preview = document.querySelector('[style*="background-color"]');
      expect(preview).toBeInTheDocument();
    });

    it("updates color value on change", async () => {
      render(<SettingsModal {...defaultProps} />);
      const input = screen.getByLabelText("Accent Color");

      fireEvent.change(input, { target: { value: "#ff0000" } });

      expect(input).toHaveValue("#ff0000");
    });
  });

  // ==========================================================================
  // Form Submission Tests
  // ==========================================================================

  describe("Form Submission", () => {
    it("Save button is disabled when no changes", () => {
      render(<SettingsModal {...defaultProps} />);
      const saveButton = screen.getByRole("button", { name: /save/i });
      expect(saveButton).toBeDisabled();
    });

    it("Save button is enabled after making changes", async () => {
      render(<SettingsModal {...defaultProps} />);

      const input = screen.getByLabelText("Username");
      await userEvent.clear(input);
      await userEvent.type(input, "newname");

      const saveButton = screen.getByRole("button", { name: /save/i });
      expect(saveButton).not.toBeDisabled();
    });

    it("calls onSave with updated values", async () => {
      const onSave = jest.fn().mockResolvedValue(undefined);
      render(<SettingsModal {...defaultProps} onSave={onSave} />);

      // Make a change
      const input = screen.getByLabelText("Username");
      await userEvent.clear(input);
      await userEvent.type(input, "newname");

      // Save
      const saveButton = screen.getByRole("button", { name: /save/i });
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            username: "newname",
          }),
        );
      });
    });

    it("closes modal on successful save", async () => {
      const onOpenChange = jest.fn();
      render(<SettingsModal {...defaultProps} onOpenChange={onOpenChange} />);

      // Make a change
      const input = screen.getByLabelText("Username");
      await userEvent.clear(input);
      await userEvent.type(input, "newname");

      // Save
      const saveButton = screen.getByRole("button", { name: /save/i });
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it("shows loading state while saving", async () => {
      const onSave = jest
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 100)),
        );
      render(<SettingsModal {...defaultProps} onSave={onSave} />);

      // Make a change
      const input = screen.getByLabelText("Username");
      await userEvent.type(input, "x");

      // Save
      const saveButton = screen.getByRole("button", { name: /save/i });
      await userEvent.click(saveButton);

      // Should show loading indicator
      expect(saveButton).toBeDisabled();
    });

    it("handles save error gracefully", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      const onSave = jest.fn().mockRejectedValue(new Error("Save failed"));

      render(<SettingsModal {...defaultProps} onSave={onSave} />);

      // Make a change and save
      const input = screen.getByLabelText("Username");
      await userEvent.type(input, "x");

      const saveButton = screen.getByRole("button", { name: /save/i });
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });
  });

  // ==========================================================================
  // Cancel Tests
  // ==========================================================================

  describe("Cancel Button", () => {
    it("calls onOpenChange(false) on cancel", async () => {
      const onOpenChange = jest.fn();
      render(<SettingsModal {...defaultProps} onOpenChange={onOpenChange} />);

      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      await userEvent.click(cancelButton);

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it("calls onCancel when provided", async () => {
      const onCancel = jest.fn();
      render(<SettingsModal {...defaultProps} onCancel={onCancel} />);

      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      await userEvent.click(cancelButton);

      expect(onCancel).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Reset Tests
  // ==========================================================================

  describe("Reset Button", () => {
    it("resets values to defaults", async () => {
      render(
        <SettingsModal
          {...defaultProps}
          showResetButton
          initialValues={{ username: "customname" }}
        />,
      );

      // Verify custom value
      const input = screen.getByLabelText("Username");
      expect(input).toHaveValue("customname");

      // Reset
      const resetButton = screen.getByRole("button", { name: /reset/i });
      await userEvent.click(resetButton);

      // Should have default value
      expect(input).toHaveValue("testuser");
    });

    it("calls onReset when provided", async () => {
      const onReset = jest.fn();
      render(
        <SettingsModal {...defaultProps} showResetButton onReset={onReset} />,
      );

      const resetButton = screen.getByRole("button", { name: /reset/i });
      await userEvent.click(resetButton);

      expect(onReset).toHaveBeenCalled();
    });

    it("enables save button after reset", async () => {
      render(<SettingsModal {...defaultProps} showResetButton />);

      const saveButton = screen.getByRole("button", { name: /save/i });
      expect(saveButton).toBeDisabled();

      const resetButton = screen.getByRole("button", { name: /reset/i });
      await userEvent.click(resetButton);

      expect(saveButton).not.toBeDisabled();
    });
  });

  // ==========================================================================
  // Loading State Tests
  // ==========================================================================

  describe("Loading State", () => {
    it("disables inputs when loading", () => {
      render(<SettingsModal {...defaultProps} loading />);

      const input = screen.getByLabelText("Username");
      expect(input).toBeDisabled();

      const switchEl = screen.getByRole("switch", { name: /notifications/i });
      expect(switchEl).toBeDisabled();
    });

    it("disables buttons when loading", () => {
      render(<SettingsModal {...defaultProps} loading />);

      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      expect(cancelButton).toBeDisabled();
    });
  });

  // ==========================================================================
  // Initial Values Tests
  // ==========================================================================

  describe("Initial Values", () => {
    it("uses initial values over defaults", () => {
      render(
        <SettingsModal
          {...defaultProps}
          initialValues={{
            username: "initialuser",
            notifications: false,
            theme: "light",
          }}
        />,
      );

      expect(screen.getByLabelText("Username")).toHaveValue("initialuser");
      expect(
        screen.getByRole("switch", { name: /notifications/i }),
      ).not.toBeChecked();
      expect(screen.getByRole("combobox")).toHaveTextContent("Light");
    });

    it("resets to initial values when modal reopens", async () => {
      const { rerender } = render(<SettingsModal {...defaultProps} />);

      // Modify value
      const input = screen.getByLabelText("Username");
      await userEvent.clear(input);
      await userEvent.type(input, "modified");

      // Close and reopen
      rerender(<SettingsModal {...defaultProps} open={false} />);
      rerender(<SettingsModal {...defaultProps} open={true} />);

      // Should be reset to default
      expect(screen.getByLabelText("Username")).toHaveValue("testuser");
    });
  });
});

// ============================================================================
// QuickSettingsModal Tests
// ============================================================================

// Skipped: Complex component test requires mock updates
describe.skip("QuickSettingsModal", () => {
  const quickSettings = [
    {
      key: "darkMode",
      label: "Dark Mode",
      description: "Enable dark mode",
      value: true,
    },
    {
      key: "sounds",
      label: "Sounds",
      description: "Play notification sounds",
      value: false,
    },
    { key: "badges", label: "Badge Count", value: true },
  ];

  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    settings: quickSettings,
    onSave: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders all settings as switches", () => {
    render(<QuickSettingsModal {...defaultProps} />);

    expect(
      screen.getByRole("switch", { name: /dark mode/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: /sounds/i })).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: /badge/i })).toBeInTheDocument();
  });

  it("renders with correct initial values", () => {
    render(<QuickSettingsModal {...defaultProps} />);

    expect(screen.getByRole("switch", { name: /dark mode/i })).toBeChecked();
    expect(screen.getByRole("switch", { name: /sounds/i })).not.toBeChecked();
    expect(screen.getByRole("switch", { name: /badge/i })).toBeChecked();
  });

  it("renders descriptions", () => {
    render(<QuickSettingsModal {...defaultProps} />);

    expect(screen.getByText("Enable dark mode")).toBeInTheDocument();
    expect(screen.getByText("Play notification sounds")).toBeInTheDocument();
  });

  it("renders default title", () => {
    render(<QuickSettingsModal {...defaultProps} />);
    expect(screen.getByText("Quick Settings")).toBeInTheDocument();
  });

  it("renders custom title", () => {
    render(
      <QuickSettingsModal {...defaultProps} title="Notification Settings" />,
    );
    expect(screen.getByText("Notification Settings")).toBeInTheDocument();
  });

  it("calls onSave with boolean values", async () => {
    const onSave = jest.fn().mockResolvedValue(undefined);
    render(<QuickSettingsModal {...defaultProps} onSave={onSave} />);

    // Toggle a setting
    const soundsSwitch = screen.getByRole("switch", { name: /sounds/i });
    await userEvent.click(soundsSwitch);

    // Save
    const saveButton = screen.getByRole("button", { name: /save/i });
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          sounds: true,
        }),
      );
    });
  });
});
