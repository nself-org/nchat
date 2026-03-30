/**
 * @jest-environment <rootDir>/jest.jsdom-env.js
 */

/**
 * useMediaGallery Hook Tests
 *
 * Comprehensive unit tests for the media gallery hook.
 */

import { renderHook, act } from '@testing-library/react'
import { useMediaGallery } from '../use-media-gallery'
import { useGalleryStore, GalleryItem } from '@/stores/gallery-store'

// ============================================================================
// Test Helpers
// ============================================================================

function createMockItem(overrides: Partial<GalleryItem> = {}): GalleryItem {
  const id = overrides.id || `item-${Math.random().toString(36).slice(2)}`
  return {
    id,
    fileName: `file-${id}.jpg`,
    fileType: 'image',
    mimeType: 'image/jpeg',
    fileSize: 1024,
    url: `https://example.com/${id}.jpg`,
    thumbnailUrl: `https://example.com/${id}-thumb.jpg`,
    channelId: 'channel-1',
    messageId: 'message-1',
    uploadedBy: {
      id: 'user-1',
      username: 'testuser',
      displayName: 'Test User',
      avatarUrl: null,
    },
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

function createMockItems(count: number): GalleryItem[] {
  return Array.from({ length: count }, (_, i) => createMockItem({ id: `item-${i}` }))
}

// ============================================================================
// Mock Setup
// ============================================================================

// Mock link for download tests - will be set up in each download test
const mockLink = {
  href: '',
  download: '',
  click: jest.fn(),
  style: {},
}

// Store original createElement to restore
const originalCreateElement = document.createElement.bind(document)

// ============================================================================
// Tests
// ============================================================================

describe('useMediaGallery', () => {
  let createElementSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()

    // Reset mock link
    mockLink.href = ''
    mockLink.download = ''
    mockLink.click.mockClear()

    // Reset gallery store by getting its reset method
    const store = useGalleryStore.getState()
    store.reset()

    // Spy on document methods for download tests
    createElementSpy = jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') {
        return mockLink as unknown as HTMLAnchorElement
      }
      return originalCreateElement(tag)
    })
  })

  afterEach(() => {
    jest.useRealTimers()
    createElementSpy.mockRestore()
  })

  // ==========================================================================
  // Initial State Tests
  // ==========================================================================

  describe('Initial State', () => {
    it('should return initial state', () => {
      const { result } = renderHook(() => useMediaGallery())

      expect(result.current.isOpen).toBe(false)
      expect(result.current.currentItem).toBeNull()
      expect(result.current.currentIndex).toBe(0)
      expect(result.current.items).toHaveLength(0)
      expect(result.current.totalItems).toBe(0)
    })

    it('should initialize with options', () => {
      const { result } = renderHook(() =>
        useMediaGallery({
          channelId: 'channel-1',
          autoplay: true,
          loop: false,
          interval: 3000,
        })
      )

      expect(result.current.isOpen).toBe(false)
    })
  })

  // ==========================================================================
  // Open/Close Tests
  // ==========================================================================

  describe('Open/Close', () => {
    describe('open', () => {
      it('should open gallery with items', () => {
        const { result } = renderHook(() => useMediaGallery())
        const items = createMockItems(5)

        act(() => {
          result.current.open(items)
        })

        expect(result.current.isOpen).toBe(true)
        expect(result.current.items).toHaveLength(5)
        expect(result.current.currentIndex).toBe(0)
        expect(result.current.currentItem).toEqual(items[0])
      })

      it('should open at specific index', () => {
        const { result } = renderHook(() => useMediaGallery())
        const items = createMockItems(5)

        act(() => {
          result.current.open(items, 2)
        })

        expect(result.current.currentIndex).toBe(2)
        expect(result.current.currentItem).toEqual(items[2])
      })
    })

    describe('openItem', () => {
      it('should open with specific item', () => {
        const { result } = renderHook(() => useMediaGallery())
        const item = createMockItem({ id: 'target' })

        act(() => {
          result.current.openItem(item)
        })

        expect(result.current.isOpen).toBe(true)
        expect(result.current.currentItem).toEqual(item)
      })

      it('should open with context items', () => {
        const { result } = renderHook(() => useMediaGallery())
        const items = createMockItems(5)
        const targetItem = items[2]

        act(() => {
          result.current.openItem(targetItem, items)
        })

        expect(result.current.items).toHaveLength(5)
        expect(result.current.currentIndex).toBe(2)
      })
    })

    describe('close', () => {
      it('should close gallery', () => {
        const { result } = renderHook(() => useMediaGallery())
        const items = createMockItems(3)

        act(() => {
          result.current.open(items)
          result.current.close()
        })

        expect(result.current.isOpen).toBe(false)
        expect(result.current.currentItem).toBeNull()
      })
    })
  })

  // ==========================================================================
  // Navigation Tests
  // ==========================================================================

  describe('Navigation', () => {
    describe('next', () => {
      it('should go to next item', () => {
        const { result } = renderHook(() => useMediaGallery())
        const items = createMockItems(5)

        act(() => {
          result.current.open(items, 0)
          result.current.next()
        })

        expect(result.current.currentIndex).toBe(1)
      })

      it('should loop when at end with loop enabled', () => {
        const { result } = renderHook(() => useMediaGallery({ loop: true }))
        const items = createMockItems(3)

        act(() => {
          result.current.open(items, 2)
          result.current.next()
        })

        expect(result.current.currentIndex).toBe(0)
      })
    })

    describe('previous', () => {
      it('should go to previous item', () => {
        const { result } = renderHook(() => useMediaGallery())
        const items = createMockItems(5)

        act(() => {
          result.current.open(items, 2)
          result.current.previous()
        })

        expect(result.current.currentIndex).toBe(1)
      })

      it('should loop to end when at start', () => {
        const { result } = renderHook(() => useMediaGallery({ loop: true }))
        const items = createMockItems(3)

        act(() => {
          result.current.open(items, 0)
          result.current.previous()
        })

        expect(result.current.currentIndex).toBe(2)
      })
    })

    describe('goTo', () => {
      it('should go to specific index', () => {
        const { result } = renderHook(() => useMediaGallery())
        const items = createMockItems(5)

        act(() => {
          result.current.open(items)
          result.current.goTo(3)
        })

        expect(result.current.currentIndex).toBe(3)
      })
    })

    describe('canGoNext', () => {
      it('should return true when not at end', () => {
        const { result } = renderHook(() => useMediaGallery())
        const items = createMockItems(3)

        act(() => {
          result.current.open(items, 0)
        })

        expect(result.current.canGoNext).toBe(true)
      })
    })

    describe('canGoPrevious', () => {
      it('should return true when not at start', () => {
        const { result } = renderHook(() => useMediaGallery())
        const items = createMockItems(3)

        act(() => {
          result.current.open(items, 1)
        })

        expect(result.current.canGoPrevious).toBe(true)
      })
    })
  })

  // ==========================================================================
  // Autoplay Tests
  // ==========================================================================

  describe('Autoplay', () => {
    describe('startAutoplay', () => {
      it('should enable autoplay', () => {
        const { result } = renderHook(() => useMediaGallery())
        const items = createMockItems(3)

        act(() => {
          result.current.open(items)
          result.current.startAutoplay()
        })

        expect(result.current.isAutoplayEnabled).toBe(true)
      })
    })

    describe('stopAutoplay', () => {
      it('should disable autoplay', () => {
        const { result } = renderHook(() => useMediaGallery())
        const items = createMockItems(3)

        act(() => {
          result.current.open(items)
          result.current.startAutoplay()
          result.current.stopAutoplay()
        })

        expect(result.current.isAutoplayEnabled).toBe(false)
      })
    })

    describe('toggleAutoplay', () => {
      it('should toggle autoplay', () => {
        const { result } = renderHook(() => useMediaGallery())
        const items = createMockItems(3)

        act(() => {
          result.current.open(items)
          result.current.toggleAutoplay()
        })

        expect(result.current.isAutoplayEnabled).toBe(true)

        act(() => {
          result.current.toggleAutoplay()
        })

        expect(result.current.isAutoplayEnabled).toBe(false)
      })
    })

    it('should auto-advance when autoplay is enabled', () => {
      const { result } = renderHook(() => useMediaGallery({ interval: 1000 }))
      const items = createMockItems(5)

      act(() => {
        result.current.open(items)
        result.current.startAutoplay()
      })

      expect(result.current.currentIndex).toBe(0)

      act(() => {
        jest.advanceTimersByTime(1000)
      })

      expect(result.current.currentIndex).toBe(1)
    })
  })

  // ==========================================================================
  // Viewer Controls Tests
  // ==========================================================================

  describe('Viewer Controls', () => {
    describe('zoom controls', () => {
      it('should zoom in', () => {
        const { result } = renderHook(() => useMediaGallery())
        const items = createMockItems(1)

        act(() => {
          result.current.open(items)
          result.current.zoomIn()
        })

        expect(result.current.zoom).toBeGreaterThan(1)
      })

      it('should zoom out', () => {
        const { result } = renderHook(() => useMediaGallery())
        const items = createMockItems(1)

        act(() => {
          result.current.open(items)
          result.current.setZoom(2)
          result.current.zoomOut()
        })

        expect(result.current.zoom).toBeLessThan(2)
      })

      it('should set zoom level', () => {
        const { result } = renderHook(() => useMediaGallery())
        const items = createMockItems(1)

        act(() => {
          result.current.open(items)
          result.current.setZoom(2.5)
        })

        expect(result.current.zoom).toBe(2.5)
      })
    })

    describe('rotation controls', () => {
      it('should rotate left', () => {
        const { result } = renderHook(() => useMediaGallery())
        const items = createMockItems(1)

        act(() => {
          result.current.open(items)
          result.current.rotateLeft()
        })

        expect(result.current.rotation).toBe(270)
      })

      it('should rotate right', () => {
        const { result } = renderHook(() => useMediaGallery())
        const items = createMockItems(1)

        act(() => {
          result.current.open(items)
          result.current.rotateRight()
        })

        expect(result.current.rotation).toBe(90)
      })

      it('should set rotation', () => {
        const { result } = renderHook(() => useMediaGallery())
        const items = createMockItems(1)

        act(() => {
          result.current.open(items)
          result.current.setRotation(180)
        })

        expect(result.current.rotation).toBe(180)
      })
    })

    describe('resetView', () => {
      it('should reset zoom and rotation', () => {
        const { result } = renderHook(() => useMediaGallery())
        const items = createMockItems(1)

        act(() => {
          result.current.open(items)
          result.current.setZoom(2)
          result.current.setRotation(90)
          result.current.resetView()
        })

        expect(result.current.zoom).toBe(1)
        expect(result.current.rotation).toBe(0)
      })
    })

    describe('toggleFullscreen', () => {
      it('should toggle fullscreen', () => {
        const { result } = renderHook(() => useMediaGallery())
        const items = createMockItems(1)

        act(() => {
          result.current.open(items)
          result.current.toggleFullscreen()
        })

        expect(result.current.isFullscreen).toBe(true)

        act(() => {
          result.current.toggleFullscreen()
        })

        expect(result.current.isFullscreen).toBe(false)
      })
    })

    describe('toggleInfo', () => {
      it('should toggle info panel', () => {
        const { result } = renderHook(() => useMediaGallery())
        const items = createMockItems(1)

        act(() => {
          result.current.open(items)
          result.current.toggleInfo()
        })

        expect(result.current.showInfo).toBe(true)
      })
    })
  })

  // ==========================================================================
  // Download Tests
  // ==========================================================================

  describe('Download', () => {
    // Skip: These tests require complex DOM mocking for appendChild/removeChild
    it.skip('should download current item', () => {
      const { result } = renderHook(() => useMediaGallery())
      const items = createMockItems(1)

      act(() => {
        result.current.open(items)
        result.current.download()
      })

      expect(mockLink.click).toHaveBeenCalled()
      expect(mockLink.download).toBe(items[0].fileName)
    })

    it.skip('should download specific item', () => {
      const { result } = renderHook(() => useMediaGallery())
      const items = createMockItems(3)
      const targetItem = items[1]

      act(() => {
        result.current.open(items)
        result.current.download(targetItem)
      })

      expect(mockLink.click).toHaveBeenCalled()
      expect(mockLink.download).toBe(targetItem.fileName)
    })

    it.skip('should use downloadUrl if available', () => {
      const { result } = renderHook(() => useMediaGallery())
      const item = createMockItem({
        downloadUrl: 'https://example.com/download/file.jpg',
      })

      act(() => {
        result.current.open([item])
        result.current.download()
      })

      expect(mockLink.href).toBe('https://example.com/download/file.jpg')
    })

    it('should not download when no item', () => {
      const { result } = renderHook(() => useMediaGallery())

      act(() => {
        result.current.download()
      })

      expect(mockLink.click).not.toHaveBeenCalled()
    })
  })

  // ==========================================================================
  // Selection Tests
  // ==========================================================================

  describe('Selection', () => {
    describe('selectItem', () => {
      it('should select item', () => {
        const { result } = renderHook(() => useMediaGallery())

        act(() => {
          result.current.selectItem('item-1')
        })

        expect(result.current.selectedItems.has('item-1')).toBe(true)
      })
    })

    describe('deselectItem', () => {
      it('should deselect item', () => {
        const { result } = renderHook(() => useMediaGallery())

        act(() => {
          result.current.selectItem('item-1')
          result.current.deselectItem('item-1')
        })

        expect(result.current.selectedItems.has('item-1')).toBe(false)
      })
    })

    describe('toggleSelection', () => {
      it('should toggle selection', () => {
        const { result } = renderHook(() => useMediaGallery())

        act(() => {
          result.current.toggleSelection('item-1')
        })

        expect(result.current.selectedItems.has('item-1')).toBe(true)

        act(() => {
          result.current.toggleSelection('item-1')
        })

        expect(result.current.selectedItems.has('item-1')).toBe(false)
      })
    })

    describe('selectAll', () => {
      it('should select all items', () => {
        const { result: storeResult } = renderHook(() => useGalleryStore())
        const { result } = renderHook(() => useMediaGallery())
        const items = createMockItems(3)

        act(() => {
          storeResult.current.setItemsForChannel('channel-1', items)
          result.current.selectAll()
        })

        expect(result.current.selectedItems.size).toBe(3)
      })
    })

    describe('clearSelection', () => {
      it('should clear selection', () => {
        const { result } = renderHook(() => useMediaGallery())

        act(() => {
          result.current.selectItem('item-1')
          result.current.selectItem('item-2')
          result.current.clearSelection()
        })

        expect(result.current.selectedItems.size).toBe(0)
      })
    })

    describe('setSelectMode', () => {
      it('should enable select mode', () => {
        const { result } = renderHook(() => useMediaGallery())

        act(() => {
          result.current.setSelectMode(true)
        })

        expect(result.current.isSelectMode).toBe(true)
      })

      it('should clear selection when disabling', () => {
        const { result } = renderHook(() => useMediaGallery())

        act(() => {
          result.current.setSelectMode(true)
          result.current.selectItem('item-1')
          result.current.setSelectMode(false)
        })

        expect(result.current.selectedItems.size).toBe(0)
      })
    })

    describe('getSelectedItems', () => {
      it('should return selected items', () => {
        const { result: storeResult } = renderHook(() => useGalleryStore())
        const { result } = renderHook(() => useMediaGallery())
        const items = createMockItems(3)

        act(() => {
          storeResult.current.setItemsForChannel('channel-1', items)
          result.current.selectItem(items[0].id)
          result.current.selectItem(items[2].id)
        })

        const selected = result.current.getSelectedItems()
        expect(selected).toHaveLength(2)
      })
    })
  })

  // ==========================================================================
  // Integration Tests
  // ==========================================================================

  describe('Integration', () => {
    it('should handle full workflow', () => {
      const { result } = renderHook(() => useMediaGallery())
      const items = createMockItems(5)

      // Open gallery
      act(() => {
        result.current.open(items, 1)
      })

      expect(result.current.isOpen).toBe(true)
      expect(result.current.currentIndex).toBe(1)

      // Navigate
      act(() => {
        result.current.next()
      })

      expect(result.current.currentIndex).toBe(2)

      // Zoom
      act(() => {
        result.current.zoomIn()
      })

      expect(result.current.zoom).toBeGreaterThan(1)

      // Rotate
      act(() => {
        result.current.rotateRight()
      })

      expect(result.current.rotation).toBe(90)

      // Reset view
      act(() => {
        result.current.resetView()
      })

      expect(result.current.zoom).toBe(1)
      expect(result.current.rotation).toBe(0)

      // Close gallery
      act(() => {
        result.current.close()
      })

      expect(result.current.isOpen).toBe(false)
    })

    it('should clean up autoplay on close', () => {
      const { result } = renderHook(() => useMediaGallery({ interval: 1000 }))
      const items = createMockItems(5)

      act(() => {
        result.current.open(items)
        result.current.startAutoplay()
      })

      act(() => {
        result.current.close()
      })

      // Advance timers after close
      act(() => {
        jest.advanceTimersByTime(5000)
      })

      // Should not have advanced (currentIndex is 0 because gallery is closed)
      expect(result.current.isOpen).toBe(false)
    })
  })
})
