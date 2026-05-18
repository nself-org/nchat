"use client";

import { useState, useCallback } from "react";

import { logger } from "@/lib/logger";

interface UseCopyToClipboardResult {
  /** The last copied text, or null if nothing has been copied */
  copiedText: string | null;
  /** Function to copy text to clipboard */
  copy: (text: string) => Promise<boolean>;
  /** Function to reset the copied state */
  reset: () => void;
  /** Error if copy failed */
  error: Error | null;
}

/**
 * Hook for copying text to clipboard
 * @returns { copiedText, copy, reset, error }
 */
export function useCopyToClipboard(): UseCopyToClipboardResult {
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const copy = useCallback(async (text: string): Promise<boolean> => {
    if (!navigator?.clipboard) {
      // Fallback for older browsers
      try {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        const success = document.execCommand("copy");
        document.body.removeChild(textArea);

        if (success) {
          setCopiedText(text);
          setError(null);
          return true;
        } else {
          throw new Error("Copy command failed");
        }
      } catch (err) {
        const copyError =
          err instanceof Error ? err : new Error("Failed to copy");
        setError(copyError);
        setCopiedText(null);
        logger.warn("Copy to clipboard failed:", { context: copyError });
        return false;
      }
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(text);
      setError(null);
      return true;
    } catch (err) {
      const copyError =
        err instanceof Error ? err : new Error("Failed to copy");
      setError(copyError);
      setCopiedText(null);
      logger.warn("Copy to clipboard failed:", { context: copyError });
      return false;
    }
  }, []);

  const reset = useCallback(() => {
    setCopiedText(null);
    setError(null);
  }, []);

  return { copiedText, copy, reset, error };
}

/**
 * Simplified tuple-based hook for copying to clipboard
 * @returns [copiedText, copy] tuple
 */
export function useClipboard(): [
  string | null,
  (text: string) => Promise<boolean>,
] {
  const { copiedText, copy } = useCopyToClipboard();
  return [copiedText, copy];
}
