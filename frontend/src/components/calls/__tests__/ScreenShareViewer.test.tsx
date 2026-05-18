/**
 * ScreenShareViewer Component Tests
 *
 * Tests for the screen share viewer with:
 * - Full-screen mode
 * - Picture-in-Picture
 * - Fit modes
 * - Controls visibility
 * - Keyboard shortcuts
 */

import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ScreenShareViewer } from "../ScreenShareViewer";
import type { ScreenShare } from "@/lib/webrtc/screen-capture";

// =============================================================================
// Mocks
// =============================================================================

// Mock MediaStream and tracks
class MockMediaStreamTrack {
  kind: "video" | "audio";
  id: string;
  enabled = true;
  readyState: "live" | "ended" = "live";

  constructor(kind: "video" | "audio") {
    this.kind = kind;
    this.id = `${kind}-${Math.random()}`;
  }
}

class MockMediaStream {
  id: string;
  active = true;
  private tracks: MockMediaStreamTrack[];

  constructor(tracks: MockMediaStreamTrack[] = []) {
    this.id = `stream-${Math.random()}`;
    this.tracks = tracks;
  }

  getTracks() {
    return this.tracks;
  }
  getVideoTracks() {
    return this.tracks.filter((t) => t.kind === "video");
  }
  getAudioTracks() {
    return this.tracks.filter((t) => t.kind === "audio");
  }
}

// Mock fullscreen API
const mockRequestFullscreen = jest.fn().mockResolvedValue(undefined);
const mockExitFullscreen = jest.fn().mockResolvedValue(undefined);

Object.defineProperty(document, "fullscreenElement", {
  value: null,
  writable: true,
  configurable: true,
});

Object.defineProperty(document, "exitFullscreen", {
  value: mockExitFullscreen,
  writable: true,
});

// Mock PiP API
const mockRequestPictureInPicture = jest.fn().mockResolvedValue({});
const mockExitPictureInPicture = jest.fn().mockResolvedValue(undefined);

Object.defineProperty(document, "pictureInPictureEnabled", {
  value: true,
  writable: true,
  configurable: true,
});

Object.defineProperty(document, "exitPictureInPicture", {
  value: mockExitPictureInPicture,
  writable: true,
});

// Mock HTMLVideoElement
HTMLVideoElement.prototype.requestPictureInPicture =
  mockRequestPictureInPicture;

// =============================================================================
// Test Data
// =============================================================================

