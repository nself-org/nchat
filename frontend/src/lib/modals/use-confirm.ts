"use client";

import { useCallback, useRef } from "react";
import { useModalStore } from "./modal-store";

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive" | "warning";
}

export interface UseConfirmReturn {
  /**
   * Shows a confirmation dialog and returns a promise that resolves to true
   * if the user confirms, or false if they cancel.
   *
   * @example
   * ```tsx
   * const { confirm } = useConfirm()
   *
   * const handleDelete = async () => {
   *   const confirmed = await confirm({
   *     title: 'Delete Item',
   *     message: 'Are you sure you want to delete this item?',
   *     variant: 'destructive',
   *     confirmText: 'Delete',
   *   })
   *
   *   if (confirmed) {
   *     await deleteItem(id)
   *   }
   * }
   * ```
   */
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

/**
 * Hook that provides a promise-based confirmation dialog.
 * Returns true if confirmed, false if cancelled.
 */
export function useConfirm(): UseConfirmReturn {
  const openModal = useModalStore((state) => state.openModal);
  const closeModal = useModalStore((state) => state.closeModal);

  // Use ref to store the resolve function for the current confirmation
  const resolveRef = useRef<((value: boolean) => void) | null>(null);
  const modalIdRef = useRef<string | null>(null);

  const confirm = useCallback(
    (options: ConfirmOptions): Promise<boolean> => {
      return new Promise((resolve) => {
        // Store the resolve function
        resolveRef.current = resolve;

        // Open the confirmation modal
        const modalId = openModal(
          "confirm",
          {
            title: options.title,
            message: options.message,
            confirmText: options.confirmText ?? "Confirm",
            cancelText: options.cancelText ?? "Cancel",
            variant: options.variant ?? "default",
            onConfirm: () => {
              if (resolveRef.current) {
                resolveRef.current(true);
                resolveRef.current = null;
              }
              if (modalIdRef.current) {
                closeModal(modalIdRef.current);
                modalIdRef.current = null;
              }
            },
            onCancel: () => {
              if (resolveRef.current) {
                resolveRef.current(false);
                resolveRef.current = null;
              }
              if (modalIdRef.current) {
                closeModal(modalIdRef.current);
                modalIdRef.current = null;
              }
            },
          },
          {
            onClose: () => {
              // If modal is closed without explicit confirm/cancel, treat as cancel
              if (resolveRef.current) {
                resolveRef.current(false);
                resolveRef.current = null;
              }
              modalIdRef.current = null;
            },
          },
        );

        modalIdRef.current = modalId;
      });
    },
    [openModal, closeModal],
  );

  return { confirm };
}

/**
 * Convenience hook for delete confirmations
 */
export function useDeleteConfirm() {
  const { confirm } = useConfirm();

  const confirmDelete = useCallback(
    (itemName?: string): Promise<boolean> => {
      return confirm({
        title: `Delete ${itemName || "item"}?`,
        message: `Are you sure you want to delete ${itemName || "this item"}? This action cannot be undone.`,
        confirmText: "Delete",
        cancelText: "Cancel",
        variant: "destructive",
      });
    },
    [confirm],
  );

  return { confirmDelete };
}

/**
 * Convenience hook for discard changes confirmations
 */
export function useDiscardConfirm() {
  const { confirm } = useConfirm();

  const confirmDiscard = useCallback((): Promise<boolean> => {
    return confirm({
      title: "Discard changes?",
      message:
        "You have unsaved changes. Are you sure you want to discard them?",
      confirmText: "Discard",
      cancelText: "Keep editing",
      variant: "warning",
    });
  }, [confirm]);

  return { confirmDiscard };
}

/**
 * Convenience hook for leave page confirmations
 */
export function useLeaveConfirm() {
  const { confirm } = useConfirm();

  const confirmLeave = useCallback((): Promise<boolean> => {
    return confirm({
      title: "Leave page?",
      message:
        "You have unsaved changes. Are you sure you want to leave this page?",
      confirmText: "Leave",
      cancelText: "Stay",
      variant: "warning",
    });
  }, [confirm]);

  return { confirmLeave };
}
