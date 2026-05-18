/**
 * Mock Exports
 *
 * Central export for all test mocks
 */

export * from "./auth";
export * from "./router";
export * from "./graphql";
export * from "./stores";

// ============================================================================
// Common Browser API Mocks
// ============================================================================

/**
 * Mock window.matchMedia
 */
export function mockMatchMedia(matches: boolean = false) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

/**
 * Mock window.ResizeObserver
 */
export function mockResizeObserver() {
  const mockResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));

  Object.defineProperty(window, "ResizeObserver", {
    writable: true,
    value: mockResizeObserver,
  });

  return mockResizeObserver;
}

/**
 * Mock window.IntersectionObserver
 */
export function mockIntersectionObserver(
  intersect: boolean = false,
  callback?: (entries: IntersectionObserverEntry[]) => void,
) {
  const mockIntersectionObserver = jest
    .fn()
    .mockImplementation((observerCallback) => {
      if (callback) {
        callback = observerCallback;
      }
      return {
        observe: jest.fn(),
        unobserve: jest.fn(),
        disconnect: jest.fn(),
        root: null,
        rootMargin: "",
        thresholds: [],
        takeRecords: jest.fn(() => []),
      };
    });

  Object.defineProperty(window, "IntersectionObserver", {
    writable: true,
    value: mockIntersectionObserver,
  });

  return {
    mockObserver: mockIntersectionObserver,
    triggerIntersection: (isIntersecting: boolean = true) => {
      if (callback) {
        callback([
          {
            isIntersecting,
            boundingClientRect: {} as DOMRectReadOnly,
            intersectionRatio: isIntersecting ? 1 : 0,
            intersectionRect: {} as DOMRectReadOnly,
            rootBounds: null,
            target: document.createElement("div"),
            time: Date.now(),
          },
        ]);
      }
    },
  };
}

/**
 * Mock window.scrollTo
 */
export function mockScrollTo() {
  Object.defineProperty(window, "scrollTo", {
    writable: true,
    value: jest.fn(),
  });
}

/**
 * Mock document.execCommand (for clipboard operations)
 */
export function mockExecCommand() {
  document.execCommand = jest.fn();
}

/**
 * Mock navigator.clipboard
 */
export function mockClipboard() {
  const clipboard = {
    writeText: jest.fn().mockResolvedValue(undefined),
    readText: jest.fn().mockResolvedValue(""),
    write: jest.fn().mockResolvedValue(undefined),
    read: jest.fn().mockResolvedValue([]),
  };

  Object.defineProperty(navigator, "clipboard", {
    writable: true,
    value: clipboard,
  });

  return clipboard;
}

/**
 * Mock navigator.mediaDevices
 */
export function mockMediaDevices() {
  const mediaDevices = {
    getUserMedia: jest.fn().mockResolvedValue({
      getTracks: () => [],
      getAudioTracks: () => [],
      getVideoTracks: () => [],
    }),
    enumerateDevices: jest.fn().mockResolvedValue([]),
    getDisplayMedia: jest.fn().mockResolvedValue({
      getTracks: () => [],
    }),
  };

  Object.defineProperty(navigator, "mediaDevices", {
    writable: true,
    value: mediaDevices,
  });

  return mediaDevices;
}

/**
 * Mock fetch API
 */
export function mockFetch(responses: Record<string, any> = {}) {
  const mockFetch = jest
    .fn()
    .mockImplementation((url: string, options?: RequestInit) => {
      const response = responses[url];
      if (response) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(response),
          text: () => Promise.resolve(JSON.stringify(response)),
          blob: () => Promise.resolve(new Blob()),
          headers: new Headers(),
        });
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: "Not found" }),
        text: () => Promise.resolve("Not found"),
      });
    });

  global.fetch = mockFetch;
  return mockFetch;
}

/**
 * Mock WebSocket
 */
export function mockWebSocket() {
  const mockWs = {
    send: jest.fn(),
    close: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    readyState: 1, // OPEN
    CONNECTING: 0,
    OPEN: 1,
    CLOSING: 2,
    CLOSED: 3,
    onopen: null as ((ev: Event) => void) | null,
    onclose: null as ((ev: CloseEvent) => void) | null,
    onerror: null as ((ev: Event) => void) | null,
    onmessage: null as ((ev: MessageEvent) => void) | null,
  };

  const MockWebSocket = jest.fn().mockImplementation(() => mockWs);

  Object.defineProperty(global, "WebSocket", {
    writable: true,
    value: MockWebSocket,
  });

  return {
    MockWebSocket,
    instance: mockWs,
    simulateOpen: () => {
      if (mockWs.onopen) mockWs.onopen(new Event("open"));
    },
    simulateClose: (code: number = 1000, reason: string = "") => {
      if (mockWs.onclose)
        mockWs.onclose(new CloseEvent("close", { code, reason }));
    },
    simulateMessage: (data: any) => {
      if (mockWs.onmessage)
        mockWs.onmessage(
          new MessageEvent("message", { data: JSON.stringify(data) }),
        );
    },
    simulateError: () => {
      if (mockWs.onerror) mockWs.onerror(new Event("error"));
    },
  };
}

/**
 * Mock File constructor
 */
export function createMockFile(
  name: string = "test.txt",
  size: number = 1024,
  type: string = "text/plain",
  content: string = "",
): File {
  const blob = new Blob([content || "x".repeat(size)], { type });
  return new File([blob], name, { type });
}

/**
 * Mock Image constructor for image loading
 */
export function mockImageLoad(success: boolean = true) {
  const originalImage = global.Image;

  class MockImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    src: string = "";
    width: number = 100;
    height: number = 100;

    constructor() {
      setTimeout(() => {
        if (success && this.onload) {
          this.onload();
        } else if (!success && this.onerror) {
          this.onerror();
        }
      }, 0);
    }
  }

  global.Image = MockImage as any;

  return () => {
    global.Image = originalImage;
  };
}

// ============================================================================
// Setup All Mocks
// ============================================================================

/**
 * Setup all common mocks for testing
 */
export function setupAllMocks() {
  mockMatchMedia();
  mockResizeObserver();
  mockIntersectionObserver();
  mockScrollTo();
  mockClipboard();
}
