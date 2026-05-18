/**
 * Draft Store Unit Tests
 */

import { act } from "@testing-library/react";
import {
  useDraftStore,
  getChannelDraftKey,
  getThreadDraftKey,
  getDMDraftKey,
} from "../draft-store";
import type { DraftAttachment } from "../draft-store";

describe("useDraftStore", () => {
  beforeEach(() => {
    act(() => {
      useDraftStore.getState().reset();
    });
  });

  describe("key helpers", () => {
    it("builds stable keys per context", () => {
      expect(getChannelDraftKey("c1")).toBe("channel:c1");
      expect(getThreadDraftKey("t1")).toBe("thread:t1");
      expect(getDMDraftKey("dm1")).toBe("dm:dm1");
    });
  });

  describe("CRUD", () => {
    it("setDraft creates new draft with defaults merged", () => {
      act(() => {
        useDraftStore.getState().setDraft("channel:c1", { content: "hello" });
      });
      const draft = useDraftStore.getState().getDraft("channel:c1");
      expect(draft?.content).toBe("hello");
      expect(draft?.attachmentIds).toEqual([]);
      expect(draft?.mentions).toEqual([]);
      expect(draft?.lastModified).toBeGreaterThan(0);
    });

    it("setDraft merges over existing draft", () => {
      act(() => {
        useDraftStore.getState().setDraft("channel:c1", { content: "a" });
      });
      act(() => {
        useDraftStore
          .getState()
          .setDraft("channel:c1", { contentHtml: "<p>a</p>" });
      });
      const draft = useDraftStore.getState().getDraft("channel:c1");
      expect(draft?.content).toBe("a");
      expect(draft?.contentHtml).toBe("<p>a</p>");
    });

    it("clearDraft removes draft and pending attachments", () => {
      act(() => {
        useDraftStore.getState().setDraftContent("channel:c1", "hi");
        useDraftStore.getState().addPendingAttachment("channel:c1", {
          id: "a1",
          name: "f.png",
          type: "image/png",
          size: 100,
          localUrl: "blob:x",
        });
      });
      act(() => {
        useDraftStore.getState().clearDraft("channel:c1");
      });
      expect(useDraftStore.getState().getDraft("channel:c1")).toBeUndefined();
      expect(
        useDraftStore.getState().getPendingAttachments("channel:c1"),
      ).toEqual([]);
    });

    it("clearAllDrafts wipes everything", () => {
      act(() => {
        useDraftStore.getState().setDraftContent("channel:c1", "a");
        useDraftStore.getState().setDraftContent("channel:c2", "b");
      });
      act(() => {
        useDraftStore.getState().clearAllDrafts();
      });
      expect(useDraftStore.getState().getDraftCount()).toBe(0);
    });
  });

  describe("content shortcuts", () => {
    it("setDraftContent creates draft if missing", () => {
      act(() => {
        useDraftStore.getState().setDraftContent("channel:new", "text");
      });
      expect(useDraftStore.getState().getDraft("channel:new")?.content).toBe(
        "text",
      );
    });

    it("appendToDraft concatenates", () => {
      act(() => {
        useDraftStore.getState().setDraftContent("channel:c1", "foo");
        useDraftStore.getState().appendToDraft("channel:c1", "bar");
      });
      expect(useDraftStore.getState().getDraft("channel:c1")?.content).toBe(
        "foobar",
      );
    });

    it("appendToDraft creates draft if missing", () => {
      act(() => {
        useDraftStore.getState().appendToDraft("channel:c1", "x");
      });
      expect(useDraftStore.getState().getDraft("channel:c1")?.content).toBe(
        "x",
      );
    });
  });

  describe("reply management", () => {
    it("setReplyTo records reply and preview", () => {
      act(() => {
        useDraftStore.getState().setReplyTo("channel:c1", "msg-1", {
          userId: "u1",
          userName: "Alice",
          content: "hi",
        });
      });
      const draft = useDraftStore.getState().getDraft("channel:c1");
      expect(draft?.replyToMessageId).toBe("msg-1");
      expect(draft?.replyToPreview?.userName).toBe("Alice");
    });

    it("clearReplyTo removes reply fields", () => {
      act(() => {
        useDraftStore.getState().setReplyTo("channel:c1", "msg-1", {
          userId: "u1",
          userName: "A",
          content: "hi",
        });
      });
      act(() => {
        useDraftStore.getState().clearReplyTo("channel:c1");
      });
      const draft = useDraftStore.getState().getDraft("channel:c1");
      expect(draft?.replyToMessageId).toBeNull();
      expect(draft?.replyToPreview).toBeUndefined();
    });

    it("clearReplyTo is a no-op on missing draft", () => {
      act(() => {
        useDraftStore.getState().clearReplyTo("missing");
      });
      expect(useDraftStore.getState().getDraft("missing")).toBeUndefined();
    });
  });

  describe("mentions", () => {
    it("addMention pushes mention", () => {
      act(() => {
        useDraftStore
          .getState()
          .addMention("channel:c1", { type: "user", id: "u1", name: "Ali" });
        useDraftStore
          .getState()
          .addMention("channel:c1", { type: "everyone", name: "everyone" });
      });
      const draft = useDraftStore.getState().getDraft("channel:c1");
      expect(draft?.mentions).toHaveLength(2);
    });

    it("clearMentions empties the list", () => {
      act(() => {
        useDraftStore
          .getState()
          .addMention("channel:c1", { type: "user", id: "u1", name: "Ali" });
      });
      act(() => {
        useDraftStore.getState().clearMentions("channel:c1");
      });
      expect(useDraftStore.getState().getDraft("channel:c1")?.mentions).toEqual(
        [],
      );
    });
  });

  describe("selection", () => {
    it("setSelection updates cursor position", () => {
      act(() => {
        useDraftStore.getState().setSelection("channel:c1", 5, 10);
      });
      const draft = useDraftStore.getState().getDraft("channel:c1");
      expect(draft?.selectionStart).toBe(5);
      expect(draft?.selectionEnd).toBe(10);
    });
  });

  describe("pending attachments", () => {
    const att: DraftAttachment = {
      id: "a1",
      name: "f.png",
      type: "image/png",
      size: 1024,
      localUrl: "blob:x",
    };

    it("addPendingAttachment records attachment", () => {
      act(() => {
        useDraftStore.getState().addPendingAttachment("channel:c1", att);
      });
      expect(
        useDraftStore.getState().getPendingAttachments("channel:c1"),
      ).toEqual([att]);
    });

    it("removePendingAttachment removes by id", () => {
      act(() => {
        useDraftStore.getState().addPendingAttachment("channel:c1", att);
        useDraftStore
          .getState()
          .addPendingAttachment("channel:c1", { ...att, id: "a2" });
      });
      act(() => {
        useDraftStore.getState().removePendingAttachment("channel:c1", "a1");
      });
      expect(
        useDraftStore.getState().getPendingAttachments("channel:c1"),
      ).toHaveLength(1);
      expect(
        useDraftStore.getState().getPendingAttachments("channel:c1")[0].id,
      ).toBe("a2");
    });

    it("clearPendingAttachments empties list", () => {
      act(() => {
        useDraftStore.getState().addPendingAttachment("channel:c1", att);
      });
      act(() => {
        useDraftStore.getState().clearPendingAttachments("channel:c1");
      });
      expect(
        useDraftStore.getState().getPendingAttachments("channel:c1"),
      ).toEqual([]);
    });

    it("getPendingAttachments returns [] when missing", () => {
      expect(
        useDraftStore.getState().getPendingAttachments("channel:empty"),
      ).toEqual([]);
    });
  });

  describe("active draft + config", () => {
    it("setActiveDraftContext updates active key", () => {
      act(() => {
        useDraftStore.getState().setActiveDraftContext("channel:c1");
      });
      expect(useDraftStore.getState().activeDraftContext).toBe("channel:c1");
      act(() => {
        useDraftStore.getState().setActiveDraftContext(null);
      });
      expect(useDraftStore.getState().activeDraftContext).toBeNull();
    });

    it("setAutoSaveEnabled and setAutoSaveDebounce", () => {
      act(() => {
        useDraftStore.getState().setAutoSaveEnabled(false);
        useDraftStore.getState().setAutoSaveDebounce(1000);
      });
      const s = useDraftStore.getState();
      expect(s.autoSaveEnabled).toBe(false);
      expect(s.autoSaveDebounce).toBe(1000);
    });
  });

  describe("utility", () => {
    it("hasDraft returns false for empty content + no attachments", () => {
      act(() => {
        useDraftStore.getState().setDraftContent("channel:c1", "   ");
      });
      expect(useDraftStore.getState().hasDraft("channel:c1")).toBe(false);
    });

    it("hasDraft returns true for non-empty content", () => {
      act(() => {
        useDraftStore.getState().setDraftContent("channel:c1", "hi");
      });
      expect(useDraftStore.getState().hasDraft("channel:c1")).toBe(true);
    });

    it("hasDraft returns true if draft exists and has pending attachments", () => {
      act(() => {
        useDraftStore.getState().setDraft("channel:c1", { content: "" });
        useDraftStore.getState().addPendingAttachment("channel:c1", {
          id: "a",
          name: "f",
          type: "t",
          size: 1,
          localUrl: "x",
        });
      });
      expect(useDraftStore.getState().hasDraft("channel:c1")).toBe(true);
    });

    it("hasDraft returns false for missing context", () => {
      expect(useDraftStore.getState().hasDraft("missing")).toBe(false);
    });

    it("getDraftCount counts stored drafts", () => {
      act(() => {
        useDraftStore.getState().setDraftContent("channel:c1", "a");
        useDraftStore.getState().setDraftContent("channel:c2", "b");
      });
      expect(useDraftStore.getState().getDraftCount()).toBe(2);
    });

    it("getOldDrafts returns keys past threshold", () => {
      act(() => {
        useDraftStore.getState().setDraftContent("channel:c1", "a");
      });
      act(() => {
        useDraftStore.setState((state) => {
          state.drafts["channel:c1"].lastModified = Date.now() - 10_000;
        });
      });
      expect(useDraftStore.getState().getOldDrafts(5_000)).toContain(
        "channel:c1",
      );
      expect(useDraftStore.getState().getOldDrafts(20_000)).toEqual([]);
    });

    it("cleanupOldDrafts removes aged drafts", () => {
      act(() => {
        useDraftStore.getState().setDraftContent("channel:c1", "a");
      });
      act(() => {
        useDraftStore.setState((state) => {
          state.drafts["channel:c1"].lastModified = Date.now() - 10_000;
        });
      });
      act(() => {
        useDraftStore.getState().cleanupOldDrafts(5_000);
      });
      expect(useDraftStore.getState().getDraft("channel:c1")).toBeUndefined();
    });
  });
});
