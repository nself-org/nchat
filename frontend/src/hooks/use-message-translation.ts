"use client";

/**
 * useMessageTranslation Hook
 *
 * Hook for translating messages using a translation API.
 */

import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";

interface TranslationResult {
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
}

interface UseMessageTranslationOptions {
  defaultTargetLanguage?: string;
}

export function useMessageTranslation(
  options: UseMessageTranslationOptions = {},
) {
  const { defaultTargetLanguage = "en" } = options;
  const { toast } = useToast();

  const [translations, setTranslations] = useState<
    Map<string, TranslationResult>
  >(new Map());
  const [loading, setLoading] = useState<Map<string, boolean>>(new Map());
  const [errors, setErrors] = useState<Map<string, string>>(new Map());

  const translateMessage = useCallback(
    async (
      messageId: string,
      text: string,
      targetLanguage: string = defaultTargetLanguage,
    ) => {
      try {
        logger.debug("Translating message", { messageId, targetLanguage });

        setLoading((prev) => new Map(prev).set(messageId, true));
        setErrors((prev) => {
          const next = new Map(prev);
          next.delete(messageId);
          return next;
        });

        // Call translation API
        const response = await fetch("/api/translate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text,
            targetLanguage,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || `Translation failed: ${response.status}`,
          );
        }

        const data = await response.json();

        const result: TranslationResult = {
          translatedText: data.translatedText,
          sourceLanguage: data.sourceLanguage || "unknown",
          targetLanguage,
        };

        setTranslations((prev) => new Map(prev).set(messageId, result));
        logger.info("Message translated successfully", {
          messageId,
          targetLanguage,
        });

        return result;
      } catch (error) {
        const errorMsg =
          error instanceof Error
            ? error.message
            : "Failed to translate message";
        setErrors((prev) => new Map(prev).set(messageId, errorMsg));
        logger.error(
          "Failed to translate message",
          error instanceof Error ? error : undefined,
          {
            messageId,
            errorMessage: errorMsg,
          },
        );

        toast({
          title: "Translation failed",
          description: errorMsg,
          variant: "destructive",
        });

        throw error;
      } finally {
        setLoading((prev) => {
          const next = new Map(prev);
          next.delete(messageId);
          return next;
        });
      }
    },
    [defaultTargetLanguage, toast],
  );

  const dismissTranslation = useCallback((messageId: string) => {
    setTranslations((prev) => {
      const next = new Map(prev);
      next.delete(messageId);
      return next;
    });
  }, []);

  const retryTranslation = useCallback(
    (messageId: string, text: string, targetLanguage?: string) => {
      setErrors((prev) => {
        const next = new Map(prev);
        next.delete(messageId);
        return next;
      });
      return translateMessage(messageId, text, targetLanguage);
    },
    [translateMessage],
  );

  return {
    // Data
    translations,
    loading,
    errors,

    // Actions
    translateMessage,
    dismissTranslation,
    retryTranslation,

    // Helpers
    getTranslation: (messageId: string) => translations.get(messageId),
    isTranslating: (messageId: string) => loading.get(messageId) || false,
    getError: (messageId: string) => errors.get(messageId),
  };
}
