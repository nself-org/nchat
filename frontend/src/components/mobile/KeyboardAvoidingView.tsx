"use client";

import {
  ReactNode,
  useEffect,
  useState,
  useRef,
  useCallback,
  CSSProperties,
  memo,
} from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface KeyboardAvoidingViewProps {
  children: ReactNode;
  className?: string;
  behavior?: "padding" | "height" | "position";
  keyboardVerticalOffset?: number;
  enabled?: boolean;
  contentContainerClassName?: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Keyboard Avoiding View Component
 *
 * Automatically adjusts content when the keyboard appears on mobile devices.
 * Prevents inputs from being hidden behind the keyboard.
 *
 * Features:
 * - Detects keyboard open/close
 * - Multiple adjustment behaviors
 * - Visual Viewport API support
 * - Smooth transitions
 * - iOS and Android compatible
 *
 * @example
 * ```tsx
 * <KeyboardAvoidingView behavior="padding">
 *   <MessageInput />
 * </KeyboardAvoidingView>
 * ```
 */
export const KeyboardAvoidingView = memo(function KeyboardAvoidingView({
  children,
  className,
  behavior = "padding",
  keyboardVerticalOffset = 0,
  enabled = true,
  contentContainerClassName,
}: KeyboardAvoidingViewProps) {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const originalHeightRef = useRef<number>(0);

  // Handle keyboard visibility using Visual Viewport API
  const handleVisualViewportResize = useCallback(() => {
    if (!enabled || typeof window === "undefined") return;

    const visualViewport = window.visualViewport;

    if (!visualViewport) {
      return;
    }

    const windowHeight = window.innerHeight;
    const viewportHeight = visualViewport.height;
    const heightDifference = windowHeight - viewportHeight;

    // Keyboard is considered visible if viewport is significantly smaller
    const keyboardVisible = heightDifference > 150;

    setIsKeyboardVisible(keyboardVisible);
    setKeyboardHeight(keyboardVisible ? heightDifference : 0);

    // Store original height on first keyboard open
    if (keyboardVisible && originalHeightRef.current === 0) {
      originalHeightRef.current = windowHeight;
    }
  }, [enabled]);

  // Fallback for older browsers using window resize
  const handleWindowResize = useCallback(() => {
    if (!enabled || typeof window === "undefined") return;

    // Only use this if Visual Viewport is not available
    if (window.visualViewport) return;

    const currentHeight = window.innerHeight;

    if (originalHeightRef.current === 0) {
      originalHeightRef.current = currentHeight;
      return;
    }

    const heightDifference = originalHeightRef.current - currentHeight;
    const keyboardVisible = heightDifference > 150;

    setIsKeyboardVisible(keyboardVisible);
    setKeyboardHeight(keyboardVisible ? heightDifference : 0);
  }, [enabled]);

  // Setup event listeners
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const visualViewport = window.visualViewport;

    if (visualViewport) {
      // Modern approach using Visual Viewport API
      visualViewport.addEventListener("resize", handleVisualViewportResize);
      visualViewport.addEventListener("scroll", handleVisualViewportResize);

      // Initial check
      handleVisualViewportResize();

      return () => {
        visualViewport.removeEventListener(
          "resize",
          handleVisualViewportResize,
        );
        visualViewport.removeEventListener(
          "scroll",
          handleVisualViewportResize,
        );
      };
    } else {
      // Fallback for older browsers
      window.addEventListener("resize", handleWindowResize);
      handleWindowResize();

      return () => {
        window.removeEventListener("resize", handleWindowResize);
      };
    }
  }, [enabled, handleVisualViewportResize, handleWindowResize]);

  // Reset on unmount
  useEffect(() => {
    return () => {
      originalHeightRef.current = 0;
    };
  }, []);

  // Calculate styles based on behavior
  const getContainerStyle = (): CSSProperties => {
    if (!enabled || !isKeyboardVisible || keyboardHeight === 0) {
      return {};
    }

    const offset = keyboardHeight - keyboardVerticalOffset;

    switch (behavior) {
      case "padding":
        return {
          paddingBottom: `${offset}px`,
          transition: "padding-bottom 0.25s ease-out",
        };

      case "height":
        return {
          height: `calc(100% - ${offset}px)`,
          transition: "height 0.25s ease-out",
        };

      case "position":
        return {
          transform: `translateY(-${offset}px)`,
          transition: "transform 0.25s ease-out",
        };

      default:
        return {};
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn("relative", className)}
      style={getContainerStyle()}
      data-keyboard-visible={isKeyboardVisible}
    >
      <div className={cn(contentContainerClassName)}>{children}</div>
    </div>
  );
});

// ============================================================================
// Hook for manual keyboard detection
// ============================================================================

export interface UseKeyboardReturn {
  isKeyboardVisible: boolean;
  keyboardHeight: number;
}

/**
 * Hook to detect keyboard visibility
 *
 * @example
 * ```tsx
 * const { isKeyboardVisible, keyboardHeight } = useKeyboard()
 *
 * if (isKeyboardVisible) {
 *   // Adjust UI
 * }
 * ```
 */
export function useKeyboard(): UseKeyboardReturn {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const originalHeightRef = useRef<number>(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleResize = () => {
      const visualViewport = window.visualViewport;

      if (visualViewport) {
        const windowHeight = window.innerHeight;
        const viewportHeight = visualViewport.height;
        const heightDifference = windowHeight - viewportHeight;
        const keyboardVisible = heightDifference > 150;

        setIsKeyboardVisible(keyboardVisible);
        setKeyboardHeight(keyboardVisible ? heightDifference : 0);
      } else {
        const currentHeight = window.innerHeight;

        if (originalHeightRef.current === 0) {
          originalHeightRef.current = currentHeight;
          return;
        }

        const heightDifference = originalHeightRef.current - currentHeight;
        const keyboardVisible = heightDifference > 150;

        setIsKeyboardVisible(keyboardVisible);
        setKeyboardHeight(keyboardVisible ? heightDifference : 0);
      }
    };

    const visualViewport = window.visualViewport;

    if (visualViewport) {
      visualViewport.addEventListener("resize", handleResize);
      visualViewport.addEventListener("scroll", handleResize);
      handleResize();

      return () => {
        visualViewport.removeEventListener("resize", handleResize);
        visualViewport.removeEventListener("scroll", handleResize);
      };
    } else {
      window.addEventListener("resize", handleResize);
      handleResize();

      return () => {
        window.removeEventListener("resize", handleResize);
      };
    }
  }, []);

  return { isKeyboardVisible, keyboardHeight };
}

export default KeyboardAvoidingView;
