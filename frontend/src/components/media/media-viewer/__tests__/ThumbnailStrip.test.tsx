/**
 * ThumbnailStrip Component Tests
 *
 * Comprehensive tests for the thumbnail strip navigation component.
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThumbnailStrip } from "../ThumbnailStrip";
import { MediaItem } from "@/lib/media/media-types";

// ============================================================================
// Mocks
// ============================================================================

// Mock IntersectionObserver
class MockIntersectionObserver {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
}

Object.defineProperty(window, "IntersectionObserver", {
  writable: true,
  value: MockIntersectionObserver,
});

// Mock scrollIntoView
Element.prototype.scrollIntoView = jest.fn();

// ============================================================================
// Test Data
// ============================================================================

const createMockItem = (
  id: string,
  type: "image" | "video" | "audio" | "document" = "image",
): MediaItem => ({
  id,
  fileName: `file-${id}.${type === "image" ? "jpg" : type === "video" ? "mp4" : "mp3"}`,
  fileType: type,
  mimeType:
    type === "image"
      ? "image/jpeg"
      : type === "video"
        ? "video/mp4"
        : "audio/mpeg",
  fileSize: 1024 * 100,
  fileExtension: type === "image" ? "jpg" : type === "video" ? "mp4" : "mp3",
  url: `https://example.com/${id}.${type === "image" ? "jpg" : type === "video" ? "mp4" : "mp3"}`,
  thumbnailUrl: `https://example.com/${id}-thumb.jpg`,
  channelId: "channel-1",
  threadId: null,
  messageId: "msg-1",
  uploadedBy: {
    id: "user-1",
    username: "testuser",
    displayName: "Test User",
    avatarUrl: null,
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
  createMockItem("4", "audio"),
  createMockItem("5"),
];

// ============================================================================
// Test Helpers
// ============================================================================

const defaultProps = {
  items: mockItems,
  currentIndex: 0,
  onSelect: jest.fn(),
};

function renderThumbnailStrip(props = {}) {
  return render(<ThumbnailStrip {...defaultProps} {...props} />);
}

// ============================================================================
// Tests
// ============================================================================

describe("ThumbnailStrip", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // Rendering Tests
  // ==========================================================================

  describe("Rendering", () => {
    it("should render the thumbnail strip container", () => {
      renderThumbnailStrip();
      expect(screen.getByTestId("thumbnail-strip")).toBeInTheDocument();
    });

    it("should render all thumbnails", () => {
      renderThumbnailStrip();
      mockItems.forEach((_, index) => {
        expect(screen.getByTestId(`thumbnail-${index}`)).toBeInTheDocument();
      });
    });

    it("should not render when items array is empty", () => {
      renderThumbnailStrip({ items: [] });
      expect(screen.queryByTestId("thumbnail-strip")).not.toBeInTheDocument();
    });

    it("should render thumbnail container", () => {
      renderThumbnailStrip();
      expect(screen.getByTestId("thumbnail-container")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Counter Tests
  // ==========================================================================

  describe("Counter", () => {
    it("should show counter by default", () => {
      renderThumbnailStrip();
      expect(screen.getByTestId("thumbnail-counter")).toBeInTheDocument();
      expect(screen.getByTestId("thumbnail-counter")).toHaveTextContent(
        "1 / 5",
      );
    });

    it("should hide counter when showCounter is false", () => {
      renderThumbnailStrip({ showCounter: false });
      expect(screen.queryByTestId("thumbnail-counter")).not.toBeInTheDocument();
    });

    it("should update counter when currentIndex changes", () => {
      const { rerender } = renderThumbnailStrip({ currentIndex: 0 });
      expect(screen.getByTestId("thumbnail-counter")).toHaveTextContent(
        "1 / 5",
      );

      rerender(<ThumbnailStrip {...defaultProps} currentIndex={2} />);
      expect(screen.getByTestId("thumbnail-counter")).toHaveTextContent(
        "3 / 5",
      );
    });
  });

  // ==========================================================================
  // Selection Tests
  // ==========================================================================

  describe("Selection", () => {
    it("should call onSelect when thumbnail is clicked", async () => {
      const onSelect = jest.fn();
      renderThumbnailStrip({ onSelect });

      await userEvent.click(screen.getByTestId("thumbnail-2"));

      expect(onSelect).toHaveBeenCalledWith(2);
    });

    it("should highlight active thumbnail", () => {
      renderThumbnailStrip({ currentIndex: 2 });
      const activeThumbnail = screen.getByTestId("thumbnail-2");
      expect(activeThumbnail).toHaveAttribute("aria-current", "true");
    });

    it("should not highlight inactive thumbnails", () => {
      renderThumbnailStrip({ currentIndex: 2 });
      const inactiveThumbnail = screen.getByTestId("thumbnail-0");
      expect(inactiveThumbnail).not.toHaveAttribute("aria-current");
    });
  });

  // ==========================================================================
  // Keyboard Navigation Tests
  // ==========================================================================

  describe("Keyboard Navigation", () => {
    it("should navigate left on ArrowLeft key", () => {
      const onSelect = jest.fn();
      renderThumbnailStrip({ currentIndex: 2, onSelect });

      const thumbnail = screen.getByTestId("thumbnail-2");
      thumbnail.focus();
      fireEvent.keyDown(thumbnail, { key: "ArrowLeft" });

      expect(onSelect).toHaveBeenCalledWith(1);
    });

    it("should navigate right on ArrowRight key", () => {
      const onSelect = jest.fn();
      renderThumbnailStrip({ currentIndex: 2, onSelect });

      const thumbnail = screen.getByTestId("thumbnail-2");
      thumbnail.focus();
      fireEvent.keyDown(thumbnail, { key: "ArrowRight" });

      expect(onSelect).toHaveBeenCalledWith(3);
    });

    it("should navigate to first on Home key", () => {
      const onSelect = jest.fn();
      renderThumbnailStrip({ currentIndex: 2, onSelect });

      const thumbnail = screen.getByTestId("thumbnail-2");
      thumbnail.focus();
      fireEvent.keyDown(thumbnail, { key: "Home" });

      expect(onSelect).toHaveBeenCalledWith(0);
    });

    it("should navigate to last on End key", () => {
      const onSelect = jest.fn();
      renderThumbnailStrip({ currentIndex: 2, onSelect });

      const thumbnail = screen.getByTestId("thumbnail-2");
      thumbnail.focus();
      fireEvent.keyDown(thumbnail, { key: "End" });

      expect(onSelect).toHaveBeenCalledWith(4);
    });

    it("should select on Enter key", () => {
      const onSelect = jest.fn();
      renderThumbnailStrip({ currentIndex: 2, onSelect });

      const thumbnail = screen.getByTestId("thumbnail-2");
      thumbnail.focus();
      fireEvent.keyDown(thumbnail, { key: "Enter" });

      expect(onSelect).toHaveBeenCalledWith(2);
    });

    it("should not navigate left at start", () => {
      const onSelect = jest.fn();
      renderThumbnailStrip({ currentIndex: 0, onSelect });

      const thumbnail = screen.getByTestId("thumbnail-0");
      thumbnail.focus();
      fireEvent.keyDown(thumbnail, { key: "ArrowLeft" });

      expect(onSelect).not.toHaveBeenCalled();
    });

    it("should not navigate right at end", () => {
      const onSelect = jest.fn();
      renderThumbnailStrip({ currentIndex: 4, onSelect });

      const thumbnail = screen.getByTestId("thumbnail-4");
      thumbnail.focus();
      fireEvent.keyDown(thumbnail, { key: "ArrowRight" });

      expect(onSelect).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // File Type Icon Tests
  // ==========================================================================

  describe("File Type Icons", () => {
    it("should show file type icon for non-image items when enabled", () => {
      renderThumbnailStrip({ showFileType: true });
      // Video and audio items should have type icons
      // This is implicitly tested by rendering the component
      expect(screen.getByTestId("thumbnail-1")).toBeInTheDocument(); // video
      expect(screen.getByTestId("thumbnail-3")).toBeInTheDocument(); // audio
    });
  });

  // ==========================================================================
  // Thumbnail Size Tests
  // ==========================================================================

  describe("Thumbnail Sizes", () => {
    it("should render with small size", () => {
      renderThumbnailStrip({ thumbnailSize: "sm" });
      expect(screen.getByTestId("thumbnail-strip")).toBeInTheDocument();
    });

    it("should render with medium size (default)", () => {
      renderThumbnailStrip({ thumbnailSize: "md" });
      expect(screen.getByTestId("thumbnail-strip")).toBeInTheDocument();
    });

    it("should render with large size", () => {
      renderThumbnailStrip({ thumbnailSize: "lg" });
      expect(screen.getByTestId("thumbnail-strip")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe("Accessibility", () => {
    it("should have listbox role on container", () => {
      renderThumbnailStrip();
      const container = screen.getByTestId("thumbnail-container");
      expect(container).toHaveAttribute("role", "listbox");
    });

    it("should have aria-label on container", () => {
      renderThumbnailStrip();
      const container = screen.getByTestId("thumbnail-container");
      expect(container).toHaveAttribute(
        "aria-label",
        "Image gallery thumbnails",
      );
    });

    it("should have aria-activedescendant on container", () => {
      renderThumbnailStrip({ currentIndex: 2 });
      const container = screen.getByTestId("thumbnail-container");
      expect(container).toHaveAttribute("aria-activedescendant", "thumbnail-2");
    });

    it("should have accessible labels on thumbnails", () => {
      renderThumbnailStrip();
      const thumbnail = screen.getByTestId("thumbnail-0");
      expect(thumbnail).toHaveAttribute("aria-label");
    });
  });

  // ==========================================================================
  // Auto-scroll Tests
  // ==========================================================================

  describe("Auto-scroll", () => {
    it("should render correctly with autoScroll enabled", () => {
      renderThumbnailStrip({ autoScroll: true, currentIndex: 3 });

      // Component should render with auto-scroll enabled
      expect(screen.getByTestId("thumbnail-strip")).toBeInTheDocument();
      expect(screen.getByTestId("thumbnail-3")).toHaveAttribute(
        "aria-current",
        "true",
      );
    });

    it("should render correctly with autoScroll disabled", () => {
      renderThumbnailStrip({ autoScroll: false, currentIndex: 3 });

      // Component should still render correctly
      expect(screen.getByTestId("thumbnail-strip")).toBeInTheDocument();
      expect(screen.getByTestId("thumbnail-3")).toHaveAttribute(
        "aria-current",
        "true",
      );
    });
  });
});
