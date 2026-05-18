/**
 * EnhancedVideoPlayer Component Tests
 *
 * Comprehensive tests for the enhanced video player component.
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EnhancedVideoPlayer } from "../EnhancedVideoPlayer";

// ============================================================================
// Mocks
// ============================================================================

// Mock HTMLMediaElement methods
Object.defineProperty(HTMLMediaElement.prototype, "play", {
  configurable: true,
  value: jest.fn().mockResolvedValue(undefined),
});

Object.defineProperty(HTMLMediaElement.prototype, "pause", {
  configurable: true,
  value: jest.fn(),
});

// Mock fullscreen API
Object.defineProperty(document, "fullscreenElement", {
  configurable: true,
  writable: true,
  value: null,
});

Object.defineProperty(document, "exitFullscreen", {
  configurable: true,
  value: jest.fn().mockResolvedValue(undefined),
});

Object.defineProperty(HTMLElement.prototype, "requestFullscreen", {
  configurable: true,
  value: jest.fn().mockResolvedValue(undefined),
});

// Mock Picture-in-Picture API
Object.defineProperty(document, "pictureInPictureElement", {
  configurable: true,
  writable: true,
  value: null,
});

Object.defineProperty(document, "pictureInPictureEnabled", {
  configurable: true,
  writable: true,
  value: true,
});

Object.defineProperty(document, "exitPictureInPicture", {
  configurable: true,
  value: jest.fn().mockResolvedValue(undefined),
});

Object.defineProperty(HTMLVideoElement.prototype, "requestPictureInPicture", {
  configurable: true,
  value: jest.fn().mockResolvedValue(undefined),
});

// ============================================================================
// Test Helpers
// ============================================================================

const defaultProps = {
  src: "https://example.com/video.mp4",
};

function renderVideoPlayer(props = {}) {
  return render(<EnhancedVideoPlayer {...defaultProps} {...props} />);
}

// ============================================================================
// Tests
// ============================================================================

describe("EnhancedVideoPlayer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // Rendering Tests
  // ==========================================================================

  describe("Rendering", () => {
    it("should render the video player container", () => {
      renderVideoPlayer();
      expect(screen.getByTestId("enhanced-video-player")).toBeInTheDocument();
    });

    it("should render the video element", () => {
      renderVideoPlayer();
      expect(screen.getByTestId("video-element")).toBeInTheDocument();
    });

    it("should render the video with correct src", () => {
      renderVideoPlayer();
      const video = screen.getByTestId("video-element");
      expect(video).toHaveAttribute("src", defaultProps.src);
    });

    it("should render poster if provided", () => {
      const poster = "https://example.com/poster.jpg";
      renderVideoPlayer({ poster });
      const video = screen.getByTestId("video-element");
      expect(video).toHaveAttribute("poster", poster);
    });

    it("should render play overlay when paused", () => {
      renderVideoPlayer();
      expect(screen.getByTestId("play-overlay")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Controls Tests
  // ==========================================================================

  describe("Controls", () => {
    it("should render controls by default", () => {
      renderVideoPlayer();
      expect(screen.getByTestId("controls")).toBeInTheDocument();
    });

    it("should hide controls when showControls is false", () => {
      renderVideoPlayer({ showControls: false });
      expect(screen.queryByTestId("controls")).not.toBeInTheDocument();
    });

    it("should render play/pause button", () => {
      renderVideoPlayer();
      expect(screen.getByTestId("play-pause-button")).toBeInTheDocument();
    });

    it("should render skip buttons by default", () => {
      renderVideoPlayer();
      expect(screen.getByTestId("skip-back-button")).toBeInTheDocument();
      expect(screen.getByTestId("skip-forward-button")).toBeInTheDocument();
    });

    it("should hide skip buttons when showSkipButtons is false", () => {
      renderVideoPlayer({ showSkipButtons: false });
      expect(screen.queryByTestId("skip-back-button")).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("skip-forward-button"),
      ).not.toBeInTheDocument();
    });

    it("should render volume controls by default", () => {
      renderVideoPlayer();
      expect(screen.getByTestId("mute-button")).toBeInTheDocument();
      expect(screen.getByTestId("volume-slider")).toBeInTheDocument();
    });

    it("should hide volume controls when showVolume is false", () => {
      renderVideoPlayer({ showVolume: false });
      expect(screen.queryByTestId("mute-button")).not.toBeInTheDocument();
      expect(screen.queryByTestId("volume-slider")).not.toBeInTheDocument();
    });

    it("should render fullscreen button by default", () => {
      renderVideoPlayer();
      expect(screen.getByTestId("fullscreen-button")).toBeInTheDocument();
    });

    it("should hide fullscreen button when showFullscreen is false", () => {
      renderVideoPlayer({ showFullscreen: false });
      expect(screen.queryByTestId("fullscreen-button")).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Progress Bar Tests
  // ==========================================================================

  describe("Progress Bar", () => {
    it("should render progress slider by default", () => {
      renderVideoPlayer();
      expect(screen.getByTestId("progress-slider")).toBeInTheDocument();
    });

    it("should hide progress slider when showProgress is false", () => {
      renderVideoPlayer({ showProgress: false });
      expect(screen.queryByTestId("progress-slider")).not.toBeInTheDocument();
    });

    it("should render time display by default", () => {
      renderVideoPlayer();
      expect(screen.getByTestId("current-time")).toBeInTheDocument();
      expect(screen.getByTestId("duration")).toBeInTheDocument();
    });

    it("should hide time display when showTimeDisplay is false", () => {
      renderVideoPlayer({ showTimeDisplay: false });
      expect(screen.queryByTestId("current-time")).not.toBeInTheDocument();
      expect(screen.queryByTestId("duration")).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Playback Rate Tests
  // ==========================================================================

  describe("Playback Rate", () => {
    it("should render playback rate button by default", () => {
      renderVideoPlayer();
      expect(screen.getByTestId("playback-rate-button")).toBeInTheDocument();
    });

    it("should hide playback rate when showPlaybackRate is false", () => {
      renderVideoPlayer({ showPlaybackRate: false });
      expect(
        screen.queryByTestId("playback-rate-button"),
      ).not.toBeInTheDocument();
    });

    it("should show playback rate menu on click", async () => {
      renderVideoPlayer();
      const rateButton = screen.getByTestId("playback-rate-button");

      await userEvent.click(rateButton);

      expect(screen.getByTestId("playback-rate-menu")).toBeInTheDocument();
    });

    it("should display all playback rate options", async () => {
      renderVideoPlayer();
      const rateButton = screen.getByTestId("playback-rate-button");

      await userEvent.click(rateButton);

      expect(screen.getByTestId("rate-0.25")).toBeInTheDocument();
      expect(screen.getByTestId("rate-0.5")).toBeInTheDocument();
      expect(screen.getByTestId("rate-1")).toBeInTheDocument();
      expect(screen.getByTestId("rate-2")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Picture-in-Picture Tests
  // ==========================================================================

  describe("Picture-in-Picture", () => {
    it("should render PiP button when supported", () => {
      renderVideoPlayer();
      expect(screen.getByTestId("pip-button")).toBeInTheDocument();
    });

    it("should hide PiP button when showPictureInPicture is false", () => {
      renderVideoPlayer({ showPictureInPicture: false });
      expect(screen.queryByTestId("pip-button")).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Video Event Tests
  // ==========================================================================

  describe("Video Events", () => {
    it("should show buffering indicator when waiting", () => {
      renderVideoPlayer();
      const video = screen.getByTestId("video-element");

      fireEvent.waiting(video);

      expect(screen.getByTestId("buffering-indicator")).toBeInTheDocument();
    });

    it("should hide buffering indicator when playing", () => {
      renderVideoPlayer();
      const video = screen.getByTestId("video-element");

      fireEvent.waiting(video);
      expect(screen.getByTestId("buffering-indicator")).toBeInTheDocument();

      fireEvent.playing(video);
      expect(
        screen.queryByTestId("buffering-indicator"),
      ).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Callback Tests
  // ==========================================================================

  describe("Callbacks", () => {
    it("should call onPlay when play is triggered", async () => {
      const onPlay = jest.fn();
      renderVideoPlayer({ onPlay });
      const playButton = screen.getByTestId("play-pause-button");

      await userEvent.click(playButton);

      expect(onPlay).toHaveBeenCalledTimes(1);
    });

    it("should call onEnded when video ends", () => {
      const onEnded = jest.fn();
      renderVideoPlayer({ onEnded });
      const video = screen.getByTestId("video-element");

      fireEvent.ended(video);

      expect(onEnded).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe("Accessibility", () => {
    it("should have accessible role on container", () => {
      renderVideoPlayer();
      const container = screen.getByTestId("enhanced-video-player");
      expect(container).toHaveAttribute("role", "application");
    });

    it("should have accessible label on container", () => {
      renderVideoPlayer({ title: "Test Video" });
      const container = screen.getByTestId("enhanced-video-player");
      expect(container).toHaveAttribute(
        "aria-label",
        "Video player: Test Video",
      );
    });

    it("should have accessible labels on control buttons", () => {
      renderVideoPlayer();
      expect(screen.getByTestId("play-pause-button")).toHaveAttribute(
        "aria-label",
      );
      expect(screen.getByTestId("mute-button")).toHaveAttribute("aria-label");
      expect(screen.getByTestId("fullscreen-button")).toHaveAttribute(
        "aria-label",
      );
    });

    it("should be focusable with tabIndex", () => {
      renderVideoPlayer();
      const container = screen.getByTestId("enhanced-video-player");
      expect(container).toHaveAttribute("tabIndex", "0");
    });
  });
});
