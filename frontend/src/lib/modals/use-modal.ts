"use client";

import { useCallback } from "react";
import {
  useModalStore,
  type ModalType,
  type ModalPropsMap,
  type ConfirmModalProps,
  type AlertModalProps,
  type PromptModalProps,
  type ImageLightboxProps,
  type VideoModalProps,
  type ProfileModalProps,
  type SettingsModalProps,
  type CustomModalProps,
} from "./modal-store";

export interface UseModalOptions {
  id?: string;
  onClose?: () => void;
  preventClose?: boolean;
  priority?: number;
}

export interface UseModalReturn {
  // Generic open
  open: <T extends ModalType>(
    type: T,
    props: ModalPropsMap[T],
    options?: UseModalOptions,
  ) => string;

  // Typed openers
  openConfirm: (props: ConfirmModalProps, options?: UseModalOptions) => string;
  openAlert: (props: AlertModalProps, options?: UseModalOptions) => string;
  openPrompt: (props: PromptModalProps, options?: UseModalOptions) => string;
  openImageLightbox: (
    props: ImageLightboxProps,
    options?: UseModalOptions,
  ) => string;
  openVideo: (props: VideoModalProps, options?: UseModalOptions) => string;
  openProfile: (props: ProfileModalProps, options?: UseModalOptions) => string;
  openSettings: (
    props: SettingsModalProps,
    options?: UseModalOptions,
  ) => string;
  openCustom: (props: CustomModalProps, options?: UseModalOptions) => string;

  // Close operations
  close: (id: string) => void;
  closeTop: () => void;
  closeAll: () => void;

  // State
  isOpen: boolean;
  modalCount: number;
}

/**
 * Hook for managing modals throughout the application.
 *
 * @example
 * ```tsx
 * const { openConfirm, openAlert, close } = useModal()
 *
 * // Open a confirmation modal
 * const handleDelete = async () => {
 *   openConfirm({
 *     title: 'Delete Item',
 *     message: 'Are you sure you want to delete this item?',
 *     variant: 'destructive',
 *     onConfirm: async () => {
 *       await deleteItem(id)
 *     }
 *   })
 * }
 *
 * // Open an alert
 * openAlert({
 *   title: 'Success',
 *   message: 'Item created successfully',
 *   icon: 'success'
 * })
 * ```
 */
export function useModal(): UseModalReturn {
  const openModal = useModalStore((state) => state.openModal);
  const closeModal = useModalStore((state) => state.closeModal);
  const closeTopModal = useModalStore((state) => state.closeTopModal);
  const closeAllModals = useModalStore((state) => state.closeAllModals);
  const modals = useModalStore((state) => state.modals);
  const isAnyModalOpen = useModalStore((state) => state.isAnyModalOpen);

  const open = useCallback(
    <T extends ModalType>(
      type: T,
      props: ModalPropsMap[T],
      options?: UseModalOptions,
    ) => {
      return openModal(type, props, options);
    },
    [openModal],
  );

  const openConfirm = useCallback(
    (props: ConfirmModalProps, options?: UseModalOptions) => {
      return openModal("confirm", props, options);
    },
    [openModal],
  );

  const openAlert = useCallback(
    (props: AlertModalProps, options?: UseModalOptions) => {
      return openModal("alert", props, options);
    },
    [openModal],
  );

  const openPrompt = useCallback(
    (props: PromptModalProps, options?: UseModalOptions) => {
      return openModal("prompt", props, options);
    },
    [openModal],
  );

  const openImageLightbox = useCallback(
    (props: ImageLightboxProps, options?: UseModalOptions) => {
      return openModal("image-lightbox", props, options);
    },
    [openModal],
  );

  const openVideo = useCallback(
    (props: VideoModalProps, options?: UseModalOptions) => {
      return openModal("video", props, options);
    },
    [openModal],
  );

  const openProfile = useCallback(
    (props: ProfileModalProps, options?: UseModalOptions) => {
      return openModal("profile", props, options);
    },
    [openModal],
  );

  const openSettings = useCallback(
    (props: SettingsModalProps, options?: UseModalOptions) => {
      return openModal("settings", props, options);
    },
    [openModal],
  );

  const openCustom = useCallback(
    (props: CustomModalProps, options?: UseModalOptions) => {
      return openModal("custom", props, options);
    },
    [openModal],
  );

  const close = useCallback(
    (id: string) => {
      closeModal(id);
    },
    [closeModal],
  );

  const closeTop = useCallback(() => {
    closeTopModal();
  }, [closeTopModal]);

  const closeAll = useCallback(() => {
    closeAllModals();
  }, [closeAllModals]);

  return {
    open,
    openConfirm,
    openAlert,
    openPrompt,
    openImageLightbox,
    openVideo,
    openProfile,
    openSettings,
    openCustom,
    close,
    closeTop,
    closeAll,
    isOpen: isAnyModalOpen,
    modalCount: modals.length,
  };
}

/**
 * Hook to check if a specific modal is open
 */
export function useModalOpen(modalId: string): boolean {
  return useModalStore((state) => state.modals.some((m) => m.id === modalId));
}

/**
 * Hook to get the top modal
 */
export function useTopModal() {
  return useModalStore((state) =>
    state.modals.length > 0 ? state.modals[state.modals.length - 1] : null,
  );
}
