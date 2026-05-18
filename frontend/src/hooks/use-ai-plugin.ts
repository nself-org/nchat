/**
 * AI Orchestration Plugin Hooks
 * React hooks for using AI Orchestration plugin functionality
 */

import { useState, useCallback } from "react";
import useSWR from "swr";
import {
  aiService,
  type ChatRequest,
  type ChatResponse,
  type ChatMessage,
  type ModerationRequest,
  type ModerationResult,
  type SummarizeRequest,
  type SummarizeResponse,
} from "@/services/plugins/ai.service";

export function useAIChat(userId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const sendMessage = useCallback(
    async (
      content: string,
      options?: { maxTokens?: number; temperature?: number },
    ): Promise<ChatResponse | null> => {
      setIsProcessing(true);
      setError(null);

      const userMessage: ChatMessage = { role: "user", content };
      const newMessages = [...messages, userMessage];
      setMessages(newMessages);

      try {
        const request: ChatRequest = {
          messages: newMessages,
          userId,
          ...options,
        };

        const response = await aiService.chat(request);

        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: response.message,
        };
        setMessages([...newMessages, assistantMessage]);

        return response;
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Chat request failed"));
        return null;
      } finally {
        setIsProcessing(false);
      }
    },
    [messages, userId],
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    sendMessage,
    clearMessages,
    isProcessing,
    error,
  };
}

export function useContentModeration() {
  const [isChecking, setIsChecking] = useState(false);

  const checkContent = useCallback(
    async (text: string, userId: string): Promise<ModerationResult | null> => {
      setIsChecking(true);

      try {
        const request: ModerationRequest = { text, userId };
        const result = await aiService.moderate(request);
        return result;
      } catch (error) {
        console.error("Content moderation failed:", error);
        return null;
      } finally {
        setIsChecking(false);
      }
    },
    [],
  );

  return {
    checkContent,
    isChecking,
  };
}

export function useTextSummarization() {
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const summarize = useCallback(
    async (
      text: string,
      userId: string,
      maxLength?: number,
    ): Promise<SummarizeResponse | null> => {
      setIsSummarizing(true);
      setError(null);

      try {
        const request: SummarizeRequest = { text, userId, maxLength };
        const result = await aiService.summarize(request);
        return result;
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Summarization failed"),
        );
        return null;
      } finally {
        setIsSummarizing(false);
      }
    },
    [],
  );

  return {
    summarize,
    isSummarizing,
    error,
  };
}

export function useAIHealth() {
  const { data, error, isLoading, mutate } = useSWR(
    "/ai/health",
    () => aiService.checkHealth(),
    {
      refreshInterval: 30000,
    },
  );

  return {
    health: data,
    isHealthy: data?.status === "healthy",
    isLoading,
    error,
    checkHealth: mutate,
  };
}
