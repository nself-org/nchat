/**
 * Tests for connection-store selectors
 *
 * All selectors are pure functions that receive the store state.
 * Tests construct minimal plain-object state and call selectors directly.
 */

import type { ConnectionStore, ConnectionStoreState } from "../connection-store";
import type {
  ConnectionInfo,
  SocketConnectionState,
  RetryState,
} from "@/lib/offline/offline-types";
import {
  selectNetworkInfo,
  selectSocketState,
  selectOverallState,
  selectCanSendMessages,
  selectShouldShowOffline,
  selectRetryState,
  selectShowConnectionBanner,
  selectNetworkQuality,
  selectIsOnline,
  selectIsOffline,
  selectIsReconnecting,
  selectReconnectAttempts,
  selectLastConnectedAt,
  selectConnectionStats,
} from "../connection-store";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const defaultNetwork: ConnectionInfo = {
  state: "online",
  quality: "unknown",
  type: "unknown",
  effectiveType: "unknown",
  downlink: null,
  rtt: null,
  saveData: false,
  lastOnline: null,
  lastOffline: null,
  offlineDuration: null,
};

const defaultSocket: SocketConnectionState = {
  connected: false,
  socketId: null,
  reconnectAttempts: 0,
  lastConnectedAt: null,
  lastDisconnectedAt: null,
  disconnectReason: null,
};

const defaultRetry: RetryState = {
  attempt: 0,
  nextRetryAt: null,
  lastError: null,
  shouldRetry: true,
};

function makeState(overrides?: Partial<Record<string, unknown>>): ConnectionStore {
  const defaultState: ConnectionStoreState = {
    network: defaultNetwork,
    socket: defaultSocket,
    overallState: "offline",
    canSendMessages: false,
    shouldShowOffline: false,
    retry: defaultRetry,
    showConnectionBanner: false,
    bannerDismissedUntil: null,
    totalDisconnections: 0,
    lastDisconnectionDuration: null,
  };
  const stubs = {
    setNetworkInfo: () => undefined,
    setNetworkState: () => undefined,
    setNetworkQuality: () => undefined,
    setSocketState: () => undefined,
    setSocketConnected: () => undefined,
    incrementReconnectAttempts: () => undefined,
    resetReconnectAttempts: () => undefined,
    updateOverallState: () => undefined,
    setRetryState: () => undefined,
    resetRetryState: () => undefined,
    showBanner: () => undefined,
    hideBanner: () => undefined,
    dismissBannerTemporarily: () => undefined,
    recordDisconnection: () => undefined,
    reset: () => undefined,
  };
  return { ...defaultState, ...stubs, ...overrides } as unknown as ConnectionStore;
}

// ---------------------------------------------------------------------------
// selectNetworkInfo
// ---------------------------------------------------------------------------

describe("selectNetworkInfo", () => {
  it("returns default network info", () => {
    const result = selectNetworkInfo(makeState());
    expect(result.state).toBe("online");
    expect(result.quality).toBe("unknown");
  });

  it("returns updated network info", () => {
    const network: ConnectionInfo = { ...defaultNetwork, state: "offline", quality: "poor" };
    expect(selectNetworkInfo(makeState({ network }))).toBe(network);
  });
});

// ---------------------------------------------------------------------------
// selectSocketState
// ---------------------------------------------------------------------------

describe("selectSocketState", () => {
  it("returns default socket state", () => {
    const result = selectSocketState(makeState());
    expect(result.connected).toBe(false);
    expect(result.reconnectAttempts).toBe(0);
  });

  it("returns updated socket state", () => {
    const socket: SocketConnectionState = {
      ...defaultSocket,
      connected: true,
      socketId: "sock123",
    };
    expect(selectSocketState(makeState({ socket }))).toBe(socket);
  });
});

// ---------------------------------------------------------------------------
// selectOverallState
// ---------------------------------------------------------------------------

describe("selectOverallState", () => {
  it("returns offline by default", () => {
    expect(selectOverallState(makeState())).toBe("offline");
  });

  it("returns the current overall state", () => {
    expect(selectOverallState(makeState({ overallState: "online" }))).toBe("online");
  });

  it("returns reconnecting when set", () => {
    expect(selectOverallState(makeState({ overallState: "reconnecting" }))).toBe(
      "reconnecting",
    );
  });
});

// ---------------------------------------------------------------------------
// selectCanSendMessages
// ---------------------------------------------------------------------------

