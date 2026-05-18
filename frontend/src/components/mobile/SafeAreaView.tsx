"use client";

import { ReactNode, CSSProperties, memo } from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface SafeAreaViewProps {
  children: ReactNode;
  className?: string;
  edges?: ("top" | "bottom" | "left" | "right")[];
  mode?: "padding" | "margin";
  style?: CSSProperties;
}

export interface SafeAreaInsetsProps {
  className?: string;
  edge: "top" | "bottom" | "left" | "right";
  mode?: "padding" | "margin";
}

// ============================================================================
// Safe Area View Component
// ============================================================================

/**
 * Safe Area View Component
 *
 * Handles safe area insets (notch, home bar, camera cutout) on modern mobile devices.
 * Uses CSS environment variables for dynamic safe area detection.
 *
 * Features:
 * - Automatic safe area detection
 * - Per-edge control
 * - Padding or margin modes
 * - iPhone notch support
 * - Android camera cutout support
 * - Home bar indicator support
 *
 * @example
 * ```tsx
 * // Full safe area
 * <SafeAreaView>
 *   <AppContent />
 * </SafeAreaView>
 *
 * // Only top and bottom
 * <SafeAreaView edges={['top', 'bottom']}>
 *   <AppContent />
 * </SafeAreaView>
 *
 * // Using margin instead of padding
 * <SafeAreaView mode="margin" edges={['bottom']}>
 *   <FixedButton />
 * </SafeAreaView>
 * ```
 */
export const SafeAreaView = memo(function SafeAreaView({
  children,
  className,
  edges = ["top", "bottom", "left", "right"],
  mode = "padding",
  style: customStyle,
}: SafeAreaViewProps) {
  const style: CSSProperties = {
    ...customStyle,
  };

  // Apply safe area insets based on edges
  edges.forEach((edge) => {
    const property =
      mode === "padding"
        ? `padding${capitalize(edge)}`
        : `margin${capitalize(edge)}`;
    const envVar = `env(safe-area-inset-${edge})`;

    // @ts-ignore - CSS env() is valid but TypeScript doesn't know about it
    style[property] = envVar;
  });

  return (
    <div className={cn("safe-area-view", className)} style={style}>
      {children}
    </div>
  );
});

// ============================================================================
// Safe Area Inset Component
// ============================================================================

/**
 * Single Safe Area Inset Component
 *
 * Adds safe area spacing for a single edge.
 * Useful for header/footer components.
 *
 * @example
 * ```tsx
 * <header>
 *   <SafeAreaInset edge="top" />
 *   <HeaderContent />
 * </header>
 * ```
 */
export const SafeAreaInset = memo(function SafeAreaInset({
  className,
  edge,
  mode = "padding",
}: SafeAreaInsetsProps) {
  const property = mode === "padding" ? `padding-${edge}` : `margin-${edge}`;

  return (
    <div
      className={cn("safe-area-inset", className)}
      style={
        {
          [property]: `env(safe-area-inset-${edge})`,
        } as CSSProperties
      }
    />
  );
});

// ============================================================================
// Safe Area Aware Components
// ============================================================================

/**
 * Safe Area Top Component
 * Automatically adds top safe area padding
 */
export const SafeAreaTop = memo(function SafeAreaTop({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("safe-area-top", className)}
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      {children}
    </div>
  );
});

/**
 * Safe Area Bottom Component
 * Automatically adds bottom safe area padding (for home bar)
 */
export const SafeAreaBottom = memo(function SafeAreaBottom({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("safe-area-bottom", className)}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {children}
    </div>
  );
});

/**
 * Fixed Bottom Component with Safe Area
 * Common pattern for fixed bottom bars
 */
export const FixedBottomBar = memo(function FixedBottomBar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("fixed bottom-0 left-0 right-0 z-50", className)}
      style={{
        paddingBottom: "max(env(safe-area-inset-bottom), 1rem)",
      }}
    >
      {children}
    </div>
  );
});

/**
 * Fixed Top Component with Safe Area
 * Common pattern for fixed headers
 */
export const FixedTopBar = memo(function FixedTopBar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("fixed left-0 right-0 top-0 z-50", className)}
      style={{
        paddingTop: "env(safe-area-inset-top)",
      }}
    >
      {children}
    </div>
  );
});

// ============================================================================
// Hook for Safe Area Values
// ============================================================================

export interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/**
 * Hook to get safe area inset values
 *
 * Returns the actual pixel values of safe area insets.
 * Useful for calculations or conditional rendering.
 *
 * @example
 * ```tsx
 * const insets = useSafeAreaInsets()
 *
 * if (insets.bottom > 0) {
 *   // Device has home bar indicator
 * }
 * ```
 */
export function useSafeAreaInsets(): SafeAreaInsets {
  if (typeof window === "undefined") {
    return { top: 0, bottom: 0, left: 0, right: 0 };
  }

  const getInsetValue = (edge: string): number => {
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue(`--safe-area-inset-${edge}`)
      .trim();

    if (!value || value === "0px") {
      // Fallback to env() via a temporary element
      const temp = document.createElement("div");
      temp.style.cssText = `position: fixed; ${edge}: env(safe-area-inset-${edge}); opacity: 0; pointer-events: none;`;
      document.body.appendChild(temp);
      const computed = parseFloat(getComputedStyle(temp)[edge as any] || "0");
      document.body.removeChild(temp);
      return computed;
    }

    return parseFloat(value);
  };

  return {
    top: getInsetValue("top"),
    bottom: getInsetValue("bottom"),
    left: getInsetValue("left"),
    right: getInsetValue("right"),
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ============================================================================
// CSS-in-JS Safe Area Helper
// ============================================================================

/**
 * Generate safe area CSS for inline styles
 *
 * @example
 * ```tsx
 * <div style={getSafeAreaStyle(['bottom'])}>
 *   Content
 * </div>
 * ```
 */
export function getSafeAreaStyle(
  edges: ("top" | "bottom" | "left" | "right")[],
  mode: "padding" | "margin" = "padding",
): CSSProperties {
  const style: CSSProperties = {};

  edges.forEach((edge) => {
    const property = (
      mode === "padding"
        ? `padding${capitalize(edge)}`
        : `margin${capitalize(edge)}`
    ) as keyof CSSProperties;

    // @ts-ignore
    style[property] = `env(safe-area-inset-${edge})`;
  });

  return style;
}

/**
 * CSS class for safe area padding
 * Can be used in Tailwind or custom CSS
 */
export const safeAreaClasses = {
  all: "pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]",
  top: "pt-[env(safe-area-inset-top)]",
  bottom: "pb-[env(safe-area-inset-bottom)]",
  left: "pl-[env(safe-area-inset-left)]",
  right: "pr-[env(safe-area-inset-right)]",
  vertical: "pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]",
  horizontal: "pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]",
};

export default SafeAreaView;
