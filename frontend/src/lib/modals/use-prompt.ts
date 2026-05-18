"use client";

import { useCallback, useRef } from "react";
import { useModalStore } from "./modal-store";

export interface PromptOptions {
  title: string;
  message?: string;
  placeholder?: string;
  defaultValue?: string;
  inputType?: "text" | "email" | "password" | "number" | "textarea";
  validation?: (value: string) => string | null;
  submitText?: string;
  cancelText?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
}

export interface UsePromptReturn {
  /**
   * Shows a prompt dialog and returns a promise that resolves to the
   * entered value, or null if cancelled.
   *
   * @example
   * ```tsx
   * const { prompt } = usePrompt()
   *
   * const handleRename = async () => {
   *   const newName = await prompt({
   *     title: 'Rename Item',
   *     message: 'Enter a new name for this item',
   *     placeholder: 'New name',
   *     defaultValue: currentName,
   *     validation: (value) => {
   *       if (value.length < 3) return 'Name must be at least 3 characters'
   *       return null
   *     }
   *   })
   *
   *   if (newName !== null) {
   *     await renameItem(id, newName)
   *   }
   * }
   * ```
   */
  prompt: (options: PromptOptions) => Promise<string | null>;
}

/**
 * Hook that provides a promise-based prompt dialog.
 * Returns the entered value if submitted, null if cancelled.
 */
export function usePrompt(): UsePromptReturn {
  const openModal = useModalStore((state) => state.openModal);
  const closeModal = useModalStore((state) => state.closeModal);

  // Use ref to store the resolve function for the current prompt
  const resolveRef = useRef<((value: string | null) => void) | null>(null);
  const modalIdRef = useRef<string | null>(null);

  const prompt = useCallback(
    (options: PromptOptions): Promise<string | null> => {
      return new Promise((resolve) => {
        // Store the resolve function
        resolveRef.current = resolve;

        // Build validation function
        const validate = (value: string): string | null => {
          if (options.required && !value.trim()) {
            return "This field is required";
          }
          if (options.minLength && value.length < options.minLength) {
            return `Must be at least ${options.minLength} characters`;
          }
          if (options.maxLength && value.length > options.maxLength) {
            return `Must be no more than ${options.maxLength} characters`;
          }
          if (options.validation) {
            return options.validation(value);
          }
          return null;
        };

        // Open the prompt modal
        const modalId = openModal(
          "prompt",
          {
            title: options.title,
            message: options.message,
            placeholder: options.placeholder,
            defaultValue: options.defaultValue ?? "",
            inputType: options.inputType ?? "text",
            validation: validate,
            submitText: options.submitText ?? "Submit",
            cancelText: options.cancelText ?? "Cancel",
            onSubmit: (value: string) => {
              if (resolveRef.current) {
                resolveRef.current(value);
                resolveRef.current = null;
              }
              if (modalIdRef.current) {
                closeModal(modalIdRef.current);
                modalIdRef.current = null;
              }
            },
            onCancel: () => {
              if (resolveRef.current) {
                resolveRef.current(null);
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
              // If modal is closed without explicit submit/cancel, treat as cancel
              if (resolveRef.current) {
                resolveRef.current(null);
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

  return { prompt };
}

/**
 * Convenience hook for rename operations
 */
export function useRenamePrompt() {
  const { prompt } = usePrompt();

  const promptRename = useCallback(
    (currentName: string, itemType = "item"): Promise<string | null> => {
      return prompt({
        title: `Rename ${itemType}`,
        message: `Enter a new name for this ${itemType}`,
        placeholder: "New name",
        defaultValue: currentName,
        required: true,
        minLength: 1,
        maxLength: 100,
        submitText: "Rename",
      });
    },
    [prompt],
  );

  return { promptRename };
}

/**
 * Convenience hook for creating new items with a name
 */
export function useCreatePrompt() {
  const { prompt } = usePrompt();

  const promptCreate = useCallback(
    (
      itemType = "item",
      options?: {
        placeholder?: string;
        minLength?: number;
        maxLength?: number;
      },
    ): Promise<string | null> => {
      return prompt({
        title: `Create ${itemType}`,
        message: `Enter a name for the new ${itemType}`,
        placeholder: options?.placeholder ?? `${itemType} name`,
        required: true,
        minLength: options?.minLength ?? 1,
        maxLength: options?.maxLength ?? 100,
        submitText: "Create",
      });
    },
    [prompt],
  );

  return { promptCreate };
}

/**
 * Convenience hook for password/secret input
 */
export function usePasswordPrompt() {
  const { prompt } = usePrompt();

  const promptPassword = useCallback(
    (
      title = "Enter password",
      options?: { message?: string; placeholder?: string },
    ): Promise<string | null> => {
      return prompt({
        title,
        message: options?.message,
        placeholder: options?.placeholder ?? "Password",
        inputType: "password",
        required: true,
        submitText: "Submit",
      });
    },
    [prompt],
  );

  return { promptPassword };
}
