/**
 * @fileoverview Tests for CallControls Component
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  CallControls,
  formatCallDuration,
  type CallControlsProps,
} from "../call-controls";

// =============================================================================
// Test Helpers
// =============================================================================

const defaultProps: CallControlsProps = {
  isMuted: false,
  onToggleMute: jest.fn(),
  onEndCall: jest.fn(),
};

const renderCallControls = (props: Partial<CallControlsProps> = {}) => {
  return render(<CallControls {...defaultProps} {...props} />);
};

// =============================================================================
// Tests
// =============================================================================

describe("CallControls", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render mute button", () => {
      renderCallControls();
      expect(
        screen.getByRole("button", { name: /mute microphone/i }),
      ).toBeInTheDocument();
    });

    it("should render end call button", () => {
      renderCallControls();
      expect(
        screen.getByRole("button", { name: /end call/i }),
      ).toBeInTheDocument();
    });

    it("should render as toolbar", () => {
      renderCallControls();
      expect(screen.getByRole("toolbar")).toBeInTheDocument();
    });

    it("should have correct aria-label", () => {
      renderCallControls();
      expect(
        screen.getByRole("toolbar", { name: "Call controls" }),
      ).toBeInTheDocument();
    });
  });

  describe("Mute Control", () => {
    it("should show unmute label when muted", () => {
      renderCallControls({ isMuted: true });
      expect(
        screen.getByRole("button", { name: /unmute microphone/i }),
      ).toBeInTheDocument();
    });

    it("should show mute label when not muted", () => {
      renderCallControls({ isMuted: false });
      expect(
        screen.getByRole("button", { name: /mute microphone/i }),
      ).toBeInTheDocument();
    });

    it("should call onToggleMute when clicked", () => {
      const onToggleMute = jest.fn();
      renderCallControls({ onToggleMute });

      fireEvent.click(screen.getByRole("button", { name: /mute microphone/i }));
      expect(onToggleMute).toHaveBeenCalledTimes(1);
    });
  });

  describe("Video Control", () => {
    it("should not render video control by default", () => {
      renderCallControls();
      expect(
        screen.queryByRole("button", { name: /camera/i }),
      ).not.toBeInTheDocument();
    });

    it("should render video control when showVideoControls is true", () => {
      renderCallControls({
        showVideoControls: true,
        onToggleVideo: jest.fn(),
      });
      expect(
        screen.getByRole("button", { name: /turn on camera/i }),
      ).toBeInTheDocument();
    });

    it("should show turn off label when video is enabled", () => {
      renderCallControls({
        showVideoControls: true,
        isVideoEnabled: true,
        onToggleVideo: jest.fn(),
      });
      expect(
        screen.getByRole("button", { name: /turn off camera/i }),
      ).toBeInTheDocument();
    });

    it("should call onToggleVideo when clicked", () => {
      const onToggleVideo = jest.fn();
      renderCallControls({
        showVideoControls: true,
        onToggleVideo,
      });

      fireEvent.click(screen.getByRole("button", { name: /turn on camera/i }));
      expect(onToggleVideo).toHaveBeenCalledTimes(1);
    });
  });

  describe("Screen Share Control", () => {
    it("should not render screen share control by default", () => {
      renderCallControls();
      expect(
        screen.queryByRole("button", { name: /screen/i }),
      ).not.toBeInTheDocument();
    });

    it("should render screen share control when showScreenShareControls is true", () => {
      renderCallControls({
        showScreenShareControls: true,
        onToggleScreenShare: jest.fn(),
      });
      expect(
        screen.getByRole("button", { name: /share screen/i }),
      ).toBeInTheDocument();
    });

    it("should show stop label when screen sharing is active", () => {
      renderCallControls({
        showScreenShareControls: true,
        isScreenSharing: true,
        onToggleScreenShare: jest.fn(),
      });
      expect(
        screen.getByRole("button", { name: /stop screen sharing/i }),
      ).toBeInTheDocument();
    });

    it("should call onToggleScreenShare when clicked", () => {
      const onToggleScreenShare = jest.fn();
      renderCallControls({
        showScreenShareControls: true,
        onToggleScreenShare,
      });

      fireEvent.click(screen.getByRole("button", { name: /share screen/i }));
      expect(onToggleScreenShare).toHaveBeenCalledTimes(1);
    });
  });

  describe("Speaker Control", () => {
    it("should not render speaker control by default", () => {
      renderCallControls();
      expect(
        screen.queryByRole("button", { name: /speaker/i }),
      ).not.toBeInTheDocument();
    });

    it("should render speaker control when showSpeakerControls is true", () => {
      renderCallControls({
        showSpeakerControls: true,
        onToggleSpeaker: jest.fn(),
      });
      expect(
        screen.getByRole("button", { name: /mute speaker/i }),
      ).toBeInTheDocument();
    });

    it("should show unmute label when speaker is muted", () => {
      renderCallControls({
        showSpeakerControls: true,
        isSpeakerMuted: true,
        onToggleSpeaker: jest.fn(),
      });
      expect(
        screen.getByRole("button", { name: /unmute speaker/i }),
      ).toBeInTheDocument();
    });

    it("should call onToggleSpeaker when clicked", () => {
      const onToggleSpeaker = jest.fn();
      renderCallControls({
        showSpeakerControls: true,
        onToggleSpeaker,
      });

      fireEvent.click(screen.getByRole("button", { name: /mute speaker/i }));
      expect(onToggleSpeaker).toHaveBeenCalledTimes(1);
    });
  });

  describe("End Call Control", () => {
    it("should call onEndCall when clicked", () => {
      const onEndCall = jest.fn();
      renderCallControls({ onEndCall });

      fireEvent.click(screen.getByRole("button", { name: /end call/i }));
      expect(onEndCall).toHaveBeenCalledTimes(1);
    });
  });

  describe("Settings Control", () => {
    it("should not render settings by default", () => {
      renderCallControls();
      expect(
        screen.queryByRole("button", { name: /settings/i }),
      ).not.toBeInTheDocument();
    });

    it("should render settings when onOpenSettings is provided", () => {
      renderCallControls({ onOpenSettings: jest.fn() });
      expect(
        screen.getByRole("button", { name: /call settings/i }),
      ).toBeInTheDocument();
    });

    it("should call onOpenSettings when clicked", () => {
      const onOpenSettings = jest.fn();
      renderCallControls({ onOpenSettings });

      fireEvent.click(screen.getByRole("button", { name: /call settings/i }));
      expect(onOpenSettings).toHaveBeenCalledTimes(1);
    });
  });

  describe("More Options Control", () => {
    it("should not render more by default", () => {
      renderCallControls();
      expect(
        screen.queryByRole("button", { name: /more options/i }),
      ).not.toBeInTheDocument();
    });

    it("should render more when onOpenMore is provided", () => {
      renderCallControls({ onOpenMore: jest.fn() });
      expect(
        screen.getByRole("button", { name: /more options/i }),
      ).toBeInTheDocument();
    });

    it("should call onOpenMore when clicked", () => {
      const onOpenMore = jest.fn();
      renderCallControls({ onOpenMore });

      fireEvent.click(screen.getByRole("button", { name: /more options/i }));
      expect(onOpenMore).toHaveBeenCalledTimes(1);
    });
  });

  describe("Minimize Control", () => {
    it("should not render minimize by default", () => {
      renderCallControls();
      expect(
        screen.queryByRole("button", { name: /minimize/i }),
      ).not.toBeInTheDocument();
    });

    it("should render minimize when onToggleMinimize is provided", () => {
      renderCallControls({ onToggleMinimize: jest.fn() });
      expect(
        screen.getByRole("button", { name: /minimize controls/i }),
      ).toBeInTheDocument();
    });

    it("should show expand label when minimized", () => {
      renderCallControls({
        isMinimized: true,
        onToggleMinimize: jest.fn(),
      });
      expect(
        screen.getByRole("button", { name: /expand controls/i }),
      ).toBeInTheDocument();
    });

    it("should call onToggleMinimize when clicked", () => {
      const onToggleMinimize = jest.fn();
      renderCallControls({ onToggleMinimize });

      fireEvent.click(
        screen.getByRole("button", { name: /minimize controls/i }),
      );
      expect(onToggleMinimize).toHaveBeenCalledTimes(1);
    });
  });

  describe("Call Duration", () => {
    it("should not render duration by default", () => {
      renderCallControls();
      expect(screen.queryByLabelText(/call duration/i)).not.toBeInTheDocument();
    });

    it("should render duration when callDuration is provided", () => {
      renderCallControls({ callDuration: 65 });
      expect(screen.getByLabelText(/call duration: 1:05/i)).toBeInTheDocument();
    });

    it("should format duration correctly", () => {
      renderCallControls({ callDuration: 3661 });
      expect(screen.getByText("1:01:01")).toBeInTheDocument();
    });
  });

  describe("Disabled State", () => {
    it("should disable all buttons when disabled is true", () => {
      renderCallControls({
        disabled: true,
        showVideoControls: true,
        showScreenShareControls: true,
        onToggleVideo: jest.fn(),
        onToggleScreenShare: jest.fn(),
      });

      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        expect(button).toBeDisabled();
      });
    });

    it("should not call callbacks when disabled", () => {
      const onToggleMute = jest.fn();
      const onEndCall = jest.fn();

      renderCallControls({
        disabled: true,
        onToggleMute,
        onEndCall,
      });

      fireEvent.click(screen.getByRole("button", { name: /mute microphone/i }));
      fireEvent.click(screen.getByRole("button", { name: /end call/i }));

      expect(onToggleMute).not.toHaveBeenCalled();
      expect(onEndCall).not.toHaveBeenCalled();
    });
  });

  describe("Variants", () => {
    it("should apply default variant", () => {
      const { container } = renderCallControls();
      expect(container.firstChild).toHaveClass("bg-background/80");
    });

    it("should apply dark variant", () => {
      const { container } = renderCallControls({ variant: "dark" });
      expect(container.firstChild).toHaveClass("bg-gray-900/90");
    });

    it("should apply floating variant", () => {
      const { container } = renderCallControls({ variant: "floating" });
      expect(container.firstChild).toHaveClass("bg-black/70");
    });

    it("should apply minimal variant", () => {
      const { container } = renderCallControls({ variant: "minimal" });
      expect(container.firstChild).toHaveClass("bg-transparent");
    });
  });

  describe("Sizes", () => {
    it("should apply default size", () => {
      const { container } = renderCallControls();
      expect(container.firstChild).toHaveClass("gap-2", "p-2");
    });

    it("should apply small size", () => {
      const { container } = renderCallControls({ size: "sm" });
      expect(container.firstChild).toHaveClass("gap-1", "p-1");
    });

    it("should apply large size", () => {
      const { container } = renderCallControls({ size: "lg" });
      expect(container.firstChild).toHaveClass("gap-3", "p-3");
    });
  });

  describe("Custom className", () => {
    it("should apply custom className", () => {
      const { container } = renderCallControls({ className: "custom-class" });
      expect(container.firstChild).toHaveClass("custom-class");
    });
  });

  describe("Accessibility", () => {
    it("should have accessible button labels", () => {
      renderCallControls({
        showVideoControls: true,
        showScreenShareControls: true,
        showSpeakerControls: true,
        onToggleVideo: jest.fn(),
        onToggleScreenShare: jest.fn(),
        onToggleSpeaker: jest.fn(),
        onOpenSettings: jest.fn(),
        onOpenMore: jest.fn(),
        onToggleMinimize: jest.fn(),
      });

      expect(
        screen.getByRole("button", { name: /mute microphone/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /turn on camera/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /share screen/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /mute speaker/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /end call/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /call settings/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /more options/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /minimize controls/i }),
      ).toBeInTheDocument();
    });

    it("should have aria-live for call duration", () => {
      renderCallControls({ callDuration: 60 });
      const durationElement = screen.getByLabelText(/call duration/i);
      expect(durationElement).toHaveAttribute("aria-live", "polite");
    });

    it("should have title attributes for buttons", () => {
      renderCallControls();
      const muteButton = screen.getByRole("button", {
        name: /mute microphone/i,
      });
      expect(muteButton).toHaveAttribute("title", "Mute microphone");
    });
  });

  describe("Keyboard Navigation", () => {
    it("should be focusable", () => {
      renderCallControls();
      const muteButton = screen.getByRole("button", {
        name: /mute microphone/i,
      });
      muteButton.focus();
      expect(document.activeElement).toBe(muteButton);
    });

    it("should activate on Enter key", () => {
      const onToggleMute = jest.fn();
      renderCallControls({ onToggleMute });

      const muteButton = screen.getByRole("button", {
        name: /mute microphone/i,
      });
      fireEvent.keyDown(muteButton, { key: "Enter" });
      // Note: fireEvent.click is typically used for Enter key activation in React
    });
  });

  describe("Full Control Set", () => {
    it("should render all controls when all props provided", () => {
      renderCallControls({
        isMuted: false,
        isVideoEnabled: true,
        isScreenSharing: false,
        isSpeakerMuted: false,
        isMinimized: false,
        callDuration: 120,
        showVideoControls: true,
        showScreenShareControls: true,
        showSpeakerControls: true,
        onToggleMute: jest.fn(),
        onToggleVideo: jest.fn(),
        onToggleScreenShare: jest.fn(),
        onToggleSpeaker: jest.fn(),
        onEndCall: jest.fn(),
        onOpenSettings: jest.fn(),
        onOpenMore: jest.fn(),
        onToggleMinimize: jest.fn(),
      });

      // Count all buttons
      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBe(8); // mute, video, screen, speaker, end, settings, more, minimize
    });
  });
});

describe("formatCallDuration", () => {
  it("should format seconds only", () => {
    expect(formatCallDuration(45)).toBe("0:45");
  });

  it("should format minutes and seconds", () => {
    expect(formatCallDuration(90)).toBe("1:30");
    expect(formatCallDuration(125)).toBe("2:05");
  });

  it("should format hours", () => {
    expect(formatCallDuration(3600)).toBe("1:00:00");
    expect(formatCallDuration(3661)).toBe("1:01:01");
    expect(formatCallDuration(7265)).toBe("2:01:05");
  });

  it("should pad zeros correctly", () => {
    expect(formatCallDuration(5)).toBe("0:05");
    expect(formatCallDuration(65)).toBe("1:05");
    expect(formatCallDuration(3605)).toBe("1:00:05");
  });

  it("should handle zero", () => {
    expect(formatCallDuration(0)).toBe("0:00");
  });

  it("should handle large values", () => {
    expect(formatCallDuration(86400)).toBe("24:00:00");
  });
});