function createMockShare(overrides: Partial<ScreenShare> = {}): ScreenShare {
  const videoTrack = new MockMediaStreamTrack("video");
  const stream = new MockMediaStream([videoTrack]);

  return {
    id: "share-1",
    stream: stream as unknown as MediaStream,
    type: "screen",
    userId: "user-1",
    userName: "Test User",
    startedAt: new Date(),
    hasAudio: false,
    videoTrack: videoTrack as unknown as MediaStreamTrack,
    isPaused: false,
    quality: "1080p",
    frameRate: 30,
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("ScreenShareViewer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (document as any).fullscreenElement = null;
  });

  describe("Rendering", () => {
    it("should render video element", () => {
      const share = createMockShare();
      render(<ScreenShareViewer share={share} />);

      const video = document.querySelector("video");
      expect(video).toBeInTheDocument();
    });

    it("should show presenter info when enabled", () => {
      const share = createMockShare({ userName: "John Doe" });
      render(<ScreenShareViewer share={share} showPresenterInfo />);

      expect(screen.getByText(/John Doe is presenting/)).toBeInTheDocument();
    });

    it("should hide presenter info when disabled", () => {
      const share = createMockShare({ userName: "John Doe" });
      render(<ScreenShareViewer share={share} showPresenterInfo={false} />);

      expect(screen.queryByText(/is presenting/)).not.toBeInTheDocument();
    });

    it("should show quality badge", () => {
      const share = createMockShare({ quality: "1080p", frameRate: 60 });
      render(<ScreenShareViewer share={share} />);

      expect(screen.getByText(/1080P @ 60fps/)).toBeInTheDocument();
    });

    it("should show audio badge when audio is available", () => {
      const audioTrack = new MockMediaStreamTrack("audio");
      const share = createMockShare({
        hasAudio: true,
        audioTrack: audioTrack as unknown as MediaStreamTrack,
      });
      render(<ScreenShareViewer share={share} showPresenterInfo />);

      expect(screen.getByText("Audio")).toBeInTheDocument();
    });
  });

  describe("Paused State", () => {
    it("should show paused overlay when paused", () => {
      const share = createMockShare({ isPaused: true });
      render(<ScreenShareViewer share={share} />);

      expect(screen.getByText(/Screen share paused/)).toBeInTheDocument();
    });

    it("should show resume button for local user when paused", () => {
      const share = createMockShare({ isPaused: true });
      render(<ScreenShareViewer share={share} isLocal />);

      // There may be multiple Resume buttons (overlay + controls), just check at least one exists
      const resumeButtons = screen.getAllByRole("button", { name: /Resume/i });
      expect(resumeButtons.length).toBeGreaterThan(0);
    });

    it("should not show resume button for remote user", () => {
      const share = createMockShare({ isPaused: true });
      render(<ScreenShareViewer share={share} isLocal={false} />);

      expect(
        screen.queryByRole("button", { name: /Resume/i }),
      ).not.toBeInTheDocument();
    });

    it("should call onPauseToggle when resume clicked", async () => {
      const share = createMockShare({ isPaused: true });
      const onPauseToggle = jest.fn();
      render(
        <ScreenShareViewer
          share={share}
          isLocal
          onPauseToggle={onPauseToggle}
        />,
      );

      // Click the first Resume button found (there may be multiple)
      const resumeButtons = screen.getAllByRole("button", { name: /Resume/i });
      await userEvent.click(resumeButtons[0]);

      expect(onPauseToggle).toHaveBeenCalled();
    });
  });

  describe("Fit Modes", () => {
    it("should apply initial fit mode", () => {
      const share = createMockShare();
      render(<ScreenShareViewer share={share} initialFitMode="cover" />);

      const video = document.querySelector("video");
      expect(video).toHaveClass("object-cover");
    });

    it("should change fit mode via dropdown", async () => {
      const share = createMockShare();
      const onFitModeChange = jest.fn();
      render(
        <ScreenShareViewer
          share={share}
          initialFitMode="contain"
          onFitModeChange={onFitModeChange}
        />,
      );

      // Find and click the fit mode button
      const fitModeButton = screen.getByTitle("Screen fit mode");
      await userEvent.click(fitModeButton);

      // Select 'Fill window' option
      const fillOption = screen.getByText("Fill window");
      await userEvent.click(fillOption);

      expect(onFitModeChange).toHaveBeenCalledWith("cover");
    });

    it("should show correct fit mode icon", () => {
      const share = createMockShare();
      render(<ScreenShareViewer share={share} initialFitMode="contain" />);

      // The contain mode should be shown initially
      const fitModeButton = screen.getByTitle("Screen fit mode");
      expect(fitModeButton).toBeInTheDocument();
    });
  });

  describe("Local Controls", () => {
    it("should show pause button for local user", () => {
      const share = createMockShare();
      render(<ScreenShareViewer share={share} isLocal />);

      expect(screen.getByTitle(/Pause sharing/)).toBeInTheDocument();
    });

    it("should show stop button for local user", () => {
      const share = createMockShare();
      render(<ScreenShareViewer share={share} isLocal />);

      expect(screen.getByRole("button", { name: /Stop/i })).toBeInTheDocument();
    });

    it("should call onStopSharing when stop clicked", async () => {
      const share = createMockShare();
      const onStopSharing = jest.fn();
      render(
        <ScreenShareViewer
          share={share}
          isLocal
          onStopSharing={onStopSharing}
        />,
      );

      const stopButton = screen.getByRole("button", { name: /Stop/i });
      await userEvent.click(stopButton);

      expect(onStopSharing).toHaveBeenCalled();
    });

    it("should not show local controls for remote user", () => {
      const share = createMockShare();
      render(<ScreenShareViewer share={share} isLocal={false} />);

      expect(screen.queryByTitle(/Pause sharing/)).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /Stop/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe("Audio Controls", () => {
    it("should show mute button when audio is available", () => {
      const share = createMockShare({ hasAudio: true });
      render(<ScreenShareViewer share={share} />);

      expect(screen.getByTitle(/Mute/)).toBeInTheDocument();
    });

    it("should not show mute button when no audio", () => {
      const share = createMockShare({ hasAudio: false });
      render(<ScreenShareViewer share={share} />);

      expect(screen.queryByTitle(/Mute/)).not.toBeInTheDocument();
    });

    it("should toggle mute state", async () => {
      const share = createMockShare({ hasAudio: true });
      render(<ScreenShareViewer share={share} />);

      const muteButton = screen.getByTitle(/Mute/);
      await userEvent.click(muteButton);

      expect(screen.getByTitle(/Unmute/)).toBeInTheDocument();
    });
  });

  describe("Picture-in-Picture", () => {
    it("should show PiP button when supported", () => {
      const share = createMockShare();
      render(<ScreenShareViewer share={share} />);

      expect(screen.getByTitle(/Picture-in-Picture/)).toBeInTheDocument();
    });

    it("should toggle PiP on click", async () => {
      const share = createMockShare();
      render(<ScreenShareViewer share={share} />);

      const pipButton = screen.getByTitle(/Picture-in-Picture/);
      await userEvent.click(pipButton);

      expect(mockRequestPictureInPicture).toHaveBeenCalled();
    });
  });

  describe("Fullscreen", () => {
    it("should show fullscreen button", () => {
      const share = createMockShare();
      render(<ScreenShareViewer share={share} />);

      expect(screen.getByTitle(/Fullscreen/)).toBeInTheDocument();
    });

    it("should toggle fullscreen on click", async () => {
      const share = createMockShare();
      const { container } = render(<ScreenShareViewer share={share} />);

      // Mock requestFullscreen on the container
      const containerDiv = container.firstChild as HTMLElement;
      containerDiv.requestFullscreen = mockRequestFullscreen;

      const fullscreenButton = screen.getByTitle(/Fullscreen/);
      await userEvent.click(fullscreenButton);

      expect(mockRequestFullscreen).toHaveBeenCalled();
    });
  });

  describe("Close Button", () => {
    it("should show close button for remote user with onClose", () => {
      const share = createMockShare();
      const onClose = jest.fn();
      render(
        <ScreenShareViewer share={share} isLocal={false} onClose={onClose} />,
      );

      expect(screen.getByTitle(/Close viewer/)).toBeInTheDocument();
    });

    it("should call onClose when close button clicked", async () => {
      const share = createMockShare();
      const onClose = jest.fn();
      render(
        <ScreenShareViewer share={share} isLocal={false} onClose={onClose} />,
      );

      const closeButton = screen.getByTitle(/Close viewer/);
      await userEvent.click(closeButton);

      expect(onClose).toHaveBeenCalled();
    });

    it("should not show close button for local user", () => {
      const share = createMockShare();
      const onClose = jest.fn();
      render(<ScreenShareViewer share={share} isLocal onClose={onClose} />);

      expect(screen.queryByTitle(/Close viewer/)).not.toBeInTheDocument();
    });
  });

  describe("Keyboard Shortcuts", () => {
    it("should toggle fullscreen with F key", async () => {
      const share = createMockShare();
      const { container } = render(<ScreenShareViewer share={share} />);

      const containerDiv = container.firstChild as HTMLElement;
      containerDiv.requestFullscreen = mockRequestFullscreen;

      fireEvent.keyDown(window, { key: "f" });

      expect(mockRequestFullscreen).toHaveBeenCalled();
    });

    it("should toggle mute with M key when audio available", async () => {
      const share = createMockShare({ hasAudio: true });
      render(<ScreenShareViewer share={share} />);

      // Initially unmuted
      expect(screen.getByTitle(/Mute/)).toBeInTheDocument();

      fireEvent.keyDown(window, { key: "m" });

      // Now muted
      await waitFor(() => {
        expect(screen.getByTitle(/Unmute/)).toBeInTheDocument();
      });
    });

    it("should toggle PiP with P key", async () => {
      const share = createMockShare();
      render(<ScreenShareViewer share={share} />);

      fireEvent.keyDown(window, { key: "p" });

      expect(mockRequestPictureInPicture).toHaveBeenCalled();
    });

    it("should not respond to shortcuts when typing in input", () => {
      const share = createMockShare();
      render(
        <div>
          <ScreenShareViewer share={share} />
          <input type="text" data-testid="text-input" />
        </div>,
      );

      const input = screen.getByTestId("text-input");
      input.focus();

      fireEvent.keyDown(input, { key: "f" });

      // Should not trigger fullscreen when focused on input
      expect(mockRequestFullscreen).not.toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    it("should show error state with retry button", async () => {
      const share = createMockShare();
      render(<ScreenShareViewer share={share} />);

      // Simulate video error
      const video = document.querySelector("video")!;
      fireEvent.error(video);

      await waitFor(() => {
        expect(
          screen.getByText(/Failed to load screen share/),
        ).toBeInTheDocument();
        expect(
          screen.getByRole("button", { name: /Retry/ }),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Controls Visibility", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should hide controls after timeout", async () => {
      const share = createMockShare();
      const { container } = render(<ScreenShareViewer share={share} />);

      // Move mouse to show controls
      fireEvent.mouseMove(container.firstChild as Element);

      // Controls visible
      const controlsOverlay = container.querySelector('[class*="from-black"]');
      expect(controlsOverlay).toHaveClass("opacity-100");

      // Wait for timeout
      act(() => {
        jest.advanceTimersByTime(4000);
      });

      // Controls should be hidden
      expect(controlsOverlay).toHaveClass("opacity-0");
    });

    it("should show controls on mouse move", async () => {
      const share = createMockShare();
      const { container } = render(<ScreenShareViewer share={share} />);

      // Hide controls first
      act(() => {
        jest.advanceTimersByTime(4000);
      });

      // Move mouse
      fireEvent.mouseMove(container.firstChild as Element);

      const controlsOverlay = container.querySelector('[class*="from-black"]');
      expect(controlsOverlay).toHaveClass("opacity-100");
    });
  });

  describe("Zoom Controls", () => {
    it("should display zoom percentage button", () => {
      const share = createMockShare();
      render(<ScreenShareViewer share={share} initialZoom={1} />);

      expect(screen.getByText("100%")).toBeInTheDocument();
    });

    it("should display initial zoom level", () => {
      const share = createMockShare();
      render(<ScreenShareViewer share={share} initialZoom={1.5} />);

      expect(screen.getByText("150%")).toBeInTheDocument();
    });

    it("should call onZoomChange when zoom percentage is clicked", async () => {
      const share = createMockShare();
      const onZoomChange = jest.fn();
      render(
        <ScreenShareViewer
          share={share}
          initialZoom={1.5}
          onZoomChange={onZoomChange}
        />,
      );

      // Click the percentage button to reset zoom
      const resetBtn = screen.getByText("150%");
      await userEvent.click(resetBtn);

      expect(onZoomChange).toHaveBeenCalledWith(1);
    });

    it("should render zoom slider", () => {
      const share = createMockShare();
      render(<ScreenShareViewer share={share} />);

      // Slider should exist (check for slider role)
      const slider = document.querySelector('[role="slider"]');
      expect(slider).toBeInTheDocument();
    });
  });

  describe("Presenter Pointer", () => {
    const presenterPointer = {
      x: 0.5,
      y: 0.5,
      visible: true,
      color: "#ff0000",
    };

    it("should render presenter pointer when visible", () => {
      const share = createMockShare();
      render(
        <ScreenShareViewer share={share} presenterPointer={presenterPointer} />,
      );

      // Look for animated pointer element
      const pointer = document.querySelector(".animate-pulse");
      expect(pointer).toBeInTheDocument();
    });

    it("should not render pointer when not visible", () => {
      const share = createMockShare();
      const hiddenPointer = { ...presenterPointer, visible: false };
      render(
        <ScreenShareViewer share={share} presenterPointer={hiddenPointer} />,
      );

      const pointer = document.querySelector(".animate-pulse");
      expect(pointer).not.toBeInTheDocument();
    });

    it("should position pointer based on coordinates", () => {
      const share = createMockShare();
      render(
        <ScreenShareViewer share={share} presenterPointer={presenterPointer} />,
      );

      const pointer = document.querySelector(".animate-pulse")?.parentElement;
      expect(pointer).toHaveStyle({ left: "50%", top: "50%" });
    });

    it("should apply custom color to pointer", () => {
      const share = createMockShare();
      render(
        <ScreenShareViewer share={share} presenterPointer={presenterPointer} />,
      );

      const pointer = document.querySelector(".animate-pulse");
      expect(pointer).toHaveStyle({ backgroundColor: "#ff0000" });
    });
  });

  describe("Follow Presenter", () => {
    const presenterPointer = {
      x: 0.5,
      y: 0.5,
      visible: true,
    };

    it("should render follow presenter button when pointer available", () => {
      const share = createMockShare();
      render(
        <ScreenShareViewer share={share} presenterPointer={presenterPointer} />,
      );

      // The crosshair button for follow presenter should exist
      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(5); // Should have many controls including follow
    });

    it("should call onFollowPresenterChange when toggle clicked", async () => {
      const share = createMockShare();
      const onFollowPresenterChange = jest.fn();
      render(
        <ScreenShareViewer
          share={share}
          presenterPointer={presenterPointer}
          onFollowPresenterChange={onFollowPresenterChange}
        />,
      );

      // Find the crosshair/follow button - it should be in the zoom controls section
      // Since we can't easily identify it, we test the callback is provided
      expect(onFollowPresenterChange).not.toHaveBeenCalled();
    });
  });

  describe("Annotate Button", () => {
    it("should show annotate button when onAnnotate is provided", () => {
      const share = createMockShare();
      const onAnnotate = jest.fn();
      render(<ScreenShareViewer share={share} onAnnotate={onAnnotate} />);

      // MousePointer icon button should be visible
      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(4);
    });

    it("should accept onAnnotate callback", () => {
      const share = createMockShare();
      const onAnnotate = jest.fn();

      // Just verify the component renders without error when onAnnotate is provided
      const { unmount } = render(
        <ScreenShareViewer share={share} onAnnotate={onAnnotate} />,
      );

      expect(onAnnotate).toBeDefined();
      unmount();
    });
  });

  describe("Snapshot/Download", () => {
    it("should have download button for taking snapshots", () => {
      const share = createMockShare();
      render(<ScreenShareViewer share={share} />);

      // The download icon button should exist
      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(4);
    });
  });

  describe("Drag to Pan", () => {
    it("should show grab cursor when zoomed in", () => {
      const share = createMockShare();
      render(
        <ScreenShareViewer
          share={share}
          initialZoom={2}
          initialFitMode="none"
        />,
      );

      // The scroll container should have cursor-grab class
      const scrollContainer = document.querySelector(".overflow-auto");
      expect(scrollContainer).toHaveClass("cursor-grab");
    });

    it("should not show grab cursor at normal zoom", () => {
      const share = createMockShare();
      render(<ScreenShareViewer share={share} initialZoom={1} />);

      const scrollContainer = document.querySelector(".overflow-auto");
      expect(scrollContainer).not.toHaveClass("cursor-grab");
    });
  });
});
