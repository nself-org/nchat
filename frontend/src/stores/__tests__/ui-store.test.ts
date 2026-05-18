/**
 * @fileoverview Tests for UI Store
 */

import { act } from "@testing-library/react";
import { useUIStore, type ModalType } from "../ui-store";

describe("useUIStore", () => {
  beforeEach(() => {
    act(() => {
      useUIStore.getState().resetUI();
    });
  });

  describe("Initial State", () => {
    it("should have correct initial sidebar state", () => {
      const state = useUIStore.getState();
      expect(state.sidebarCollapsed).toBe(false);
      expect(state.sidebarWidth).toBe(260);
      expect(state.sidebarMinWidth).toBe(200);
      expect(state.sidebarMaxWidth).toBe(400);
    });

    it("should have correct initial thread panel state", () => {
      const state = useUIStore.getState();
      expect(state.threadPanelOpen).toBe(false);
      expect(state.threadPanelWidth).toBe(400);
      expect(state.threadPanelMinWidth).toBe(300);
      expect(state.threadPanelMaxWidth).toBe(600);
    });

    it("should have correct initial members panel state", () => {
      const state = useUIStore.getState();
      expect(state.membersPanelOpen).toBe(false);
      expect(state.membersPanelWidth).toBe(240);
    });

    it("should have correct initial modal state", () => {
      const state = useUIStore.getState();
      expect(state.activeModal).toBeNull();
      expect(state.modalData).toBeNull();
    });

    it("should have correct initial overlay state", () => {
      const state = useUIStore.getState();
      expect(state.commandPaletteOpen).toBe(false);
      expect(state.emojiPickerOpen).toBe(false);
      expect(state.searchOpen).toBe(false);
      expect(state.quickSwitcherOpen).toBe(false);
    });

    it("should have correct initial mobile state", () => {
      const state = useUIStore.getState();
      expect(state.mobileMenuOpen).toBe(false);
      expect(state.mobileChannelListOpen).toBe(false);
    });

    it("should have correct initial layout state", () => {
      const state = useUIStore.getState();
      expect(state.isFullscreen).toBe(false);
      expect(state.isCompactMode).toBe(false);
      expect(state.isNavigating).toBe(false);
      expect(state.globalLoadingMessage).toBeNull();
    });
  });

  describe("Sidebar Actions", () => {
    it("should toggle sidebar", () => {
      act(() => useUIStore.getState().toggleSidebar());
      expect(useUIStore.getState().sidebarCollapsed).toBe(true);

      act(() => useUIStore.getState().toggleSidebar());
      expect(useUIStore.getState().sidebarCollapsed).toBe(false);
    });

    it("should set sidebar collapsed directly", () => {
      act(() => useUIStore.getState().setSidebarCollapsed(true));
      expect(useUIStore.getState().sidebarCollapsed).toBe(true);

      act(() => useUIStore.getState().setSidebarCollapsed(false));
      expect(useUIStore.getState().sidebarCollapsed).toBe(false);
    });

    it("should set sidebar width within bounds", () => {
      act(() => useUIStore.getState().setSidebarWidth(300));
      expect(useUIStore.getState().sidebarWidth).toBe(300);
    });

    it("should clamp sidebar width to min", () => {
      act(() => useUIStore.getState().setSidebarWidth(100));
      expect(useUIStore.getState().sidebarWidth).toBe(200);
    });

    it("should clamp sidebar width to max", () => {
      act(() => useUIStore.getState().setSidebarWidth(500));
      expect(useUIStore.getState().sidebarWidth).toBe(400);
    });
  });

  describe("Thread Panel Actions", () => {
    it("should toggle thread panel", () => {
      act(() => useUIStore.getState().toggleThreadPanel());
      expect(useUIStore.getState().threadPanelOpen).toBe(true);

      act(() => useUIStore.getState().toggleThreadPanel());
      expect(useUIStore.getState().threadPanelOpen).toBe(false);
    });

    it("should set thread panel open directly", () => {
      act(() => useUIStore.getState().setThreadPanelOpen(true));
      expect(useUIStore.getState().threadPanelOpen).toBe(true);
    });

    it("should set thread panel width within bounds", () => {
      act(() => useUIStore.getState().setThreadPanelWidth(450));
      expect(useUIStore.getState().threadPanelWidth).toBe(450);
    });

    it("should clamp thread panel width to min", () => {
      act(() => useUIStore.getState().setThreadPanelWidth(200));
      expect(useUIStore.getState().threadPanelWidth).toBe(300);
    });

    it("should clamp thread panel width to max", () => {
      act(() => useUIStore.getState().setThreadPanelWidth(700));
      expect(useUIStore.getState().threadPanelWidth).toBe(600);
    });
  });

  describe("Members Panel Actions", () => {
    it("should toggle members panel", () => {
      act(() => useUIStore.getState().toggleMembersPanel());
      expect(useUIStore.getState().membersPanelOpen).toBe(true);

      act(() => useUIStore.getState().toggleMembersPanel());
      expect(useUIStore.getState().membersPanelOpen).toBe(false);
    });

    it("should set members panel open directly", () => {
      act(() => useUIStore.getState().setMembersPanelOpen(true));
      expect(useUIStore.getState().membersPanelOpen).toBe(true);
    });

    it("should set members panel width", () => {
      act(() => useUIStore.getState().setMembersPanelWidth(300));
      expect(useUIStore.getState().membersPanelWidth).toBe(300);
    });
  });

  describe("Modal Actions", () => {
    it("should open modal", () => {
      act(() => useUIStore.getState().openModal("create-channel"));
      expect(useUIStore.getState().activeModal).toBe("create-channel");
    });

    it("should open modal with data", () => {
      const modalData = { channelId: "ch-1", title: "Test" };
      act(() => useUIStore.getState().openModal("edit-channel", modalData));
      expect(useUIStore.getState().activeModal).toBe("edit-channel");
      expect(useUIStore.getState().modalData).toEqual(modalData);
    });

    it("should close modal", () => {
      act(() => useUIStore.getState().openModal("create-channel"));
      act(() => useUIStore.getState().closeModal());
      expect(useUIStore.getState().activeModal).toBeNull();
      expect(useUIStore.getState().modalData).toBeNull();
    });

    it("should set modal data", () => {
      const modalData = { userId: "user-1" };
      act(() => useUIStore.getState().setModalData(modalData));
      expect(useUIStore.getState().modalData).toEqual(modalData);
    });

    it("should handle all modal types", () => {
      const modalTypes: ModalType[] = [
        "create-channel",
        "edit-channel",
        "delete-channel",
        "invite-members",
        "user-profile",
        "channel-settings",
        "app-settings",
        "keyboard-shortcuts",
        "file-preview",
        "confirm-action",
        "create-workspace",
        "edit-profile",
        "notifications-settings",
      ];

      modalTypes.forEach((modalType) => {
        act(() => useUIStore.getState().openModal(modalType));
        expect(useUIStore.getState().activeModal).toBe(modalType);
      });
    });
  });

  describe("Command Palette Actions", () => {
    it("should toggle command palette", () => {
      act(() => useUIStore.getState().toggleCommandPalette());
      expect(useUIStore.getState().commandPaletteOpen).toBe(true);

      act(() => useUIStore.getState().toggleCommandPalette());
      expect(useUIStore.getState().commandPaletteOpen).toBe(false);
    });

    it("should close other overlays when opening command palette", () => {
      act(() => useUIStore.getState().setSearchOpen(true));
      act(() => useUIStore.getState().setQuickSwitcherOpen(true));
      act(() => useUIStore.getState().setCommandPaletteOpen(true));

      expect(useUIStore.getState().commandPaletteOpen).toBe(true);
      expect(useUIStore.getState().searchOpen).toBe(false);
      expect(useUIStore.getState().quickSwitcherOpen).toBe(false);
    });
  });

  describe("Emoji Picker Actions", () => {
    it("should toggle emoji picker", () => {
      act(() => useUIStore.getState().toggleEmojiPicker());
      expect(useUIStore.getState().emojiPickerOpen).toBe(true);

      act(() => useUIStore.getState().toggleEmojiPicker());
      expect(useUIStore.getState().emojiPickerOpen).toBe(false);
    });

    it("should set emoji picker position", () => {
      const position = { x: 100, y: 200 };
      act(() => useUIStore.getState().toggleEmojiPicker(position));
      expect(useUIStore.getState().emojiPickerPosition).toEqual(position);
    });

    it("should clear position when closing", () => {
      act(() =>
        useUIStore.getState().setEmojiPickerOpen(true, { x: 100, y: 200 }),
      );
      act(() => useUIStore.getState().setEmojiPickerOpen(false));
      expect(useUIStore.getState().emojiPickerPosition).toBeNull();
    });
  });

  describe("Search Actions", () => {
    it("should toggle search", () => {
      act(() => useUIStore.getState().toggleSearch());
      expect(useUIStore.getState().searchOpen).toBe(true);

      act(() => useUIStore.getState().toggleSearch());
      expect(useUIStore.getState().searchOpen).toBe(false);
    });

    it("should close other overlays when opening search", () => {
      act(() => useUIStore.getState().setCommandPaletteOpen(true));
      act(() => useUIStore.getState().setSearchOpen(true));

      expect(useUIStore.getState().searchOpen).toBe(true);
      expect(useUIStore.getState().commandPaletteOpen).toBe(false);
    });
  });

  describe("Quick Switcher Actions", () => {
    it("should toggle quick switcher", () => {
      act(() => useUIStore.getState().toggleQuickSwitcher());
      expect(useUIStore.getState().quickSwitcherOpen).toBe(true);

      act(() => useUIStore.getState().toggleQuickSwitcher());
      expect(useUIStore.getState().quickSwitcherOpen).toBe(false);
    });

    it("should close other overlays when opening quick switcher", () => {
      act(() => useUIStore.getState().setCommandPaletteOpen(true));
      act(() => useUIStore.getState().setSearchOpen(true));
      act(() => useUIStore.getState().setQuickSwitcherOpen(true));

      expect(useUIStore.getState().quickSwitcherOpen).toBe(true);
      expect(useUIStore.getState().commandPaletteOpen).toBe(false);
      expect(useUIStore.getState().searchOpen).toBe(false);
    });
  });

  describe("Mobile Actions", () => {
    it("should toggle mobile menu", () => {
      act(() => useUIStore.getState().toggleMobileMenu());
      expect(useUIStore.getState().mobileMenuOpen).toBe(true);

      act(() => useUIStore.getState().toggleMobileMenu());
      expect(useUIStore.getState().mobileMenuOpen).toBe(false);
    });

    it("should set mobile menu open directly", () => {
      act(() => useUIStore.getState().setMobileMenuOpen(true));
      expect(useUIStore.getState().mobileMenuOpen).toBe(true);
    });

    it("should toggle mobile channel list", () => {
      act(() => useUIStore.getState().toggleMobileChannelList());
      expect(useUIStore.getState().mobileChannelListOpen).toBe(true);

      act(() => useUIStore.getState().toggleMobileChannelList());
      expect(useUIStore.getState().mobileChannelListOpen).toBe(false);
    });

    it("should set mobile channel list open directly", () => {
      act(() => useUIStore.getState().setMobileChannelListOpen(true));
      expect(useUIStore.getState().mobileChannelListOpen).toBe(true);
    });
  });

  describe("Message Input Actions", () => {
    it("should set message input focused", () => {
      act(() => useUIStore.getState().setMessageInputFocused(true));
      expect(useUIStore.getState().messageInputFocused).toBe(true);

      act(() => useUIStore.getState().setMessageInputFocused(false));
      expect(useUIStore.getState().messageInputFocused).toBe(false);
    });

    it("should set message input height", () => {
      act(() => useUIStore.getState().setMessageInputHeight(100));
      expect(useUIStore.getState().messageInputHeight).toBe(100);
    });
  });

  describe("Layout Actions", () => {
    it("should toggle fullscreen", () => {
      act(() => useUIStore.getState().toggleFullscreen());
      expect(useUIStore.getState().isFullscreen).toBe(true);

      act(() => useUIStore.getState().toggleFullscreen());
      expect(useUIStore.getState().isFullscreen).toBe(false);
    });

    it("should set fullscreen directly", () => {
      act(() => useUIStore.getState().setFullscreen(true));
      expect(useUIStore.getState().isFullscreen).toBe(true);
    });

    it("should toggle compact mode", () => {
      act(() => useUIStore.getState().toggleCompactMode());
      expect(useUIStore.getState().isCompactMode).toBe(true);

      act(() => useUIStore.getState().toggleCompactMode());
      expect(useUIStore.getState().isCompactMode).toBe(false);
    });

    it("should set compact mode directly", () => {
      act(() => useUIStore.getState().setCompactMode(true));
      expect(useUIStore.getState().isCompactMode).toBe(true);
    });
  });

  describe("Loading Actions", () => {
    it("should set navigating", () => {
      act(() => useUIStore.getState().setNavigating(true));
      expect(useUIStore.getState().isNavigating).toBe(true);
    });

    it("should set global loading message", () => {
      act(() => useUIStore.getState().setGlobalLoading("Loading..."));
      expect(useUIStore.getState().globalLoadingMessage).toBe("Loading...");

      act(() => useUIStore.getState().setGlobalLoading(null));
      expect(useUIStore.getState().globalLoadingMessage).toBeNull();
    });
  });

  describe("Utility Actions", () => {
    it("should close all overlays", () => {
      act(() => {
        useUIStore.getState().setCommandPaletteOpen(true);
        useUIStore.getState().setSearchOpen(true);
        useUIStore.getState().setQuickSwitcherOpen(true);
        useUIStore.getState().setEmojiPickerOpen(true, { x: 0, y: 0 });
        useUIStore.getState().openModal("create-channel");
        useUIStore.getState().setMobileMenuOpen(true);
      });

      act(() => useUIStore.getState().closeAllOverlays());

      const state = useUIStore.getState();
      expect(state.commandPaletteOpen).toBe(false);
      expect(state.searchOpen).toBe(false);
      expect(state.quickSwitcherOpen).toBe(false);
      expect(state.emojiPickerOpen).toBe(false);
      expect(state.activeModal).toBeNull();
      expect(state.mobileMenuOpen).toBe(false);
    });

    it("should reset UI to initial state", () => {
      act(() => {
        useUIStore.getState().setSidebarCollapsed(true);
        useUIStore.getState().setThreadPanelOpen(true);
        useUIStore.getState().setFullscreen(true);
      });

      act(() => useUIStore.getState().resetUI());

      const state = useUIStore.getState();
      expect(state.sidebarCollapsed).toBe(false);
      expect(state.threadPanelOpen).toBe(false);
      expect(state.isFullscreen).toBe(false);
    });
  });
});
