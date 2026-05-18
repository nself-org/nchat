"use client";

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

// ============================================================================
// Types
// ============================================================================

export type MobileView =
  | "channels"
  | "messages"
  | "channel"
  | "thread"
  | "profile"
  | "settings"
  | "search"
  | "notifications";

export type DrawerPosition = "left" | "right" | "bottom";

export interface MobileDrawerState {
  isOpen: boolean;
  position: DrawerPosition;
  content: React.ReactNode | null;
}

export interface MobileState {
  // Navigation state
  sidebarOpen: boolean;
  activeView: MobileView;
  previousView: MobileView | null;
  viewStack: MobileView[];

  // Keyboard state
  keyboardVisible: boolean;
  keyboardHeight: number;

  // Drawer state
  drawer: MobileDrawerState;

  // Action sheet state
  actionSheet: {
    isOpen: boolean;
    options: ActionSheetOption[];
    onSelect: ((index: number) => void) | null;
  };

  // Pull to refresh
  isRefreshing: boolean;

  // Bottom nav
  bottomNavVisible: boolean;
  unreadCounts: {
    channels: number;
    messages: number;
    notifications: number;
  };
}

export interface ActionSheetOption {
  label: string;
  icon?: React.ReactNode;
  destructive?: boolean;
  disabled?: boolean;
}

export interface MobileActions {
  // Sidebar
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;

  // Navigation
  setActiveView: (view: MobileView) => void;
  pushView: (view: MobileView) => void;
  popView: () => void;
  resetViewStack: () => void;

  // Keyboard
  setKeyboardVisible: (visible: boolean, height?: number) => void;

  // Drawer
  openDrawer: (position: DrawerPosition, content: React.ReactNode) => void;
  closeDrawer: () => void;

  // Action sheet
  showActionSheet: (
    options: ActionSheetOption[],
    onSelect: (index: number) => void,
  ) => void;
  hideActionSheet: () => void;

  // Pull to refresh
  setRefreshing: (refreshing: boolean) => void;

  // Bottom nav
  setBottomNavVisible: (visible: boolean) => void;
  updateUnreadCount: (
    key: "channels" | "messages" | "notifications",
    count: number,
  ) => void;

  // Reset
  reset: () => void;
}

// ============================================================================
// Initial State
// ============================================================================

const initialState: MobileState = {
  sidebarOpen: false,
  activeView: "channels",
  previousView: null,
  viewStack: ["channels"],

  keyboardVisible: false,
  keyboardHeight: 0,

  drawer: {
    isOpen: false,
    position: "left",
    content: null,
  },

  actionSheet: {
    isOpen: false,
    options: [],
    onSelect: null,
  },

  isRefreshing: false,

  bottomNavVisible: true,
  unreadCounts: {
    channels: 0,
    messages: 0,
    notifications: 0,
  },
};

// ============================================================================
// Store
// ============================================================================

export const useMobileStore = create<MobileState & MobileActions>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // Sidebar actions
    openSidebar: () => set({ sidebarOpen: true }),
    closeSidebar: () => set({ sidebarOpen: false }),
    toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

    // Navigation actions
    setActiveView: (view) => {
      const { activeView, viewStack } = get();
      if (view === activeView) return;

      set({
        activeView: view,
        previousView: activeView,
        viewStack: [...viewStack.filter((v) => v !== view), view],
      });
    },

    pushView: (view) => {
      const { activeView, viewStack } = get();
      if (view === activeView) return;

      set({
        activeView: view,
        previousView: activeView,
        viewStack: [...viewStack, view],
      });
    },

    popView: () => {
      const { viewStack } = get();
      if (viewStack.length <= 1) return;

      const newStack = viewStack.slice(0, -1);
      const newView = newStack[newStack.length - 1];
      const previousView =
        newStack.length > 1 ? newStack[newStack.length - 2] : null;

      set({
        activeView: newView,
        previousView,
        viewStack: newStack,
      });
    },

    resetViewStack: () => {
      set({
        activeView: "channels",
        previousView: null,
        viewStack: ["channels"],
      });
    },

    // Keyboard actions
    setKeyboardVisible: (visible, height = 0) => {
      set({
        keyboardVisible: visible,
        keyboardHeight: height,
      });
    },

    // Drawer actions
    openDrawer: (position, content) => {
      set({
        drawer: {
          isOpen: true,
          position,
          content,
        },
      });
    },

    closeDrawer: () => {
      set({
        drawer: {
          ...get().drawer,
          isOpen: false,
        },
      });
      // Clear content after animation
      setTimeout(() => {
        set({
          drawer: {
            ...get().drawer,
            content: null,
          },
        });
      }, 300);
    },

    // Action sheet actions
    showActionSheet: (options, onSelect) => {
      set({
        actionSheet: {
          isOpen: true,
          options,
          onSelect,
        },
      });
    },

    hideActionSheet: () => {
      set({
        actionSheet: {
          ...get().actionSheet,
          isOpen: false,
        },
      });
    },

    // Pull to refresh
    setRefreshing: (refreshing) => set({ isRefreshing: refreshing }),

    // Bottom nav
    setBottomNavVisible: (visible) => set({ bottomNavVisible: visible }),

    updateUnreadCount: (key, count) => {
      set({
        unreadCounts: {
          ...get().unreadCounts,
          [key]: count,
        },
      });
    },

    // Reset
    reset: () => set(initialState),
  })),
);

// ============================================================================
// Selectors
// ============================================================================

export const selectSidebarOpen = (state: MobileState) => state.sidebarOpen;
export const selectActiveView = (state: MobileState) => state.activeView;
export const selectCanGoBack = (state: MobileState) =>
  state.viewStack.length > 1;
export const selectKeyboardVisible = (state: MobileState) =>
  state.keyboardVisible;
export const selectKeyboardHeight = (state: MobileState) =>
  state.keyboardHeight;
export const selectDrawer = (state: MobileState) => state.drawer;
export const selectActionSheet = (state: MobileState) => state.actionSheet;
export const selectIsRefreshing = (state: MobileState) => state.isRefreshing;
export const selectBottomNavVisible = (state: MobileState) =>
  state.bottomNavVisible;
export const selectUnreadCounts = (state: MobileState) => state.unreadCounts;
export const selectTotalUnread = (state: MobileState) =>
  state.unreadCounts.channels +
  state.unreadCounts.messages +
  state.unreadCounts.notifications;
