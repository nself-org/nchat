"use client";

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { ReactNode } from "react";

// Modal types for type-safe modal operations
export type ModalType =
  | "confirm"
  | "alert"
  | "prompt"
  | "image-lightbox"
  | "video"
  | "profile"
  | "settings"
  | "custom";

// Base modal configuration
export interface ModalConfig {
  id: string;
  type: ModalType;
  props: Record<string, unknown>;
  onClose?: () => void;
  preventClose?: boolean;
  priority?: number;
}

// Confirmation modal props
export interface ConfirmModalProps {
  title: string;
  message?: string | ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive" | "warning";
  onConfirm: () => Promise<void> | void;
  onCancel?: () => void;
  loading?: boolean;
}

// Alert modal props
export interface AlertModalProps {
  title: string;
  message: string | ReactNode;
  icon?: "warning" | "error" | "success" | "info";
  buttonText?: string;
  onClose?: () => void;
}

// Prompt modal props
export interface PromptModalProps {
  title: string;
  message?: string;
  placeholder?: string;
  defaultValue?: string;
  inputType?: "text" | "email" | "password" | "number" | "textarea";
  validation?: (value: string) => string | null;
  submitText?: string;
  cancelText?: string;
  onSubmit: (value: string) => Promise<void> | void;
  onCancel?: () => void;
}

// Image lightbox props
export interface ImageLightboxProps {
  images: Array<{
    id: string;
    url: string;
    name?: string;
    width?: number;
    height?: number;
  }>;
  initialIndex?: number;
  onDownload?: (image: ImageLightboxProps["images"][0]) => void;
}

// Video modal props
export interface VideoModalProps {
  src: string;
  title?: string;
  poster?: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  onEnded?: () => void;
}

// Profile modal props
export interface ProfileModalProps {
  userId: string;
  user?: {
    id: string;
    name: string;
    username: string;
    email: string;
    avatarUrl?: string;
    role: string;
    bio?: string;
    status: "online" | "away" | "busy" | "offline";
    customStatus?: {
      emoji?: string;
      text: string;
      expiresAt?: Date;
    };
    createdAt?: Date;
    timezone?: string;
  };
  currentUserId?: string;
  onSendMessage?: (userId: string) => void;
  onAddToChannel?: (userId: string) => void;
  onBlockUser?: (userId: string) => void;
  onViewFullProfile?: (userId: string) => void;
}

// Settings modal props
export interface SettingsModalProps {
  title?: string;
  section?: string;
  onSave?: (settings: Record<string, unknown>) => Promise<void> | void;
  onCancel?: () => void;
}

// Custom modal props
export interface CustomModalProps {
  content: ReactNode;
  title?: string;
  description?: string;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  showCloseButton?: boolean;
  preventOutsideClose?: boolean;
}

// Union type for all modal props
export type ModalProps =
  | { type: "confirm"; props: ConfirmModalProps }
  | { type: "alert"; props: AlertModalProps }
  | { type: "prompt"; props: PromptModalProps }
  | { type: "image-lightbox"; props: ImageLightboxProps }
  | { type: "video"; props: VideoModalProps }
  | { type: "profile"; props: ProfileModalProps }
  | { type: "settings"; props: SettingsModalProps }
  | { type: "custom"; props: CustomModalProps };

// Type map for modal type to props - better generic inference than Extract
export type ModalPropsMap = {
  confirm: ConfirmModalProps;
  alert: AlertModalProps;
  prompt: PromptModalProps;
  "image-lightbox": ImageLightboxProps;
  video: VideoModalProps;
  profile: ProfileModalProps;
  settings: SettingsModalProps;
  custom: CustomModalProps;
};

// Modal state
interface ModalState {
  modals: ModalConfig[];
  isAnyModalOpen: boolean;
}

// Modal actions
interface ModalActions {
  openModal: <T extends ModalType>(
    type: T,
    props: ModalPropsMap[T],
    options?: {
      id?: string;
      onClose?: () => void;
      preventClose?: boolean;
      priority?: number;
    },
  ) => string;
  closeModal: (id: string) => void;
  closeTopModal: () => void;
  closeAllModals: () => void;
  updateModal: (id: string, props: Partial<Record<string, unknown>>) => void;
  getModal: (id: string) => ModalConfig | undefined;
  getTopModal: () => ModalConfig | undefined;
}

type ModalStore = ModalState & ModalActions;

// Generate unique modal ID
let modalIdCounter = 0;
const generateModalId = (type: ModalType): string => {
  modalIdCounter += 1;
  return `modal-${type}-${modalIdCounter}-${Date.now()}`;
};

export const useModalStore = create<ModalStore>()(
  devtools(
    (set, get) => ({
      // State
      modals: [],
      isAnyModalOpen: false,

      // Actions
      openModal: (type, props, options = {}) => {
        const id = options.id || generateModalId(type);

        const newModal: ModalConfig = {
          id,
          type,
          props: props as Record<string, unknown>,
          onClose: options.onClose,
          preventClose: options.preventClose,
          priority: options.priority ?? 0,
        };

        set((state) => {
          // Insert modal sorted by priority (higher priority = on top)
          const updatedModals = [...state.modals, newModal].sort(
            (a, b) => (a.priority ?? 0) - (b.priority ?? 0),
          );

          return {
            modals: updatedModals,
            isAnyModalOpen: true,
          };
        });

        return id;
      },

      closeModal: (id) => {
        const state = get();
        const modal = state.modals.find((m) => m.id === id);

        if (modal?.preventClose) {
          return;
        }

        if (modal?.onClose) {
          modal.onClose();
        }

        set((state) => {
          const updatedModals = state.modals.filter((m) => m.id !== id);
          return {
            modals: updatedModals,
            isAnyModalOpen: updatedModals.length > 0,
          };
        });
      },

      closeTopModal: () => {
        const state = get();
        if (state.modals.length === 0) return;

        const topModal = state.modals[state.modals.length - 1];
        if (topModal.preventClose) return;

        if (topModal.onClose) {
          topModal.onClose();
        }

        set((state) => {
          const updatedModals = state.modals.slice(0, -1);
          return {
            modals: updatedModals,
            isAnyModalOpen: updatedModals.length > 0,
          };
        });
      },

      closeAllModals: () => {
        const state = get();

        // Call onClose for all modals that can be closed
        state.modals
          .filter((m) => !m.preventClose)
          .forEach((m) => m.onClose?.());

        set((state) => {
          const remainingModals = state.modals.filter((m) => m.preventClose);
          return {
            modals: remainingModals,
            isAnyModalOpen: remainingModals.length > 0,
          };
        });
      },

      updateModal: (id, props) => {
        set((state) => ({
          modals: state.modals.map((m) =>
            m.id === id ? { ...m, props: { ...m.props, ...props } } : m,
          ),
        }));
      },

      getModal: (id) => {
        return get().modals.find((m) => m.id === id);
      },

      getTopModal: () => {
        const modals = get().modals;
        return modals.length > 0 ? modals[modals.length - 1] : undefined;
      },
    }),
    {
      name: "nchat-modal-store",
    },
  ),
);

// Selectors for optimized re-renders
export const selectModals = (state: ModalStore) => state.modals;
export const selectIsAnyModalOpen = (state: ModalStore) => state.isAnyModalOpen;
export const selectTopModal = (state: ModalStore) =>
  state.modals.length > 0 ? state.modals[state.modals.length - 1] : undefined;
