/**
 * FullscreenMediaViewer Component Tests
 *
 * Comprehensive tests for the fullscreen media viewer component.
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FullscreenMediaViewer } from "../FullscreenMediaViewer";
import { MediaItem } from "@/lib/media/media-types";

// ============================================================================
// Mocks
// ============================================================================

// Mock Radix Dialog
jest.mock("@radix-ui/react-dialog", () => ({
  Root: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? children : null,
  Portal: ({ children }: { children: React.ReactNode }) => children,
  Overlay: ({
    children,
    className,
    ...props
  }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={className} data-testid="viewer-overlay" {...props}>
      {children}
    </div>
  ),
  Content: React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
  >(({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={className}
      data-testid="fullscreen-media-viewer"
      {...props}
    >
      {children}
    </div>
  )),
  Close: ({
    children,
    asChild,
  }: {
    children: React.ReactNode;
    asChild?: boolean;
  }) => children,
}));

// Mock useGestures
jest.mock("@/hooks/use-gestures", () => ({
  useGestures: () => ({
    ref: { current: null },
    state: {
      scale: 1,
      translateX: 0,
      translateY: 0,
      rotation: 0,
      isPinching: false,
      isPanning: false,
    },
    reset: jest.fn(),
    zoomIn: jest.fn(),
    zoomOut: jest.fn(),
    getTransformStyle: () => ({}),
  }),
}));

// Mock ZoomableImage
jest.mock("../ZoomableImage", () => ({
  ZoomableImage: ({
    src,
    alt,
    onLoad,
  }: {
    src: string;
    alt: string;
    onLoad?: () => void;
  }) => (
    <img src={src} alt={alt} data-testid="zoomable-image" onLoad={onLoad} />
  ),
}));

// Mock EnhancedVideoPlayer
jest.mock("../EnhancedVideoPlayer", () => ({
  EnhancedVideoPlayer: ({ src }: { src: string }) => (
    <video src={src} data-testid="enhanced-video-player" />
  ),
}));

// Mock ThumbnailStrip
jest.mock("../ThumbnailStrip", () => ({
  ThumbnailStrip: ({
    items,
    currentIndex,
    onSelect,
  }: {
    items: MediaItem[];
    currentIndex: number;
    onSelect: (index: number) => void;
  }) => (
    <div data-testid="thumbnail-strip">
      {items.map((_, index) => (
        <button
          key={index}
          data-testid={`thumb-${index}`}
          onClick={() => onSelect(index)}
        >
          {index}
        </button>
      ))}
    </div>
  ),
}));

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

// ============================================================================
// Test Data
// ============================================================================

const createMockItem = (
  id: string,
  type: "image" | "video" | "audio" | "document" = "image",
): MediaItem => ({
  id,
  fileName: `file-${id}.${type === "image" ? "jpg" : type === "video" ? "mp4" : "pdf"}`,
  fileType: type,
  mimeType:
    type === "image"
      ? "image/jpeg"
      : type === "video"
        ? "video/mp4"
        : "application/pdf",
  fileSize: 1024 * 100,
  fileExtension: type === "image" ? "jpg" : type === "video" ? "mp4" : "pdf",
  url: `https://example.com/${id}.${type === "image" ? "jpg" : type === "video" ? "mp4" : "pdf"}`,
  thumbnailUrl: `https://example.com/${id}-thumb.jpg`,
  channelId: "channel-1",
  channelName: "general",
  threadId: null,
  messageId: "msg-1",
  uploadedBy: {
    id: "user-1",
    username: "testuser",
    displayName: "Test User",
    avatarUrl: "https://example.com/avatar.jpg",
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  metadata: {
    dimensions: { width: 1920, height: 1080 },
  },
  canDelete: true,
  canShare: true,
  canDownload: true,
});

const mockItems: MediaItem[] = [
  createMockItem("1"),
  createMockItem("2", "video"),
  createMockItem("3"),
  createMockItem("4", "document"),
  createMockItem("5"),
];

// ============================================================================
// Test Helpers
// ============================================================================

const defaultProps = {
  items: mockItems,
  initialIndex: 0,
  isOpen: true,
  onClose: jest.fn(),
};

function renderViewer(props = {}) {
  return render(<FullscreenMediaViewer {...defaultProps} {...props} />);
}

// ============================================================================
// Tests
// ============================================================================

describe("FullscreenMediaViewer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // Rendering Tests
  // ==========================================================================

  describe("Rendering", () => {
    it("should render when isOpen is true", () => {
      renderViewer();
      expect(screen.getByTestId("fullscreen-media-viewer")).toBeInTheDocument();
    });

    it("should not render when isOpen is false", () => {
      renderViewer({ isOpen: false });
      expect(
        screen.queryByTestId("fullscreen-media-viewer"),
      ).not.toBeInTheDocument();
    });

    it("should render overlay", () => {
      renderViewer();
      expect(screen.getByTestId("viewer-overlay")).toBeInTheDocument();
    });

    it("should render media container", () => {
      renderViewer();
      expect(screen.getByTestId("media-container")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Header Tests
  // ==========================================================================

  describe("Header", () => {
    it("should display uploader name", () => {
      renderViewer();
      expect(screen.getByText("Test User")).toBeInTheDocument();
    });

    it("should display counter for multiple items", () => {
      renderViewer();
      expect(screen.getByTestId("media-counter")).toHaveTextContent("1 / 5");
    });

    it("should not display counter for single item", () => {
      renderViewer({ items: [mockItems[0]] });
      expect(screen.queryByTestId("media-counter")).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Action Button Tests
  // ==========================================================================

  describe("Action Buttons", () => {
    it("should render close button", () => {
      renderViewer();
      expect(screen.getByTestId("close-button")).toBeInTheDocument();
    });

    it("should render info button", () => {
      renderViewer();
      expect(screen.getByTestId("info-button")).toBeInTheDocument();
    });

    it("should render fullscreen button", () => {
      renderViewer();
      expect(screen.getByTestId("fullscreen-button")).toBeInTheDocument();
    });

    it("should render download button when onDownload is provided", () => {
      renderViewer({ onDownload: jest.fn() });
      expect(screen.getByTestId("download-button")).toBeInTheDocument();
    });

    it("should not render download button when onDownload is not provided", () => {
      renderViewer({ onDownload: undefined });
      expect(screen.queryByTestId("download-button")).not.toBeInTheDocument();
    });

    it("should render share button when onShare is provided", () => {
      renderViewer({ onShare: jest.fn() });
      expect(screen.getByTestId("share-button")).toBeInTheDocument();
    });

    it("should render delete button when item canDelete", () => {
      renderViewer({ onDelete: jest.fn() });
      expect(screen.getByTestId("delete-button")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Navigation Tests
  // ==========================================================================

  describe("Navigation", () => {
    it("should render previous button when not at first item", () => {
      renderViewer({ initialIndex: 2 });
      expect(screen.getByTestId("previous-button")).toBeInTheDocument();
    });

    it("should not render previous button at first item without loop", () => {
      renderViewer({ initialIndex: 0, loop: false });
      expect(screen.queryByTestId("previous-button")).not.toBeInTheDocument();
    });

    it("should render previous button at first item with loop", () => {
      renderViewer({ initialIndex: 0, loop: true });
      expect(screen.getByTestId("previous-button")).toBeInTheDocument();
    });

    it("should render next button when not at last item", () => {
      renderViewer({ initialIndex: 2 });
      expect(screen.getByTestId("next-button")).toBeInTheDocument();
    });

    it("should not render next button at last item without loop", () => {
      renderViewer({ initialIndex: 4, loop: false });
      expect(screen.queryByTestId("next-button")).not.toBeInTheDocument();
    });

    it("should render next button at last item with loop", () => {
      renderViewer({ initialIndex: 4, loop: true });
      expect(screen.getByTestId("next-button")).toBeInTheDocument();
    });

    it("should navigate to next item on next button click", async () => {
      const onIndexChange = jest.fn();
      renderViewer({ initialIndex: 0, onIndexChange });

      await userEvent.click(screen.getByTestId("next-button"));

      expect(onIndexChange).toHaveBeenCalledWith(1);
    });

    it("should navigate to previous item on previous button click", async () => {
      const onIndexChange = jest.fn();
      renderViewer({ initialIndex: 2, onIndexChange });

      await userEvent.click(screen.getByTestId("previous-button"));

      expect(onIndexChange).toHaveBeenCalledWith(1);
    });
  });

  // ==========================================================================
  // Thumbnail Strip Tests
  // ==========================================================================

  describe("Thumbnail Strip", () => {
    it("should render thumbnail strip by default", () => {
      renderViewer();
      expect(screen.getByTestId("thumbnail-strip")).toBeInTheDocument();
    });

    it("should hide thumbnail strip when showThumbnails is false", () => {
      renderViewer({ showThumbnails: false });
      expect(screen.queryByTestId("thumbnail-strip")).not.toBeInTheDocument();
    });

    it("should not show thumbnail strip for single item", () => {
      renderViewer({ items: [mockItems[0]] });
      expect(screen.queryByTestId("thumbnail-strip")).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Info Panel Tests
  // ==========================================================================

  describe("Info Panel", () => {
    it("should not show info panel by default", () => {
      renderViewer();
      expect(screen.queryByTestId("info-panel")).not.toBeInTheDocument();
    });

    it("should show info panel when initialShowInfo is true", () => {
      renderViewer({ showInfo: true });
      expect(screen.getByTestId("info-panel")).toBeInTheDocument();
    });

    it("should toggle info panel on info button click", async () => {
      renderViewer();

      await userEvent.click(screen.getByTestId("info-button"));

      expect(screen.getByTestId("info-panel")).toBeInTheDocument();
    });

    it("should display file details in info panel", async () => {
      renderViewer();
      await userEvent.click(screen.getByTestId("info-button"));

      const infoPanel = screen.getByTestId("info-panel");
      expect(infoPanel).toHaveTextContent("file-1.jpg");
      expect(infoPanel).toHaveTextContent("image");
      expect(infoPanel).toHaveTextContent("Test User");
    });
  });

  // ==========================================================================
  // Keyboard Navigation Tests
  // ==========================================================================

  describe("Keyboard Navigation", () => {
    it("should close on Escape key", () => {
      const onClose = jest.fn();
      renderViewer({ onClose });

      fireEvent.keyDown(document, { key: "Escape" });

      expect(onClose).toHaveBeenCalled();
    });

    it("should navigate next on ArrowRight key", () => {
      const onIndexChange = jest.fn();
      renderViewer({ initialIndex: 0, onIndexChange });

      fireEvent.keyDown(document, { key: "ArrowRight" });

      expect(onIndexChange).toHaveBeenCalledWith(1);
    });

    it("should navigate previous on ArrowLeft key", () => {
      const onIndexChange = jest.fn();
      renderViewer({ initialIndex: 2, onIndexChange });

      fireEvent.keyDown(document, { key: "ArrowLeft" });

      expect(onIndexChange).toHaveBeenCalledWith(1);
    });

    it("should go to first on Home key", () => {
      const onIndexChange = jest.fn();
      renderViewer({ initialIndex: 3, onIndexChange });

      fireEvent.keyDown(document, { key: "Home" });

      expect(onIndexChange).toHaveBeenCalledWith(0);
    });

    it("should go to last on End key", () => {
      const onIndexChange = jest.fn();
      renderViewer({ initialIndex: 1, onIndexChange });

      fireEvent.keyDown(document, { key: "End" });

      expect(onIndexChange).toHaveBeenCalledWith(4);
    });

    it("should toggle info on i key", async () => {
      renderViewer();

      fireEvent.keyDown(document, { key: "i" });

      await waitFor(() => {
        expect(screen.getByTestId("info-panel")).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // Media Type Tests
  // ==========================================================================

  describe("Media Types", () => {
    it("should render image for image type", () => {
      renderViewer({ items: [createMockItem("1", "image")], initialIndex: 0 });
      expect(screen.getByTestId("zoomable-image")).toBeInTheDocument();
    });

    it("should render video player for video type", () => {
      renderViewer({ items: [createMockItem("1", "video")], initialIndex: 0 });
      expect(screen.getByTestId("enhanced-video-player")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Callback Tests
  // ==========================================================================

  describe("Callbacks", () => {
    it("should call onClose when Escape key is pressed", () => {
      const onClose = jest.fn();
      renderViewer({ onClose });

      fireEvent.keyDown(document, { key: "Escape" });

      expect(onClose).toHaveBeenCalled();
    });

    it("should call onDownload when download button clicked", async () => {
      const onDownload = jest.fn();
      renderViewer({ onDownload });

      await userEvent.click(screen.getByTestId("download-button"));

      expect(onDownload).toHaveBeenCalledWith(mockItems[0]);
    });

    it("should call onShare when share button clicked", async () => {
      const onShare = jest.fn();
      renderViewer({ onShare });

      await userEvent.click(screen.getByTestId("share-button"));

      expect(onShare).toHaveBeenCalledWith(mockItems[0]);
    });

    it("should call onDelete when delete button clicked", async () => {
      const onDelete = jest.fn();
      renderViewer({ onDelete });

      await userEvent.click(screen.getByTestId("delete-button"));

      expect(onDelete).toHaveBeenCalledWith(mockItems[0]);
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe("Accessibility", () => {
    it("should have accessible label on dialog", () => {
      renderViewer();
      const dialog = screen.getByTestId("fullscreen-media-viewer");
      expect(dialog).toHaveAttribute("aria-label", "Media viewer");
    });

    it("should have accessible labels on navigation buttons", () => {
      renderViewer({ initialIndex: 2 });
      expect(screen.getByTestId("previous-button")).toHaveAttribute(
        "aria-label",
        "Previous",
      );
      expect(screen.getByTestId("next-button")).toHaveAttribute(
        "aria-label",
        "Next",
      );
    });

    it("should have accessible labels on action buttons", () => {
      renderViewer({
        onDownload: jest.fn(),
        onShare: jest.fn(),
        onDelete: jest.fn(),
      });
      expect(screen.getByTestId("info-button")).toHaveAttribute("aria-label");
      expect(screen.getByTestId("download-button")).toHaveAttribute(
        "aria-label",
      );
      expect(screen.getByTestId("share-button")).toHaveAttribute("aria-label");
      expect(screen.getByTestId("delete-button")).toHaveAttribute("aria-label");
      expect(screen.getByTestId("fullscreen-button")).toHaveAttribute(
        "aria-label",
      );
      expect(screen.getByTestId("close-button")).toHaveAttribute("aria-label");
    });
  });
});