describe("selectCanSendMessages", () => {
  it("returns false by default", () => {
    expect(selectCanSendMessages(makeState())).toBe(false);
  });

  it("returns true when can send messages", () => {
    expect(selectCanSendMessages(makeState({ canSendMessages: true }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectShouldShowOffline
// ---------------------------------------------------------------------------

describe("selectShouldShowOffline", () => {
  it("returns false by default", () => {
    expect(selectShouldShowOffline(makeState())).toBe(false);
  });

  it("returns true when offline should be shown", () => {
    expect(selectShouldShowOffline(makeState({ shouldShowOffline: true }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectRetryState
// ---------------------------------------------------------------------------

describe("selectRetryState", () => {
  it("returns default retry state", () => {
    const result = selectRetryState(makeState());
    expect(result.attempt).toBe(0);
    expect(result.shouldRetry).toBe(true);
  });

  it("returns updated retry state", () => {
    const retry: RetryState = { ...defaultRetry, attempt: 3, shouldRetry: false };
    expect(selectRetryState(makeState({ retry }))).toBe(retry);
  });
});

// ---------------------------------------------------------------------------
// selectShowConnectionBanner
// ---------------------------------------------------------------------------

describe("selectShowConnectionBanner", () => {
  it("returns false by default", () => {
    expect(selectShowConnectionBanner(makeState())).toBe(false);
  });

  it("returns true when banner should be shown", () => {
    expect(
      selectShowConnectionBanner(makeState({ showConnectionBanner: true })),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectNetworkQuality
// ---------------------------------------------------------------------------

describe("selectNetworkQuality", () => {
  it("returns unknown by default", () => {
    expect(selectNetworkQuality(makeState())).toBe("unknown");
  });

  it("returns the network quality from network info", () => {
    const network: ConnectionInfo = { ...defaultNetwork, quality: "good" };
    expect(selectNetworkQuality(makeState({ network }))).toBe("good");
  });

  it("returns poor when quality is poor", () => {
    const network: ConnectionInfo = { ...defaultNetwork, quality: "poor" };
    expect(selectNetworkQuality(makeState({ network }))).toBe("poor");
  });
});

// ---------------------------------------------------------------------------
// selectIsOnline
// ---------------------------------------------------------------------------

describe("selectIsOnline", () => {
  it("returns false when overall state is offline", () => {
    expect(selectIsOnline(makeState())).toBe(false);
  });

  it("returns true when overall state is online", () => {
    expect(selectIsOnline(makeState({ overallState: "online" }))).toBe(true);
  });

  it("returns false when overall state is reconnecting", () => {
    expect(selectIsOnline(makeState({ overallState: "reconnecting" }))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// selectIsOffline
// ---------------------------------------------------------------------------

describe("selectIsOffline", () => {
  it("returns false when overall state is online", () => {
    expect(
      selectIsOffline(makeState({ overallState: "online" })),
    ).toBe(false);
  });

  it("returns true when overall state is offline", () => {
    expect(selectIsOffline(makeState({ overallState: "offline" }))).toBe(true);
  });

  it("returns true when network state is offline even if overall differs", () => {
    const network: ConnectionInfo = { ...defaultNetwork, state: "offline" };
    expect(
      selectIsOffline(makeState({ overallState: "online", network })),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectIsReconnecting
// ---------------------------------------------------------------------------

describe("selectIsReconnecting", () => {
  it("returns false by default", () => {
    expect(selectIsReconnecting(makeState())).toBe(false);
  });

  it("returns true when overall state is reconnecting", () => {
    expect(selectIsReconnecting(makeState({ overallState: "reconnecting" }))).toBe(
      true,
    );
  });

  it("returns true when socket has reconnect attempts", () => {
    const socket: SocketConnectionState = { ...defaultSocket, reconnectAttempts: 2 };
    expect(selectIsReconnecting(makeState({ socket }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectReconnectAttempts
// ---------------------------------------------------------------------------

describe("selectReconnectAttempts", () => {
  it("returns 0 by default", () => {
    expect(selectReconnectAttempts(makeState())).toBe(0);
  });

  it("returns the current reconnect attempt count", () => {
    const socket: SocketConnectionState = { ...defaultSocket, reconnectAttempts: 5 };
    expect(selectReconnectAttempts(makeState({ socket }))).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// selectLastConnectedAt
// ---------------------------------------------------------------------------

describe("selectLastConnectedAt", () => {
  it("returns null by default", () => {
    expect(selectLastConnectedAt(makeState())).toBeNull();
  });

  it("returns the last connected timestamp", () => {
    const lastConnectedAt = new Date("2024-01-01T00:00:00Z");
    const socket: SocketConnectionState = { ...defaultSocket, lastConnectedAt };
    expect(selectLastConnectedAt(makeState({ socket }))).toBe(lastConnectedAt);
  });
});

// ---------------------------------------------------------------------------
// selectConnectionStats
// ---------------------------------------------------------------------------

describe("selectConnectionStats", () => {
  it("returns default connection stats", () => {
    const result = selectConnectionStats(makeState());
    expect(result.totalDisconnections).toBe(0);
    expect(result.lastDisconnectionDuration).toBeNull();
    expect(result.reconnectAttempts).toBe(0);
  });

  it("returns updated stats when disconnections have occurred", () => {
    const socket: SocketConnectionState = { ...defaultSocket, reconnectAttempts: 3 };
    const result = selectConnectionStats(
      makeState({
        socket,
        totalDisconnections: 5,
        lastDisconnectionDuration: 1500,
      }),
    );
    expect(result.totalDisconnections).toBe(5);
    expect(result.lastDisconnectionDuration).toBe(1500);
    expect(result.reconnectAttempts).toBe(3);
  });
});
