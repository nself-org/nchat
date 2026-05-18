/**
 * Gallery Store Tests
 *
 * Comprehensive unit tests for the gallery Zustand store.
 */

import { act, renderHook } from "@testing-library/react";
import {
  useGalleryStore,
  GalleryItem,
  MIN_ZOOM,
  MAX_ZOOM,
  ZOOM_STEP,
  ROTATION_STEP,
  DEFAULT_CAROUSEL_INTERVAL,
} from "../gallery-store";

// ============================================================================
// Test Helpers
// ============================================================================

function createMockItem(overrides: Partial<GalleryItem> = {}): GalleryItem {
  const id = overrides.id || `item-${Math.random().toString(36).slice(2)}`;
  return {
    id,
    fileName: `file-${id}.jpg`,
    fileType: "image",
    mimeType: "image/jpeg",
    fileSize: 1024,
    url: `https://example.com/${id}.jpg`,
    thumbnailUrl: `https://example.com/${id}-thumb.jpg`,
    channelId: "channel-1",
    messageId: "message-1",
    uploadedBy: {
      id: "user-1",
      username: "testuser",
      displayName: "Test User",
      avatarUrl: null,
    },
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function createMockItems(
  count: number,
  channelId: string = "channel-1",
): GalleryItem[] {
  return Array.from({ length: count }, (_, i) =>
    createMockItem({ id: `item-${channelId}-${i}`, channelId }),
  );
}

// ============================================================================
// Tests
// ============================================================================

describe("Gallery Store", () => {
  beforeEach(() => {
    const { result } = renderHook(() => useGalleryStore());
    act(() => {
      result.current.reset();
    });
  });

  // ==========================================================================
  // Item Management Tests
  // ==========================================================================

  describe("Item Management", () => {
    describe("setItemsForChannel", () => {
      it("should set items for a channel", () => {
        const { result } = renderHook(() => useGalleryStore());
        const items = createMockItems(3, "channel-1");

        act(() => {
          result.current.setItemsForChannel("channel-1", items);
        });

        expect(result.current.getItemsByChannel("channel-1")).toHaveLength(3);
        expect(result.current.allItems).toHaveLength(3);
      });

      it("should replace existing items for channel", () => {
        const { result } = renderHook(() => useGalleryStore());
        const items1 = createMockItems(3, "channel-1");
        const items2 = createMockItems(2, "channel-1");

        act(() => {
          result.current.setItemsForChannel("channel-1", items1);
          result.current.setItemsForChannel("channel-1", items2);
        });

        expect(result.current.getItemsByChannel("channel-1")).toHaveLength(2);
      });

      it("should handle multiple channels", () => {
        const { result } = renderHook(() => useGalleryStore());
        const items1 = createMockItems(3, "channel-1");
        const items2 = createMockItems(2, "channel-2");

        act(() => {
          result.current.setItemsForChannel("channel-1", items1);
          result.current.setItemsForChannel("channel-2", items2);
        });

        expect(result.current.getItemsByChannel("channel-1")).toHaveLength(3);
        expect(result.current.getItemsByChannel("channel-2")).toHaveLength(2);
        expect(result.current.allItems).toHaveLength(5);
      });
    });

    describe("addItemsToChannel", () => {
      it("should add items to an empty channel", () => {
        const { result } = renderHook(() => useGalleryStore());
        const items = createMockItems(2, "channel-1");

        act(() => {
          result.current.addItemsToChannel("channel-1", items);
        });

        expect(result.current.getItemsByChannel("channel-1")).toHaveLength(2);
      });

      it("should append items to existing channel", () => {
        const { result } = renderHook(() => useGalleryStore());
        const items1 = createMockItems(2, "channel-1");
        // Create items with different IDs
        const items2 = [
          createMockItem({ id: "item-channel-1-2", channelId: "channel-1" }),
          createMockItem({ id: "item-channel-1-3", channelId: "channel-1" }),
        ];

        act(() => {
          result.current.setItemsForChannel("channel-1", items1);
          result.current.addItemsToChannel("channel-1", items2);
        });

        expect(result.current.getItemsByChannel("channel-1")).toHaveLength(4);
      });

      it("should not add duplicate items", () => {
        const { result } = renderHook(() => useGalleryStore());
        const items = createMockItems(2, "channel-1");

        act(() => {
          result.current.setItemsForChannel("channel-1", items);
          result.current.addItemsToChannel("channel-1", items);
        });

        expect(result.current.getItemsByChannel("channel-1")).toHaveLength(2);
      });
    });

    describe("removeItemFromChannel", () => {
      it("should remove item from channel", () => {
        const { result } = renderHook(() => useGalleryStore());
        const items = createMockItems(3, "channel-1");

        act(() => {
          result.current.setItemsForChannel("channel-1", items);
          result.current.removeItemFromChannel("channel-1", items[1].id);
        });

        expect(result.current.getItemsByChannel("channel-1")).toHaveLength(2);
        expect(result.current.allItems).toHaveLength(2);
      });

      it("should remove item from selection if selected", () => {
        const { result } = renderHook(() => useGalleryStore());
        const items = createMockItems(3, "channel-1");

        act(() => {
          result.current.setItemsForChannel("channel-1", items);
          result.current.selectItem(items[1].id);
          result.current.removeItemFromChannel("channel-1", items[1].id);
        });

        expect(result.current.selectedItems.has(items[1].id)).toBe(false);
      });

      it("should handle non-existent channel", () => {
        const { result } = renderHook(() => useGalleryStore());

        act(() => {
          result.current.removeItemFromChannel("non-existent", "item-1");
        });

        expect(result.current.allItems).toHaveLength(0);
      });
    });

    describe("updateItem", () => {
      it("should update item in channel", () => {
        const { result } = renderHook(() => useGalleryStore());
        const items = createMockItems(2, "channel-1");

        act(() => {
          result.current.setItemsForChannel("channel-1", items);
          result.current.updateItem(items[0].id, { fileName: "updated.jpg" });
        });

        const updated = result.current.getItemsByChannel("channel-1")[0];
        expect(updated.fileName).toBe("updated.jpg");
      });

      it("should update lightbox current item if matches", () => {
        const { result } = renderHook(() => useGalleryStore());
        const items = createMockItems(2, "channel-1");

        act(() => {
          result.current.setItemsForChannel("channel-1", items);
          result.current.openLightbox(items, 0);
          result.current.updateItem(items[0].id, { fileName: "updated.jpg" });
        });

        expect(result.current.lightbox.currentItem?.fileName).toBe(
          "updated.jpg",
        );
      });
    });

    describe("clearChannel", () => {
      it("should clear items for specific channel", () => {
        const { result } = renderHook(() => useGalleryStore());
        const items1 = createMockItems(3, "channel-1");
        const items2 = createMockItems(2, "channel-2");

        act(() => {
          result.current.setItemsForChannel("channel-1", items1);
          result.current.setItemsForChannel("channel-2", items2);
          result.current.clearChannel("channel-1");
        });

        expect(result.current.getItemsByChannel("channel-1")).toHaveLength(0);
        expect(result.current.getItemsByChannel("channel-2")).toHaveLength(2);
        expect(result.current.allItems).toHaveLength(2);
      });
    });

    describe("clearAllItems", () => {
      it("should clear all items from all channels", () => {
        const { result } = renderHook(() => useGalleryStore());
        const items1 = createMockItems(3, "channel-1");
        const items2 = createMockItems(2, "channel-2");

        act(() => {
          result.current.setItemsForChannel("channel-1", items1);
          result.current.setItemsForChannel("channel-2", items2);
          result.current.clearAllItems();
        });

        expect(result.current.allItems).toHaveLength(0);
        expect(result.current.getItemsByChannel("channel-1")).toHaveLength(0);
        expect(result.current.getItemsByChannel("channel-2")).toHaveLength(0);
      });

      it("should clear selection", () => {
        const { result } = renderHook(() => useGalleryStore());
        const items = createMockItems(3, "channel-1");

        act(() => {
          result.current.setItemsForChannel("channel-1", items);
          result.current.selectAll();
          result.current.clearAllItems();
        });

        expect(result.current.selectedItems.size).toBe(0);
      });
    });

    describe("getItemsByChannel", () => {
      it("should return items for channel", () => {
        const { result } = renderHook(() => useGalleryStore());
        const items = createMockItems(3, "channel-1");

        act(() => {
          result.current.setItemsForChannel("channel-1", items);
        });

        expect(result.current.getItemsByChannel("channel-1")).toEqual(items);
      });

      it("should return empty array for non-existent channel", () => {
        const { result } = renderHook(() => useGalleryStore());

        expect(result.current.getItemsByChannel("non-existent")).toEqual([]);
      });
    });
  });

  // ==========================================================================
  // Lightbox Tests
  // ==========================================================================

  describe("Lightbox", () => {
    describe("openLightbox", () => {
      it("should open lightbox with items", () => {
        const { result } = renderHook(() => useGalleryStore());
        const items = createMockItems(5, "channel-1");

        act(() => {
          result.current.openLightbox(items);
        });

        expect(result.current.lightbox.isOpen).toBe(true);
        expect(result.current.lightbox.items).toHaveLength(5);
        expect(result.current.lightbox.currentIndex).toBe(0);
        expect(result.current.lightbox.currentItem).toEqual(items[0]);
      });

      it("should open at specific index", () => {
        const { result } = renderHook(() => useGalleryStore());
        const items = createMockItems(5, "channel-1");

        act(() => {
          result.current.openLightbox(items, 2);
        });

        expect(result.current.lightbox.currentIndex).toBe(2);
        expect(result.current.lightbox.currentItem).toEqual(items[2]);
      });

      it("should clamp index to valid range", () => {
        const { result } = renderHook(() => useGalleryStore());
        const items = createMockItems(3, "channel-1");

        act(() => {
          result.current.openLightbox(items, 10);
        });

        expect(result.current.lightbox.currentIndex).toBe(2);
      });

      it("should reset viewer controls", () => {
        const { result } = renderHook(() => useGalleryStore());
        const items = createMockItems(3, "channel-1");

        act(() => {
          result.current.setZoom(2);
          result.current.setRotation(90);
          result.current.openLightbox(items);
        });

        expect(result.current.controls.zoom).toBe(1);
        expect(result.current.controls.rotation).toBe(0);
      });
    });

    describe("openLightboxWithItem", () => {
      it("should open with specific item", () => {
        const { result } = renderHook(() => useGalleryStore());
        const item = createMockItem({ id: "target" });

        act(() => {
          result.current.openLightboxWithItem(item);
        });

        expect(result.current.lightbox.isOpen).toBe(true);
        expect(result.current.lightbox.currentItem).toEqual(item);
      });

      it("should open with context items", () => {
        const { result } = renderHook(() => useGalleryStore());
        const items = createMockItems(5, "channel-1");
        const targetItem = items[2];

        act(() => {
          result.current.openLightboxWithItem(targetItem, items);
        });

        expect(result.current.lightbox.items).toHaveLength(5);
        expect(result.current.lightbox.currentIndex).toBe(2);
      });
    });

    describe("closeLightbox", () => {
      it("should close lightbox", () => {
        const { result } = renderHook(() => useGalleryStore());
        const items = createMockItems(3, "channel-1");

        act(() => {
          result.current.openLightbox(items);
          result.current.closeLightbox();
        });

        expect(result.current.lightbox.isOpen).toBe(false);
        expect(result.current.lightbox.currentItem).toBeNull();
        expect(result.current.lightbox.items).toHaveLength(0);
      });

      it("should reset controls", () => {
        const { result } = renderHook(() => useGalleryStore());
        const items = createMockItems(3, "channel-1");

        act(() => {
          result.current.openLightbox(items);
          result.current.setZoom(2);
          result.current.closeLightbox();
        });

        expect(result.current.controls.zoom).toBe(1);
      });
    });

    describe("nextItem", () => {
      it("should go to next item", () => {
        const { result } = renderHook(() => useGalleryStore());
        const items = createMockItems(5, "channel-1");

        act(() => {
          result.current.openLightbox(items, 0);
          result.current.nextItem();
        });

        expect(result.current.lightbox.currentIndex).toBe(1);
        expect(result.current.lightbox.currentItem).toEqual(items[1]);
      });

      it("should loop when at end with loop enabled", () => {
        const { result } = renderHook(() => useGalleryStore());
        const items = createMockItems(3, "channel-1");

        act(() => {
          result.current.setCarouselLoop(true);
          result.current.openLightbox(items, 2);
          result.current.nextItem();
        });

        expect(result.current.lightbox.currentIndex).toBe(0);
      });

      it("should not loop when at end with loop disabled", () => {
        const { result } = renderHook(() => useGalleryStore());
        const items = createMockItems(3, "channel-1");

        act(() => {
          result.current.setCarouselLoop(false);
          result.current.openLightbox(items, 2);
          result.current.nextItem();
        });

        expect(result.current.lightbox.currentIndex).toBe(2);
      });

      it("should reset controls when changing item", () => {
        const { result } = renderHook(() => useGalleryStore());
        const items = createMockItems(3, "channel-1");

        act(() => {
          result.current.openLightbox(items);
          result.current.setZoom(2);
          result.current.nextItem();
        });

        expect(result.current.controls.zoom).toBe(1);
      });
    });

    describe("previousItem", () => {
      it("should go to previous item", () => {
        const { result } = renderHook(() => useGalleryStore());
        const items = createMockItems(5, "channel-1");

        act(() => {
          result.current.openLightbox(items, 2);
          result.current.previousItem();
        });

        expect(result.current.lightbox.currentIndex).toBe(1);
      });

      it("should loop to end with loop enabled", () => {
        const { result } = renderHook(() => useGalleryStore());
        const items = createMockItems(3, "channel-1");

        act(() => {
          result.current.setCarouselLoop(true);
          result.current.openLightbox(items, 0);
          result.current.previousItem();
        });

        expect(result.current.lightbox.currentIndex).toBe(2);
      });
    });

    describe("goToItem", () => {
      it("should go to specific index", () => {
        const { result } = renderHook(() => useGalleryStore());
        const items = createMockItems(5, "channel-1");

        act(() => {
          result.current.openLightbox(items);
          result.current.goToItem(3);
        });

        expect(result.current.lightbox.currentIndex).toBe(3);
        expect(result.current.lightbox.currentItem).toEqual(items[3]);
      });

      it("should ignore invalid index", () => {
        const { result } = renderHook(() => useGalleryStore());
        const items = createMockItems(3, "channel-1");

        act(() => {
          result.current.openLightbox(items, 1);
          result.current.goToItem(10);
        });

        expect(result.current.lightbox.currentIndex).toBe(1);
      });

      it("should ignore negative index", () => {
        const { result } = renderHook(() => useGalleryStore());
        const items = createMockItems(3, "channel-1");

        act(() => {
          result.current.openLightbox(items, 1);
          result.current.goToItem(-1);
        });

        expect(result.current.lightbox.currentIndex).toBe(1);
      });
    });

    describe("canGoNext", () => {
      it("should return true when not at end", () => {
        const { result } = renderHook(() => useGalleryStore());
        const items = createMockItems(3, "channel-1");

        act(() => {
          result.current.openLightbox(items, 0);
        });

        expect(result.current.canGoNext()).toBe(true);
      });

      it("should return true at end with loop enabled", () => {
        const { result } = renderHook(() => useGalleryStore());
        const items = createMockItems(3, "channel-1");

        act(() => {
          result.current.setCarouselLoop(true);
          result.current.openLightbox(items, 2);
        });

        expect(result.current.canGoNext()).toBe(true);
      });

      it("should return false at end with loop disabled", () => {
        const { result } = renderHook(() => useGalleryStore());
        const items = createMockItems(3, "channel-1");

        act(() => {
          result.current.setCarouselLoop(false);
          result.current.openLightbox(items, 2);
        });

        expect(result.current.canGoNext()).toBe(false);
      });
    });

    describe("canGoPrevious", () => {
      it("should return true when not at start", () => {
        const { result } = renderHook(() => useGalleryStore());
        const items = createMockItems(3, "channel-1");

        act(() => {
          result.current.openLightbox(items, 1);
        });

        expect(result.current.canGoPrevious()).toBe(true);
      });

      it("should return true at start with loop enabled", () => {
        const { result } = renderHook(() => useGalleryStore());
        const items = createMockItems(3, "channel-1");

        act(() => {
          result.current.setCarouselLoop(true);
          result.current.openLightbox(items, 0);
        });

        expect(result.current.canGoPrevious()).toBe(true);
      });

      it("should return false at start with loop disabled", () => {
        const { result } = renderHook(() => useGalleryStore());
        const items = createMockItems(3, "channel-1");

        act(() => {
          result.current.setCarouselLoop(false);
          result.current.openLightbox(items, 0);
        });

        expect(result.current.canGoPrevious()).toBe(false);
      });
    });
  });

  // ==========================================================================
  // Carousel Tests
  // ==========================================================================

  describe("Carousel", () => {
    describe("setCarouselEnabled", () => {
      it("should enable carousel", () => {
        const { result } = renderHook(() => useGalleryStore());

        act(() => {
          result.current.setCarouselEnabled(true);
        });

        expect(result.current.carousel.enabled).toBe(true);
      });
    });

    describe("setCarouselAutoplay", () => {
      it("should enable autoplay", () => {
        const { result } = renderHook(() => useGalleryStore());

        act(() => {
          result.current.setCarouselAutoplay(true);
        });

        expect(result.current.carousel.autoplay).toBe(true);
      });
    });

    describe("setCarouselInterval", () => {
      it("should set interval", () => {
        const { result } = renderHook(() => useGalleryStore());

        act(() => {
          result.current.setCarouselInterval(3000);
        });

        expect(result.current.carousel.interval).toBe(3000);
      });
    });

    describe("setCarouselLoop", () => {
      it("should set loop", () => {
        const { result } = renderHook(() => useGalleryStore());

        act(() => {
          result.current.setCarouselLoop(false);
        });

        expect(result.current.carousel.loop).toBe(false);
      });
    });

    describe("startCarousel", () => {
      it("should enable carousel and autoplay", () => {
        const { result } = renderHook(() => useGalleryStore());

        act(() => {
          result.current.startCarousel();
        });

        expect(result.current.carousel.enabled).toBe(true);
        expect(result.current.carousel.autoplay).toBe(true);
      });
    });

    describe("stopCarousel", () => {
      it("should stop autoplay", () => {
        const { result } = renderHook(() => useGalleryStore());

        act(() => {
          result.current.startCarousel();
          result.current.stopCarousel();
        });

        expect(result.current.carousel.autoplay).toBe(false);
      });
    });
  });

  // ==========================================================================
  // Viewer Controls Tests
  // ==========================================================================

  describe("Viewer Controls", () => {
    describe("setZoom", () => {
      it("should set zoom level", () => {
        const { result } = renderHook(() => useGalleryStore());

        act(() => {
          result.current.setZoom(2);
        });

        expect(result.current.controls.zoom).toBe(2);
      });

      it("should clamp to min zoom", () => {
        const { result } = renderHook(() => useGalleryStore());

        act(() => {
          result.current.setZoom(0);
        });

        expect(result.current.controls.zoom).toBe(MIN_ZOOM);
      });

      it("should clamp to max zoom", () => {
        const { result } = renderHook(() => useGalleryStore());

        act(() => {
          result.current.setZoom(100);
        });

        expect(result.current.controls.zoom).toBe(MAX_ZOOM);
      });
    });

    describe("zoomIn", () => {
      it("should increase zoom by step", () => {
        const { result } = renderHook(() => useGalleryStore());

        act(() => {
          result.current.zoomIn();
        });

        expect(result.current.controls.zoom).toBe(1 + ZOOM_STEP);
      });

      it("should not exceed max zoom", () => {
        const { result } = renderHook(() => useGalleryStore());

        act(() => {
          result.current.setZoom(MAX_ZOOM);
          result.current.zoomIn();
        });

        expect(result.current.controls.zoom).toBe(MAX_ZOOM);
      });
    });

    describe("zoomOut", () => {
      it("should decrease zoom by step", () => {
        const { result } = renderHook(() => useGalleryStore());

        act(() => {
          result.current.setZoom(2);
          result.current.zoomOut();
        });

        expect(result.current.controls.zoom).toBe(2 - ZOOM_STEP);
      });

      it("should not go below min zoom", () => {
        const { result } = renderHook(() => useGalleryStore());

        act(() => {
          result.current.setZoom(MIN_ZOOM);
          result.current.zoomOut();
        });

        expect(result.current.controls.zoom).toBe(MIN_ZOOM);
      });
    });

    describe("setPan", () => {
      it("should set pan position", () => {
        const { result } = renderHook(() => useGalleryStore());

        act(() => {
          result.current.setPan(100, 50);
        });

        expect(result.current.controls.panX).toBe(100);
        expect(result.current.controls.panY).toBe(50);
      });
    });

    describe("setRotation", () => {
      it("should set rotation", () => {
        const { result } = renderHook(() => useGalleryStore());

        act(() => {
          result.current.setRotation(90);
        });

        expect(result.current.controls.rotation).toBe(90);
      });

      it("should wrap rotation at 360", () => {
        const { result } = renderHook(() => useGalleryStore());

        act(() => {
          result.current.setRotation(450);
        });

        expect(result.current.controls.rotation).toBe(90);
      });
    });

    describe("rotateLeft", () => {
      it("should rotate left by step", () => {
        const { result } = renderHook(() => useGalleryStore());

        act(() => {
          result.current.setRotation(180);
          result.current.rotateLeft();
        });

        expect(result.current.controls.rotation).toBe(180 - ROTATION_STEP);
      });

      it("should wrap from 0 to 270", () => {
        const { result } = renderHook(() => useGalleryStore());

        act(() => {
          result.current.setRotation(0);
          result.current.rotateLeft();
        });

        expect(result.current.controls.rotation).toBe(270);
      });
    });

    describe("rotateRight", () => {
      it("should rotate right by step", () => {
        const { result } = renderHook(() => useGalleryStore());

        act(() => {
          result.current.rotateRight();
        });

        expect(result.current.controls.rotation).toBe(ROTATION_STEP);
      });

      it("should wrap from 270 to 0", () => {
        const { result } = renderHook(() => useGalleryStore());

        act(() => {
          result.current.setRotation(270);
          result.current.rotateRight();
        });

        expect(result.current.controls.rotation).toBe(0);
      });
    });

    describe("resetView", () => {
      it("should reset zoom, pan, and rotation", () => {
        const { result } = renderHook(() => useGalleryStore());

        act(() => {
          result.current.setZoom(2);
          result.current.setPan(100, 50);
          result.current.setRotation(90);
          result.current.resetView();
        });

        expect(result.current.controls.zoom).toBe(1);
        expect(result.current.controls.panX).toBe(0);
        expect(result.current.controls.panY).toBe(0);
        expect(result.current.controls.rotation).toBe(0);
      });
    });

    describe("toggleFullscreen", () => {
      it("should toggle fullscreen", () => {
        const { result } = renderHook(() => useGalleryStore());

        act(() => {
          result.current.toggleFullscreen();
        });

        expect(result.current.controls.isFullscreen).toBe(true);

        act(() => {
          result.current.toggleFullscreen();
        });

        expect(result.current.controls.isFullscreen).toBe(false);
      });
    });

    describe("toggleInfo", () => {
      it("should toggle info panel", () => {
        const { result } = renderHook(() => useGalleryStore());

        act(() => {
          result.current.toggleInfo();
        });

        expect(result.current.controls.showInfo).toBe(true);
      });
    });

    describe("toggleControls", () => {
      it("should toggle controls visibility", () => {
        const { result } = renderHook(() => useGalleryStore());

        act(() => {
          result.current.toggleControls();
        });

        expect(result.current.controls.showControls).toBe(false);
      });
    });
  });

  // ==========================================================================
  // Playback Controls Tests
  // ==========================================================================

  describe("Playback Controls", () => {
    describe("setPlaying", () => {
      it("should set playing state", () => {
        const { result } = renderHook(() => useGalleryStore());

        act(() => {
          result.current.setPlaying(true);
        });

        expect(result.current.controls.isPlaying).toBe(true);
      });
    });

    describe("togglePlayback", () => {
      it("should toggle playback", () => {
        const { result } = renderHook(() => useGalleryStore());

        act(() => {
          result.current.togglePlayback();
        });

        expect(result.current.controls.isPlaying).toBe(true);

        act(() => {
          result.current.togglePlayback();
        });

        expect(result.current.controls.isPlaying).toBe(false);
      });
    });

    describe("setCurrentTime", () => {
      it("should set current time", () => {
        const { result } = renderHook(() => useGalleryStore());

        act(() => {
          result.current.setCurrentTime(30);
        });

        expect(result.current.controls.currentTime).toBe(30);
      });
    });

    describe("setVolume", () => {
      it("should set volume", () => {
        const { result } = renderHook(() => useGalleryStore());

        act(() => {
          result.current.setVolume(0.5);
        });

        expect(result.current.controls.volume).toBe(0.5);
      });

      it("should clamp volume to 0-1", () => {
        const { result } = renderHook(() => useGalleryStore());

        act(() => {
          result.current.setVolume(2);
        });

        expect(result.current.controls.volume).toBe(1);

        act(() => {
          result.current.setVolume(-1);
        });

        expect(result.current.controls.volume).toBe(0);
      });
    });

    describe("toggleMute", () => {
      it("should toggle mute", () => {
        const { result } = renderHook(() => useGalleryStore());

        act(() => {
          result.current.toggleMute();
        });

        expect(result.current.controls.isMuted).toBe(true);

        act(() => {
          result.current.toggleMute();
        });

        expect(result.current.controls.isMuted).toBe(false);
      });
    });
  });

  // ==========================================================================
  // Selection Tests
  // ==========================================================================

  describe("Selection", () => {
    describe("selectItem", () => {
      it("should add item to selection", () => {
        const { result } = renderHook(() => useGalleryStore());

        act(() => {
          result.current.selectItem("item-1");
        });

        expect(result.current.selectedItems.has("item-1")).toBe(true);
      });
    });

    describe("deselectItem", () => {
      it("should remove item from selection", () => {
        const { result } = renderHook(() => useGalleryStore());

        act(() => {
          result.current.selectItem("item-1");
          result.current.deselectItem("item-1");
        });

        expect(result.current.selectedItems.has("item-1")).toBe(false);
      });
    });

    describe("toggleItemSelection", () => {
      it("should toggle selection", () => {
        const { result } = renderHook(() => useGalleryStore());

        act(() => {
          result.current.toggleItemSelection("item-1");
        });

        expect(result.current.selectedItems.has("item-1")).toBe(true);

        act(() => {
          result.current.toggleItemSelection("item-1");
        });

        expect(result.current.selectedItems.has("item-1")).toBe(false);
      });
    });

    describe("selectAll", () => {
      it("should select all items", () => {
        const { result } = renderHook(() => useGalleryStore());
        const items = createMockItems(3, "channel-1");

        act(() => {
          result.current.setItemsForChannel("channel-1", items);
          result.current.selectAll();
        });

        expect(result.current.selectedItems.size).toBe(3);
      });

      it("should select all items in specific channel", () => {
        const { result } = renderHook(() => useGalleryStore());
        const items1 = createMockItems(3, "channel-1");
        const items2 = createMockItems(2, "channel-2");

        act(() => {
          result.current.setItemsForChannel("channel-1", items1);
          result.current.setItemsForChannel("channel-2", items2);
          result.current.selectAll("channel-1");
        });

        expect(result.current.selectedItems.size).toBe(3);
      });
    });

    describe("clearSelection", () => {
      it("should clear all selection", () => {
        const { result } = renderHook(() => useGalleryStore());

        act(() => {
          result.current.selectItem("item-1");
          result.current.selectItem("item-2");
          result.current.clearSelection();
        });

        expect(result.current.selectedItems.size).toBe(0);
      });
    });

    describe("setSelectMode", () => {
      it("should enable select mode", () => {
        const { result } = renderHook(() => useGalleryStore());

        act(() => {
          result.current.setSelectMode(true);
        });

        expect(result.current.isSelectMode).toBe(true);
      });

      it("should clear selection when disabling", () => {
        const { result } = renderHook(() => useGalleryStore());

        act(() => {
          result.current.setSelectMode(true);
          result.current.selectItem("item-1");
          result.current.setSelectMode(false);
        });

        expect(result.current.selectedItems.size).toBe(0);
      });
    });

    describe("getSelectedItems", () => {
      it("should return selected items", () => {
        const { result } = renderHook(() => useGalleryStore());
        const items = createMockItems(3, "channel-1");

        act(() => {
          result.current.setItemsForChannel("channel-1", items);
          result.current.selectItem(items[0].id);
          result.current.selectItem(items[2].id);
        });

        const selected = result.current.getSelectedItems();
        expect(selected).toHaveLength(2);
        expect(selected).toContainEqual(items[0]);
        expect(selected).toContainEqual(items[2]);
      });
    });
  });

  // ==========================================================================
  // Loading State Tests
  // ==========================================================================

  describe("Loading State", () => {
    describe("setLoading", () => {
      it("should set loading state", () => {
        const { result } = renderHook(() => useGalleryStore());

        act(() => {
          result.current.setLoading(true);
        });

        expect(result.current.isLoading).toBe(true);
      });
    });

    describe("setError", () => {
      it("should set error message", () => {
        const { result } = renderHook(() => useGalleryStore());

        act(() => {
          result.current.setError("Something went wrong");
        });

        expect(result.current.error).toBe("Something went wrong");
      });

      it("should clear error", () => {
        const { result } = renderHook(() => useGalleryStore());

        act(() => {
          result.current.setError("Error");
          result.current.setError(null);
        });

        expect(result.current.error).toBeNull();
      });
    });
  });

  // ==========================================================================
  // Reset Test
  // ==========================================================================

  describe("Reset", () => {
    it("should reset entire store", () => {
      const { result } = renderHook(() => useGalleryStore());
      const items = createMockItems(3, "channel-1");

      act(() => {
        result.current.setItemsForChannel("channel-1", items);
        result.current.openLightbox(items);
        result.current.selectAll();
        result.current.setZoom(2);
        result.current.setLoading(true);
        result.current.setError("Error");
        result.current.reset();
      });

      expect(result.current.allItems).toHaveLength(0);
      expect(result.current.lightbox.isOpen).toBe(false);
      expect(result.current.selectedItems.size).toBe(0);
      expect(result.current.controls.zoom).toBe(1);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  // ==========================================================================
  // Constants Tests
  // ==========================================================================

  describe("Constants", () => {
    it("should have correct MIN_ZOOM", () => {
      expect(MIN_ZOOM).toBe(0.1);
    });

    it("should have correct MAX_ZOOM", () => {
      expect(MAX_ZOOM).toBe(5);
    });

    it("should have correct ZOOM_STEP", () => {
      expect(ZOOM_STEP).toBe(0.25);
    });

    it("should have correct ROTATION_STEP", () => {
      expect(ROTATION_STEP).toBe(90);
    });

    it("should have correct DEFAULT_CAROUSEL_INTERVAL", () => {
      expect(DEFAULT_CAROUSEL_INTERVAL).toBe(5000);
    });
  });
});
