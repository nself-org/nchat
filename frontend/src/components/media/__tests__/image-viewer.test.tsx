/**
 * ImageViewer Component Tests
 *
 * Comprehensive unit tests for the image viewer component.
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ImageViewer, ImageViewerProps } from "../image-viewer";

// ============================================================================
// Test Helpers
// ============================================================================

const defaultItem = {
  id: "test-image-1",
  url: "https://example.com/image.jpg",
  fileName: "test-image.jpg",
  width: 1920,
  height: 1080,
};

function renderImageViewer(props: Partial<ImageViewerProps> = {}) {
  const defaultProps: ImageViewerProps = {
    item: defaultItem,
    ...props,
  };
  return render(<ImageViewer {...defaultProps} />);
}

// ============================================================================
// Tests
// ============================================================================

describe("ImageViewer", () => {
  // ==========================================================================
  // Rendering Tests
  // ==========================================================================

  describe("Rendering", () => {
    it("should render the component", () => {
      renderImageViewer();
      expect(screen.getByTestId("image-viewer")).toBeInTheDocument();
    });

    it("should render the image", () => {
      renderImageViewer();
      const img = screen.getByTestId("viewer-image");
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute("src", defaultItem.url);
      expect(img).toHaveAttribute("alt", defaultItem.fileName);
    });

    it("should show loading indicator initially", () => {
      renderImageViewer();
      expect(screen.getByTestId("loading-indicator")).toBeInTheDocument();
    });

    it("should hide loading indicator after image loads", async () => {
      renderImageViewer();
      const img = screen.getByTestId("viewer-image");

      fireEvent.load(img);

      await waitFor(() => {
        expect(
          screen.queryByTestId("loading-indicator"),
        ).not.toBeInTheDocument();
      });
    });

    it("should show error state on image error", async () => {
      renderImageViewer();
      const img = screen.getByTestId("viewer-image");

      fireEvent.error(img);

      await waitFor(() => {
        expect(screen.getByTestId("error-state")).toBeInTheDocument();
        expect(screen.getByText("Failed to load image")).toBeInTheDocument();
      });
    });

    it("should render controls by default", () => {
      renderImageViewer();
      expect(screen.getByTestId("controls")).toBeInTheDocument();
    });

    it("should hide controls when showControls is false", () => {
      renderImageViewer({ showControls: false });
      expect(screen.queryByTestId("controls")).not.toBeInTheDocument();
    });

    it("should show close button by default", () => {
      renderImageViewer({ onClose: jest.fn() });
      expect(screen.getByTestId("close-button")).toBeInTheDocument();
    });

    it("should hide close button when showClose is false", () => {
      renderImageViewer({ showClose: false, onClose: jest.fn() });
      expect(screen.queryByTestId("close-button")).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Zoom Tests
  // ==========================================================================

  describe("Zoom", () => {
    it("should display current zoom level", () => {
      renderImageViewer({ zoom: 1.5 });
      expect(screen.getByTestId("zoom-level")).toHaveTextContent("150%");
    });

    it("should call onZoomChange when zoom in clicked", async () => {
      const onZoomChange = jest.fn();
      renderImageViewer({ zoom: 1, onZoomChange });

      await userEvent.click(screen.getByTestId("zoom-in-button"));

      expect(onZoomChange).toHaveBeenCalledWith(1.25);
    });

    it("should call onZoomChange when zoom out clicked", async () => {
      const onZoomChange = jest.fn();
      renderImageViewer({ zoom: 2, onZoomChange });

      await userEvent.click(screen.getByTestId("zoom-out-button"));

      expect(onZoomChange).toHaveBeenCalledWith(1.75);
    });

    it("should respect custom zoom step", async () => {
      const onZoomChange = jest.fn();
      renderImageViewer({ zoom: 1, zoomStep: 0.5, onZoomChange });

      await userEvent.click(screen.getByTestId("zoom-in-button"));

      expect(onZoomChange).toHaveBeenCalledWith(1.5);
    });

    it("should not exceed max zoom", async () => {
      const onZoomChange = jest.fn();
      renderImageViewer({ zoom: 4.9, maxZoom: 5, onZoomChange });

      await userEvent.click(screen.getByTestId("zoom-in-button"));

      expect(onZoomChange).toHaveBeenCalledWith(5);
    });

    it("should not go below min zoom", async () => {
      const onZoomChange = jest.fn();
      renderImageViewer({ zoom: 0.2, minZoom: 0.1, onZoomChange });

      await userEvent.click(screen.getByTestId("zoom-out-button"));

      expect(onZoomChange).toHaveBeenCalledWith(0.1);
    });

    it("should disable zoom in at max zoom", () => {
      renderImageViewer({ zoom: 5, maxZoom: 5 });
      expect(screen.getByTestId("zoom-in-button")).toBeDisabled();
    });

    it("should disable zoom out at min zoom", () => {
      renderImageViewer({ zoom: 0.1, minZoom: 0.1 });
      expect(screen.getByTestId("zoom-out-button")).toBeDisabled();
    });

    it("should zoom on wheel event", () => {
      const onZoomChange = jest.fn();
      renderImageViewer({ zoom: 1, onZoomChange });

      const viewer = screen.getByTestId("image-viewer");
      fireEvent.wheel(viewer, { deltaY: -100 });

      expect(onZoomChange).toHaveBeenCalledWith(1.25);
    });

    it("should zoom out on wheel down", () => {
      const onZoomChange = jest.fn();
      renderImageViewer({ zoom: 2, onZoomChange });

      const viewer = screen.getByTestId("image-viewer");
      fireEvent.wheel(viewer, { deltaY: 100 });

      expect(onZoomChange).toHaveBeenCalledWith(1.75);
    });

    it("should toggle zoom on double-click", () => {
      const onZoomChange = jest.fn();
      renderImageViewer({ zoom: 1, onZoomChange });

      const viewer = screen.getByTestId("image-viewer");
      fireEvent.doubleClick(viewer);

      expect(onZoomChange).toHaveBeenCalledWith(2);
    });

    it("should reset zoom on double-click when zoomed", () => {
      const onZoomChange = jest.fn();
      const onPanChange = jest.fn();
      const onRotationChange = jest.fn();
      renderImageViewer({
        zoom: 2,
        onZoomChange,
        onPanChange,
        onRotationChange,
      });

      const viewer = screen.getByTestId("image-viewer");
      fireEvent.doubleClick(viewer);

      expect(onZoomChange).toHaveBeenCalledWith(1);
      expect(onPanChange).toHaveBeenCalledWith(0, 0);
      expect(onRotationChange).toHaveBeenCalledWith(0);
    });
  });

  // ==========================================================================
  // Rotation Tests
  // ==========================================================================

  describe("Rotation", () => {
    it("should call onRotationChange when rotate left clicked", async () => {
      const onRotationChange = jest.fn();
      renderImageViewer({ rotation: 180, onRotationChange });

      await userEvent.click(screen.getByTestId("rotate-left-button"));

      expect(onRotationChange).toHaveBeenCalledWith(90);
    });

    it("should call onRotationChange when rotate right clicked", async () => {
      const onRotationChange = jest.fn();
      renderImageViewer({ rotation: 0, onRotationChange });

      await userEvent.click(screen.getByTestId("rotate-right-button"));

      expect(onRotationChange).toHaveBeenCalledWith(90);
    });

    it("should wrap rotation at 360", async () => {
      const onRotationChange = jest.fn();
      renderImageViewer({ rotation: 270, rotationStep: 90, onRotationChange });

      await userEvent.click(screen.getByTestId("rotate-right-button"));

      expect(onRotationChange).toHaveBeenCalledWith(0);
    });

    it("should wrap rotation negative", async () => {
      const onRotationChange = jest.fn();
      renderImageViewer({ rotation: 0, rotationStep: 90, onRotationChange });

      await userEvent.click(screen.getByTestId("rotate-left-button"));

      expect(onRotationChange).toHaveBeenCalledWith(270);
    });

    it("should respect custom rotation step", async () => {
      const onRotationChange = jest.fn();
      renderImageViewer({ rotation: 0, rotationStep: 45, onRotationChange });

      await userEvent.click(screen.getByTestId("rotate-right-button"));

      expect(onRotationChange).toHaveBeenCalledWith(45);
    });
  });

  // ==========================================================================
  // Pan Tests
  // ==========================================================================

  describe("Pan", () => {
    it("should enable dragging when zoomed", () => {
      renderImageViewer({ zoom: 2 });

      const viewer = screen.getByTestId("image-viewer");
      fireEvent.mouseDown(viewer, { clientX: 100, clientY: 100 });

      const img = screen.getByTestId("viewer-image");
      expect(img).toHaveStyle({ cursor: "grabbing" });
    });

    it("should call onPanChange during drag", () => {
      const onPanChange = jest.fn();
      renderImageViewer({ zoom: 2, panX: 0, panY: 0, onPanChange });

      const viewer = screen.getByTestId("image-viewer");

      fireEvent.mouseDown(viewer, { clientX: 100, clientY: 100 });
      fireEvent.mouseMove(viewer, { clientX: 150, clientY: 120 });

      expect(onPanChange).toHaveBeenCalledWith(50, 20);
    });

    it("should stop dragging on mouse up", () => {
      const onPanChange = jest.fn();
      renderImageViewer({ zoom: 2, panX: 0, panY: 0, onPanChange });

      const viewer = screen.getByTestId("image-viewer");

      fireEvent.mouseDown(viewer, { clientX: 100, clientY: 100 });
      fireEvent.mouseUp(viewer);
      fireEvent.mouseMove(viewer, { clientX: 200, clientY: 200 });

      // Should only be called once during mouseMove after mouseDown
      expect(onPanChange).toHaveBeenCalledTimes(0);
    });

    it("should stop dragging on mouse leave", () => {
      const onPanChange = jest.fn();
      renderImageViewer({ zoom: 2, panX: 0, panY: 0, onPanChange });

      const viewer = screen.getByTestId("image-viewer");

      fireEvent.mouseDown(viewer, { clientX: 100, clientY: 100 });
      fireEvent.mouseLeave(viewer);

      const img = screen.getByTestId("viewer-image");
      expect(img).not.toHaveStyle({ cursor: "grabbing" });
    });

    it("should not enable dragging at 1x zoom", () => {
      const onPanChange = jest.fn();
      renderImageViewer({ zoom: 1, onPanChange });

      const viewer = screen.getByTestId("image-viewer");

      fireEvent.mouseDown(viewer, { clientX: 100, clientY: 100 });
      fireEvent.mouseMove(viewer, { clientX: 150, clientY: 150 });

      expect(onPanChange).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Navigation Tests
  // ==========================================================================

  describe("Navigation", () => {
    it("should show previous button when canGoPrevious is true", () => {
      renderImageViewer({ canGoPrevious: true, onPrevious: jest.fn() });
      expect(screen.getByTestId("previous-button")).toBeInTheDocument();
    });

    it("should hide previous button when canGoPrevious is false", () => {
      renderImageViewer({ canGoPrevious: false });
      expect(screen.queryByTestId("previous-button")).not.toBeInTheDocument();
    });

    it("should show next button when canGoNext is true", () => {
      renderImageViewer({ canGoNext: true, onNext: jest.fn() });
      expect(screen.getByTestId("next-button")).toBeInTheDocument();
    });

    it("should hide next button when canGoNext is false", () => {
      renderImageViewer({ canGoNext: false });
      expect(screen.queryByTestId("next-button")).not.toBeInTheDocument();
    });

    it("should call onPrevious when previous button clicked", async () => {
      const onPrevious = jest.fn();
      renderImageViewer({ canGoPrevious: true, onPrevious });

      await userEvent.click(screen.getByTestId("previous-button"));

      expect(onPrevious).toHaveBeenCalledTimes(1);
    });

    it("should call onNext when next button clicked", async () => {
      const onNext = jest.fn();
      renderImageViewer({ canGoNext: true, onNext });

      await userEvent.click(screen.getByTestId("next-button"));

      expect(onNext).toHaveBeenCalledTimes(1);
    });

    it("should hide navigation when showNavigation is false", () => {
      renderImageViewer({
        showNavigation: false,
        canGoPrevious: true,
        canGoNext: true,
      });

      expect(screen.queryByTestId("previous-button")).not.toBeInTheDocument();
      expect(screen.queryByTestId("next-button")).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Reset Tests
  // ==========================================================================

  describe("Reset", () => {
    it("should reset all values when reset button clicked", async () => {
      const onZoomChange = jest.fn();
      const onPanChange = jest.fn();
      const onRotationChange = jest.fn();
      renderImageViewer({
        zoom: 2,
        panX: 100,
        panY: 50,
        rotation: 90,
        onZoomChange,
        onPanChange,
        onRotationChange,
      });

      await userEvent.click(screen.getByTestId("reset-button"));

      expect(onZoomChange).toHaveBeenCalledWith(1);
      expect(onPanChange).toHaveBeenCalledWith(0, 0);
      expect(onRotationChange).toHaveBeenCalledWith(0);
    });
  });

  // ==========================================================================
  // Download Tests
  // ==========================================================================

  describe("Download", () => {
    it("should show download button when showDownload is true", () => {
      renderImageViewer({ showDownload: true, onDownload: jest.fn() });
      expect(screen.getByTestId("download-button")).toBeInTheDocument();
    });

    it("should hide download button when no onDownload handler", () => {
      renderImageViewer({ showDownload: true });
      expect(screen.queryByTestId("download-button")).not.toBeInTheDocument();
    });

    it("should call onDownload when download button clicked", async () => {
      const onDownload = jest.fn();
      renderImageViewer({ showDownload: true, onDownload });

      await userEvent.click(screen.getByTestId("download-button"));

      expect(onDownload).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // Close Tests
  // ==========================================================================

  describe("Close", () => {
    it("should call onClose when close button clicked", async () => {
      const onClose = jest.fn();
      renderImageViewer({ showClose: true, onClose });

      await userEvent.click(screen.getByTestId("close-button"));

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // Info Tests
  // ==========================================================================

  describe("Info", () => {
    it("should show info button when showInfo is true", () => {
      renderImageViewer({ showInfo: true, onInfoClick: jest.fn() });
      expect(screen.getByTestId("info-button")).toBeInTheDocument();
    });

    it("should hide info button when showInfo is false", () => {
      renderImageViewer({ showInfo: false });
      expect(screen.queryByTestId("info-button")).not.toBeInTheDocument();
    });

    it("should call onInfoClick when info button clicked", async () => {
      const onInfoClick = jest.fn();
      renderImageViewer({ showInfo: true, onInfoClick });

      await userEvent.click(screen.getByTestId("info-button"));

      expect(onInfoClick).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // Keyboard Tests
  // ==========================================================================

  describe("Keyboard Navigation", () => {
    it("should navigate previous on ArrowLeft", () => {
      const onPrevious = jest.fn();
      renderImageViewer({ canGoPrevious: true, onPrevious });

      fireEvent.keyDown(window, { key: "ArrowLeft" });

      expect(onPrevious).toHaveBeenCalledTimes(1);
    });

    it("should navigate next on ArrowRight", () => {
      const onNext = jest.fn();
      renderImageViewer({ canGoNext: true, onNext });

      fireEvent.keyDown(window, { key: "ArrowRight" });

      expect(onNext).toHaveBeenCalledTimes(1);
    });

    it("should close on Escape", () => {
      const onClose = jest.fn();
      renderImageViewer({ onClose });

      fireEvent.keyDown(window, { key: "Escape" });

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("should zoom in on + key", () => {
      const onZoomChange = jest.fn();
      renderImageViewer({ zoom: 1, onZoomChange });

      fireEvent.keyDown(window, { key: "+" });

      expect(onZoomChange).toHaveBeenCalledWith(1.25);
    });

    it("should zoom in on = key", () => {
      const onZoomChange = jest.fn();
      renderImageViewer({ zoom: 1, onZoomChange });

      fireEvent.keyDown(window, { key: "=" });

      expect(onZoomChange).toHaveBeenCalledWith(1.25);
    });

    it("should zoom out on - key", () => {
      const onZoomChange = jest.fn();
      renderImageViewer({ zoom: 2, onZoomChange });

      fireEvent.keyDown(window, { key: "-" });

      expect(onZoomChange).toHaveBeenCalledWith(1.75);
    });

    it("should reset view on 0 key", () => {
      const onZoomChange = jest.fn();
      const onPanChange = jest.fn();
      const onRotationChange = jest.fn();
      renderImageViewer({
        zoom: 2,
        onZoomChange,
        onPanChange,
        onRotationChange,
      });

      fireEvent.keyDown(window, { key: "0" });

      expect(onZoomChange).toHaveBeenCalledWith(1);
      expect(onPanChange).toHaveBeenCalledWith(0, 0);
      expect(onRotationChange).toHaveBeenCalledWith(0);
    });

    it("should not navigate previous when canGoPrevious is false", () => {
      const onPrevious = jest.fn();
      renderImageViewer({ canGoPrevious: false, onPrevious });

      fireEvent.keyDown(window, { key: "ArrowLeft" });

      expect(onPrevious).not.toHaveBeenCalled();
    });

    it("should not navigate next when canGoNext is false", () => {
      const onNext = jest.fn();
      renderImageViewer({ canGoNext: false, onNext });

      fireEvent.keyDown(window, { key: "ArrowRight" });

      expect(onNext).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Image Style Tests
  // ==========================================================================

  describe("Image Styles", () => {
    it("should apply transform styles", () => {
      renderImageViewer({
        zoom: 2,
        panX: 100,
        panY: 50,
        rotation: 90,
      });

      const img = screen.getByTestId("viewer-image");
      expect(img).toHaveStyle({
        transform: "translate(100px, 50px) scale(2) rotate(90deg)",
      });
    });

    it("should apply grab cursor when zoomed", () => {
      renderImageViewer({ zoom: 2 });

      const img = screen.getByTestId("viewer-image");
      expect(img).toHaveStyle({ cursor: "grab" });
    });

    it("should apply default cursor when not zoomed", () => {
      renderImageViewer({ zoom: 1 });

      const img = screen.getByTestId("viewer-image");
      expect(img).toHaveStyle({ cursor: "default" });
    });
  });

  // ==========================================================================
  // Item Change Tests
  // ==========================================================================

  describe("Item Change", () => {
    it("should reset loading state when item changes", () => {
      const { rerender } = renderImageViewer({
        item: { ...defaultItem, id: "item-1" },
      });

      const img = screen.getByTestId("viewer-image");
      fireEvent.load(img);

      expect(screen.queryByTestId("loading-indicator")).not.toBeInTheDocument();

      rerender(
        <ImageViewer
          item={{
            ...defaultItem,
            id: "item-2",
            url: "https://example.com/image2.jpg",
          }}
        />,
      );

      expect(screen.getByTestId("loading-indicator")).toBeInTheDocument();
    });
  });
});
