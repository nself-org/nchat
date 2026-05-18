/**
 * Pinned Store Unit Tests
 */

import { act } from "@testing-library/react";
import {
  usePinnedStore,
  selectPinnedCount,
  selectHasPinnedMessages,
  selectIsPanelOpen,
  selectIsLoading,
  selectError,
} from "../pinned-store";
import type { PinnedMessage } from "@/lib/pinned";

const makePin = (overrides: Partial<PinnedMessage> = {}): PinnedMessage =>
  ({
    id: overrides.id ?? "pin-1",
    messageId: overrides.messageId ?? "msg-1",
    channelId: overrides.channelId ?? "c1",
    pinnedBy: { id: "u1", name: "Ali" } as any,
    pinnedAt: new Date(),
    message: { id: "msg-1", content: "hi" } as any,
    position: overrides.position ?? 0,
    ...overrides,
  }) as PinnedMessage;

describe("usePinnedStore", () => {
  beforeEach(() => {
    act(() => {
      usePinnedStore.getState().resetStore();
    });
  });

  describe("pinned message ops", () => {
    it("setPinnedMessages sets list for channel", () => {
      const pins = [
        makePin({ id: "p1" }),
        makePin({ id: "p2", messageId: "m2" }),
      ];
      act(() => {
        usePinnedStore.getState().setPinnedMessages("c1", pins);
      });
      expect(usePinnedStore.getState().getPinnedMessages("c1")).toEqual(pins);
    });

    it("addPinnedMessage appends to channel list", () => {
      act(() => {
        usePinnedStore
          .getState()
          .setPinnedMessages("c1", [makePin({ id: "p1" })]);
      });
      act(() => {
        usePinnedStore
          .getState()
          .addPinnedMessage("c1", makePin({ id: "p2", messageId: "m2" }));
      });
      expect(usePinnedStore.getState().getPinnedMessages("c1")).toHaveLength(2);
    });

    it("addPinnedMessage creates list for unknown channel", () => {
      act(() => {
        usePinnedStore
          .getState()
          .addPinnedMessage("new", makePin({ channelId: "new" }));
      });
      expect(usePinnedStore.getState().getPinnedMessages("new")).toHaveLength(
        1,
      );
    });

    it("removePinnedMessage filters by messageId", () => {
      act(() => {
        usePinnedStore
          .getState()
          .setPinnedMessages("c1", [
            makePin({ id: "p1", messageId: "m1" }),
            makePin({ id: "p2", messageId: "m2" }),
          ]);
      });
      act(() => {
        usePinnedStore.getState().removePinnedMessage("c1", "m1");
      });
      const pins = usePinnedStore.getState().getPinnedMessages("c1");
      expect(pins).toHaveLength(1);
      expect(pins[0].messageId).toBe("m2");
    });

    it("updatePinnedMessage merges updates by pin id", () => {
      act(() => {
        usePinnedStore
          .getState()
          .setPinnedMessages("c1", [makePin({ id: "p1", note: "a" })]);
      });
      act(() => {
        usePinnedStore
          .getState()
          .updatePinnedMessage("c1", "p1", { note: "updated" });
      });
      expect(usePinnedStore.getState().getPinnedMessages("c1")[0].note).toBe(
        "updated",
      );
    });

    it("updatePinnedMessage is no-op for missing pin id", () => {
      act(() => {
        usePinnedStore
          .getState()
          .setPinnedMessages("c1", [makePin({ id: "p1" })]);
      });
      act(() => {
        usePinnedStore
          .getState()
          .updatePinnedMessage("c1", "nope", { note: "x" });
      });
      expect(usePinnedStore.getState().getPinnedMessages("c1")).toHaveLength(1);
    });

    it("reorderPinnedMessages applies new order and positions", () => {
      act(() => {
        usePinnedStore
          .getState()
          .setPinnedMessages("c1", [
            makePin({ id: "p1", position: 0 }),
            makePin({ id: "p2", position: 1, messageId: "m2" }),
            makePin({ id: "p3", position: 2, messageId: "m3" }),
          ]);
      });
      act(() => {
        usePinnedStore
          .getState()
          .reorderPinnedMessages("c1", ["p3", "p1", "p2"]);
      });
      const pins = usePinnedStore.getState().getPinnedMessages("c1");
      expect(pins.map((p) => p.id)).toEqual(["p3", "p1", "p2"]);
      expect(pins.map((p) => p.position)).toEqual([0, 1, 2]);
    });

    it("reorderPinnedMessages drops unknown ids", () => {
      act(() => {
        usePinnedStore
          .getState()
          .setPinnedMessages("c1", [makePin({ id: "p1" })]);
      });
      act(() => {
        usePinnedStore
          .getState()
          .reorderPinnedMessages("c1", ["unknown", "p1"]);
      });
      expect(
        usePinnedStore
          .getState()
          .getPinnedMessages("c1")
          .map((p) => p.id),
      ).toEqual(["p1"]);
    });

    it("clearChannelPins removes channel entry", () => {
      act(() => {
        usePinnedStore.getState().setPinnedMessages("c1", [makePin()]);
      });
      act(() => {
        usePinnedStore.getState().clearChannelPins("c1");
      });
      expect(usePinnedStore.getState().getPinnedMessages("c1")).toEqual([]);
    });
  });

  describe("getters", () => {
    it("getPinnedMessage finds by messageId", () => {
      act(() => {
        usePinnedStore
          .getState()
          .setPinnedMessages("c1", [makePin({ messageId: "m1" })]);
      });
      expect(
        usePinnedStore.getState().getPinnedMessage("c1", "m1"),
      ).toBeDefined();
      expect(
        usePinnedStore.getState().getPinnedMessage("c1", "m2"),
      ).toBeUndefined();
    });

    it("isMessagePinned returns correct boolean", () => {
      act(() => {
        usePinnedStore
          .getState()
          .setPinnedMessages("c1", [makePin({ messageId: "m1" })]);
      });
      expect(usePinnedStore.getState().isMessagePinned("c1", "m1")).toBe(true);
      expect(usePinnedStore.getState().isMessagePinned("c1", "m2")).toBe(false);
    });
  });

  describe("configuration", () => {
    it("setChannelConfig merges with default", () => {
      act(() => {
        usePinnedStore.getState().setChannelConfig("c1", { maxPins: 10 });
      });
      const config = usePinnedStore.getState().getChannelConfig("c1");
      expect(config.maxPins).toBe(10);
      expect(config.showBanner).toBe(true); // default merged
    });

    it("getChannelConfig returns defaults for unknown channel", () => {
      expect(
        usePinnedStore.getState().getChannelConfig("unknown").maxPins,
      ).toBe(50);
    });
  });

  describe("panel state", () => {
    it("setActiveChannel updates activeChannelId", () => {
      act(() => {
        usePinnedStore.getState().setActiveChannel("c1");
      });
      expect(usePinnedStore.getState().activeChannelId).toBe("c1");
    });

    it("openPanel sets isPanelOpen and optional active channel", () => {
      act(() => {
        usePinnedStore.getState().openPanel("c1");
      });
      const s = usePinnedStore.getState();
      expect(s.isPanelOpen).toBe(true);
      expect(s.activeChannelId).toBe("c1");
    });

    it("closePanel hides panel", () => {
      act(() => {
        usePinnedStore.getState().openPanel("c1");
      });
      act(() => {
        usePinnedStore.getState().closePanel();
      });
      expect(usePinnedStore.getState().isPanelOpen).toBe(false);
    });

    it("togglePanel flips boolean", () => {
      act(() => {
        usePinnedStore.getState().togglePanel();
      });
      expect(usePinnedStore.getState().isPanelOpen).toBe(true);
      act(() => {
        usePinnedStore.getState().togglePanel();
      });
      expect(usePinnedStore.getState().isPanelOpen).toBe(false);
    });
  });

  describe("unpin confirm", () => {
    it("openUnpinConfirm and closeUnpinConfirm", () => {
      const pin = makePin();
      act(() => {
        usePinnedStore.getState().openUnpinConfirm(pin);
      });
      expect(usePinnedStore.getState().isConfirmUnpinOpen).toBe(true);
      expect(usePinnedStore.getState().pinToUnpin).toBe(pin);
      act(() => {
        usePinnedStore.getState().closeUnpinConfirm();
      });
      expect(usePinnedStore.getState().isConfirmUnpinOpen).toBe(false);
      expect(usePinnedStore.getState().pinToUnpin).toBeNull();
    });
  });

  describe("filters and sorting", () => {
    it("setFilters merges, clearFilters empties", () => {
      act(() => {
        usePinnedStore.getState().setFilters({ pinnedBy: "u1" } as any);
      });
      expect((usePinnedStore.getState().filters as any).pinnedBy).toBe("u1");
      act(() => {
        usePinnedStore.getState().clearFilters();
      });
      expect(usePinnedStore.getState().filters).toEqual({});
    });

    it("setSortBy + setSortOrder", () => {
      act(() => {
        usePinnedStore.getState().setSortBy("pinnedAt");
        usePinnedStore.getState().setSortOrder("desc");
      });
      expect(usePinnedStore.getState().sortBy).toBe("pinnedAt");
      expect(usePinnedStore.getState().sortOrder).toBe("desc");
    });
  });

  describe("loading/error/pagination setters", () => {
    it("update flags and values", () => {
      act(() => {
        usePinnedStore.getState().setLoading(true);
        usePinnedStore.getState().setLoadingChannel("c1");
        usePinnedStore.getState().setPinning(true);
        usePinnedStore.getState().setUnpinning(true);
        usePinnedStore.getState().setError("oops");
        usePinnedStore.getState().setHasMore(true);
        usePinnedStore.getState().setCursor(42);
      });
      const s = usePinnedStore.getState();
      expect(s.isLoading).toBe(true);
      expect(s.isLoadingChannel).toBe("c1");
      expect(s.isPinning).toBe(true);
      expect(s.isUnpinning).toBe(true);
      expect(s.error).toBe("oops");
      expect(s.hasMore).toBe(true);
      expect(s.cursor).toBe(42);
    });
  });

  describe("selectors", () => {
    it("selectPinnedCount and selectHasPinnedMessages", () => {
      act(() => {
        usePinnedStore
          .getState()
          .setPinnedMessages("c1", [makePin(), makePin({ id: "p2" })]);
      });
      const s = usePinnedStore.getState();
      expect(selectPinnedCount("c1")(s)).toBe(2);
      expect(selectHasPinnedMessages("c1")(s)).toBe(true);
      expect(selectPinnedCount("empty")(s)).toBe(0);
      expect(selectHasPinnedMessages("empty")(s)).toBe(false);
    });

    it("selectIsPanelOpen / selectIsLoading / selectError", () => {
      act(() => {
        usePinnedStore.getState().openPanel();
        usePinnedStore.getState().setLoading(true);
        usePinnedStore.getState().setError("e");
      });
      const s = usePinnedStore.getState();
      expect(selectIsPanelOpen(s)).toBe(true);
      expect(selectIsLoading(s)).toBe(true);
      expect(selectError(s)).toBe("e");
    });
  });
});
