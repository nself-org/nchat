/**
 * Profile Avatar Component Tests
 *
 * @module components/profile/__tests__/profile-avatar.test
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProfileAvatar } from "../profile-avatar";

describe("ProfileAvatar", () => {
  // ============================================================================
  // Basic Rendering Tests
  // ============================================================================

  describe("basic rendering", () => {
    it("should render avatar with image when src provided", () => {
      render(
        <ProfileAvatar src="https://example.com/avatar.jpg" name="John Doe" />,
      );
      expect(screen.getByTestId("profile-avatar")).toBeInTheDocument();
    });

    it("should render initials when no src provided", () => {
      render(<ProfileAvatar name="John Doe" />);
      expect(screen.getByText("JD")).toBeInTheDocument();
    });

    it("should render single name initials correctly", () => {
      render(<ProfileAvatar name="John" />);
      expect(screen.getByText("JO")).toBeInTheDocument();
    });

    it("should handle multi-word names for initials", () => {
      render(<ProfileAvatar name="John Michael Doe" />);
      expect(screen.getByText("JD")).toBeInTheDocument();
    });

    it("should fallback to User icon when no name", () => {
      render(<ProfileAvatar />);
      expect(screen.getByTestId("profile-avatar")).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Size Variants Tests
  // ============================================================================

  describe("size variants", () => {
    it("should render small size", () => {
      render(<ProfileAvatar size="sm" name="JD" />);
      expect(screen.getByTestId("profile-avatar")).toBeInTheDocument();
    });

    it("should render medium size (default)", () => {
      render(<ProfileAvatar size="md" name="JD" />);
      expect(screen.getByTestId("profile-avatar")).toBeInTheDocument();
    });

    it("should render large size", () => {
      render(<ProfileAvatar size="lg" name="JD" />);
      expect(screen.getByTestId("profile-avatar")).toBeInTheDocument();
    });

    it("should render extra large size", () => {
      render(<ProfileAvatar size="xl" name="JD" />);
      expect(screen.getByTestId("profile-avatar")).toBeInTheDocument();
    });

    it("should render 2xl size", () => {
      render(<ProfileAvatar size="2xl" name="JD" />);
      expect(screen.getByTestId("profile-avatar")).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Online Indicator Tests
  // ============================================================================

  describe("online indicator", () => {
    it("should show online indicator when enabled and online", () => {
      render(<ProfileAvatar name="JD" showOnlineIndicator isOnline />);
      expect(screen.getByTestId("online-indicator-online")).toBeInTheDocument();
    });

    it("should show offline indicator when enabled and offline", () => {
      render(<ProfileAvatar name="JD" showOnlineIndicator isOnline={false} />);
      expect(
        screen.getByTestId("online-indicator-offline"),
      ).toBeInTheDocument();
    });

    it("should not show indicator when disabled", () => {
      render(<ProfileAvatar name="JD" showOnlineIndicator={false} />);
      expect(
        screen.queryByTestId("online-indicator-online"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("online-indicator-offline"),
      ).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Editable Mode Tests
  // ============================================================================

  describe("editable mode", () => {
    it("should show upload button when editable", () => {
      render(<ProfileAvatar name="JD" editable onUpload={() => {}} />);

      // Hover to show actions
      fireEvent.mouseEnter(screen.getByTestId("profile-avatar"));
      expect(screen.getByTestId("avatar-upload-button")).toBeInTheDocument();
    });

    it("should show delete button when editable and has src", () => {
      render(
        <ProfileAvatar
          src="https://example.com/avatar.jpg"
          name="JD"
          editable
          onUpload={() => {}}
          onDelete={() => {}}
        />,
      );

      fireEvent.mouseEnter(screen.getByTestId("profile-avatar"));
      expect(screen.getByTestId("avatar-delete-button")).toBeInTheDocument();
    });

    it("should not show delete button when no src", () => {
      render(
        <ProfileAvatar
          name="JD"
          editable
          onUpload={() => {}}
          onDelete={() => {}}
        />,
      );

      fireEvent.mouseEnter(screen.getByTestId("profile-avatar"));
      expect(
        screen.queryByTestId("avatar-delete-button"),
      ).not.toBeInTheDocument();
    });

    it("should call onUpload when upload button clicked", () => {
      const onUpload = jest.fn();
      render(<ProfileAvatar name="JD" editable onUpload={onUpload} />);

      fireEvent.mouseEnter(screen.getByTestId("profile-avatar"));
      fireEvent.click(screen.getByTestId("avatar-upload-button"));
      expect(onUpload).toHaveBeenCalled();
    });

    it("should call onDelete when delete button clicked", () => {
      const onDelete = jest.fn();
      render(
        <ProfileAvatar
          src="https://example.com/avatar.jpg"
          name="JD"
          editable
          onUpload={() => {}}
          onDelete={onDelete}
        />,
      );

      fireEvent.mouseEnter(screen.getByTestId("profile-avatar"));
      fireEvent.click(screen.getByTestId("avatar-delete-button"));
      expect(onDelete).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Loading State Tests
  // ============================================================================

  describe("loading state", () => {
    it("should show loading spinner when uploading", () => {
      render(
        <ProfileAvatar name="JD" editable isUploading onUpload={() => {}} />,
      );

      // Loading overlay should be visible
      expect(screen.getByTestId("profile-avatar")).toBeInTheDocument();
    });

    it("should hide action buttons when uploading", () => {
      render(
        <ProfileAvatar
          src="https://example.com/avatar.jpg"
          name="JD"
          editable
          isUploading
          onUpload={() => {}}
          onDelete={() => {}}
        />,
      );

      expect(
        screen.queryByTestId("avatar-upload-button"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("avatar-delete-button"),
      ).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Custom Class Tests
  // ============================================================================

  describe("custom styling", () => {
    it("should apply custom className", () => {
      render(<ProfileAvatar name="JD" className="custom-class" />);
      expect(screen.getByTestId("profile-avatar")).toHaveClass("custom-class");
    });
  });
});
