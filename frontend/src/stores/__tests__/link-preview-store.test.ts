/**
 * Link Preview Store Unit Tests
 */

import { act } from "@testing-library/react";
import {
  useLinkPreviewStore,
  selectPreview,
  selectIsLoading,
  selectSettings,
  selectAutoUnfurl,
  selectEnabled,
  selectBlockedDomains,
  selectAllBlockedDomains,
  getPreviewsForMessage,
  hasLoadingPreviews,
} from "../link-preview-store";
import type { LinkPreviewData } from "@/lib/link-preview";

const makePreview = (
  overrides: Partial<LinkPreviewData> = {},
): LinkPreviewData =>
  ({
    url: "https://example.com",
    type: "generic",
    status: "success",
    title: "Example",
    description: "desc",
    domain: "example.com",
    isSecure: true,
    fetchedAt: Date.now(),
    expiresAt: Date.now() + 3600000,
    ...overrides,
  }) as LinkPreviewData;

describe("useLinkPreviewStore", () => {
  beforeEach(() => {
    act(() => {
      const s = useLinkPreviewStore.getState();
      s.clearAllPreviews();
      s.resetSettings();
      s.setAdminBlockedDomains([]);
    });
  });

  describe("preview management", () => {
    it("setPreview stores preview entry", () => {
      const preview = makePreview();
      act(() => {
        useLinkPreviewStore
          .getState()
          .setPreview("https://example.com", preview, "msg-1");
      });
      const entry = useLinkPreviewStore
        .getState()
        .getPreview("https://example.com");
      expect(entry).not.toBeNull();
      expect(entry?.data).toBe(preview);
      expect(entry?.messageId).toBe("msg-1");
      expect(entry?.status).toBe("success");
    });

    it("setPreviewLoading marks url as loading", () => {
      act(() => {
        useLinkPreviewStore.getState().setPreviewLoading("https://loading.com");
      });
      const s = useLinkPreviewStore.getState();
      expect(s.isPreviewLoading("https://loading.com")).toBe(true);
      expect(s.previews["https://loading.com"].status).toBe("loading");
    });

    it("setPreviewError records error and clears loading", () => {
      act(() => {
        useLinkPreviewStore.getState().setPreviewLoading("https://x.com");
      });
      act(() => {
        useLinkPreviewStore
          .getState()
          .setPreviewError("https://x.com", "Timeout");
      });
      const s = useLinkPreviewStore.getState();
      expect(s.previews["https://x.com"].status).toBe("error");
      expect(s.previews["https://x.com"].error).toBe("Timeout");
      expect(s.isPreviewLoading("https://x.com")).toBe(false);
    });

    it("clearPreview removes single preview", () => {
      act(() => {
        useLinkPreviewStore
          .getState()
          .setPreview("https://a.com", makePreview(), "m1");
        useLinkPreviewStore
          .getState()
          .setPreview("https://b.com", makePreview(), "m1");
      });
      act(() => {
        useLinkPreviewStore.getState().clearPreview("https://a.com");
      });
      expect(
        useLinkPreviewStore.getState().previews["https://a.com"],
      ).toBeUndefined();
      expect(
        useLinkPreviewStore.getState().previews["https://b.com"],
      ).toBeDefined();
    });

    it("clearAllPreviews empties everything", () => {
      act(() => {
        useLinkPreviewStore
          .getState()
          .setPreview("https://a.com", makePreview(), "m1");
        useLinkPreviewStore.getState().setPreviewLoading("https://b.com");
      });
      act(() => {
        useLinkPreviewStore.getState().clearAllPreviews();
      });
      expect(Object.keys(useLinkPreviewStore.getState().previews)).toHaveLength(
        0,
      );
      expect(useLinkPreviewStore.getState().loadingUrls.size).toBe(0);
    });
  });

  describe("removed previews", () => {
    it("removePreview tracks removal per message", () => {
      act(() => {
        useLinkPreviewStore.getState().removePreview("https://a.com", "msg-1");
      });
      expect(
        useLinkPreviewStore
          .getState()
          .isPreviewRemoved("https://a.com", "msg-1"),
      ).toBe(true);
      expect(
        useLinkPreviewStore
          .getState()
          .isPreviewRemoved("https://a.com", "msg-2"),
      ).toBe(false);
    });

    it("removePreview deduplicates", () => {
      act(() => {
        useLinkPreviewStore.getState().removePreview("https://a.com", "msg-1");
        useLinkPreviewStore.getState().removePreview("https://a.com", "msg-1");
      });
      expect(
        useLinkPreviewStore.getState().removedPreviews["msg-1"],
      ).toHaveLength(1);
    });

    it("restorePreview removes url from removed list and cleans empty arrays", () => {
      act(() => {
        useLinkPreviewStore.getState().removePreview("https://a.com", "msg-1");
      });
      act(() => {
        useLinkPreviewStore.getState().restorePreview("https://a.com", "msg-1");
      });
      expect(
        useLinkPreviewStore.getState().removedPreviews["msg-1"],
      ).toBeUndefined();
    });
  });

  describe("settings", () => {
    it("updateSettings merges fields", () => {
      act(() => {
        useLinkPreviewStore
          .getState()
          .updateSettings({ compactMode: true, maxImageHeight: 500 });
      });
      const s = useLinkPreviewStore.getState().settings;
      expect(s.compactMode).toBe(true);
      expect(s.maxImageHeight).toBe(500);
      expect(s.enabled).toBe(true); // untouched default
    });

    it("toggleAutoUnfurl flips boolean", () => {
      expect(useLinkPreviewStore.getState().settings.autoUnfurl).toBe(true);
      act(() => {
        useLinkPreviewStore.getState().toggleAutoUnfurl();
      });
      expect(useLinkPreviewStore.getState().settings.autoUnfurl).toBe(false);
    });

    it("resetSettings restores defaults", () => {
      act(() => {
        useLinkPreviewStore.getState().updateSettings({ compactMode: true });
      });
      act(() => {
        useLinkPreviewStore.getState().resetSettings();
      });
      expect(useLinkPreviewStore.getState().settings.compactMode).toBe(false);
    });
  });

  describe("blocked domains", () => {
    it("addBlockedDomain normalizes and dedupes", () => {
      act(() => {
        useLinkPreviewStore.getState().addBlockedDomain("WWW.Example.com");
        useLinkPreviewStore.getState().addBlockedDomain("example.com");
      });
      expect(useLinkPreviewStore.getState().settings.blockedDomains).toEqual([
        "example.com",
      ]);
    });

    it("removeBlockedDomain normalizes", () => {
      act(() => {
        useLinkPreviewStore.getState().addBlockedDomain("example.com");
      });
      act(() => {
        useLinkPreviewStore.getState().removeBlockedDomain("WWW.Example.com");
      });
      expect(useLinkPreviewStore.getState().settings.blockedDomains).toEqual(
        [],
      );
    });

    it("setAdminBlockedDomains normalizes list", () => {
      act(() => {
        useLinkPreviewStore
          .getState()
          .setAdminBlockedDomains(["WWW.bad.com", "Evil.com"]);
      });
      expect(useLinkPreviewStore.getState().adminBlockedDomains).toEqual([
        "bad.com",
        "evil.com",
      ]);
    });

    it("isDomainBlocked respects user + admin lists and subdomains", () => {
      act(() => {
        useLinkPreviewStore.getState().addBlockedDomain("bad.com");
        useLinkPreviewStore.getState().setAdminBlockedDomains(["banned.io"]);
      });
      const s = useLinkPreviewStore.getState();
      expect(s.isDomainBlocked("https://bad.com/x")).toBe(true);
      expect(s.isDomainBlocked("https://sub.bad.com/x")).toBe(true);
      expect(s.isDomainBlocked("https://banned.io")).toBe(true);
      expect(s.isDomainBlocked("https://ok.com")).toBe(false);
    });

    it("isDomainBlocked returns false for invalid URLs", () => {
      expect(useLinkPreviewStore.getState().isDomainBlocked("not-a-url")).toBe(
        false,
      );
    });
  });

  describe("pruneExpired", () => {
    it("removes entries older than 24 hours", () => {
      const oldPreview = makePreview();
      act(() => {
        useLinkPreviewStore
          .getState()
          .setPreview("https://old.com", oldPreview);
      });
      // Manually age the entry
      act(() => {
        useLinkPreviewStore.setState((state) => {
          state.previews["https://old.com"].fetchedAt =
            Date.now() - 2 * 24 * 60 * 60 * 1000;
        });
      });
      act(() => {
        useLinkPreviewStore.getState().pruneExpired();
      });
      expect(
        useLinkPreviewStore.getState().previews["https://old.com"],
      ).toBeUndefined();
    });

    it("keeps fresh entries", () => {
      act(() => {
        useLinkPreviewStore
          .getState()
          .setPreview("https://fresh.com", makePreview());
      });
      act(() => {
        useLinkPreviewStore.getState().pruneExpired();
      });
      expect(
        useLinkPreviewStore.getState().previews["https://fresh.com"],
      ).toBeDefined();
    });
  });

  describe("selectors and helpers", () => {
    it("selectPreview returns preview or null", () => {
      const preview = makePreview();
      act(() => {
        useLinkPreviewStore.getState().setPreview("https://a.com", preview);
      });
      const s = useLinkPreviewStore.getState();
      expect(selectPreview("https://a.com")(s)?.data).toBe(preview);
      expect(selectPreview("https://nope.com")(s)).toBeNull();
    });

    it("selectIsLoading reflects loadingUrls", () => {
      act(() => {
        useLinkPreviewStore.getState().setPreviewLoading("https://x.com");
      });
      expect(
        selectIsLoading("https://x.com")(useLinkPreviewStore.getState()),
      ).toBe(true);
    });

    it("selectSettings / selectAutoUnfurl / selectEnabled", () => {
      const s = useLinkPreviewStore.getState();
      expect(selectSettings(s)).toBe(s.settings);
      expect(selectAutoUnfurl(s)).toBe(true);
      expect(selectEnabled(s)).toBe(true);
    });

    it("selectBlockedDomains + selectAllBlockedDomains", () => {
      act(() => {
        useLinkPreviewStore.getState().addBlockedDomain("a.com");
        useLinkPreviewStore.getState().setAdminBlockedDomains(["b.com"]);
      });
      const s = useLinkPreviewStore.getState();
      expect(selectBlockedDomains(s)).toEqual(["a.com"]);
      expect(selectAllBlockedDomains(s)).toEqual(["a.com", "b.com"]);
    });

    it("getPreviewsForMessage excludes removed urls", () => {
      act(() => {
        useLinkPreviewStore
          .getState()
          .setPreview("https://a.com", makePreview());
        useLinkPreviewStore
          .getState()
          .setPreview("https://b.com", makePreview());
        useLinkPreviewStore.getState().removePreview("https://b.com", "msg-1");
      });
      const s = useLinkPreviewStore.getState();
      const result = getPreviewsForMessage(s, "msg-1", [
        "https://a.com",
        "https://b.com",
      ]);
      expect(result).toHaveLength(1);
      expect(result[0].url).toBe("https://a.com");
    });

    it("hasLoadingPreviews", () => {
      act(() => {
        useLinkPreviewStore.getState().setPreviewLoading("https://a.com");
      });
      const s = useLinkPreviewStore.getState();
      expect(hasLoadingPreviews(s, ["https://a.com"])).toBe(true);
      expect(hasLoadingPreviews(s, ["https://b.com"])).toBe(false);
    });
  });
});
