/**
 * Privacy Settings Form Component Tests
 *
 * @module components/profile/__tests__/privacy-settings-form.test
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PrivacySettingsForm } from "../privacy-settings-form";
import { DEFAULT_PRIVACY_SETTINGS } from "@/types/profile";

describe("PrivacySettingsForm", () => {
  const mockOnChange = jest.fn();
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
    mockOnSubmit.mockClear();
  });

  // ============================================================================
  // Basic Rendering Tests
  // ============================================================================

  describe("basic rendering", () => {
    it("should render all privacy sections", () => {
      render(
        <PrivacySettingsForm
          settings={DEFAULT_PRIVACY_SETTINGS}
          onChange={mockOnChange}
          onSubmit={mockOnSubmit}
        />,
      );

      expect(screen.getByText("Online Status & Presence")).toBeInTheDocument();
      expect(screen.getByText("Profile Visibility")).toBeInTheDocument();
      expect(screen.getByText("Messaging & Calls")).toBeInTheDocument();
      expect(screen.getByText("Profile Discovery")).toBeInTheDocument();
    });

    it("should render save button", () => {
      render(
        <PrivacySettingsForm
          settings={DEFAULT_PRIVACY_SETTINGS}
          onChange={mockOnChange}
          onSubmit={mockOnSubmit}
        />,
      );

      expect(screen.getByTestId("save-privacy-button")).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Online Status Section Tests
  // ============================================================================

  describe("online status section", () => {
    it("should render online status select", () => {
      render(
        <PrivacySettingsForm
          settings={DEFAULT_PRIVACY_SETTINGS}
          onChange={mockOnChange}
          onSubmit={mockOnSubmit}
        />,
      );

      expect(screen.getByTestId("online-status-select")).toBeInTheDocument();
    });

    it("should render last seen select", () => {
      render(
        <PrivacySettingsForm
          settings={DEFAULT_PRIVACY_SETTINGS}
          onChange={mockOnChange}
          onSubmit={mockOnSubmit}
        />,
      );

      expect(screen.getByTestId("last-seen-select")).toBeInTheDocument();
    });

    it("should render typing indicator switch", () => {
      render(
        <PrivacySettingsForm
          settings={DEFAULT_PRIVACY_SETTINGS}
          onChange={mockOnChange}
          onSubmit={mockOnSubmit}
        />,
      );

      expect(screen.getByTestId("typing-indicator-switch")).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Profile Visibility Section Tests
  // ============================================================================

  describe("profile visibility section", () => {
    it("should render profile photo select", () => {
      render(
        <PrivacySettingsForm
          settings={DEFAULT_PRIVACY_SETTINGS}
          onChange={mockOnChange}
          onSubmit={mockOnSubmit}
        />,
      );

      expect(screen.getByTestId("profile-photo-select")).toBeInTheDocument();
    });

    it("should render bio select", () => {
      render(
        <PrivacySettingsForm
          settings={DEFAULT_PRIVACY_SETTINGS}
          onChange={mockOnChange}
          onSubmit={mockOnSubmit}
        />,
      );

      expect(screen.getByTestId("bio-select")).toBeInTheDocument();
    });

    it("should render phone select", () => {
      render(
        <PrivacySettingsForm
          settings={DEFAULT_PRIVACY_SETTINGS}
          onChange={mockOnChange}
          onSubmit={mockOnSubmit}
        />,
      );

      expect(screen.getByTestId("phone-select")).toBeInTheDocument();
    });

    it("should render show email switch", () => {
      render(
        <PrivacySettingsForm
          settings={DEFAULT_PRIVACY_SETTINGS}
          onChange={mockOnChange}
          onSubmit={mockOnSubmit}
        />,
      );

      expect(screen.getByTestId("show-email-switch")).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Messaging & Calls Section Tests
  // ============================================================================

  describe("messaging & calls section", () => {
    it("should render add to groups select", () => {
      render(
        <PrivacySettingsForm
          settings={DEFAULT_PRIVACY_SETTINGS}
          onChange={mockOnChange}
          onSubmit={mockOnSubmit}
        />,
      );

      expect(screen.getByTestId("add-to-groups-select")).toBeInTheDocument();
    });

    it("should render calls select", () => {
      render(
        <PrivacySettingsForm
          settings={DEFAULT_PRIVACY_SETTINGS}
          onChange={mockOnChange}
          onSubmit={mockOnSubmit}
        />,
      );

      expect(screen.getByTestId("calls-select")).toBeInTheDocument();
    });

    it("should render read receipts switch", () => {
      render(
        <PrivacySettingsForm
          settings={DEFAULT_PRIVACY_SETTINGS}
          onChange={mockOnChange}
          onSubmit={mockOnSubmit}
        />,
      );

      expect(screen.getByTestId("read-receipts-switch")).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Profile Discovery Section Tests
  // ============================================================================

  describe("profile discovery section", () => {
    it("should render searchable by username switch", () => {
      render(
        <PrivacySettingsForm
          settings={DEFAULT_PRIVACY_SETTINGS}
          onChange={mockOnChange}
          onSubmit={mockOnSubmit}
        />,
      );

      expect(
        screen.getByTestId("searchable-username-switch"),
      ).toBeInTheDocument();
    });

    it("should render searchable by email switch", () => {
      render(
        <PrivacySettingsForm
          settings={DEFAULT_PRIVACY_SETTINGS}
          onChange={mockOnChange}
          onSubmit={mockOnSubmit}
        />,
      );

      expect(screen.getByTestId("searchable-email-switch")).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Interaction Tests
  // ============================================================================

  describe("interactions", () => {
    it("should call onChange when switch is toggled", () => {
      render(
        <PrivacySettingsForm
          settings={DEFAULT_PRIVACY_SETTINGS}
          onChange={mockOnChange}
          onSubmit={mockOnSubmit}
        />,
      );

      fireEvent.click(screen.getByTestId("read-receipts-switch"));
      expect(mockOnChange).toHaveBeenCalledWith({ readReceipts: false });
    });

    it("should call onSubmit when form is submitted", async () => {
      mockOnSubmit.mockResolvedValue(undefined);

      render(
        <PrivacySettingsForm
          settings={DEFAULT_PRIVACY_SETTINGS}
          onChange={mockOnChange}
          onSubmit={mockOnSubmit}
        />,
      );

      // Make a change first (button is disabled without changes)
      fireEvent.click(screen.getByTestId("read-receipts-switch"));

      // Submit the form
      fireEvent.click(screen.getByTestId("save-privacy-button"));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });
    });

    it("should disable save button when no changes made", () => {
      render(
        <PrivacySettingsForm
          settings={DEFAULT_PRIVACY_SETTINGS}
          onChange={mockOnChange}
          onSubmit={mockOnSubmit}
        />,
      );

      expect(screen.getByTestId("save-privacy-button")).toBeDisabled();
    });

    it("should enable save button after changes", () => {
      render(
        <PrivacySettingsForm
          settings={DEFAULT_PRIVACY_SETTINGS}
          onChange={mockOnChange}
          onSubmit={mockOnSubmit}
        />,
      );

      fireEvent.click(screen.getByTestId("read-receipts-switch"));
      expect(screen.getByTestId("save-privacy-button")).not.toBeDisabled();
    });
  });

  // ============================================================================
  // Loading State Tests
  // ============================================================================

  describe("loading state", () => {
    it("should disable save button when loading", () => {
      render(
        <PrivacySettingsForm
          settings={DEFAULT_PRIVACY_SETTINGS}
          onChange={mockOnChange}
          onSubmit={mockOnSubmit}
          isLoading
        />,
      );

      expect(screen.getByTestId("save-privacy-button")).toBeDisabled();
    });
  });

  // ============================================================================
  // Current Values Tests
  // ============================================================================

  describe("current values", () => {
    it("should reflect current read receipts setting", () => {
      const customSettings = {
        ...DEFAULT_PRIVACY_SETTINGS,
        readReceipts: false,
      };

      render(
        <PrivacySettingsForm
          settings={customSettings}
          onChange={mockOnChange}
          onSubmit={mockOnSubmit}
        />,
      );

      const switchElement = screen.getByTestId("read-receipts-switch");
      expect(switchElement).toHaveAttribute("data-state", "unchecked");
    });

    it("should reflect current typing indicator setting", () => {
      const customSettings = {
        ...DEFAULT_PRIVACY_SETTINGS,
        typingIndicator: false,
      };

      render(
        <PrivacySettingsForm
          settings={customSettings}
          onChange={mockOnChange}
          onSubmit={mockOnSubmit}
        />,
      );

      const switchElement = screen.getByTestId("typing-indicator-switch");
      expect(switchElement).toHaveAttribute("data-state", "unchecked");
    });
  });
});
