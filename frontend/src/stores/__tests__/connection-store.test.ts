/**
 * Connection Store Unit Tests
 */

import { act } from "@testing-library/react";
import {
  useConnectionStore,
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

describe("useConnectionStore", () => {
  beforeEach(() => {
    act(() => {
      useConnectionStore.getState().reset();
    });
  });

  describe("initial state", () => {
    it("starts offline with defaults", () => {
      const s = useConnectionStore.getState();
      expect(s.overallState).toBe("offline");
      expect(s.canSendMessages).toBe(false);
      expect(s.shouldShowOffline).toBe(false);
      expect(s.totalDisconnections).toBe(0);
      expect(s.lastDisconnectionDuration).toBeNull();
      expect(s.socket.connected).toBe(false);
      expect(s.socket.reconnectAttempts).toBe(0);
      expect(s.network.state).toBe("online");
      expect(s.retry.attempt).toBe(0);
    });
  });

  describe("network actions", () => {
    it("setNetworkInfo merges partial info and updates overallState", () => {
      act(() => {
        useConnectionStore.getState().setNetworkInfo({ downlink: 5, rtt: 100 });
      });
      const s = useConnectionStore.getState();
      expect(s.network.downlink).toBe(5);
      expect(s.network.rtt).toBe(100);
    });

    it("setNetworkState to offline shows banner and records lastOffline", () => {
      act(() => {
        useConnectionStore.getState().setNetworkState("offline");
      });
      const s = useConnectionStore.getState();
      expect(s.network.state).toBe("offline");
      expect(s.showConnectionBanner).toBe(true);
      expect(s.overallState).toBe("offline");
      expect(s.network.lastOffline).toBeInstanceOf(Date);
    });

    it("setNetworkState to online records lastOnline and computes offlineDuration", () => {
      act(() => {
        useConnectionStore.getState().setNetworkState("offline");
      });
      act(() => {
        useConnectionStore.getState().setNetworkState("online");
      });
      const s = useConnectionStore.getState();
      expect(s.network.state).toBe("online");
      expect(s.network.lastOnline).toBeInstanceOf(Date);
      expect(typeof s.network.offlineDuration).toBe("number");
    });

    it("setNetworkQuality updates quality only", () => {
      act(() => {
        useConnectionStore.getState().setNetworkQuality("excellent");
      });
      expect(useConnectionStore.getState().network.quality).toBe("excellent");
    });
  });

  describe("socket actions", () => {
    it("setSocketConnected true records lastConnectedAt and clears banner", () => {
      act(() => {
        useConnectionStore.getState().setNetworkState("offline");
      });
      act(() => {
        useConnectionStore.getState().setNetworkState("online");
      });
      act(() => {
        useConnectionStore.getState().setSocketConnected(true, "sock-1");
      });
      const s = useConnectionStore.getState();
      expect(s.socket.connected).toBe(true);
      expect(s.socket.socketId).toBe("sock-1");
      expect(s.socket.reconnectAttempts).toBe(0);
      expect(s.showConnectionBanner).toBe(false);
      expect(s.overallState).toBe("online");
      expect(s.canSendMessages).toBe(true);
    });

    it("setSocketConnected false after being connected records disconnect and shows banner", () => {
      act(() => {
        useConnectionStore.getState().setSocketConnected(true, "sock-1");
      });
      act(() => {
        useConnectionStore.getState().setSocketConnected(false);
      });
      const s = useConnectionStore.getState();
      expect(s.socket.connected).toBe(false);
      expect(s.socket.lastDisconnectedAt).toBeInstanceOf(Date);
      expect(s.showConnectionBanner).toBe(true);
    });

    it("incrementReconnectAttempts and reset", () => {
      act(() => {
        useConnectionStore.getState().incrementReconnectAttempts();
        useConnectionStore.getState().incrementReconnectAttempts();
      });
      expect(useConnectionStore.getState().socket.reconnectAttempts).toBe(2);
      act(() => {
        useConnectionStore.getState().resetReconnectAttempts();
      });
      expect(useConnectionStore.getState().socket.reconnectAttempts).toBe(0);
    });

    it("setSocketState merges partial state", () => {
      act(() => {
        useConnectionStore
          .getState()
          .setSocketState({ disconnectReason: "transport error" });
      });
      expect(useConnectionStore.getState().socket.disconnectReason).toBe(
        "transport error",
      );
    });
  });

  describe("overall state derivation", () => {
    it("reconnecting when reconnectAttempts > 0", () => {
      act(() => {
        useConnectionStore.getState().incrementReconnectAttempts();
        useConnectionStore.getState().updateOverallState();
      });
      expect(useConnectionStore.getState().overallState).toBe("reconnecting");
    });

    it("error when retry will not continue and has lastError", () => {
      act(() => {
        useConnectionStore
          .getState()
          .setRetryState({ shouldRetry: false, lastError: new Error("boom") });
        useConnectionStore.getState().updateOverallState();
      });
      expect(useConnectionStore.getState().overallState).toBe("error");
      expect(useConnectionStore.getState().shouldShowOffline).toBe(true);
    });
  });

  describe("retry actions", () => {
    it("setRetryState merges and resetRetryState restores defaults", () => {
      act(() => {
        useConnectionStore
          .getState()
          .setRetryState({ attempt: 3, shouldRetry: false });
      });
      expect(useConnectionStore.getState().retry.attempt).toBe(3);
      expect(useConnectionStore.getState().retry.shouldRetry).toBe(false);

      act(() => {
        useConnectionStore.getState().resetRetryState();
      });
      expect(useConnectionStore.getState().retry.attempt).toBe(0);
      expect(useConnectionStore.getState().retry.shouldRetry).toBe(true);
    });
  });

  describe("banner management", () => {
    it("hideBanner hides, showBanner shows", () => {
      act(() => {
        useConnectionStore.getState().showBanner();
      });
      expect(useConnectionStore.getState().showConnectionBanner).toBe(true);
      act(() => {
        useConnectionStore.getState().hideBanner();
      });
      expect(useConnectionStore.getState().showConnectionBanner).toBe(false);
    });

    it("dismissBannerTemporarily sets future timestamp and hides banner", () => {
      act(() => {
        useConnectionStore.getState().dismissBannerTemporarily(1000);
      });
      const s = useConnectionStore.getState();
      expect(s.showConnectionBanner).toBe(false);
      expect(s.bannerDismissedUntil).toBeInstanceOf(Date);
      expect(s.bannerDismissedUntil!.getTime()).toBeGreaterThan(
        Date.now() - 100,
      );
    });

    it("showBanner respects bannerDismissedUntil", () => {
      act(() => {
        useConnectionStore.getState().dismissBannerTemporarily(60000);
      });
      act(() => {
        useConnectionStore.getState().showBanner();
      });
      expect(useConnectionStore.getState().showConnectionBanner).toBe(false);
    });
  });

  describe("statistics", () => {
    it("recordDisconnection increments counter and stores duration", () => {
      act(() => {
        useConnectionStore.getState().recordDisconnection(5000);
        useConnectionStore.getState().recordDisconnection(2000);
      });
      const s = useConnectionStore.getState();
      expect(s.totalDisconnections).toBe(2);
      expect(s.lastDisconnectionDuration).toBe(2000);
    });

    it("recordDisconnection without duration keeps last", () => {
      act(() => {
        useConnectionStore.getState().recordDisconnection(5000);
        useConnectionStore.getState().recordDisconnection();
      });
      expect(useConnectionStore.getState().lastDisconnectionDuration).toBe(
        5000,
      );
    });
  });

  describe("reset", () => {
    it("restores initial state", () => {
      act(() => {
        useConnectionStore.getState().setSocketConnected(true, "x");
        useConnectionStore.getState().recordDisconnection(1234);
      });
      act(() => {
        useConnectionStore.getState().reset();
      });
      const s = useConnectionStore.getState();
      expect(s.socket.connected).toBe(false);
      expect(s.totalDisconnections).toBe(0);
    });
  });

  describe("selectors", () => {
    it("selectors return expected slices", () => {
      act(() => {
        useConnectionStore.getState().setSocketConnected(true, "sid");
        useConnectionStore.getState().setNetworkQuality("good");
      });
      const s = useConnectionStore.getState();
      expect(selectNetworkInfo(s)).toBe(s.network);
      expect(selectSocketState(s)).toBe(s.socket);
      expect(selectOverallState(s)).toBe(s.overallState);
      expect(selectCanSendMessages(s)).toBe(s.canSendMessages);
      expect(selectShouldShowOffline(s)).toBe(s.shouldShowOffline);
      expect(selectRetryState(s)).toBe(s.retry);
      expect(selectShowConnectionBanner(s)).toBe(s.showConnectionBanner);
      expect(selectNetworkQuality(s)).toBe("good");
      expect(selectIsOnline(s)).toBe(true);
      expect(selectIsOffline(s)).toBe(false);
      expect(selectIsReconnecting(s)).toBe(false);
      expect(selectReconnectAttempts(s)).toBe(0);
      expect(selectLastConnectedAt(s)).toBeInstanceOf(Date);
      expect(selectConnectionStats(s)).toEqual({
        totalDisconnections: 0,
        lastDisconnectionDuration: null,
        reconnectAttempts: 0,
      });
    });

    it("selectIsOffline true when network offline", () => {
      act(() => {
        useConnectionStore.getState().setNetworkState("offline");
      });
      expect(selectIsOffline(useConnectionStore.getState())).toBe(true);
    });
  });
});
