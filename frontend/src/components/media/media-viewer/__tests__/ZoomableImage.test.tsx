/**
 * ZoomableImage Component Tests
 *
 * Comprehensive tests for the zoomable image component.
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
import { ZoomableImage } from "../ZoomableImage";

// ============================================================================
// Mocks
// ============================================================================

const mockGestureState = {
  scale: 1,
  translateX: 0,
  translateY: 0,
  rotation: 0,
  isPinching: false,
  isPanning: false,
  isSwiping: false,
  velocityX: 0,
  velocityY: 0,
};

const mockZoomIn = jest.fn();
const mockZoomOut = jest.fn();
const mockReset = jest.fn();

// Mock useGestures hook
jest.mock("@/hooks/use-gestures", () => ({
  useGestures: jest.fn(() => ({
    ref: { current: null },
    state: mockGestureState,
    setScale: jest.fn(),
    setTranslate: jest.fn(),
    reset: mockReset,
    zoomIn: mockZoomIn,
    zoomOut: mockZoomOut,
    zoomToPoint: jest.fn(),
    getTransformStyle: () => ({
      transform: "translate(0px, 0px) scale(1) rotate(0deg)",
      cursor: "default",
      touchAction: "none",
    }),
  })),
}));

// ============================================================================
// Test Helpers
// ============================================================================

const defaultProps = {
  src: "https://example.com/image.jpg",
  alt: "Test image",
};

function renderZoomableImage(props = {}) {
  return render(<ZoomableImage {...defaultProps} {...props} />);
}

// ============================================================================
// Tests
// ============================================================================

describe("ZoomableImage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // Rendering Tests
  // ==========================================================================

  describe("Rendering", () => {
    it("should render the container", () => {
      renderZoomableImage();
      expect(
        screen.getByTestId("zoomable-image-container"),
      ).toBeInTheDocument();
    });

    it("should render the image with correct src and alt", () => {
      renderZoomableImage();
      const image = screen.getByTestId("zoomable-image");
      expect(image).toHaveAttribute("src", defaultProps.src);
      expect(image).toHaveAttribute("alt", defaultProps.alt);
    });

    it("should show loading indicator initially", () => {
      renderZoomableImage();
      expect(screen.getByTestId("loading-indicator")).toBeInTheDocument();
    });

    it("should hide loading indicator after image loads", async () => {
      renderZoomableImage();
      const image = screen.getByTestId("zoomable-image");

      await act(async () => {
        fireEvent.load(image);
      });

      // After loading, the loading indicator should be hidden
      expect(screen.queryByTestId("loading-indicator")).not.toBeInTheDocument();
    });

    it("should show error state on image error", async () => {
      renderZoomableImage();
      const image = screen.getByTestId("zoomable-image");

      await act(async () => {
        fireEvent.error(image);
      });

      expect(screen.getByTestId("error-state")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Controls Tests
  // ==========================================================================

  describe("Controls", () => {
    it("should render controls by default", async () => {
      renderZoomableImage();
      const image = screen.getByTestId("zoomable-image");
      fireEvent.load(image);

      await waitFor(() => {
        expect(screen.getByTestId("controls")).toBeInTheDocument();
      });
    });

    it("should hide controls when showControls is false", async () => {
      renderZoomableImage({ showControls: false });
      const image = screen.getByTestId("zoomable-image");
      fireEvent.load(image);

      await waitFor(() => {
        expect(screen.queryByTestId("controls")).not.toBeInTheDocument();
      });
    });

    it("should render zoom in button", async () => {
      renderZoomableImage();
      const image = screen.getByTestId("zoomable-image");
      fireEvent.load(image);

      await waitFor(() => {
        expect(screen.getByTestId("zoom-in-button")).toBeInTheDocument();
      });
    });

    it("should render zoom out button", async () => {
      renderZoomableImage();
      const image = screen.getByTestId("zoomable-image");
      fireEvent.load(image);

      await waitFor(() => {
        expect(screen.getByTestId("zoom-out-button")).toBeInTheDocument();
      });
    });

    it("should render reset button", async () => {
      renderZoomableImage();
      const image = screen.getByTestId("zoomable-image");
      fireEvent.load(image);

      await waitFor(() => {
        expect(screen.getByTestId("reset-button")).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // Rotation Controls Tests
  // ==========================================================================

  describe("Rotation Controls", () => {
    it("should render rotation buttons when enabled", async () => {
      renderZoomableImage({ enableRotation: true });
      const image = screen.getByTestId("zoomable-image");
      fireEvent.load(image);

      await waitFor(() => {
        expect(screen.getByTestId("rotate-left-button")).toBeInTheDocument();
        expect(screen.getByTestId("rotate-right-button")).toBeInTheDocument();
      });
    });

    it("should not render rotation buttons when disabled", async () => {
      renderZoomableImage({ enableRotation: false });
      const image = screen.getByTestId("zoomable-image");
      fireEvent.load(image);

      await waitFor(() => {
        expect(
          screen.queryByTestId("rotate-left-button"),
        ).not.toBeInTheDocument();
        expect(
          screen.queryByTestId("rotate-right-button"),
        ).not.toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // Zoom Level Display Tests
  // ==========================================================================

  describe("Zoom Level Display", () => {
    it("should show zoom level when enabled", async () => {
      renderZoomableImage({ showZoomLevel: true });
      const image = screen.getByTestId("zoomable-image");
      fireEvent.load(image);

      await waitFor(() => {
        expect(screen.getByTestId("zoom-level")).toBeInTheDocument();
        expect(screen.getByTestId("zoom-level")).toHaveTextContent("100%");
      });
    });

    it("should not show zoom level when disabled", async () => {
      renderZoomableImage({ showZoomLevel: false });
      const image = screen.getByTestId("zoomable-image");
      fireEvent.load(image);

      await waitFor(() => {
        expect(screen.queryByTestId("zoom-level")).not.toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // Callback Tests
  // ==========================================================================

  describe("Callbacks", () => {
    it("should call onLoad when image loads", async () => {
      const onLoad = jest.fn();
      renderZoomableImage({ onLoad });
      const image = screen.getByTestId("zoomable-image");

      fireEvent.load(image);

      await waitFor(() => {
        expect(onLoad).toHaveBeenCalledTimes(1);
      });
    });

    it("should call onError when image fails to load", async () => {
      const onError = jest.fn();
      renderZoomableImage({ onError });
      const image = screen.getByTestId("zoomable-image");

      fireEvent.error(image);

      await waitFor(() => {
        expect(onError).toHaveBeenCalledTimes(1);
      });
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe("Accessibility", () => {
    it("should have accessible role on gesture container", () => {
      renderZoomableImage();
      const container = screen.getByTestId("gesture-container");
      expect(container).toHaveAttribute("role", "application");
    });

    it("should have accessible label on gesture container", () => {
      renderZoomableImage();
      const container = screen.getByTestId("gesture-container");
      expect(container).toHaveAttribute("aria-label");
    });

    it("should have accessible labels on control buttons", async () => {
      renderZoomableImage();
      const image = screen.getByTestId("zoomable-image");
      fireEvent.load(image);

      await waitFor(() => {
        expect(screen.getByTestId("zoom-in-button")).toHaveAttribute(
          "aria-label",
        );
        expect(screen.getByTestId("zoom-out-button")).toHaveAttribute(
          "aria-label",
        );
        expect(screen.getByTestId("reset-button")).toHaveAttribute(
          "aria-label",
        );
      });
    });
  });

  // ==========================================================================
  // Image Reset on Source Change
  // ==========================================================================

  describe("Source Change", () => {
    it("should reset loading state when source changes", async () => {
      const { rerender } = renderZoomableImage();
      const image = screen.getByTestId("zoomable-image");

      fireEvent.load(image);

      await waitFor(() => {
        expect(
          screen.queryByTestId("loading-indicator"),
        ).not.toBeInTheDocument();
      });

      // Change source
      rerender(
        <ZoomableImage src="https://example.com/image2.jpg" alt="New image" />,
      );

      expect(screen.getByTestId("loading-indicator")).toBeInTheDocument();
    });
  });
});
